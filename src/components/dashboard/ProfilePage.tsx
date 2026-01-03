import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  User,
  AtSign,
  Mail,
  Globe,
  Camera,
  Save,
  AlertTriangle,
  Heart,
  MessageCircle,
  Bookmark,
  UserPlus,
  Layers,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    country: "",
  });
  const [stats, setStats] = useState({
    tasksDone: 0,
    successRate: 0,
    adsCreated: 0,
    daysActive: 0,
  });
  
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.first_name || "",
        lastName: profile.last_name || "",
        email: profile.email || "",
        country: profile.country || "",
      });
    }
    fetchStats();
  }, [profile]);

  const fetchStats = async () => {
    if (!user) return;
    try {
      // Fetch task submissions
      const { data: submissions } = await supabase
        .from("task_submissions")
        .select("status")
        .eq("user_id", user.id);

      // Fetch ads created
      const { data: ads } = await supabase
        .from("ads")
        .select("id")
        .eq("creator_id", user.id);

      const total = submissions?.length || 0;
      const approved = submissions?.filter(s => s.status === "approved").length || 0;
      
      // Calculate days active
      const createdAt = new Date(profile?.created_at || Date.now());
      const now = new Date();
      const daysActive = Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      setStats({
        tasksDone: approved,
        successRate: total > 0 ? Math.round((approved / total) * 100) : 0,
        adsCreated: ads?.length || 0,
        daysActive: Math.max(1, daysActive),
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          country: formData.country,
        })
        .eq("user_id", user?.id);

      if (error) throw error;

      await refreshProfile();
      setIsEditing(false);
      toast({ title: "Saved", description: "Your profile has been updated." });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save profile." });
    } finally {
      setIsSaving(false);
    }
  };

  // Task types the user can perform
  const supportedTasks = [
    { id: "like", label: "Like", icon: Heart, color: "text-red-500" },
    { id: "comment", label: "Comment", icon: MessageCircle, color: "text-blue-500" },
    { id: "save", label: "Save", icon: Bookmark, color: "text-yellow-500" },
    { id: "follow", label: "Follow", icon: UserPlus, color: "text-purple-500" },
    { id: "combo_mini", label: "Combo Mini", icon: Layers, color: "text-cyan-500" },
    { id: "combo_large", label: "Combo Large", icon: Layers, color: "text-pink-500" },
  ];

  const initials = `${formData.firstName?.charAt(0) || ""}${formData.lastName?.charAt(0) || ""}`.toUpperCase() || "U";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card variant="elevated">
          <CardContent className="p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl font-bold text-primary-foreground">
                  {initials}
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                  <Camera className="w-4 h-4 text-primary-foreground" />
                </button>
              </div>
              
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-2xl font-bold">{formData.firstName} {formData.lastName}</h2>
                <p className="text-muted-foreground">
                  {profile?.tiktok_name ? (
                    <span className="font-medium">{profile.tiktok_name}</span>
                  ) : (
                    <span>@{profile?.tiktok_username}</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                  <Badge variant="success">Verified</Badge>
                  {stats.tasksDone >= 100 && <Badge variant="gradient">Pro Member</Badge>}
                </div>
              </div>

              <Button 
                variant={isEditing ? "default" : "outline"}
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                ) : (
                  "Edit Profile"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* TikTok Identity Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AtSign className="w-5 h-5" />
              TikTok Identity
            </CardTitle>
            <CardDescription>
              This information is used for verification and cannot be changed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                TikTok Display Name
                <Badge variant="warning" className="text-xs">Locked</Badge>
              </Label>
              <Input 
                value={profile?.tiktok_name || "Not set"} 
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                This must exactly match your TikTok profile display name for comment verification
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                TikTok Username
                <Badge variant="outline" className="text-xs">Reference</Badge>
              </Label>
              <Input 
                value={`@${profile?.tiktok_username}`} 
                disabled
                className="bg-muted"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Supported Task Types */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Supported Task Types</CardTitle>
            <CardDescription>Task categories you can complete to earn TikPoints</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {supportedTasks.map((task) => (
                <Badge 
                  key={task.id} 
                  variant="outline" 
                  className={`gap-1.5 py-1.5 px-3 ${task.color}`}
                >
                  <task.icon className="w-3.5 h-3.5" />
                  {task.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Profile Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Update your profile details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input 
                  id="firstName" 
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input 
                  id="lastName" 
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </Label>
              <Input 
                id="email" 
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Country
              </Label>
              <Input 
                id="country" 
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="Your country"
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Account Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-xl bg-muted/50">
                <div className="text-2xl font-bold gradient-text">{stats.tasksDone}</div>
                <div className="text-sm text-muted-foreground">Tasks Done</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/50">
                <div className="text-2xl font-bold gradient-text">{stats.successRate}%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/50">
                <div className="text-2xl font-bold gradient-text">{stats.adsCreated}</div>
                <div className="text-sm text-muted-foreground">Ads Created</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/50">
                <div className="text-2xl font-bold gradient-text">{stats.daysActive}</div>
                <div className="text-sm text-muted-foreground">Days Active</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
