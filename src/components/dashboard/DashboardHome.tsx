import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Coins, 
  TrendingUp, 
  CheckCircle, 
  Clock,
  ArrowUpRight,
  Heart,
  MessageCircle,
  Bookmark,
  Play,
  Users,
  Loader2,
  Layers,
  ExternalLink
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const taskTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  like: { icon: Heart, color: "text-red-500", label: "Like" },
  comment: { icon: MessageCircle, color: "text-blue-500", label: "Comment" },
  save: { icon: Bookmark, color: "text-yellow-500", label: "Save" },
  watch: { icon: Play, color: "text-green-500", label: "Watch" },
  follow: { icon: Users, color: "text-purple-500", label: "Follow" },
  combo_mini: { icon: Layers, color: "text-pink-500", label: "Combo Mini" },
  combo_large: { icon: Layers, color: "text-primary", label: "Combo Large" },
};

interface DashboardStats {
  totalEarned: number;
  tasksCompleted: number;
  pendingTasks: number;
  successRate: number;
  monthlyChange: number;
}

interface AvailableTask {
  id: string;
  task_type: string;
  points_per_task: number;
  remaining: number;
  tiktok_post_url: string;
  video_description: string | null;
  created_at: string;
}

export function DashboardHome() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [availableTasks, setAvailableTasks] = useState<AvailableTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<AvailableTask | null>(null);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);

      // Fetch user's task submissions to calculate stats
      const { data: submissions, error: submissionsError } = await supabase
        .from("task_submissions")
        .select("*, ads(points_per_task)")
        .eq("user_id", user.id);

      if (submissionsError) throw submissionsError;

      // Get completed ad IDs to filter available tasks
      const completedAdIds = new Set(submissions?.map(s => s.ad_id) || []);

      // Calculate stats from real data
      const approved = submissions?.filter(s => s.status === "approved") || [];
      const pending = submissions?.filter(s => s.status === "pending" || s.status === "needs_review") || [];
      const total = submissions?.length || 0;

      const totalEarned = approved.reduce((sum, s) => sum + (s.points_awarded || 0), 0);
      const successRate = total > 0 ? Math.round((approved.length / total) * 100 * 10) / 10 : 100;

      // Get last month's earnings for comparison
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const thisMonthEarned = approved
        .filter(s => new Date(s.created_at) >= thisMonth)
        .reduce((sum, s) => sum + (s.points_awarded || 0), 0);
      
      const lastMonthEarned = approved
        .filter(s => new Date(s.created_at) >= lastMonth && new Date(s.created_at) < thisMonth)
        .reduce((sum, s) => sum + (s.points_awarded || 0), 0);
      
      const monthlyChange = lastMonthEarned > 0 
        ? Math.round(((thisMonthEarned - lastMonthEarned) / lastMonthEarned) * 100 * 10) / 10
        : thisMonthEarned > 0 ? 100 : 0;

      setStats({
        totalEarned,
        tasksCompleted: approved.length,
        pendingTasks: pending.length,
        successRate,
        monthlyChange
      });

      // Fetch available tasks (ads) - excluding completed ones
      const { data: ads, error: adsError } = await supabase
        .from("ads")
        .select("*")
        .eq("is_active", true)
        .neq("creator_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (adsError) throw adsError;

      const tasksWithRemaining = (ads || [])
        .filter(ad => 
          ad.completed_count < ad.required_completions && 
          !completedAdIds.has(ad.id)
        )
        .slice(0, 4)
        .map(ad => ({
          id: ad.id,
          task_type: ad.task_type,
          points_per_task: ad.points_per_task,
          remaining: ad.required_completions - ad.completed_count,
          tiktok_post_url: ad.tiktok_post_url,
          video_description: ad.video_description,
          created_at: ad.created_at
        }));

      setAvailableTasks(tasksWithRemaining);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskClick = (task: AvailableTask) => {
    setSelectedTask(task);
  };

  const goToTaskBrowser = () => {
    setSelectedTask(null);
    navigate("/dashboard/tasks");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const statsData = [
    { 
      label: "Total Earned", 
      value: stats?.totalEarned.toLocaleString() || "0", 
      icon: Coins, 
      change: stats?.monthlyChange ? `${stats.monthlyChange > 0 ? "+" : ""}${stats.monthlyChange}%` : "0%", 
      trend: (stats?.monthlyChange || 0) >= 0 ? "up" : "down" 
    },
    { 
      label: "Tasks Completed", 
      value: stats?.tasksCompleted.toString() || "0", 
      icon: CheckCircle, 
      change: `+${stats?.tasksCompleted || 0}`, 
      trend: "up" 
    },
    { 
      label: "Pending Tasks", 
      value: stats?.pendingTasks.toString() || "0", 
      icon: Clock, 
      change: "Review", 
      trend: "neutral" 
    },
    { 
      label: "Success Rate", 
      value: `${stats?.successRate || 100}%`, 
      icon: TrendingUp, 
      change: stats?.successRate && stats.successRate >= 90 ? "Excellent" : "Good", 
      trend: (stats?.successRate || 100) >= 90 ? "up" : "neutral" 
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card variant="interactive">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <Badge 
                    variant={stat.trend === "up" ? "success" : "secondary"}
                    className="text-xs"
                  >
                    {stat.change}
                  </Badge>
                </div>
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Available Tasks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Available Tasks</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/tasks">
              View All
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>

        {availableTasks.length === 0 ? (
          <Card variant="glass" className="py-8">
            <CardContent className="text-center">
              <p className="text-muted-foreground">No tasks available at the moment.</p>
              <p className="text-sm text-muted-foreground mt-1">Check back later!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {availableTasks.map((task, index) => {
              const config = taskTypeConfig[task.task_type] || taskTypeConfig.like;
              const Icon = config.icon;
              
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                >
                  <Card 
                    variant="interactive" 
                    className="h-full cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => handleTaskClick(task)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-xl ${config.color.replace('text-', 'bg-')}/10 flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{config.label} Task</div>
                          <div className="text-xs text-muted-foreground">{task.remaining} spots left</div>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {task.video_description || `Complete this ${config.label.toLowerCase()} task to earn points`}
                      </p>

                      <div className="flex items-center justify-between">
                        <Badge variant="gradient" className="gap-1">
                          <Coins className="w-3 h-3" />
                          +{task.points_per_task}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Click to start
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Preview Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTask && (
                <>
                  {(() => {
                    const config = taskTypeConfig[selectedTask.task_type] || taskTypeConfig.like;
                    const Icon = config.icon;
                    return <Icon className={`w-5 h-5 ${config.color}`} />;
                  })()}
                  {taskTypeConfig[selectedTask?.task_type || "like"]?.label || "Task"} Task
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Complete this task to earn {selectedTask?.points_per_task} TikPoints
            </DialogDescription>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm">
                  {selectedTask.video_description || `Complete this ${selectedTask.task_type.replace("_", " ")} task`}
                </p>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Reward</span>
                <Badge variant="gradient" className="gap-1">
                  <Coins className="w-3 h-3" />
                  +{selectedTask.points_per_task} TikPoints
                </Badge>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Spots remaining</span>
                <span className="font-medium">{selectedTask.remaining}</span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => window.open(selectedTask.tiktok_post_url, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on TikTok
                </Button>
                <Button 
                  variant="gradient" 
                  className="flex-1"
                  onClick={goToTaskBrowser}
                >
                  Start Task
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card variant="elevated" className="bg-gradient-to-br from-primary/20 to-purple-500/20 border-primary/30">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-2">Start Earning</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Browse available tasks and earn TikPoints by completing them.
            </p>
            <Button variant="gradient" asChild>
              <Link to="/dashboard/tasks">Browse Tasks</Link>
            </Button>
          </CardContent>
        </Card>

        <Card variant="elevated" className="bg-gradient-to-br from-accent/20 to-cyan-400/20 border-accent/30">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-2">Boost Your Content</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create an ad to get authentic engagement on your TikTok posts.
            </p>
            <Button variant="outline" asChild>
              <Link to="/dashboard/create-ad">Create Ad</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
