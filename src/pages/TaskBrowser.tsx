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
  Loader2,
  Users,
  Layers,
  ArrowUpDown,
  Clock,
  TrendingUp,
  Award,
  Zap,
  Copy,
  Check
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
import { NativeAdCard } from "@/components/ads/NativeAdCard";

type TaskType = "like" | "comment" | "save" | "watch" | "follow" | "combo_mini" | "combo_large" | "all";
type SortOption = "recent" | "trending" | "highest_reward" | "lowest_effort";

interface Ad {
  id: string;
  creator_id: string;
  tiktok_post_url: string;
  task_type: string;
  required_completions: number;
  completed_count: number;
  points_per_task: number;
  screenshot_example_url: string | null;
  video_description: string | null;
  created_at: string;
}

const taskTypeConfig: Record<string, { icon: React.ElementType; label: string; color: string; bgColor: string }> = {
  like: { icon: Heart, label: "Like", color: "text-red-500", bgColor: "bg-red-500/10" },
  comment: { icon: MessageCircle, label: "Comment", color: "text-blue-500", bgColor: "bg-blue-500/10" },
  save: { icon: Bookmark, label: "Save", color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  watch: { icon: Play, label: "Watch", color: "text-green-500", bgColor: "bg-green-500/10" },
  follow: { icon: Users, label: "Follow", color: "text-purple-500", bgColor: "bg-purple-500/10" },
  combo_mini: { icon: Layers, label: "Combo Mini", color: "text-pink-500", bgColor: "bg-pink-500/10" },
  combo_large: { icon: Layers, label: "Combo Large", color: "text-primary", bgColor: "bg-primary/10" },
};

const sortOptions: Record<SortOption, { label: string; icon: React.ElementType }> = {
  recent: { label: "Recently Added", icon: Clock },
  trending: { label: "Trending", icon: TrendingUp },
  highest_reward: { label: "Highest Reward", icon: Award },
  lowest_effort: { label: "Lowest Effort", icon: Zap },
};

export default function TaskBrowser() {
  const [tasks, setTasks] = useState<Ad[]>([]);
  const [filter, setFilter] = useState<TaskType>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Ad | null>(null);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    status: "success" | "error" | "pending";
    message: string;
  } | null>(null);
  
  // Comment task state
  const [generatedComment, setGeneratedComment] = useState<string | null>(null);
  const [isGeneratingComment, setIsGeneratingComment] = useState(false);
  const [commentCopied, setCommentCopied] = useState(false);
  
  // Follow task state
  const [isVerifyingFollow, setIsVerifyingFollow] = useState(false);
  const [advertiserUsername, setAdvertiserUsername] = useState<string | null>(null);
  
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, [filter, sortBy]);

  // Reset state when task changes
  useEffect(() => {
    if (selectedTask) {
      setGeneratedComment(null);
      setCommentCopied(false);
      setScreenshots([]);
      setVerificationResult(null);
      setAdvertiserUsername(null);
      
      // For follow tasks, get advertiser username
      if (selectedTask.task_type === "follow" || selectedTask.task_type === "combo_large") {
        fetchAdvertiserUsername(selectedTask.creator_id);
      }
    }
  }, [selectedTask?.id]);

  const fetchAdvertiserUsername = async (creatorId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("tiktok_username")
      .eq("user_id", creatorId)
      .single();
    
    if (data) {
      setAdvertiserUsername(data.tiktok_username);
    }
  };

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      // Get ONLY approved submissions - rejected ones should allow retry
      const { data: approvedSubmissions } = await supabase
        .from("task_submissions")
        .select("ad_id")
        .eq("user_id", user?.id)
        .eq("status", "approved");
      
      const approvedAdIds = new Set(approvedSubmissions?.map(s => s.ad_id) || []);

      let query = supabase
        .from("ads")
        .select("*")
        .eq("is_active", true);

      if (filter !== "all") {
        query = query.eq("task_type", filter);
      }

      switch (sortBy) {
        case "recent":
          query = query.order("created_at", { ascending: false });
          break;
        case "trending":
          query = query.order("completed_count", { ascending: false });
          break;
        case "highest_reward":
          query = query.order("points_per_task", { ascending: false });
          break;
        case "lowest_effort":
          query = query.order("points_per_task", { ascending: true });
          break;
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter out:
      // 1. Tasks created by the user
      // 2. Tasks that are fully completed (hit target)
      // 3. Tasks the user has already APPROVED (not rejected - they can retry those)
      let filteredTasks = (data || []).filter(
        (task: any) => 
          task.creator_id !== user?.id && 
          task.completed_count < task.required_completions &&
          !approvedAdIds.has(task.id)
      );

      if (sortBy === "lowest_effort") {
        const effortOrder: Record<string, number> = {
          like: 1, watch: 2, save: 3, comment: 4, follow: 5, combo_mini: 6, combo_large: 7
        };
        filteredTasks.sort((a: any, b: any) => (effortOrder[a.task_type] || 99) - (effortOrder[b.task_type] || 99));
      }

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

  const getMaxScreenshots = (taskType: string) => {
    // No screenshots for follow-only tasks
    if (taskType === "follow") return 0;
    if (taskType === "combo_large") return 4;
    return 3;
  };

  const requiresScreenshot = (taskType: string) => {
    // Follow tasks don't need screenshots - we scrape to verify
    return taskType !== "follow";
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxScreenshots = selectedTask ? getMaxScreenshots(selectedTask.task_type) : 3;
    
    if (files.length + screenshots.length > maxScreenshots) {
      toast({
        variant: "destructive",
        title: "Too many files",
        description: `You can upload a maximum of ${maxScreenshots} screenshots for this task.`,
      });
      return;
    }
    setScreenshots([...screenshots, ...files]);
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(screenshots.filter((_, i) => i !== index));
  };

  // Generate AI comment for comment tasks
  const generateComment = async () => {
    if (!selectedTask || !user) return;
    
    setIsGeneratingComment(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-screenshot", {
        body: {
          action: "generate_comment",
          adId: selectedTask.id,
          userId: user.id,
        },
      });

      if (error) throw error;

      if (data?.comment) {
        setGeneratedComment(data.comment);
        toast({
          title: "Comment Generated",
          description: "Copy the comment and post it on TikTok.",
        });
      }
    } catch (error) {
      console.error("Error generating comment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate comment. Please try again.",
      });
    } finally {
      setIsGeneratingComment(false);
    }
  };

  const copyComment = async () => {
    if (!generatedComment) return;
    
    await navigator.clipboard.writeText(generatedComment);
    setCommentCopied(true);
    toast({ title: "Copied!", description: "Comment copied to clipboard." });
    
    setTimeout(() => setCommentCopied(false), 3000);
  };

  // Verify follow task via scraping (no screenshot needed)
  const verifyFollowTask = async () => {
    if (!selectedTask || !user || !profile || !advertiserUsername) return;

    setIsVerifyingFollow(true);
    setVerificationResult({ status: "pending", message: "Checking if you follow the user..." });

    try {
      const { data, error } = await supabase.functions.invoke("verify-follow", {
        body: {
          action: "verify_follow_scrape",
          adId: selectedTask.id,
          userId: user.id,
          advertiserUsername: advertiserUsername,
          performerUsername: profile.tiktok_username,
        },
      });

      if (error) throw error;

      if (data?.verified) {
        setVerificationResult({
          status: "success",
          message: `Follow verified! You earned ${selectedTask.points_per_task} TikPoints. A re-check will occur in 5 minutes.`,
        });
        
        await refreshProfile();
        
        setTimeout(() => {
          setSelectedTask(null);
          setScreenshots([]);
          setVerificationResult(null);
          fetchTasks();
        }, 3000);
      } else {
        setVerificationResult({
          status: "error",
          message: data?.reason || "Could not verify that you follow this user. Please make sure you're following them and try again.",
        });
      }
    } catch (error) {
      console.error("Follow verification error:", error);
      setVerificationResult({
        status: "error",
        message: "Failed to verify follow. Please try again.",
      });
    } finally {
      setIsVerifyingFollow(false);
    }
  };

  // Submit task with screenshot (for like, save, comment, combo tasks)
  const submitTask = async () => {
    if (!selectedTask || !user) return;
    
    // For follow-only tasks, use different verification
    if (selectedTask.task_type === "follow") {
      await verifyFollowTask();
      return;
    }

    if (screenshots.length === 0) {
      toast({
        variant: "destructive",
        title: "Screenshots required",
        description: "Please upload screenshots to verify your task.",
      });
      return;
    }

    setIsSubmitting(true);
    setVerificationResult({ status: "pending", message: "Analyzing your screenshots with AI..." });

    try {
      const screenshotUrls: string[] = [];
      
      for (const file of screenshots) {
        const fileName = `${user.id}/${selectedTask.id}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("screenshots")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          const base64 = await fileToBase64(file);
          screenshotUrls.push(base64);
        } else {
          const { data: urlData } = supabase.storage
            .from("screenshots")
            .getPublicUrl(fileName);
          screenshotUrls.push(urlData.publicUrl);
        }
      }

      // Fetch advertiser's display name for verification
      const { data: advertiserProfile } = await supabase
        .from("profiles")
        .select("tiktok_name, tiktok_username")
        .eq("user_id", selectedTask.creator_id)
        .single();

      const { data: verifyResult, error: verifyError } = await supabase.functions.invoke(
        "verify-screenshot",
        {
          body: {
            adId: selectedTask.id,
            userId: user.id,
            taskType: selectedTask.task_type,
            tiktokName: profile?.tiktok_name || profile?.tiktok_username,
            tiktokUsername: profile?.tiktok_username,
            screenshots: screenshotUrls,
            expectedComment: generatedComment,
            advertiserDisplayName: advertiserProfile?.tiktok_name || advertiserProfile?.tiktok_username,
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
        
        await refreshProfile();
        
        setTimeout(() => {
          setSelectedTask(null);
          setScreenshots([]);
          setVerificationResult(null);
          setGeneratedComment(null);
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

  const TaskIcon = ({ type }: { type: string }) => {
    const config = taskTypeConfig[type] || taskTypeConfig.like;
    const Icon = config.icon;
    return (
      <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
    );
  };

  const getTaskInstructions = (taskType: string) => {
    const instructions: Record<string, string[]> = {
      like: ["Tap the heart icon to like the video (heart should turn red)", "Take a screenshot showing the red heart"],
      comment: [
        "Generate your unique comment using the button below",
        "Copy the comment and post it on the video",
        "Take a screenshot showing your comment"
      ],
      save: ["Tap the bookmark icon to save the video (should turn yellow)", "Take a screenshot showing the yellow bookmark"],
      watch: ["Watch the entire video from start to finish", "Take a screenshot at the end of the video"],
      follow: [
        "Open the creator's profile from the link",
        `Follow @${advertiserUsername || "the creator"}`,
        "Click 'Verify Follow' below - we'll check automatically"
      ],
      combo_mini: [
        "Like the video (heart turns red)",
        "Generate and post the AI comment",
        "Save the video (bookmark turns yellow)",
        "Take screenshots of each action"
      ],
      combo_large: [
        "Like the video (heart turns red)",
        "Generate and post the AI comment",
        "Save the video (bookmark turns yellow)",
        `Follow @${advertiserUsername || "the creator"}`,
        "Take screenshots of each action"
      ]
    };
    return instructions[taskType] || [];
  };

  const resetFilters = () => {
    setFilter("all");
    setSortBy("recent");
  };

  const isCommentTask = selectedTask?.task_type === "comment" || 
                        selectedTask?.task_type === "combo_mini" || 
                        selectedTask?.task_type === "combo_large";

  const isFollowOnlyTask = selectedTask?.task_type === "follow";

  const canSubmit = () => {
    if (!selectedTask) return false;
    
    // Follow-only tasks just need the verify button
    if (isFollowOnlyTask) return true;
    
    // Comment tasks need generated comment AND screenshots
    if (isCommentTask && !generatedComment) return false;
    
    return screenshots.length > 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Browse Tasks</h1>
          <p className="text-muted-foreground">Complete tasks to earn TikPoints</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
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
                <SelectItem value="follow">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-500" /> Follow
                  </span>
                </SelectItem>
                <SelectItem value="combo_mini">
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-pink-500" /> Combo Mini
                  </span>
                </SelectItem>
                <SelectItem value="combo_large">
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" /> Combo Large
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(sortOptions).map(([key, { label, icon: Icon }]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <Icon className="w-4 h-4" /> {label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(filter !== "all" || sortBy !== "recent") && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="w-4 h-4 mr-1" /> Reset
            </Button>
          )}
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
              <>
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
                            <p className="font-medium capitalize">{task.task_type.replace("_", " ")} Task</p>
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
                          {taskTypeConfig[task.task_type]?.label || task.task_type}
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
                
                {/* Insert native ad after every 4th card */}
                {(index + 1) % 4 === 0 && index < tasks.length - 1 && (
                  <motion.div
                    key={`native-ad-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: (index + 1) * 0.05 }}
                  >
                    <NativeAdCard className="h-full min-h-[200px]" />
                  </motion.div>
                )}
              </>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Task Modal */}
      <Dialog open={!!selectedTask} onOpenChange={() => {
        setSelectedTask(null);
        setScreenshots([]);
        setVerificationResult(null);
        setGeneratedComment(null);
        setCommentCopied(false);
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Complete {selectedTask && (taskTypeConfig[selectedTask.task_type]?.label || selectedTask.task_type)} Task
            </DialogTitle>
            <DialogDescription>
              Follow the steps below to complete this task and earn TikPoints.
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-6">
              {/* Step 1: Open TikTok */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
                  Open the TikTok {isFollowOnlyTask ? "profile" : "post"}
                </h4>
                <Button variant="outline" className="w-full gap-2" asChild>
                  <a href={selectedTask.tiktok_post_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    Open on TikTok
                  </a>
                </Button>
              </div>

              {/* Step 2: Instructions */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
                  Complete the required action(s)
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  {getTaskInstructions(selectedTask.task_type).map((instruction, i) => (
                    <li key={i}>{instruction}</li>
                  ))}
                </ul>
              </div>

              {/* Comment Generation Section (for comment tasks) */}
              {isCommentTask && (
                <div className="space-y-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <h4 className="font-medium flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <MessageCircle className="w-4 h-4" />
                    Generate Your Comment
                  </h4>
                  
                  {!generatedComment ? (
                    <Button 
                      onClick={generateComment} 
                      disabled={isGeneratingComment}
                      className="w-full"
                    >
                      {isGeneratingComment ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Generate AI Comment
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 bg-background rounded-lg border text-sm">
                        "{generatedComment}"
                      </div>
                      <Button 
                        onClick={copyComment} 
                        variant="outline" 
                        className="w-full gap-2"
                      >
                        {commentCopied ? (
                          <>
                            <Check className="w-4 h-4 text-green-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy Comment
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Post this exact comment on the TikTok video, then take a screenshot.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Screenshot Upload (for non-follow tasks) */}
              {requiresScreenshot(selectedTask.task_type) && (
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                      {isCommentTask ? "3" : "3"}
                    </span>
                    Upload proof screenshots (max {getMaxScreenshots(selectedTask.task_type)})
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

                    {screenshots.length < getMaxScreenshots(selectedTask.task_type) && (
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
              )}

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
                
                {isFollowOnlyTask ? (
                  <Button
                    variant="gradient"
                    onClick={verifyFollowTask}
                    disabled={isVerifyingFollow}
                  >
                    {isVerifyingFollow ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 mr-2" />
                        Verify Follow
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="gradient"
                    onClick={submitTask}
                    disabled={!canSubmit() || isSubmitting}
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
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
