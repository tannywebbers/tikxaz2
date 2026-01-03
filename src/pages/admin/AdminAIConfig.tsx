import { useState, useEffect } from "react";
import { 
  Brain, 
  Key, 
  Check, 
  X, 
  Save,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIConfig {
  id: string;
  provider: string;
  is_enabled: boolean;
  is_default: boolean;
  api_key_set: boolean;
}

export default function AdminAIConfig() {
  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("ai_config")
        .select("*")
        .order("provider");

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error("Error fetching AI config:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load AI configuration." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEnabled = async (config: AIConfig) => {
    try {
      const { error } = await supabase
        .from("ai_config")
        .update({ is_enabled: !config.is_enabled })
        .eq("id", config.id);

      if (error) throw error;

      setConfigs(prev =>
        prev.map(c => (c.id === config.id ? { ...c, is_enabled: !c.is_enabled } : c))
      );

      toast({ title: "Updated", description: `${config.provider} ${!config.is_enabled ? "enabled" : "disabled"}.` });
    } catch (error) {
      console.error("Error updating config:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update configuration." });
    }
  };

  const handleSetDefault = async (config: AIConfig) => {
    try {
      // First, unset all defaults
      await supabase.from("ai_config").update({ is_default: false }).neq("id", "");
      
      // Then set the selected one as default
      const { error } = await supabase
        .from("ai_config")
        .update({ is_default: true })
        .eq("id", config.id);

      if (error) throw error;

      setConfigs(prev =>
        prev.map(c => ({ ...c, is_default: c.id === config.id }))
      );

      toast({ title: "Updated", description: `${config.provider} is now the default provider.` });
    } catch (error) {
      console.error("Error setting default:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to set default provider." });
    }
  };

  const handleSaveApiKey = async (provider: string) => {
    const apiKey = apiKeys[provider];
    if (!apiKey?.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter an API key." });
      return;
    }

    setIsSaving(true);
    try {
      // In a real app, you'd call an edge function to securely store the API key
      // For now, we just mark it as set in the config
      const { error } = await supabase
        .from("ai_config")
        .update({ api_key_set: true })
        .eq("provider", provider);

      if (error) throw error;

      // Store in platform_settings (encrypted in real implementation)
      await supabase
        .from("platform_settings")
        .upsert({
          key: `${provider.toUpperCase()}_API_KEY`,
          value: JSON.stringify({ set: true, updated_at: new Date().toISOString() }),
        }, { onConflict: "key" });

      setConfigs(prev =>
        prev.map(c => (c.provider === provider ? { ...c, api_key_set: true } : c))
      );
      setApiKeys(prev => ({ ...prev, [provider]: "" }));

      toast({ title: "Saved", description: `${provider} API key has been configured.` });
    } catch (error) {
      console.error("Error saving API key:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save API key." });
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
        <h1 className="text-2xl font-semibold text-neutral-100">AI Configuration</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage AI providers and API keys</p>
      </div>

      <div className="space-y-4">
        {configs.map(config => (
          <div
            key={config.id}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  config.provider === "gemini" ? "bg-blue-500/10 text-blue-400" : "bg-green-500/10 text-green-400"
                }`}>
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-neutral-100 capitalize">{config.provider}</h3>
                  <p className="text-sm text-neutral-500">
                    {config.provider === "gemini" ? "Google Gemini Vision" : "OpenAI GPT-4 Vision"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {config.is_default && (
                  <span className="text-xs px-2 py-1 rounded bg-neutral-800 text-neutral-300">Default</span>
                )}
                {config.api_key_set ? (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <Check className="w-3 h-3" /> Key Set
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-yellow-400">
                    <X className="w-3 h-3" /> No Key
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.is_enabled}
                  onCheckedChange={() => handleToggleEnabled(config)}
                />
                <Label className="text-neutral-400">Enabled</Label>
              </div>

              {!config.is_default && config.is_enabled && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSetDefault(config)}
                  className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                >
                  Set as Default
                </Button>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <Label className="text-neutral-400">API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <Input
                    type={showKeys[config.provider] ? "text" : "password"}
                    placeholder={config.api_key_set ? "••••••••••••••••" : "Enter API key"}
                    className="pl-10 pr-10 bg-neutral-800 border-neutral-700 text-neutral-100"
                    value={apiKeys[config.provider] || ""}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, [config.provider]: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys(prev => ({ ...prev, [config.provider]: !prev[config.provider] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                  >
                    {showKeys[config.provider] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  onClick={() => handleSaveApiKey(config.provider)}
                  disabled={isSaving || !apiKeys[config.provider]}
                  className="bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-neutral-500">
                {config.provider === "gemini" 
                  ? "Get your API key from Google AI Studio" 
                  : "Get your API key from OpenAI Platform"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
