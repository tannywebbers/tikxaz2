import { useState, useEffect } from "react";
import { 
  Users, 
  Search,
  Coins,
  Loader2,
  Plus,
  Minus,
  Send,
  MoreHorizontal,
  Ban,
  Trash2,
  CheckCircle,
  XCircle
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

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
  is_banned: boolean;
  banned_at: string | null;
  ban_reason: string | null;
}

type NotificationType = "announcement" | "warning" | "info" | "admin_credit" | "admin_debit";

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { userRole } = useAuth();

  // Only super admins can credit/debit
  const canCreditDebit = userRole === 'admin';

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

  // Ban modal state
  const [banModal, setBanModal] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const [banReason, setBanReason] = useState("");

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Get all user roles to filter out admins and moderators
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "moderator"]);

      const adminModeratorIds = new Set((rolesData || []).map(r => r.user_id));

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Filter out admin and moderator users
      const regularUsers = (data || []).filter(user => !adminModeratorIds.has(user.user_id));
      setUsers(regularUsers as User[]);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load users." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreditDebit = async () => {
    if (!canCreditDebit) {
      toast({ variant: "destructive", title: "Unauthorized", description: "Only super admins can credit/debit points." });
      return;
    }

    if (!creditDebitModal.user || !amount || parseFloat(amount) <= 0) {
      toast({ variant: "destructive", title: "Invalid amount", description: "Please enter a valid amount." });
      return;
    }

    setIsProcessing(true);
    try {
      const amountNum = parseFloat(amount);
      const user = creditDebitModal.user;
      const isCredit = creditDebitModal.type === "credit";
      
      const newBalance = isCredit 
        ? user.tik_points + amountNum 
        : Math.max(0, user.tik_points - amountNum);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ tik_points: newBalance })
        .eq("user_id", user.user_id);

      if (updateError) throw updateError;

      await supabase.from("transactions").insert({
        user_id: user.user_id,
        type: isCredit ? "admin_credit" : "admin_debit",
        amount: isCredit ? amountNum : -amountNum,
        description: reason || `Admin ${isCredit ? "credit" : "debit"}: ${amountNum} points`
      });

      await supabase.from("notifications").insert({
        user_id: user.user_id,
        type: isCredit ? "admin_credit" : "admin_debit",
        title: isCredit ? "Points Credited" : "Points Debited",
        message: reason || `${amountNum} TikPoints have been ${isCredit ? "added to" : "removed from"} your account.`
      });

      toast({ title: "Success", description: `${isCredit ? "Credited" : "Debited"} ${amountNum} points.` });
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

  const handleBanUser = async () => {
    if (!banModal.user) return;
    
    setIsProcessing(true);
    try {
      const user = banModal.user;
      const newBanStatus = !user.is_banned;

      const { error } = await supabase
        .from("profiles")
        .update({ 
          is_banned: newBanStatus,
          banned_at: newBanStatus ? new Date().toISOString() : null,
          ban_reason: newBanStatus ? banReason : null
        })
        .eq("user_id", user.user_id);

      if (error) throw error;

      if (newBanStatus) {
        await supabase.from("notifications").insert({
          user_id: user.user_id,
          type: "warning",
          title: "Account Suspended",
          message: banReason || "Your account has been suspended. Contact support for more information."
        });
      }

      toast({ 
        title: newBanStatus ? "User Banned" : "User Unbanned", 
        description: `${user.email} has been ${newBanStatus ? "banned" : "unbanned"}.` 
      });
      
      fetchUsers();
      setBanModal({ open: false, user: null });
      setBanReason("");
    } catch (error) {
      console.error("Ban error:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update ban status." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm.user) return;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", deleteConfirm.user.user_id);

      if (error) throw error;

      toast({ title: "User Deleted", description: `${deleteConfirm.user.email} has been permanently deleted.` });
      fetchUsers();
      setDeleteConfirm({ open: false, user: null });
    } catch (error) {
      console.error("Delete error:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete user." });
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
      const { error } = await supabase.from("notifications").insert({
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
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to send notification." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle || !broadcastMessage) {
      toast({ variant: "destructive", title: "Missing fields" });
      return;
    }

    setIsProcessing(true);
    try {
      const notifications = users.map(user => ({
        user_id: user.user_id,
        type: broadcastType,
        title: broadcastTitle,
        message: broadcastMessage
      }));

      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) throw error;

      toast({ title: "Success", description: `Broadcast sent to ${users.length} users.` });
      setBroadcastModal(false);
      setBroadcastTitle("");
      setBroadcastMessage("");
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to send broadcast." });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.tiktok_username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">{users.length} registered users</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setBroadcastModal(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Send className="w-4 h-4" /> Broadcast
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-10 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-foreground">User</TableHead>
              <TableHead className="text-foreground">TikTok</TableHead>
              <TableHead className="text-foreground">Points</TableHead>
              <TableHead className="text-foreground">Status</TableHead>
              <TableHead className="text-foreground">Joined</TableHead>
              <TableHead className="text-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map(user => (
              <TableRow key={user.id} className={`border-border hover:bg-muted/50 ${user.is_banned ? 'opacity-60' : ''}`}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm">
                      {user.avatar_url && /\p{Emoji}/u.test(user.avatar_url) 
                        ? user.avatar_url 
                        : (user.first_name?.[0] || user.email[0]).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{user.first_name} {user.last_name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">@{user.tiktok_username}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1">
                    <Coins className="w-3 h-3" /> {user.tik_points}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.is_banned ? (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="w-3 h-3" /> Banned
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 border-green-700 text-green-500">
                      <CheckCircle className="w-3 h-3" /> Active
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canCreditDebit && (
                        <>
                          <DropdownMenuItem 
                            className="text-green-500 focus:text-green-500"
                            onClick={() => setCreditDebitModal({ open: true, type: "credit", user })}
                          >
                            <Plus className="w-4 h-4 mr-2" /> Credit Points
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-orange-500 focus:text-orange-500"
                            onClick={() => setCreditDebitModal({ open: true, type: "debit", user })}
                          >
                            <Minus className="w-4 h-4 mr-2" /> Debit Points
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem 
                        className="text-blue-500 focus:text-blue-500"
                        onClick={() => setNotifyModal({ open: true, user })}
                      >
                        <Send className="w-4 h-4 mr-2" /> Send Notification
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-yellow-500 focus:text-yellow-500"
                        onClick={() => setBanModal({ open: true, user })}
                      >
                        <Ban className="w-4 h-4 mr-2" /> {user.is_banned ? "Unban" : "Ban"} User
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-500 focus:text-red-500"
                        onClick={() => setDeleteConfirm({ open: true, user })}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete User
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {creditDebitModal.type === "credit" ? "Credit" : "Debit"} Points
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditDebitModal({ ...creditDebitModal, open: false })}>Cancel</Button>
            <Button onClick={handleCreditDebit} disabled={isProcessing} className={creditDebitModal.type === "credit" ? "bg-green-600" : "bg-red-600"}>
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {creditDebitModal.type === "credit" ? "Credit" : "Debit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Modal */}
      <Dialog open={banModal.open} onOpenChange={(open) => !open && setBanModal({ ...banModal, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {banModal.user?.is_banned ? "Unban" : "Ban"} User
            </DialogTitle>
            <DialogDescription>
              {banModal.user?.is_banned 
                ? "This will restore the user's access to the platform."
                : "This will prevent the user from logging in or earning points."}
            </DialogDescription>
          </DialogHeader>
          {!banModal.user?.is_banned && (
            <div className="space-y-2 py-4">
              <Label>Ban Reason</Label>
              <Textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Reason for ban..." />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanModal({ ...banModal, open: false })}>Cancel</Button>
            <Button onClick={handleBanUser} disabled={isProcessing} className={banModal.user?.is_banned ? "bg-green-600" : "bg-yellow-600"}>
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {banModal.user?.is_banned ? "Unban" : "Ban"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ ...deleteConfirm, open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {deleteConfirm.user?.email} and all their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Notification Modal */}
      <Dialog open={notifyModal.open} onOpenChange={(open) => !open && setNotifyModal({ ...notifyModal, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={notifyType} onValueChange={(v) => setNotifyType(v as NotificationType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Title" value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} />
            <Textarea placeholder="Message" value={notifyMessage} onChange={(e) => setNotifyMessage(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyModal({ ...notifyModal, open: false })}>Cancel</Button>
            <Button onClick={handleSendNotification} disabled={isProcessing} className="bg-blue-600">
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broadcast Modal */}
      <Dialog open={broadcastModal} onOpenChange={setBroadcastModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Broadcast to All Users</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={broadcastType} onValueChange={(v) => setBroadcastType(v as NotificationType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Title" value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} />
            <Textarea placeholder="Message" value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBroadcastModal(false)}>Cancel</Button>
            <Button onClick={handleBroadcast} disabled={isProcessing} className="bg-blue-600">
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Send to {users.length} users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}