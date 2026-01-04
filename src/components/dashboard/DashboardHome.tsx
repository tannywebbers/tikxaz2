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
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const taskTypeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  like: { icon: Heart, color: "text-red-500" },
  comment: { icon: MessageCircle, color: "text-blue-500" },
  save: { icon: Bookmark, color: "text-yellow-500" },
  watch: { icon: Play, color: "text-green-500" },
  follow: { icon: Users, color: "text-purple-500" },
  combo_mini: { icon: Heart, color: "text-pink-500" },
  combo_large: { icon: Heart, color: "text-primary" },
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
}

export function DashboardHome() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [availableTasks, setAvailableTasks] = useState<AvailableTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

      // Calculate stats from real data
      const approved = submissions?.filter(s => s.status === "approved") || [];
      const pending = submissions?.filter(s => s.status === "pending" || s.status === "needs_review") || [];
      const rejected = submissions?.filter(s => s.status === "rejected") || [];
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

      // Fetch available tasks (ads)
      const { data: ads, error: adsError } = await supabase
        .from("ads")
        .select("*")
        .eq("is_active", true)
        .neq("creator_id", user.id)
        .order("created_at", { ascending: false })
        .limit(4);

      if (adsError) throw adsError;

      const tasksWithRemaining = (ads || [])
        .filter(ad => ad.completed_count < ad.required_completions)
        .map(ad => ({
          id: ad.id,
          task_type: ad.task_type,
          points_per_task: ad.points_per_task,
          remaining: ad.required_completions - ad.completed_count,
          tiktok_post_url: ad.tiktok_post_url
        }));

      setAvailableTasks(tasksWithRemaining);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
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
                  <Card variant="interactive" className="h-full">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate capitalize">{task.task_type.replace("_", " ")} Task</div>
                          <div className="text-xs text-muted-foreground">{task.remaining} spots left</div>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        Complete this {task.task_type.replace("_", " ")} task to earn points
                      </p>

                      <div className="flex items-center justify-between">
                        <Badge variant="gradient" className="gap-1">
                          <Coins className="w-3 h-3" />
                          +{task.points_per_task}
                        </Badge>
                        <div className={`flex items-center gap-1 text-xs capitalize ${config.color}`}>
                          <Icon className="w-4 h-4" />
                          {task.task_type.replace("_", " ")}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

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
