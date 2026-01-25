import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
  Pause,
  Play,
  BarChart3,
  TrendingUp,
  Users,
  Coins,
  Trash2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Ad {
  id: string;
  tiktok_post_url: string;
  task_type: string;
  points_per_task: number;
  required_completions: number;
  completed_count: number;
  is_active: boolean;
  created_at: string;
}

interface AdStats {
  pending: number;
  approved: number;
  rejected: number;
  totalSpent: number;
}

const taskTypeLabels: Record<string, string> = {
  like: "Like",
  comment: "Comment",
  save: "Save",
  follow: "Follow",
  combo_mini: "Combo Mini",
  combo_large: "Combo Large",
};

export function MyAdsPage() {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [ads, setAds] = useState<Ad[]>([]);
  const [adStats, setAdStats] = useState<Record<string, AdStats>>({});
  const [loading, setLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState<string | null>(null);
  const [deleteAd, setDeleteAd] = useState<Ad | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAds();
    }
  }, [user]);

  const fetchAds = async () => {
    try {
      setLoading(true);

      // Fetch user's ads
      const { data: adsData, error: adsError } = await supabase
        .from("ads")
        .select("*")
        .eq("creator_id", user?.id)
        .order("created_at", { ascending: false });

      if (adsError) throw adsError;
      setAds(adsData || []);

      // Fetch stats for each ad
      const statsMap: Record<string, AdStats> = {};
      for (const ad of adsData || []) {
        const { data: submissions } = await supabase
          .from("task_submissions")
          .select("status, points_awarded")
          .eq("ad_id", ad.id);

        const pending = submissions?.filter(s => s.status === "pending" || s.status === "needs_review").length || 0;
        const approved = submissions?.filter(s => s.status === "approved").length || 0;
        const rejected = submissions?.filter(s => s.status === "rejected").length || 0;
        const totalSpent = submissions?.reduce((sum, s) => sum + (s.points_awarded || 0), 0) || 0;

        statsMap[ad.id] = { pending, approved, rejected, totalSpent };
      }
      setAdStats(statsMap);
    } catch (error) {
      console.error("Error fetching ads:", error);
      toast({
        title: "Error",
        description: "Failed to load your ads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAdStatus = async (ad: Ad) => {
    try {
      const { error } = await supabase
        .from("ads")
        .update({ is_active: !ad.is_active })
        .eq("id", ad.id);

      if (error) throw error;

      setAds(prev =>
        prev.map(a => (a.id === ad.id ? { ...a, is_active: !a.is_active } : a))
      );

      toast({
        title: "Updated",
        description: `Ad ${!ad.is_active ? "activated" : "paused"} successfully`,
      });
    } catch (error) {
      console.error("Error toggling ad:", error);
      toast({
        title: "Error",
        description: "Failed to update ad status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAd = async () => {
    if (!deleteAd || !user) return;
    
    setIsDeleting(true);
    try {
      const stats = adStats[deleteAd.id] || { totalSpent: 0 };
      const totalBudget = deleteAd.required_completions * deleteAd.points_per_task;
      const refundAmount = totalBudget - stats.totalSpent;
      
      // Delete the ad
      const { error: deleteError } = await supabase
        .from("ads")
        .delete()
        .eq("id", deleteAd.id);
        
      if (deleteError) throw deleteError;
      
      // Refund remaining balance to user
      if (refundAmount > 0) {
        // Update user's points
        const { error: updateError } = await supabase.rpc("credit_purchase_points", {
          _user_id: user.id,
          _points: refundAmount,
          _amount_paid: 0,
          _reference: `refund_ad_${deleteAd.id}`
        });
        
        // If RPC fails (due to duplicate reference), try direct update
        if (updateError) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("tik_points")
            .eq("user_id", user.id)
            .single();
            
          if (profile) {
            await supabase
              .from("profiles")
              .update({ tik_points: profile.tik_points + refundAmount })
              .eq("user_id", user.id);
          }
        }
        
        // Refresh profile to update points display
        await refreshProfile();
        
        toast({
          title: "Ad Deleted",
          description: `${refundAmount} TikPoints have been refunded to your account.`,
        });
      } else {
        toast({
          title: "Ad Deleted",
          description: "Your ad has been deleted successfully.",
        });
      }
      
      setAds(prev => prev.filter(a => a.id !== deleteAd.id));
      setDeleteAd(null);
    } catch (error) {
      console.error("Error deleting ad:", error);
      toast({
        title: "Error",
        description: "Failed to delete ad",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getAdStatus = (ad: Ad) => {
    if (ad.completed_count >= ad.required_completions) return "completed";
    return ad.is_active ? "active" : "paused";
  };

  const calculateRefund = (ad: Ad) => {
    const stats = adStats[ad.id] || { totalSpent: 0 };
    const totalBudget = ad.required_completions * ad.points_per_task;
    return totalBudget - stats.totalSpent;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Ads</h1>
        <p className="text-muted-foreground">Manage and track your created ads</p>
      </div>

      {ads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Ads Created Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first ad to start getting engagement on your TikTok content.
            </p>
            <Button variant="gradient" onClick={() => window.location.href = "/dashboard/create-ad"}>
              Create Your First Ad
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {ads.map((ad, index) => {
            const stats = adStats[ad.id] || { pending: 0, approved: 0, rejected: 0, totalSpent: 0 };
            const status = getAdStatus(ad);
            const progress = (ad.completed_count / ad.required_completions) * 100;
            const remaining = ad.required_completions - ad.completed_count;
            const refundAmount = calculateRefund(ad);

            return (
              <motion.div
                key={ad.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Ad Info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge variant={
                            status === "completed" ? "success" :
                            status === "active" ? "default" : "secondary"
                          }>
                            {status === "completed" ? "Completed" :
                             status === "active" ? "Active" : "Paused"}
                          </Badge>
                          <Badge variant="outline">
                            {taskTypeLabels[ad.task_type] || ad.task_type}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <Coins className="w-3 h-3" />
                            {ad.points_per_task} pts/task
                          </Badge>
                        </div>

                        <a
                          href={ad.tiktok_post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline truncate"
                        >
                          <ExternalLink className="w-4 h-4 shrink-0" />
                          <span className="truncate">{ad.tiktok_post_url}</span>
                        </a>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">
                              {ad.completed_count} / {ad.required_completions}
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {remaining > 0 ? `${remaining} more to go` : "Target reached!"}
                          </p>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 lg:w-48">
                        <div className="p-3 rounded-lg bg-muted text-center">
                          <div className="flex items-center justify-center gap-1 text-warning mb-1">
                            <Clock className="w-4 h-4" />
                          </div>
                          <p className="text-lg font-bold">{stats.pending}</p>
                          <p className="text-xs text-muted-foreground">Pending</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted text-center">
                          <div className="flex items-center justify-center gap-1 text-success mb-1">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <p className="text-lg font-bold">{stats.approved}</p>
                          <p className="text-xs text-muted-foreground">Approved</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted text-center">
                          <div className="flex items-center justify-center gap-1 text-destructive mb-1">
                            <Users className="w-4 h-4" />
                          </div>
                          <p className="text-lg font-bold">{stats.rejected}</p>
                          <p className="text-xs text-muted-foreground">Rejected</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted text-center">
                          <div className="flex items-center justify-center gap-1 text-primary mb-1">
                            <Coins className="w-4 h-4" />
                          </div>
                          <p className="text-lg font-bold">{stats.totalSpent}</p>
                          <p className="text-xs text-muted-foreground">Spent</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex lg:flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAdStatus(ad)}
                          disabled={status === "completed"}
                        >
                          {ad.is_active ? (
                            <>
                              <Pause className="w-4 h-4 mr-1" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAd(selectedAd === ad.id ? null : ad.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteAd(ad)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {selectedAd === ad.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="mt-4 pt-4 border-t border-border"
                      >
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Created</p>
                            <p className="font-medium">{format(new Date(ad.created_at), "MMM d, yyyy")}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Task Type</p>
                            <p className="font-medium">{taskTypeLabels[ad.task_type]}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Points Per Task</p>
                            <p className="font-medium">{ad.points_per_task} TikPoints</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Refund if Deleted</p>
                            <p className="font-medium text-primary">{refundAmount} TikPoints</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteAd} onOpenChange={(open) => !open && setDeleteAd(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this Ad?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteAd && (
                <>
                  This will permanently delete this ad and all associated submissions.
                  {calculateRefund(deleteAd) > 0 && (
                    <span className="block mt-2 text-primary font-medium">
                      You will be refunded {calculateRefund(deleteAd)} TikPoints for unused completions.
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAd}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete Ad
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
