import { useState, useEffect } from "react";
import { 
  Settings, 
  Save,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PlatformSettings {
  pointsPerLike: number;
  pointsPerComment: number;
  pointsPerSave: number;
  pointsPerFollow: number;
  pointsPerComboMini: number;
  pointsPerComboLarge: number;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<PlatformSettings>({
    pointsPerLike: 10,
    pointsPerComment: 15,
    pointsPerSave: 10,
    pointsPerFollow: 20,
    pointsPerComboMini: 30,
    pointsPerComboLarge: 50,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("key", "task_points");

      if (error) throw error;

      if (data && data.length > 0 && typeof data[0].value === 'object' && data[0].value !== null) {
        const savedSettings = data[0].value as unknown as PlatformSettings;
        setSettings(prev => ({ ...prev, ...savedSettings }));
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Check if setting exists
      const { data: existing } = await supabase
        .from("platform_settings")
        .select("id")
        .eq("key", "task_points")
        .maybeSingle();

      const settingsValue = JSON.parse(JSON.stringify(settings));

      let error;
      if (existing) {
        const result = await supabase
          .from("platform_settings")
          .update({ value: settingsValue })
          .eq("key", "task_points");
        error = result.error;
      } else {
        const result = await supabase
          .from("platform_settings")
          .insert([{
            key: "task_points",
            value: settingsValue,
          }]);
        error = result.error;
      }

      if (error) throw error;

      toast({ title: "Saved", description: "Settings updated successfully." });
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-100">Platform Settings</h1>
        <p className="text-sm text-neutral-500 mt-1">Configure platform-wide settings</p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h2 className="text-lg font-medium text-neutral-100 mb-4">Default Points per Task</h2>
        
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-neutral-300">Like Task</Label>
            <Input
              type="number"
              value={settings.pointsPerLike}
              onChange={(e) => setSettings({ ...settings, pointsPerLike: parseInt(e.target.value) || 0 })}
              className="bg-neutral-800 border-neutral-700 text-neutral-100"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-neutral-300">Comment Task</Label>
            <Input
              type="number"
              value={settings.pointsPerComment}
              onChange={(e) => setSettings({ ...settings, pointsPerComment: parseInt(e.target.value) || 0 })}
              className="bg-neutral-800 border-neutral-700 text-neutral-100"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-neutral-300">Save Task</Label>
            <Input
              type="number"
              value={settings.pointsPerSave}
              onChange={(e) => setSettings({ ...settings, pointsPerSave: parseInt(e.target.value) || 0 })}
              className="bg-neutral-800 border-neutral-700 text-neutral-100"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-neutral-300">Follow Task</Label>
            <Input
              type="number"
              value={settings.pointsPerFollow}
              onChange={(e) => setSettings({ ...settings, pointsPerFollow: parseInt(e.target.value) || 0 })}
              className="bg-neutral-800 border-neutral-700 text-neutral-100"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-neutral-300">Combo Mini (Like + Comment + Save)</Label>
            <Input
              type="number"
              value={settings.pointsPerComboMini}
              onChange={(e) => setSettings({ ...settings, pointsPerComboMini: parseInt(e.target.value) || 0 })}
              className="bg-neutral-800 border-neutral-700 text-neutral-100"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-neutral-300">Combo Large (Like + Comment + Save + Follow)</Label>
            <Input
              type="number"
              value={settings.pointsPerComboLarge}
              onChange={(e) => setSettings({ ...settings, pointsPerComboLarge: parseInt(e.target.value) || 0 })}
              className="bg-neutral-800 border-neutral-700 text-neutral-100"
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-800 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
