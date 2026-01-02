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
  Play
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const stats = [
  { label: "Total Earned", value: "2,450", icon: Coins, change: "+12.5%", trend: "up" },
  { label: "Tasks Completed", value: "127", icon: CheckCircle, change: "+8", trend: "up" },
  { label: "Pending Tasks", value: "3", icon: Clock, change: "Review", trend: "neutral" },
  { label: "Success Rate", value: "98.4%", icon: TrendingUp, change: "+2.1%", trend: "up" },
];

const availableTasks = [
  {
    id: 1,
    username: "@fashionista_nyc",
    avatar: "bg-gradient-to-br from-pink-500 to-orange-400",
    type: "like",
    typeIcon: Heart,
    points: 25,
    description: "Like my latest dance video",
    remaining: 45,
  },
  {
    id: 2,
    username: "@techreviewer",
    avatar: "bg-gradient-to-br from-blue-500 to-cyan-400",
    type: "comment",
    typeIcon: MessageCircle,
    points: 50,
    description: "Leave a thoughtful comment on my review",
    remaining: 23,
  },
  {
    id: 3,
    username: "@foodie_adventures",
    avatar: "bg-gradient-to-br from-green-500 to-emerald-400",
    type: "save",
    typeIcon: Bookmark,
    points: 35,
    description: "Save my recipe video for later",
    remaining: 67,
  },
  {
    id: 4,
    username: "@fitness_pro",
    avatar: "bg-gradient-to-br from-purple-500 to-pink-400",
    type: "watch",
    typeIcon: Play,
    points: 40,
    description: "Watch my full workout video",
    remaining: 12,
  },
];

export function DashboardHome() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {availableTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Card variant="interactive" className="h-full">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-full ${task.avatar}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{task.username}</div>
                      <div className="text-xs text-muted-foreground">{task.remaining} left</div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {task.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <Badge variant="gradient" className="gap-1">
                      <Coins className="w-3 h-3" />
                      +{task.points}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                      <task.typeIcon className="w-4 h-4" />
                      {task.type}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
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
