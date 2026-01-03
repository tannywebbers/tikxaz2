import { useState, useEffect } from "react";
import { 
  Users, 
  FileCheck, 
  Coins, 
  TrendingUp,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { SubmissionReviewDialog } from "./components/SubmissionReviewDialog";

interface Submission {
  id: string;
  ad_id: string;
  user_id: string;
  screenshot_urls: string[];
  status: "pending" | "approved" | "rejected" | "needs_review";
  ai_analysis: any;
  points_awarded: number | null;
  admin_notes: string | null;
  created_at: string;
  profiles?: { tiktok_username: string; tiktok_name: string | null; email: string };
  ads?: { task_type: string; points_per_task: number };
}

interface Stats {
  totalUsers: number;
  pendingReviews: number;
  totalPointsIssued: number;
  approvalRate: number;
}

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    pendingReviews: 0,
    totalPointsIssued: 0,
    approvalRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: submissionsData } = await supabase
        .from("task_submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      const { data: adsData } = await supabase.from("ads").select("id, task_type, points_per_task");
      const { data: profilesData } = await supabase.from("profiles").select("user_id, tiktok_username, tiktok_name, email");
      const { data: usersData } = await supabase.from("profiles").select("id");

      const enrichedSubmissions = (submissionsData || []).map(sub => ({
        ...sub,
        profiles: profilesData?.find(p => p.user_id === sub.user_id),
        ads: adsData?.find(a => a.id === sub.ad_id),
      }));

      const pending = enrichedSubmissions.filter(s => s.status === "pending" || s.status === "needs_review").length;
      const approved = enrichedSubmissions.filter(s => s.status === "approved").length;
      const total = enrichedSubmissions.length;
      const totalPoints = enrichedSubmissions.reduce((sum, s) => sum + (s.points_awarded || 0), 0);

      setSubmissions(enrichedSubmissions as Submission[]);
      setStats({
        totalUsers: usersData?.length || 0,
        pendingReviews: pending,
        totalPointsIssued: totalPoints,
        approvalRate: total > 0 ? (approved / total) * 100 : 0,
      });
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load data." });
    } finally {
      setIsLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "success" | "destructive" | "warning"; icon: any }> = {
      pending: { variant: "warning", icon: AlertTriangle },
      approved: { variant: "success", icon: CheckCircle },
      rejected: { variant: "destructive", icon: XCircle },
      needs_review: { variant: "warning", icon: AlertTriangle },
    };
    const { variant, icon: Icon } = config[status] || { variant: "default", icon: null };
    return (
      <Badge variant={variant} className="gap-1 capitalize">
        {Icon && <Icon className="w-3 h-3" />}
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const taskTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      like: "bg-red-500/10 text-red-500",
      comment: "bg-blue-500/10 text-blue-500",
      save: "bg-yellow-500/10 text-yellow-500",
      follow: "bg-purple-500/10 text-purple-500",
      combo_mini: "bg-gradient-to-r from-red-500/10 via-blue-500/10 to-yellow-500/10 text-neutral-100",
      combo_large: "bg-gradient-to-r from-red-500/10 via-blue-500/10 via-yellow-500/10 to-purple-500/10 text-neutral-100",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${colors[type] || "bg-neutral-700"}`}>
        {type.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-100">Dashboard</h1>
          <p className="text-sm text-neutral-500">Overview of platform activity</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={isLoading}
          className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: "Total Users", value: stats.totalUsers, color: "text-blue-400" },
          { icon: AlertTriangle, label: "Pending Reviews", value: stats.pendingReviews, color: "text-yellow-400" },
          { icon: Coins, label: "Points Issued", value: stats.totalPointsIssued.toLocaleString(), color: "text-green-400" },
          { icon: TrendingUp, label: "Approval Rate", value: `${stats.approvalRate.toFixed(1)}%`, color: "text-purple-400" },
        ].map((stat, i) => (
          <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-neutral-100">{stat.value}</div>
                <div className="text-sm text-neutral-500">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Submissions */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl">
        <div className="p-4 border-b border-neutral-800">
          <h2 className="text-lg font-medium text-neutral-100">Recent Submissions</h2>
          <p className="text-sm text-neutral-500">Latest task submissions requiring review</p>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-800 hover:bg-transparent">
                  <TableHead className="text-neutral-400">User</TableHead>
                  <TableHead className="text-neutral-400">Task Type</TableHead>
                  <TableHead className="text-neutral-400">Status</TableHead>
                  <TableHead className="text-neutral-400">Points</TableHead>
                  <TableHead className="text-neutral-400">Date</TableHead>
                  <TableHead className="text-neutral-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.slice(0, 10).map(sub => (
                  <TableRow key={sub.id} className="border-neutral-800 hover:bg-neutral-800/50">
                    <TableCell className="text-neutral-300">
                      {sub.profiles?.tiktok_name || `@${sub.profiles?.tiktok_username}`}
                    </TableCell>
                    <TableCell>{taskTypeBadge(sub.ads?.task_type || "unknown")}</TableCell>
                    <TableCell>{statusBadge(sub.status)}</TableCell>
                    <TableCell className="text-neutral-300">{sub.points_awarded || "-"}</TableCell>
                    <TableCell className="text-neutral-400">{new Date(sub.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedSubmission(sub)}
                        className="text-neutral-400 hover:text-neutral-100"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <SubmissionReviewDialog
        submission={selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        onUpdate={fetchData}
      />
    </div>
  );
}
