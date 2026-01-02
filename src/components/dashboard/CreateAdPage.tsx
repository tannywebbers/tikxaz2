import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Link2,
  Upload,
  Heart,
  MessageCircle,
  Bookmark,
  Play,
  Coins,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const taskTypes = [
  { id: "like", label: "Like", icon: Heart, points: 25, color: "from-pink-500 to-red-500" },
  { id: "comment", label: "Comment", icon: MessageCircle, points: 50, color: "from-blue-500 to-cyan-500" },
  { id: "save", label: "Save", icon: Bookmark, points: 35, color: "from-yellow-500 to-orange-500" },
  { id: "watch", label: "Watch", icon: Play, points: 40, color: "from-purple-500 to-pink-500" },
];

export function CreateAdPage() {
  const [selectedType, setSelectedType] = useState("like");
  const [completions, setCompletions] = useState(100);
  
  const selectedTask = taskTypes.find(t => t.id === selectedType);
  const totalCost = selectedTask ? selectedTask.points * completions : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Create New Ad</h1>
          <p className="text-muted-foreground">
            Boost your TikTok content with authentic engagement from real users.
          </p>
        </div>
      </motion.div>

      {/* Task Type Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Select Task Type</CardTitle>
            <CardDescription>Choose what kind of engagement you want</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {taskTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedType === type.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center mb-3`}>
                    <type.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="font-medium">{type.label}</div>
                  <div className="text-sm text-muted-foreground">{type.points} pts each</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Post Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              TikTok Post Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="postLink">TikTok Post Link</Label>
              <Input 
                id="postLink" 
                placeholder="https://www.tiktok.com/@username/video/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Task Description</Label>
              <Textarea 
                id="description" 
                placeholder="Describe what users need to do..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Example Screenshot (Optional)</Label>
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Upload a screenshot showing how the completed task should look
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Completions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Number of Completions</CardTitle>
            <CardDescription>How many users should complete this task?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Input 
                type="number" 
                value={completions}
                onChange={(e) => setCompletions(parseInt(e.target.value) || 0)}
                min={10}
                max={10000}
                className="w-32"
              />
              <div className="flex-1">
                <input
                  type="range"
                  min={10}
                  max={1000}
                  value={completions}
                  onChange={(e) => setCompletions(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Cost Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card variant="elevated" className="border-primary/30">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">Total Cost</h3>
                <div className="flex items-baseline gap-2">
                  <Coins className="w-6 h-6 text-primary" />
                  <span className="text-4xl font-bold gradient-text">{totalCost.toLocaleString()}</span>
                  <span className="text-muted-foreground">TikPoints</span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4" />
                  {completions} completions × {selectedTask?.points} points each
                </div>
              </div>
              
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <Button variant="gradient" size="lg" className="w-full sm:w-auto">
                  <CheckCircle className="w-5 h-5" />
                  Create Ad
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Your balance: 2,450 TikPoints
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
