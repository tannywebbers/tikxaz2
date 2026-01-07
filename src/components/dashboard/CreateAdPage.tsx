import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Link2,
  Upload,
  Heart,
  MessageCircle,
  Bookmark,
  Play,
  UserPlus,
  Coins,
  AlertCircle,
  CheckCircle,
  Loader2,
  Layers
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const taskTypes = [
  { id: "like", label: "Like", icon: Heart, points: 10, color: "from-pink-500 to-red-500", description: "Get likes on your post" },
  { id: "comment", label: "Comment", icon: MessageCircle, points: 15, color: "from-blue-500 to-cyan-500", description: "Get comments on your post" },
  { id: "save", label: "Save", icon: Bookmark, points: 10, color: "from-yellow-500 to-orange-500", description: "Get saves/bookmarks" },
  { id: "follow", label: "Follow", icon: UserPlus, points: 20, color: "from-purple-500 to-violet-500", description: "Get new followers" },
];

const comboTypes = [
  { 
    id: "combo_mini", 
    label: "Combo Mini", 
    icon: Layers, 
    points: 30, 
    color: "from-pink-500 via-blue-500 to-yellow-500",
    description: "Like + Comment + Save",
    includes: ["like", "comment", "save"],
    maxScreenshots: 3
  },
  { 
    id: "combo_large", 
    label: "Combo Large", 
    icon: Layers, 
    points: 50, 
    color: "from-pink-500 via-blue-500 via-yellow-500 to-purple-500",
    description: "Like + Comment + Save + Follow",
    includes: ["like", "comment", "save", "follow"],
    maxScreenshots: 4
  },
];

export function CreateAdPage() {
  const [selectedType, setSelectedType] = useState("like");
  const [completions, setCompletions] = useState(100);
  const [postLink, setPostLink] = useState("");
  const [description, setDescription] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [commentKeywords, setCommentKeywords] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const allTypes = [...taskTypes, ...comboTypes];
  const selectedTask = allTypes.find(t => t.id === selectedType);
  const totalCost = selectedTask ? selectedTask.points * completions : 0;
  const userBalance = profile?.tik_points || 0;
  const canAfford = userBalance >= totalCost;

  const handleCreateAd = async () => {
    if (!postLink.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a TikTok post link." });
      return;
    }

    if (!canAfford) {
      toast({ variant: "destructive", title: "Insufficient Balance", description: "You don't have enough TikPoints." });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create the ad with video description for comment generation
      const { error: adError } = await supabase
        .from("ads")
        .insert({
          creator_id: user?.id,
          tiktok_post_url: postLink,
          task_type: selectedType as any,
          required_completions: completions,
          points_per_task: selectedTask?.points || 10,
          video_description: videoDescription || null,
          comment_keywords: commentKeywords ? commentKeywords.split(',').map(k => k.trim()).filter(Boolean) : null,
        });

      if (adError) throw adError;

      // Deduct points from user
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ tik_points: userBalance - totalCost })
        .eq("user_id", user?.id);

      if (updateError) throw updateError;

      // Log transaction
      await supabase
        .from("transactions")
        .insert({
          user_id: user?.id,
          amount: -totalCost,
          type: "spend",
          description: `Created ${selectedTask?.label} ad`,
        });

      toast({ title: "Success", description: "Your ad has been created!" });
      navigate("/dashboard");
    } catch (error) {
      console.error("Error creating ad:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to create ad. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCombo = selectedType.startsWith("combo");

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

      {/* Single Tasks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Single Task Types</CardTitle>
            <CardDescription>Choose a single engagement action</CardDescription>
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

      {/* Combo Tasks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Combo Tasks
              <Badge variant="gradient" className="ml-2">Popular</Badge>
            </CardTitle>
            <CardDescription>Bundle multiple actions for better value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {comboTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`p-5 rounded-xl border-2 transition-all text-left ${
                    selectedType === type.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center shrink-0`}>
                      <type.icon className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{type.label}</div>
                      <div className="text-sm text-muted-foreground mb-2">{type.description}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {type.maxScreenshots} screenshots max
                        </Badge>
                        <Badge variant="gradient" className="text-xs">
                          {type.points} pts each
                        </Badge>
                      </div>
                    </div>
                  </div>
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
              <Label htmlFor="postLink">TikTok Post Link *</Label>
              <Input 
                id="postLink" 
                placeholder="https://www.tiktok.com/@username/video/..."
                value={postLink}
                onChange={(e) => setPostLink(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Task Description (Optional)</Label>
              <Textarea 
                id="description" 
                placeholder="Any specific instructions for users..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Video Description for Comment Generation */}
            {(selectedType === "comment" || selectedType === "combo_mini" || selectedType === "combo_large") && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="videoDescription" className="flex items-center gap-2">
                    Video Description
                    <Badge variant="outline" className="text-xs">For AI Comments</Badge>
                  </Label>
                  <Textarea 
                    id="videoDescription" 
                    placeholder="Describe your video content so AI can generate relevant comments..."
                    rows={3}
                    value={videoDescription}
                    onChange={(e) => setVideoDescription(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This helps generate unique, relevant comments for each user.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commentKeywords">Comment Keywords (Optional)</Label>
                  <Input 
                    id="commentKeywords" 
                    placeholder="amazing, love this, fire, talent (comma separated)"
                    value={commentKeywords}
                    onChange={(e) => setCommentKeywords(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Keywords to include in generated comments (comma separated).
                  </p>
                </div>
              </>
            )}

            {isCombo && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  Combo Task Requirements
                </div>
                <p className="text-sm text-muted-foreground">
                  Users must complete ALL actions in this combo ({(selectedTask as any)?.description}). 
                  They can upload up to {(selectedTask as any)?.maxScreenshots} screenshots to prove completion.
                </p>
              </div>
            )}
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
                onChange={(e) => setCompletions(Math.max(10, parseInt(e.target.value) || 10))}
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
        <Card variant="elevated" className={`border-2 ${canAfford ? "border-primary/30" : "border-destructive/30"}`}>
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
                <Button 
                  variant="gradient" 
                  size="lg" 
                  className="w-full sm:w-auto"
                  onClick={handleCreateAd}
                  disabled={isSubmitting || !canAfford}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Create Ad
                    </>
                  )}
                </Button>
                <p className={`text-xs text-center ${canAfford ? "text-muted-foreground" : "text-destructive"}`}>
                  Your balance: {userBalance.toLocaleString()} TikPoints
                  {!canAfford && " (Insufficient)"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
