import { useState, useEffect } from "react";
import { 
  Mail, 
  Save,
  Loader2,
  Plus,
  Trash2,
  Check,
  X,
  Eye,
  EyeOff,
  Server,
  Shield,
  Send,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SMTPConfig {
  id: string;
  host: string;
  port: number;
  username: string;
  password_set: boolean;
  from_name: string;
  from_email: string;
  is_enabled: boolean;
}

interface AllowedDomain {
  id: string;
  domain: string;
  is_enabled: boolean;
}

export default function AdminEmailConfig() {
  const [smtpConfig, setSmtpConfig] = useState<SMTPConfig | null>(null);
  const [smtpPassword, setSmtpPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [allowedDomains, setAllowedDomains] = useState<AllowedDomain[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      // Fetch SMTP config
      const { data: smtp, error: smtpError } = await supabase
        .from("smtp_config")
        .select("*")
        .maybeSingle();
      
      if (smtpError && smtpError.code !== 'PGRST116') throw smtpError;
      
      if (smtp) {
        setSmtpConfig(smtp);
      } else {
        // Initialize with defaults
        setSmtpConfig({
          id: "",
          host: "",
          port: 587,
          username: "",
          password_set: false,
          from_name: "TikPoints",
          from_email: "",
          is_enabled: false,
        });
      }

      // Fetch allowed domains
      const { data: domains } = await supabase
        .from("allowed_email_domains")
        .select("*")
        .order("domain");
      
      setAllowedDomains(domains || []);
    } catch (error) {
      console.error("Error fetching config:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load configuration." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSMTP = async () => {
    if (!smtpConfig) return;
    
    if (!smtpConfig.host || !smtpConfig.from_email) {
      toast({ variant: "destructive", title: "Error", description: "Please fill in host and from email." });
      return;
    }
    
    setIsSaving(true);
    try {
      const updateData: any = {
        host: smtpConfig.host,
        port: smtpConfig.port,
        username: smtpConfig.username,
        from_name: smtpConfig.from_name,
        from_email: smtpConfig.from_email,
        is_enabled: smtpConfig.is_enabled,
      };

      if (smtpPassword) {
        updateData.password_set = true;
      }

      if (smtpConfig.id) {
        const { error } = await supabase
          .from("smtp_config")
          .update(updateData)
          .eq("id", smtpConfig.id);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("smtp_config")
          .insert({
            ...updateData,
            password_set: !!smtpPassword
          })
          .select()
          .single();
        
        if (error) throw error;
        setSmtpConfig(data);
      }

      toast({ title: "Saved", description: "SMTP configuration updated." });
      setSmtpPassword("");
      fetchConfig();
    } catch (error) {
      console.error("Error saving SMTP:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save SMTP configuration." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!smtpConfig?.is_enabled || !smtpConfig?.password_set) {
      toast({ variant: "destructive", title: "Error", description: "SMTP must be enabled and password set to send test email." });
      return;
    }
    
    setIsTesting(true);
    try {
      // This would call an edge function to send a test email
      toast({ title: "Test Email", description: "Test email functionality would be triggered here." });
    } catch (error) {
      console.error("Error sending test email:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to send test email." });
    } finally {
      setIsTesting(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;
    
    const domain = newDomain.toLowerCase().trim();
    
    // More flexible domain validation
    if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(domain)) {
      toast({ variant: "destructive", title: "Invalid domain", description: "Please enter a valid domain (e.g., gmail.com)." });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("allowed_email_domains")
        .insert({ domain, is_enabled: true })
        .select()
        .single();
      
      if (error) {
        if (error.code === "23505") {
          toast({ variant: "destructive", title: "Error", description: "Domain already exists." });
        } else {
          throw error;
        }
        return;
      }

      setAllowedDomains(prev => [...prev, data]);
      toast({ title: "Added", description: `${domain} added to allowed domains.` });
      setNewDomain("");
    } catch (error) {
      console.error("Error adding domain:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to add domain." });
    }
  };

  const handleToggleDomain = async (domain: AllowedDomain) => {
    try {
      const { error } = await supabase
        .from("allowed_email_domains")
        .update({ is_enabled: !domain.is_enabled })
        .eq("id", domain.id);
      
      if (error) throw error;

      setAllowedDomains(prev =>
        prev.map(d => (d.id === domain.id ? { ...d, is_enabled: !d.is_enabled } : d))
      );
    } catch (error) {
      console.error("Error toggling domain:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update domain." });
    }
  };

  const handleDeleteDomain = async (domain: AllowedDomain) => {
    try {
      const { error } = await supabase
        .from("allowed_email_domains")
        .delete()
        .eq("id", domain.id);
      
      if (error) throw error;

      setAllowedDomains(prev => prev.filter(d => d.id !== domain.id));
      toast({ title: "Deleted", description: `${domain.domain} removed.` });
    } catch (error) {
      console.error("Error deleting domain:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete domain." });
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-100">Email Configuration</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Configure SMTP settings and allowed email domains for registration
        </p>
      </div>

      {/* SMTP Configuration */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Server className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-neutral-100">SMTP Settings</CardTitle>
              <CardDescription className="text-neutral-500">
                Configure email sending for verification codes
              </CardDescription>
            </div>
            {smtpConfig?.is_enabled && smtpConfig?.password_set && (
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                <Check className="w-3 h-3 mr-1" />
                Configured
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-neutral-400">SMTP Host *</Label>
              <Input
                value={smtpConfig?.host || ""}
                onChange={(e) => setSmtpConfig(prev => prev ? { ...prev, host: e.target.value } : null)}
                className="bg-neutral-800 border-neutral-700"
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-400">Port</Label>
              <Input
                type="number"
                value={smtpConfig?.port || 587}
                onChange={(e) => setSmtpConfig(prev => prev ? { ...prev, port: parseInt(e.target.value) } : null)}
                className="bg-neutral-800 border-neutral-700"
                placeholder="587"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-neutral-400">Username</Label>
              <Input
                value={smtpConfig?.username || ""}
                onChange={(e) => setSmtpConfig(prev => prev ? { ...prev, username: e.target.value } : null)}
                className="bg-neutral-800 border-neutral-700"
                placeholder="your@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-400">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  className="bg-neutral-800 border-neutral-700 pr-10"
                  placeholder={smtpConfig?.password_set ? "••••••••" : "Enter password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {smtpConfig?.password_set && (
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Password is set
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-neutral-400">From Name</Label>
              <Input
                value={smtpConfig?.from_name || ""}
                onChange={(e) => setSmtpConfig(prev => prev ? { ...prev, from_name: e.target.value } : null)}
                className="bg-neutral-800 border-neutral-700"
                placeholder="TikPoints"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-400">From Email *</Label>
              <Input
                value={smtpConfig?.from_email || ""}
                onChange={(e) => setSmtpConfig(prev => prev ? { ...prev, from_email: e.target.value } : null)}
                className="bg-neutral-800 border-neutral-700"
                placeholder="noreply@tikpoints.com"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={smtpConfig?.is_enabled || false}
                  onCheckedChange={(checked) => setSmtpConfig(prev => prev ? { ...prev, is_enabled: checked } : null)}
                />
                <Label className="text-neutral-400">Enable SMTP</Label>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestEmail}
                disabled={isTesting || !smtpConfig?.is_enabled || !smtpConfig?.password_set}
                className="border-neutral-700"
              >
                {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Test Email
              </Button>
            </div>
            
            <Button
              onClick={handleSaveSMTP}
              disabled={isSaving}
              className="bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save SMTP
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Allowed Email Domains */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <CardTitle className="text-neutral-100">Allowed Email Domains</CardTitle>
              <CardDescription className="text-neutral-500">
                Restrict registration to specific email domains
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5" />
              <div className="text-sm text-neutral-300">
                <p className="font-medium mb-1">How it works</p>
                <p className="text-neutral-400">
                  If no domains are added, all email addresses can register. 
                  Once you add domains, only users with those email domains can sign up.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="bg-neutral-800 border-neutral-700"
              placeholder="gmail.com"
              onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
            />
            <Button
              onClick={handleAddDomain}
              className="bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {allowedDomains.map(domain => (
              <div 
                key={domain.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  domain.is_enabled 
                    ? "bg-neutral-800/50 border-neutral-700" 
                    : "bg-neutral-800/20 border-neutral-800 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-neutral-500" />
                  <span className="text-neutral-200">@{domain.domain}</span>
                  {domain.is_enabled ? (
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
                      Active
                    </Badge>
                  ) : (
                    <Badge className="bg-neutral-500/10 text-neutral-400 border-neutral-500/30 text-xs">
                      Disabled
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={domain.is_enabled}
                    onCheckedChange={() => handleToggleDomain(domain)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDomain(domain)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {allowedDomains.length === 0 && (
            <div className="text-center py-8 text-neutral-500">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No domains configured.</p>
              <p className="text-sm">All email domains are currently allowed.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
