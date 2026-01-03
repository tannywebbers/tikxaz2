import { useState, useEffect } from "react";
import { 
  Users, 
  Search,
  Coins,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

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

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-800 hover:bg-transparent">
              <TableHead className="text-neutral-400">User</TableHead>
              <TableHead className="text-neutral-400">TikTok Name</TableHead>
              <TableHead className="text-neutral-400">TikTok Username</TableHead>
              <TableHead className="text-neutral-400">Points</TableHead>
              <TableHead className="text-neutral-400">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map(user => (
              <TableRow key={user.id} className="border-neutral-800 hover:bg-neutral-800/50">
                <TableCell>
                  <div>
                    <div className="font-medium text-neutral-100">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm text-neutral-500">{user.email}</div>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
