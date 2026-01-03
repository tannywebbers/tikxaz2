import { useState, useEffect } from "react";
import { 
  FileCheck,
  Search,
  Eye,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const { data: submissionsData } = await supabase
        .from("task_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: adsData } = await supabase.from("ads").select("id, task_type, points_per_task");
      const { data: profilesData } = await supabase.from("profiles").select("user_id, tiktok_username, tiktok_name, email");

      const enrichedSubmissions = (submissionsData || []).map(sub => ({
        ...sub,
        profiles: profilesData?.find(p => p.user_id === sub.user_id),
        ads: adsData?.find(a => a.id === sub.ad_id),
      }));

      setSubmissions(enrichedSubmissions as Submission[]);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load submissions." });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = 
      sub.profiles?.tiktok_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.profiles?.tiktok_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
      like: "bg-red-500/10 text-red-400",
      comment: "bg-blue-500/10 text-blue-400",
      save: "bg-yellow-500/10 text-yellow-400",
      follow: "bg-purple-500/10 text-purple-400",
      combo_mini: "bg-gradient-to-r from-red-500/10 via-blue-500/10 to-yellow-500/10 text-neutral-100",
      combo_large: "bg-gradient-to-r from-red-500/10 via-blue-500/10 via-yellow-500/10 to-purple-500/10 text-neutral-100",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${colors[type] || "bg-neutral-700"}`}>
        {type.replace("_", " ")}
      </span>
    );
  };

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
          <h1 className="text-2xl font-semibold text-neutral-100">Submissions</h1>
          <p className="text-sm text-neutral-500 mt-1">{submissions.length} total submissions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              placeholder="Search..."
              className="pl-10 w-48 bg-neutral-800 border-neutral-700 text-neutral-100"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-neutral-800 border-neutral-700 text-neutral-100">
              <Filter className="w-4 h-4 mr-2 text-neutral-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-neutral-800 border-neutral-700">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="needs_review">Needs Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-800 hover:bg-transparent">
              <TableHead className="text-neutral-400">User</TableHead>
              <TableHead className="text-neutral-400">Task Type</TableHead>
              <TableHead className="text-neutral-400">Status</TableHead>
              <TableHead className="text-neutral-400">AI Confidence</TableHead>
              <TableHead className="text-neutral-400">Points</TableHead>
              <TableHead className="text-neutral-400">Date</TableHead>
              <TableHead className="text-neutral-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubmissions.map(sub => (
              <TableRow key={sub.id} className="border-neutral-800 hover:bg-neutral-800/50">
                <TableCell>
                  <div>
                    <div className="font-medium text-neutral-100">
                      {sub.profiles?.tiktok_name || `@${sub.profiles?.tiktok_username}`}
                    </div>
                    <div className="text-xs text-neutral-500">{sub.profiles?.email}</div>
                  </div>
                </TableCell>
                <TableCell>{taskTypeBadge(sub.ads?.task_type || "unknown")}</TableCell>
                <TableCell>{statusBadge(sub.status)}</TableCell>
                <TableCell className="text-neutral-400">
                  {sub.ai_analysis?.confidence ? `${sub.ai_analysis.confidence}%` : "-"}
                </TableCell>
                <TableCell className="text-neutral-300">{sub.points_awarded || "-"}</TableCell>
                <TableCell className="text-neutral-500">
                  {new Date(sub.created_at).toLocaleDateString()}
                </TableCell>
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
      </div>

      <SubmissionReviewDialog
        submission={selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        onUpdate={fetchSubmissions}
      />
    </div>
  );
}
