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
  AlertCircle,
  Info
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
  smtp_password: string | null;
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
  const [testEmail, setTestEmail] = useState("");
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
        // Load saved password if exists
        if (smtp.smtp_password) {
          setSmtpPassword(smtp.smtp_password);
        }
      } else {
        // Initialize with Brevo defaults
        setSmtpConfig({
          id: "",
          host: "smtp-relay.brevo.com",
          port: 587,
          username: "",
          password_set: false,
          smtp_password: null,
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
    
    if (!smtpConfig.host || !smtpConfig.from_email || !smtpConfig.username) {
      toast({ variant: "destructive", title: "Error", description: "Please fill in host, username, and from email." });
      return;
    }
    
    setIsSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        host: smtpConfig.host,
        port: smtpConfig.port,
        username: smtpConfig.username,
        from_name: smtpConfig.from_name,
        from_email: smtpConfig.from_email,
        is_enabled: smtpConfig.is_enabled,
      };

      // Always save the password if provided
      if (smtpPassword) {
        updateData.password_set = true;
        updateData.smtp_password = smtpPassword;
      }

      if (smtpConfig.id) {
        const { error } = await supabase
          .from("smtp_config")
          .update(updateData)
          .eq("id", smtpConfig.id);
        
        if (error) throw error;
      } else {
        const insertData = {
          host: smtpConfig.host,
          port: smtpConfig.port,
          username: smtpConfig.username,
          from_name: smtpConfig.from_name,
          from_email: smtpConfig.from_email,
          is_enabled: smtpConfig.is_enabled,
          password_set: !!smtpPassword,
          smtp_password: smtpPassword || null
        };
        const { data, error } = await supabase
          .from("smtp_config")
          .insert(insertData)
          .select()
          .single();
        
        if (error) throw error;
        setSmtpConfig(data);
      }

      toast({ title: "Saved", description: "SMTP configuration saved successfully. Your API key is now stored." });
      fetchConfig();
    } catch (error) {
      console.error("Error saving SMTP:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save SMTP configuration." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast({ variant: "destructive", title: "Error", description: "Please enter an email address to send test to." });
      return;
    }

    if (!smtpConfig?.host || !smtpConfig?.username || !smtpPassword) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "Please fill in all SMTP fields including password before testing." 
      });
      return;
    }
    
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-smtp", {
        body: {
          to: testEmail,
          smtpConfig: {
            host: smtpConfig.host,
            port: smtpConfig.port,
            username: smtpConfig.username,
            password: smtpPassword,
            from_name: smtpConfig.from_name,
            from_email: smtpConfig.from_email,
          }
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({ title: "Success! 🎉", description: data.message || "Test email sent successfully!" });
        setTestEmail("");
      } else {
        throw new Error(data?.error || "Failed to send email");
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send test email";
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setIsTesting(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;
    
    const domain = newDomain.toLowerCase().trim();
    
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
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Email Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure SMTP email sending for verification codes and notifications
        </p>
      </div>

      {/* Brevo Setup Guide */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Info className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <CardTitle>Brevo (Sendinblue) SMTP Setup</CardTitle>
              <CardDescription>
                Free tier includes 300 emails/day - perfect for getting started
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>Quick Setup:</strong></p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Go to <a href="https://www.brevo.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">brevo.com</a> and create a free account</li>
              <li>Navigate to Settings → SMTP & API</li>
              <li>Copy your SMTP Key (this is your password)</li>
              <li>Host: <code className="bg-muted px-1.5 py-0.5 rounded">smtp-relay.brevo.com</code></li>
              <li>Port: <code className="bg-muted px-1.5 py-0.5 rounded">587</code></li>
              <li>Username: Your Brevo login email</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* SMTP Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Server className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle>SMTP Settings</CardTitle>
              <CardDescription>
                Configure your Brevo or other SMTP provider
              </CardDescription>
            </div>
            {smtpConfig?.is_enabled && smtpConfig?.password_set && (
              <Badge className="bg-success/10 text-success border-success/20">
                <Check className="w-3 h-3 mr-1" />
                Configured
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>SMTP Host *</Label>
              <Input
                value={smtpConfig?.host || ""}
                onChange={(e) => setSmtpConfig(prev => prev ? { ...prev, host: e.target.value } : null)}
                placeholder="smtp-relay.brevo.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input
                type="number"
                value={smtpConfig?.port || 587}
                onChange={(e) => setSmtpConfig(prev => prev ? { ...prev, port: parseInt(e.target.value) } : null)}
                placeholder="587"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Username (Login Email) *</Label>
              <Input
                value={smtpConfig?.username || ""}
                onChange={(e) => setSmtpConfig(prev => prev ? { ...prev, username: e.target.value } : null)}
                placeholder="your@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label>SMTP Key / Password *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  className="pr-10"
                  placeholder="Enter your Brevo SMTP key"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {smtpPassword && (
                <p className="text-xs text-success flex items-center gap-1">
                  <Check className="w-3 h-3" /> Password loaded from database
                </p>
              )}
              {!smtpPassword && smtpConfig?.password_set && (
                <p className="text-xs text-warning flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Please re-enter your SMTP key
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>From Name</Label>
              <Input
                value={smtpConfig?.from_name || ""}
                onChange={(e) => setSmtpConfig(prev => prev ? { ...prev, from_name: e.target.value } : null)}
                placeholder="TikPoints"
              />
            </div>
            <div className="space-y-2">
              <Label>From Email *</Label>
              <Input
                value={smtpConfig?.from_email || ""}
                onChange={(e) => setSmtpConfig(prev => prev ? { ...prev, from_email: e.target.value } : null)}
                placeholder="noreply@yourdomain.com"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <Switch
                checked={smtpConfig?.is_enabled || false}
                onCheckedChange={(checked) => setSmtpConfig(prev => prev ? { ...prev, is_enabled: checked } : null)}
              />
              <Label>Enable SMTP</Label>
            </div>
            
            <Button
              onClick={handleSaveSMTP}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save SMTP Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Email Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-success" />
            </div>
            <div>
              <CardTitle>Send Test Email</CardTitle>
              <CardDescription>
                Verify your SMTP configuration is working
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!smtpPassword && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Enter your SMTP password above before sending a test email
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter your email address"
            />
            <Button
              onClick={handleTestEmail}
              disabled={isTesting || !testEmail || !smtpPassword}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send Test
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            A test email will be sent to verify your SMTP configuration is working correctly
          </p>
        </CardContent>
      </Card>

      {/* Allowed Email Domains */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <CardTitle>Allowed Email Domains</CardTitle>
              <CardDescription>
                Restrict registration to specific email domains (leave empty to allow all)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {allowedDomains.length === 0 ? (
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-muted-foreground text-sm">
                No domain restrictions. All email domains are allowed.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {allowedDomains.map((domain) => (
                <div
                  key={domain.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={domain.is_enabled}
                      onCheckedChange={() => handleToggleDomain(domain)}
                    />
                    <span className={domain.is_enabled ? "" : "text-muted-foreground line-through"}>
                      {domain.domain}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteDomain(domain)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="gmail.com"
              onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
            />
            <Button onClick={handleAddDomain} disabled={!newDomain.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Domain
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
