import { useState, useEffect } from "react";
import { 
  Settings, 
  Save,
  Loader2,
  Globe,
  Mail,
  Shield,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PlatformSettings {
  pointsPerLike: number;
  pointsPerComment: number;
  pointsPerSave: number;
  pointsPerFollow: number;
  pointsPerComboMini: number;
  pointsPerComboLarge: number;
}

interface SiteSettings {
  site_name: string;
  site_logo: string;
  support_email: string;
  maintenance_mode: boolean;
}

interface EmailVerificationSettings {
  enabled: boolean;
  require_verification: boolean;
}

export default function AdminSettings() {
  const [taskSettings, setTaskSettings] = useState<PlatformSettings>({
    pointsPerLike: 10,
    pointsPerComment: 15,
    pointsPerSave: 10,
    pointsPerFollow: 20,
    pointsPerComboMini: 30,
    pointsPerComboLarge: 50,
  });
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    site_name: "TikPoints",
    site_logo: "",
    support_email: "support@tikpoints.com",
    maintenance_mode: false,
  });
  const [emailSettings, setEmailSettings] = useState<EmailVerificationSettings>({
    enabled: false,
    require_verification: false,
  });
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      // Fetch task points settings
      const { data: taskData } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("key", "task_points")
        .maybeSingle();

      if (taskData && typeof taskData.value === 'object' && taskData.value !== null) {
        const savedSettings = taskData.value as unknown as PlatformSettings;
        setTaskSettings(prev => ({ ...prev, ...savedSettings }));
      }

      // Fetch site settings
      const { data: siteData } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("key", "site_settings")
        .maybeSingle();

      if (siteData && typeof siteData.value === 'object' && siteData.value !== null) {
        const savedSite = siteData.value as unknown as SiteSettings;
        setSiteSettings(prev => ({ ...prev, ...savedSite }));
      }

      // Fetch email verification settings
      const { data: emailData } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("key", "email_verification")
        .maybeSingle();

      if (emailData && typeof emailData.value === 'object' && emailData.value !== null) {
        const savedEmail = emailData.value as unknown as EmailVerificationSettings;
        setEmailSettings(prev => ({ ...prev, ...savedEmail }));
      }

      // Check if SMTP is configured
      const { data: smtpData } = await supabase
        .from("smtp_config")
        .select("is_enabled, password_set")
        .maybeSingle();

      setSmtpConfigured(smtpData?.is_enabled && smtpData?.password_set);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSetting = async (key: string, value: any) => {
    const { data: existing } = await supabase
      .from("platform_settings")
      .select("id")
      .eq("key", key)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("platform_settings")
        .update({ value: JSON.parse(JSON.stringify(value)) })
        .eq("key", key);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("platform_settings")
        .insert([{ key, value: JSON.parse(JSON.stringify(value)) }]);
      if (error) throw error;
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        saveSetting("task_points", taskSettings),
        saveSetting("site_settings", siteSettings),
        saveSetting("email_verification", emailSettings),
      ]);

      toast({ title: "Saved", description: "All settings updated successfully." });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save settings." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-100">Platform Settings</h1>
        <p className="text-sm text-neutral-500 mt-1">Configure platform-wide settings</p>
      </div>

      {/* Site Settings */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-neutral-100">Site Settings</CardTitle>
              <CardDescription className="text-neutral-500">
                Basic site configuration
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-neutral-300">Site Name</Label>
              <Input
                value={siteSettings.site_name}
                onChange={(e) => setSiteSettings({ ...siteSettings, site_name: e.target.value })}
                className="bg-neutral-800 border-neutral-700 text-neutral-100"
                placeholder="TikPoints"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Support Email</Label>
              <Input
                type="email"
                value={siteSettings.support_email}
                onChange={(e) => setSiteSettings({ ...siteSettings, support_email: e.target.value })}
                className="bg-neutral-800 border-neutral-700 text-neutral-100"
                placeholder="support@tikpoints.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-neutral-300">Site Logo URL</Label>
            <Input
              value={siteSettings.site_logo}
              onChange={(e) => setSiteSettings({ ...siteSettings, site_logo: e.target.value })}
              className="bg-neutral-800 border-neutral-700 text-neutral-100"
              placeholder="https://..."
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5">
              <Label className="text-neutral-300">Maintenance Mode</Label>
              <p className="text-xs text-neutral-500">Disable site access for regular users</p>
            </div>
            <Switch
              checked={siteSettings.maintenance_mode}
              onCheckedChange={(checked) => setSiteSettings({ ...siteSettings, maintenance_mode: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Verification Settings */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <CardTitle className="text-neutral-100">Email Verification</CardTitle>
              <CardDescription className="text-neutral-500">
                Configure email verification for new signups
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!smtpConfigured && (
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium mb-1">
                <Shield className="w-4 h-4" />
                SMTP Not Configured
              </div>
              <p className="text-xs text-neutral-400">
                Configure SMTP settings in Email Config before enabling email verification.
              </p>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-neutral-300">Enable Email Verification</Label>
              <p className="text-xs text-neutral-500">Send verification code when users sign up</p>
            </div>
            <Switch
              checked={emailSettings.enabled}
              onCheckedChange={(checked) => setEmailSettings({ ...emailSettings, enabled: checked })}
              disabled={!smtpConfigured}
            />
          </div>

          {emailSettings.enabled && (
            <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
              <div className="space-y-0.5">
                <Label className="text-neutral-300">Require Verification Before Login</Label>
                <p className="text-xs text-neutral-500">Users must verify email before accessing dashboard</p>
              </div>
              <Switch
                checked={emailSettings.require_verification}
                onCheckedChange={(checked) => setEmailSettings({ ...emailSettings, require_verification: checked })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Points Settings */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-neutral-100">Default Points per Task</CardTitle>
              <CardDescription className="text-neutral-500">
                Set default point values for each task type
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-neutral-300">Like Task</Label>
              <Input
                type="number"
                value={taskSettings.pointsPerLike}
                onChange={(e) => setTaskSettings({ ...taskSettings, pointsPerLike: parseInt(e.target.value) || 0 })}
                className="bg-neutral-800 border-neutral-700 text-neutral-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-neutral-300">Comment Task</Label>
              <Input
                type="number"
                value={taskSettings.pointsPerComment}
                onChange={(e) => setTaskSettings({ ...taskSettings, pointsPerComment: parseInt(e.target.value) || 0 })}
                className="bg-neutral-800 border-neutral-700 text-neutral-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-neutral-300">Save Task</Label>
              <Input
                type="number"
                value={taskSettings.pointsPerSave}
                onChange={(e) => setTaskSettings({ ...taskSettings, pointsPerSave: parseInt(e.target.value) || 0 })}
                className="bg-neutral-800 border-neutral-700 text-neutral-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-neutral-300">Follow Task</Label>
              <Input
                type="number"
                value={taskSettings.pointsPerFollow}
                onChange={(e) => setTaskSettings({ ...taskSettings, pointsPerFollow: parseInt(e.target.value) || 0 })}
                className="bg-neutral-800 border-neutral-700 text-neutral-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-neutral-300">Combo Mini (Like + Comment + Save)</Label>
              <Input
                type="number"
                value={taskSettings.pointsPerComboMini}
                onChange={(e) => setTaskSettings({ ...taskSettings, pointsPerComboMini: parseInt(e.target.value) || 0 })}
                className="bg-neutral-800 border-neutral-700 text-neutral-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-neutral-300">Combo Large (Like + Comment + Save + Follow)</Label>
              <Input
                type="number"
                value={taskSettings.pointsPerComboLarge}
                onChange={(e) => setTaskSettings({ ...taskSettings, pointsPerComboLarge: parseInt(e.target.value) || 0 })}
                className="bg-neutral-800 border-neutral-700 text-neutral-100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
