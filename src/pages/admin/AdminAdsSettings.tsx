import { useState, useEffect } from "react";
import { 
  LayoutGrid,
  Save,
  Loader2,
  Eye,
  EyeOff,
  AlertTriangle,
  Megaphone,
  Square,
  Layers,
  MessageSquare,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AdSetting {
  id: string;
  ad_type: string;
  is_enabled: boolean;
  ad_code: string;
  placement: string;
}

interface AdTypeConfig {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  recommendedSize: string;
  sizeHint: string;
}

const adTypeInfo: Record<string, AdTypeConfig> = {
  banner_top: { 
    label: "Banner Top", 
    description: "Horizontal banner at the top of pages", 
    icon: Square,
    color: "text-blue-400",
    recommendedSize: "728×90 or 970×90",
    sizeHint: "Leaderboard or Large Leaderboard format. Full width on desktop."
  },
  banner_bottom: { 
    label: "Banner Bottom", 
    description: "Horizontal banner at the bottom of pages", 
    icon: Square,
    color: "text-green-400",
    recommendedSize: "728×90 or 320×50",
    sizeHint: "Leaderboard on desktop, Mobile Banner on mobile devices."
  },
  banner_sidebar: { 
    label: "Banner Sidebar", 
    description: "Vertical banner in sidebar areas", 
    icon: Layers,
    color: "text-purple-400",
    recommendedSize: "300×250 or 160×600",
    sizeHint: "Medium Rectangle or Wide Skyscraper. Best for sidebar placement."
  },
  native_feed: { 
    label: "Native Feed", 
    description: "Ads that blend into content feeds between cards", 
    icon: LayoutGrid,
    color: "text-yellow-400",
    recommendedSize: "300×250 or Responsive",
    sizeHint: "Flexible size that adapts to container. Shows between task cards."
  },
  popup: { 
    label: "Popup", 
    description: "Modal popup ads (use sparingly)", 
    icon: MessageSquare,
    color: "text-orange-400",
    recommendedSize: "800×600 or 550×480",
    sizeHint: "Center screen popup. Triggers after 3 seconds on page load."
  },
  popunder: { 
    label: "Popunder", 
    description: "Opens in background tab", 
    icon: ExternalLink,
    color: "text-red-400",
    recommendedSize: "Any (opens new tab)",
    sizeHint: "Opens in background. Uses Adsterra's popunder script."
  },
  social_bar: { 
    label: "Social Bar", 
    description: "Floating social-style notification ads", 
    icon: Megaphone,
    color: "text-pink-400",
    recommendedSize: "Fixed by Adsterra",
    sizeHint: "Floating notification-style bar. Position handled by Adsterra."
  },
  interstitial: { 
    label: "Interstitial", 
    description: "Full-screen ads between page loads", 
    icon: Square,
    color: "text-cyan-400",
    recommendedSize: "Full Screen",
    sizeHint: "Covers entire viewport. Use very sparingly to avoid frustrating users."
  },
};

export default function AdminAdsSettings() {
  const [adSettings, setAdSettings] = useState<AdSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedAd, setExpandedAd] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAdSettings();
  }, []);

  const fetchAdSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("ad_settings")
        .select("*")
        .order("ad_type");

      if (error) throw error;
      setAdSettings(data || []);
    } catch (error) {
      console.error("Error fetching ad settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load ad settings.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateAdSetting = (adType: string, field: keyof AdSetting, value: any) => {
    setAdSettings(prev => 
      prev.map(ad => 
        ad.ad_type === adType ? { ...ad, [field]: value } : ad
      )
    );
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      for (const ad of adSettings) {
        const { error } = await supabase
          .from("ad_settings")
          .update({
            is_enabled: ad.is_enabled,
            ad_code: ad.ad_code,
            placement: ad.placement,
          })
          .eq("ad_type", ad.ad_type);

        if (error) throw error;
      }

      toast({ title: "Saved", description: "All ad settings updated successfully." });
    } catch (error) {
      console.error("Error saving ad settings:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save ad settings." });
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
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-100">Ads Settings</h1>
          <p className="text-sm text-neutral-500 mt-1">Configure Adsterra ad placements</p>
        </div>
        <Button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save All
        </Button>
      </div>

      {/* Warning */}
      <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
        <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium mb-1">
          <AlertTriangle className="w-4 h-4" />
          Important Notes
        </div>
        <ul className="text-xs text-neutral-400 list-disc list-inside space-y-1">
          <li>Get your ad codes from <a href="https://adsterra.com" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">Adsterra.com</a></li>
          <li>Paste the complete ad script code in the code field</li>
          <li>Use popup/popunder ads sparingly to avoid frustrating users</li>
          <li>Test ads after enabling to ensure they display correctly</li>
        </ul>
      </div>

      {/* Ad Settings Cards */}
      <div className="grid gap-4">
        {adSettings.map((ad) => {
          const info = adTypeInfo[ad.ad_type] || { 
            label: ad.ad_type, 
            description: "Ad placement", 
            icon: Square,
            color: "text-neutral-400",
            recommendedSize: "Variable",
            sizeHint: "Check Adsterra for available sizes."
          };
          const Icon = info.icon;
          const isExpanded = expandedAd === ad.ad_type;

          return (
            <Card key={ad.ad_type} className="bg-neutral-900 border-neutral-800">
              <CardHeader 
                className="cursor-pointer"
                onClick={() => setExpandedAd(isExpanded ? null : ad.ad_type)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${info.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-neutral-100 flex items-center gap-2">
                        {info.label}
                        {ad.is_enabled ? (
                          <Badge variant="outline" className="text-green-400 border-green-400/30">
                            <Eye className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-neutral-500 border-neutral-700">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Disabled
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-neutral-500">
                        {info.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={ad.is_enabled}
                    onCheckedChange={(checked) => updateAdSetting(ad.ad_type, "is_enabled", checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="space-y-4 border-t border-neutral-800 pt-4">
                  {/* Size Guidance */}
                  <div className="p-3 rounded-lg bg-neutral-800/50 border border-neutral-700">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-neutral-300">Recommended Size:</span>
                      <Badge variant="outline" className="text-primary border-primary/30 text-xs">
                        {info.recommendedSize}
                      </Badge>
                    </div>
                    <p className="text-xs text-neutral-500">{info.sizeHint}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-neutral-300">Ad Code (Script)</Label>
                    <Textarea
                      value={ad.ad_code}
                      onChange={(e) => updateAdSetting(ad.ad_type, "ad_code", e.target.value)}
                      className="bg-neutral-800 border-neutral-700 text-neutral-100 font-mono text-sm min-h-[120px]"
                      placeholder="Paste your Adsterra ad script code here..."
                    />
                    <p className="text-xs text-neutral-500">
                      Paste the complete script tag from Adsterra
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-neutral-300">Placement Note</Label>
                    <Input
                      value={ad.placement}
                      onChange={(e) => updateAdSetting(ad.ad_type, "placement", e.target.value)}
                      className="bg-neutral-800 border-neutral-700 text-neutral-100"
                      placeholder="e.g., header, footer, sidebar (for your reference)"
                    />
                    <p className="text-xs text-neutral-500">Optional note for your own reference</p>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}