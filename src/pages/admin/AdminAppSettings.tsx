import { useState, useEffect } from "react";
import { 
  Settings, 
  Save, 
  Loader2, 
  Globe, 
  Palette, 
  Image,
  Type,
  Smartphone,
  Hash,
  Share2,
  MessageCircle,
  Mail
} from "lucide-react";
import { 
  FaFacebook, 
  FaTwitter, 
  FaInstagram, 
  FaTiktok, 
  FaYoutube 
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SocialLinks {
  facebook: string;
  twitter: string;
  instagram: string;
  tiktok: string;
  youtube: string;
}

interface AppSettings {
  id?: string;
  app_name: string;
  app_description: string;
  meta_title: string;
  meta_description: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  accent_color: string;
  platform_name: string;
  platform_username_label: string;
  platform_display_name_label: string;
  points_name: string;
  points_short_name: string;
  social_links: SocialLinks;
  community_link: string;
  community_label: string;
  support_email: string;
}

const defaultSettings: AppSettings = {
  app_name: "TikPoints",
  app_description: "Earn points by engaging with TikTok content",
  meta_title: "TikPoints - TikTok Engagement Exchange",
  meta_description: "The leading platform for TikTok engagement exchange. Earn and advertise smarter.",
  logo_url: "",
  favicon_url: "",
  primary_color: "#ec4899",
  accent_color: "#06b6d4",
  platform_name: "TikTok",
  platform_username_label: "TikTok Username",
  platform_display_name_label: "TikTok Display Name",
  points_name: "TikPoints",
  points_short_name: "pts",
  social_links: {
    facebook: "",
    twitter: "",
    instagram: "",
    tiktok: "",
    youtube: "",
  },
  community_link: "",
  community_label: "Community",
  support_email: "",
};

export default function AdminAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
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
        .from("app_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          ...defaultSettings,
          ...data,
          social_links: (data.social_links as unknown as SocialLinks) || defaultSettings.social_links,
        });
      }
    } catch (error) {
      console.error("Error fetching app settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saveData = {
        ...settings,
        social_links: settings.social_links as unknown as Record<string, string>,
      };
      
      if (settings.id) {
        const { error } = await supabase
          .from("app_settings")
          .update(saveData)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("app_settings")
          .insert([saveData]);
        if (error) throw error;
      }

      toast({ title: "Saved", description: "App settings updated successfully!" });
      
      // Update document title immediately
      document.title = settings.meta_title || settings.app_name;
      
      // Update favicon if set
      if (settings.favicon_url) {
        const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
        if (link) link.href = settings.favicon_url;
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save settings." });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof AppSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const updateSocialLink = (platform: keyof SocialLinks, value: string) => {
    setSettings(prev => ({
      ...prev,
      social_links: { ...prev.social_links, [platform]: value },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">App Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your app branding, social links, and platform settings
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save All
        </Button>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="branding">
            <Palette className="w-4 h-4 mr-2" /> Branding
          </TabsTrigger>
          <TabsTrigger value="seo">
            <Globe className="w-4 h-4 mr-2" /> SEO & Meta
          </TabsTrigger>
          <TabsTrigger value="platform">
            <Smartphone className="w-4 h-4 mr-2" /> Platform
          </TabsTrigger>
          <TabsTrigger value="social">
            <Share2 className="w-4 h-4 mr-2" /> Social & Community
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          {/* App Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="w-5 h-5" /> App Identity
              </CardTitle>
              <CardDescription>Basic app name and description</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>App Name</Label>
                  <Input
                    value={settings.app_name}
                    onChange={(e) => updateField("app_name", e.target.value)}
                    placeholder="TikPoints"
                  />
                  <p className="text-xs text-muted-foreground">Shown in navbar and footer</p>
                </div>
                <div className="space-y-2">
                  <Label>Points Name</Label>
                  <Input
                    value={settings.points_name}
                    onChange={(e) => updateField("points_name", e.target.value)}
                    placeholder="TikPoints"
                  />
                  <p className="text-xs text-muted-foreground">Name for your points currency</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>App Description</Label>
                <Textarea
                  value={settings.app_description}
                  onChange={(e) => updateField("app_description", e.target.value)}
                  placeholder="Earn points by engaging with content"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Visual Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" /> Visual Identity
              </CardTitle>
              <CardDescription>Logo, favicon, and colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input
                    value={settings.logo_url}
                    onChange={(e) => updateField("logo_url", e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                  {settings.logo_url && (
                    <div className="mt-2 p-3 bg-muted rounded-lg">
                      <img 
                        src={settings.logo_url} 
                        alt="Logo preview" 
                        className="h-12 object-contain"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Favicon URL</Label>
                  <Input
                    value={settings.favicon_url}
                    onChange={(e) => updateField("favicon_url", e.target.value)}
                    placeholder="https://example.com/favicon.ico"
                  />
                  {settings.favicon_url && (
                    <div className="mt-2 p-3 bg-muted rounded-lg">
                      <img 
                        src={settings.favicon_url} 
                        alt="Favicon preview" 
                        className="h-8 object-contain"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings.primary_color}
                      onChange={(e) => updateField("primary_color", e.target.value)}
                      className="w-14 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={settings.primary_color}
                      onChange={(e) => updateField("primary_color", e.target.value)}
                      placeholder="#ec4899"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings.accent_color}
                      onChange={(e) => updateField("accent_color", e.target.value)}
                      className="w-14 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={settings.accent_color}
                      onChange={(e) => updateField("accent_color", e.target.value)}
                      placeholder="#06b6d4"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" /> SEO Settings
              </CardTitle>
              <CardDescription>Meta tags for search engines</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Meta Title</Label>
                <Input
                  value={settings.meta_title}
                  onChange={(e) => updateField("meta_title", e.target.value)}
                  placeholder="TikPoints - TikTok Engagement Exchange"
                />
                <p className="text-xs text-muted-foreground">
                  {settings.meta_title.length}/60 characters (recommended max)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Meta Description</Label>
                <Textarea
                  value={settings.meta_description}
                  onChange={(e) => updateField("meta_description", e.target.value)}
                  placeholder="The leading platform for TikTok engagement exchange."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {settings.meta_description.length}/160 characters (recommended max)
                </p>
              </div>
              
              {/* Preview */}
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm font-medium mb-2">Google Search Preview:</p>
                <div className="text-blue-600 text-lg font-medium truncate">
                  {settings.meta_title || "Page Title"}
                </div>
                <div className="text-green-700 text-sm">
                  yourdomain.com
                </div>
                <div className="text-sm text-muted-foreground line-clamp-2">
                  {settings.meta_description || "Page description will appear here..."}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platform" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" /> Social Platform
              </CardTitle>
              <CardDescription>
                Configure which social platform your app targets. Change these to rebrand for Instagram, Facebook, X, etc.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm">
                  <strong>Multi-Platform Ready:</strong> Change the platform name and labels below to transform this app for any social network!
                </p>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Platform Name</Label>
                  <Input
                    value={settings.platform_name}
                    onChange={(e) => updateField("platform_name", e.target.value)}
                    placeholder="TikTok"
                  />
                  <p className="text-xs text-muted-foreground">e.g., TikTok, Instagram, X, Facebook</p>
                </div>
                <div className="space-y-2">
                  <Label>Points Short Name</Label>
                  <Input
                    value={settings.points_short_name}
                    onChange={(e) => updateField("points_short_name", e.target.value)}
                    placeholder="pts"
                  />
                  <p className="text-xs text-muted-foreground">e.g., pts, coins, credits</p>
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Username Field Label</Label>
                  <Input
                    value={settings.platform_username_label}
                    onChange={(e) => updateField("platform_username_label", e.target.value)}
                    placeholder="TikTok Username"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Display Name Field Label</Label>
                  <Input
                    value={settings.platform_display_name_label}
                    onChange={(e) => updateField("platform_display_name_label", e.target.value)}
                    placeholder="TikTok Display Name"
                  />
                </div>
              </div>
              
              {/* Preview */}
              <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                <p className="text-sm font-medium">Preview:</p>
                <p className="text-sm text-muted-foreground">
                  "Earn <strong>{settings.points_name}</strong> by engaging on <strong>{settings.platform_name}</strong>!"
                </p>
                <p className="text-sm text-muted-foreground">
                  Form label: "<strong>{settings.platform_username_label}</strong>"
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-6">
          {/* Social Media Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5" /> Social Media Links
              </CardTitle>
              <CardDescription>
                Add your social media profile links. These will appear in the footer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FaFacebook className="w-4 h-4 text-blue-600" /> Facebook
                  </Label>
                  <Input
                    value={settings.social_links.facebook}
                    onChange={(e) => updateSocialLink("facebook", e.target.value)}
                    placeholder="https://facebook.com/yourpage"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FaTwitter className="w-4 h-4 text-sky-500" /> Twitter / X
                  </Label>
                  <Input
                    value={settings.social_links.twitter}
                    onChange={(e) => updateSocialLink("twitter", e.target.value)}
                    placeholder="https://twitter.com/yourhandle"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FaInstagram className="w-4 h-4 text-pink-500" /> Instagram
                  </Label>
                  <Input
                    value={settings.social_links.instagram}
                    onChange={(e) => updateSocialLink("instagram", e.target.value)}
                    placeholder="https://instagram.com/yourprofile"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FaTiktok className="w-4 h-4" /> TikTok
                  </Label>
                  <Input
                    value={settings.social_links.tiktok}
                    onChange={(e) => updateSocialLink("tiktok", e.target.value)}
                    placeholder="https://tiktok.com/@yourprofile"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FaYoutube className="w-4 h-4 text-red-600" /> YouTube
                  </Label>
                  <Input
                    value={settings.social_links.youtube}
                    onChange={(e) => updateSocialLink("youtube", e.target.value)}
                    placeholder="https://youtube.com/@yourchannel"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Community Link */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" /> Community Channel
              </CardTitle>
              <CardDescription>
                Add a link to your WhatsApp channel, Telegram group, or Discord server.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Community Link</Label>
                  <Input
                    value={settings.community_link}
                    onChange={(e) => updateField("community_link", e.target.value)}
                    placeholder="https://chat.whatsapp.com/... or https://t.me/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    WhatsApp, Telegram, or Discord link
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Link Label</Label>
                  <Input
                    value={settings.community_label}
                    onChange={(e) => updateField("community_label", e.target.value)}
                    placeholder="Join our Community"
                  />
                  <p className="text-xs text-muted-foreground">
                    Text shown in the footer
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" /> Support Email
              </CardTitle>
              <CardDescription>
                Email address for the Contact Us page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Support Email</Label>
                <Input
                  type="email"
                  value={settings.support_email}
                  onChange={(e) => updateField("support_email", e.target.value)}
                  placeholder="support@yourapp.com"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
