import { useState, useEffect } from "react";
import { 
  Users, 
  Search,
  Coins,
  Loader2,
  Plus,
  Minus,
  Send,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  tiktok_username: string;
  tiktok_name: string | null;
  tik_points: number;
  created_at: string;
  avatar_url: string | null;
}

type NotificationType = "announcement" | "warning" | "info" | "admin_credit" | "admin_debit";

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Credit/Debit modal state
  const [creditDebitModal, setCreditDebitModal] = useState<{
    open: boolean;
    type: "credit" | "debit";
    user: User | null;
  }>({ open: false, type: "credit", user: null });
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Notification modal state
  const [notifyModal, setNotifyModal] = useState<{
    open: boolean;
    user: User | null;
  }>({ open: false, user: null });
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyType, setNotifyType] = useState<NotificationType>("info");

  // Broadcast modal state
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState<NotificationType>("announcement");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data as User[] || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load users." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreditDebit = async () => {
    if (!creditDebitModal.user || !amount || parseFloat(amount) <= 0) {
      toast({ variant: "destructive", title: "Invalid amount", description: "Please enter a valid amount." });
      return;
    }

    setIsProcessing(true);
    try {
      const amountNum = parseFloat(amount);
      const user = creditDebitModal.user;
      const isCredit = creditDebitModal.type === "credit";
      
      // Update user's points
      const newBalance = isCredit 
        ? user.tik_points + amountNum 
        : Math.max(0, user.tik_points - amountNum);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ tik_points: newBalance })
        .eq("user_id", user.user_id);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.user_id,
          type: isCredit ? "admin_credit" : "admin_debit",
          amount: isCredit ? amountNum : -amountNum,
          description: reason || `Admin ${isCredit ? "credit" : "debit"}: ${amountNum} points`
        });

      if (txError) throw txError;

      // Create notification for user
      const { error: notifyError } = await supabase
        .from("notifications")
        .insert({
          user_id: user.user_id,
          type: isCredit ? "admin_credit" : "admin_debit",
          title: isCredit ? "Points Credited" : "Points Debited",
          message: reason || `${amountNum} TikPoints have been ${isCredit ? "added to" : "removed from"} your account by an administrator.`
        });

      if (notifyError) console.error("Notification error:", notifyError);

      toast({
        title: "Success",
        description: `${isCredit ? "Credited" : "Debited"} ${amountNum} points ${isCredit ? "to" : "from"} ${user.email}.`
      });

      // Refresh users
      fetchUsers();
      setCreditDebitModal({ open: false, type: "credit", user: null });
      setAmount("");
      setReason("");
    } catch (error) {
      console.error("Credit/Debit error:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to process request." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notifyModal.user || !notifyTitle || !notifyMessage) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please fill all fields." });
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("notifications")
        .insert({
          user_id: notifyModal.user.user_id,
          type: notifyType,
          title: notifyTitle,
          message: notifyMessage
        });

      if (error) throw error;

      toast({ title: "Success", description: `Notification sent to ${notifyModal.user.email}.` });
      setNotifyModal({ open: false, user: null });
      setNotifyTitle("");
      setNotifyMessage("");
      setNotifyType("info");
    } catch (error) {
      console.error("Notification error:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to send notification." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle || !broadcastMessage) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please fill all fields." });
      return;
    }

    setIsProcessing(true);
    try {
      // Send notification to all users
      const notifications = users.map(user => ({
        user_id: user.user_id,
        type: broadcastType,
        title: broadcastTitle,
        message: broadcastMessage
      }));

      const { error } = await supabase
        .from("notifications")
        .insert(notifications);

      if (error) throw error;

      toast({ title: "Success", description: `Broadcast sent to ${users.length} users.` });
      setBroadcastModal(false);
      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastType("announcement");
    } catch (error) {
      console.error("Broadcast error:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to send broadcast." });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.tiktok_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.tiktok_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-100">Users</h1>
          <p className="text-sm text-neutral-500 mt-1">{users.length} registered users</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setBroadcastModal(true)}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
            Broadcast
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              placeholder="Search users..."
              className="pl-10 w-64 bg-neutral-800 border-neutral-700 text-neutral-100"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-800 hover:bg-transparent">
              <TableHead className="text-neutral-400">User</TableHead>
              <TableHead className="text-neutral-400">TikTok Name</TableHead>
              <TableHead className="text-neutral-400">TikTok Username</TableHead>
              <TableHead className="text-neutral-400">Points</TableHead>
              <TableHead className="text-neutral-400">Joined</TableHead>
              <TableHead className="text-neutral-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map(user => (
              <TableRow key={user.id} className="border-neutral-800 hover:bg-neutral-800/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm">
                      {user.avatar_url && /\p{Emoji}/u.test(user.avatar_url) 
                        ? user.avatar_url 
                        : (user.first_name?.[0] || user.email[0]).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-neutral-100">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-neutral-500">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-neutral-300">
                  {user.tiktok_name || <span className="text-neutral-500">Not set</span>}
                </TableCell>
                <TableCell className="text-neutral-400">@{user.tiktok_username}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1 border-neutral-700 text-neutral-300">
                    <Coins className="w-3 h-3" />
                    {user.tik_points}
                  </Badge>
                </TableCell>
                <TableCell className="text-neutral-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-neutral-800 border-neutral-700">
                      <DropdownMenuItem 
                        className="text-green-400 focus:text-green-400 focus:bg-green-500/10"
                        onClick={() => setCreditDebitModal({ open: true, type: "credit", user })}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Credit Points
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                        onClick={() => setCreditDebitModal({ open: true, type: "debit", user })}
                      >
                        <Minus className="w-4 h-4 mr-2" />
                        Debit Points
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-blue-400 focus:text-blue-400 focus:bg-blue-500/10"
                        onClick={() => setNotifyModal({ open: true, user })}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send Notification
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Credit/Debit Modal */}
      <Dialog open={creditDebitModal.open} onOpenChange={(open) => !open && setCreditDebitModal({ ...creditDebitModal, open: false })}>
        <DialogContent className="bg-neutral-900 border-neutral-800">
          <DialogHeader>
            <DialogTitle className="text-neutral-100">
              {creditDebitModal.type === "credit" ? "Credit" : "Debit"} Points
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              {creditDebitModal.type === "credit" ? "Add" : "Remove"} TikPoints {creditDebitModal.type === "credit" ? "to" : "from"} {creditDebitModal.user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-neutral-300">Amount</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-neutral-800 border-neutral-700 text-neutral-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Reason (optional)</Label>
              <Textarea
                placeholder="Reason for this transaction..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-neutral-800 border-neutral-700 text-neutral-100"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditDebitModal({ ...creditDebitModal, open: false })} className="border-neutral-700">
              Cancel
            </Button>
            <Button 
              onClick={handleCreditDebit} 
              disabled={isProcessing}
              className={creditDebitModal.type === "credit" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {creditDebitModal.type === "credit" ? "Credit" : "Debit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Notification Modal */}
      <Dialog open={notifyModal.open} onOpenChange={(open) => !open && setNotifyModal({ ...notifyModal, open: false })}>
        <DialogContent className="bg-neutral-900 border-neutral-800">
          <DialogHeader>
            <DialogTitle className="text-neutral-100">Send Notification</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Send a notification to {notifyModal.user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-neutral-300">Type</Label>
              <Select value={notifyType} onValueChange={(v) => setNotifyType(v as NotificationType)}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Title</Label>
              <Input
                placeholder="Notification title"
                value={notifyTitle}
                onChange={(e) => setNotifyTitle(e.target.value)}
                className="bg-neutral-800 border-neutral-700 text-neutral-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Message</Label>
              <Textarea
                placeholder="Notification message..."
                value={notifyMessage}
                onChange={(e) => setNotifyMessage(e.target.value)}
                className="bg-neutral-800 border-neutral-700 text-neutral-100"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyModal({ ...notifyModal, open: false })} className="border-neutral-700">
              Cancel
            </Button>
            <Button onClick={handleSendNotification} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700">
              {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broadcast Modal */}
      <Dialog open={broadcastModal} onOpenChange={setBroadcastModal}>
        <DialogContent className="bg-neutral-900 border-neutral-800">
          <DialogHeader>
            <DialogTitle className="text-neutral-100">Broadcast Notification</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Send a notification to all {users.length} users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-neutral-300">Type</Label>
              <Select value={broadcastType} onValueChange={(v) => setBroadcastType(v as NotificationType)}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700">
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="feature_update">Feature Update</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Title</Label>
              <Input
                placeholder="Broadcast title"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                className="bg-neutral-800 border-neutral-700 text-neutral-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Message</Label>
              <Textarea
                placeholder="Broadcast message..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="bg-neutral-800 border-neutral-700 text-neutral-100"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBroadcastModal(false)} className="border-neutral-700">
              Cancel
            </Button>
            <Button onClick={handleBroadcast} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700">
              {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send to All Users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
