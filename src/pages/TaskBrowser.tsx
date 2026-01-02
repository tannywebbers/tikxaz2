import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Play,
  Filter,
  Coins,
  ExternalLink,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

type TaskType = "like" | "comment" | "save" | "watch" | "all";

interface Ad {
  id: string;
  creator_id: string;
  tiktok_post_url: string;
  task_type: "like" | "comment" | "save" | "watch";
  required_completions: number;
  completed_count: number;
  points_per_task: number;
  screenshot_example_url: string | null;
  created_at: string;
}

const taskTypeConfig = {
  like: { icon: Heart, label: "Like", color: "text-red-500", bgColor: "bg-red-500/10" },
  comment: { icon: MessageCircle, label: "Comment", color: "text-blue-500", bgColor: "bg-blue-500/10" },
  save: { icon: Bookmark, label: "Save", color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  watch: { icon: Play, label: "Watch", color: "text-green-500", bgColor: "bg-green-500/10" },
};

export default function TaskBrowser() {
  const [tasks, setTasks] = useState<Ad[]>([]);
  const [filter, setFilter] = useState<TaskType>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Ad | null>(null);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    status: "success" | "error" | "pending";
    message: string;
  } | null>(null);
  
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("ads")
        .select("*")
        .eq("is_active", true)
        .gt("required_completions", 0);

      if (filter !== "all") {
        query = query.eq("task_type", filter);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      // Filter out own ads and completed tasks
      const filteredTasks = (data || []).filter(
        (task: any) => task.creator_id !== user?.id && 
        task.completed_count < task.required_completions
      );

      setTasks(filteredTasks as Ad[]);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load tasks. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + screenshots.length > 3) {
      toast({
        variant: "destructive",
        title: "Too many files",
        description: "You can upload a maximum of 3 screenshots.",
      });
      return;
    }
    setScreenshots([...screenshots, ...files]);
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(screenshots.filter((_, i) => i !== index));
  };

  const submitTask = async () => {
    if (!selectedTask || screenshots.length === 0 || !user) return;

    setIsSubmitting(true);
    setVerificationResult({ status: "pending", message: "Analyzing your screenshots with AI..." });

    try {
      // Upload screenshots to storage first
      const screenshotUrls: string[] = [];
      
      for (const file of screenshots) {
        const fileName = `${user.id}/${selectedTask.id}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("screenshots")
          .upload(fileName, file);

        if (uploadError) {
          // If bucket doesn't exist, try to continue without storage
          console.error("Upload error:", uploadError);
          // Convert to base64 for AI analysis
          const base64 = await fileToBase64(file);
          screenshotUrls.push(base64);
        } else {
          const { data: urlData } = supabase.storage
            .from("screenshots")
            .getPublicUrl(fileName);
          screenshotUrls.push(urlData.publicUrl);
        }
      }

      // Call AI verification edge function
      const { data: verifyResult, error: verifyError } = await supabase.functions.invoke(
        "verify-screenshot",
        {
          body: {
            adId: selectedTask.id,
            userId: user.id,
            taskType: selectedTask.task_type,
            tiktokUsername: profile?.tiktok_username,
            screenshots: screenshotUrls,
          },
        }
      );

      if (verifyError) {
        throw verifyError;
      }

      if (verifyResult.approved) {
        setVerificationResult({
          status: "success",
          message: `Task verified! You earned ${selectedTask.points_per_task} TikPoints.`,
        });
        
        // Refresh profile to update points
        await refreshProfile();
        
        // Close modal after delay
        setTimeout(() => {
          setSelectedTask(null);
          setScreenshots([]);
          setVerificationResult(null);
          fetchTasks();
        }, 2000);
      } else {
        setVerificationResult({
          status: "error",
          message: verifyResult.reason || "Verification failed. Please ensure your screenshots are correct.",
        });
      }
    } catch (error) {
      console.error("Submission error:", error);
      setVerificationResult({
        status: "error",
        message: "Failed to verify task. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const TaskIcon = ({ type }: { type: keyof typeof taskTypeConfig }) => {
    const config = taskTypeConfig[type];
    const Icon = config.icon;
    return (
      <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Browse Tasks</h1>
          <p className="text-muted-foreground">Complete tasks to earn TikPoints</p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filter} onValueChange={(v) => setFilter(v as TaskType)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="like">
                <span className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" /> Like
                </span>
              </SelectItem>
              <SelectItem value="comment">
                <span className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-blue-500" /> Comment
                </span>
              </SelectItem>
              <SelectItem value="save">
                <span className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-yellow-500" /> Save
                </span>
              </SelectItem>
              <SelectItem value="watch">
                <span className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-green-500" /> Watch
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Task Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : tasks.length === 0 ? (
        <Card variant="glass" className="py-12">
          <CardContent className="text-center">
            <p className="text-muted-foreground">No tasks available at the moment.</p>
            <p className="text-sm text-muted-foreground mt-2">Check back later for new opportunities!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {tasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card variant="interactive" className="h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent" />
                        <div>
                          <p className="font-medium">TikTok Task</p>
                          <p className="text-xs text-muted-foreground">
                            {task.required_completions - task.completed_count} spots left
                          </p>
                        </div>
                      </div>
                      <TaskIcon type={task.task_type} />
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="gradient" className="gap-1">
                        <Coins className="w-3 h-3" />
                        +{task.points_per_task} pts
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {taskTypeConfig[task.task_type].label}
                      </Badge>
                    </div>

                    <Button
                      variant="gradient"
                      className="w-full"
                      onClick={() => setSelectedTask(task)}
                    >
                      Start Task
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Task Modal */}
      <Dialog open={!!selectedTask} onOpenChange={() => {
        setSelectedTask(null);
        setScreenshots([]);
        setVerificationResult(null);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Complete {selectedTask && taskTypeConfig[selectedTask.task_type].label} Task
            </DialogTitle>
            <DialogDescription>
              Follow the steps below to complete this task and earn TikPoints.
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-6">
              {/* Step 1 */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
                  Open the TikTok post
                </h4>
                <Button variant="outline" className="w-full gap-2" asChild>
                  <a href={selectedTask.tiktok_post_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    Open on TikTok
                  </a>
                </Button>
              </div>

              {/* Step 2 */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
                  Complete the {taskTypeConfig[selectedTask.task_type].label.toLowerCase()} action
                </h4>
                <p className="text-sm text-muted-foreground">
                  {selectedTask.task_type === "like" && "Tap the heart icon to like the video (heart should turn red)."}
                  {selectedTask.task_type === "comment" && `Leave a comment using your TikTok username (@${profile?.tiktok_username}).`}
                  {selectedTask.task_type === "save" && "Tap the bookmark icon to save the video (should turn yellow)."}
                  {selectedTask.task_type === "watch" && "Watch the entire video from start to finish."}
                </p>
              </div>

              {/* Step 3 */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">3</span>
                  Upload proof screenshots (max 3)
                </h4>

                <div className="flex flex-wrap gap-2">
                  {screenshots.map((file, index) => (
                    <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeScreenshot(index)}
                        className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {screenshots.length < 3 && (
                    <Label className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-1">Add</span>
                      <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </Label>
                  )}
                </div>
              </div>

              {/* Verification Result */}
              {verificationResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-lg flex items-start gap-3 ${
                    verificationResult.status === "success" 
                      ? "bg-success/10 text-success" 
                      : verificationResult.status === "error"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted"
                  }`}
                >
                  {verificationResult.status === "success" && <CheckCircle className="w-5 h-5 mt-0.5" />}
                  {verificationResult.status === "error" && <AlertCircle className="w-5 h-5 mt-0.5" />}
                  {verificationResult.status === "pending" && <Loader2 className="w-5 h-5 mt-0.5 animate-spin" />}
                  <p className="text-sm">{verificationResult.message}</p>
                </motion.div>
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="gradient" className="gap-1">
                    <Coins className="w-3 h-3" />
                    +{selectedTask.points_per_task} pts
                  </Badge>
                </div>
                <Button
                  variant="gradient"
                  onClick={submitTask}
                  disabled={screenshots.length === 0 || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Submit for Verification"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
