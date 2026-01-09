import { useEffect, useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { Footer } from "@/components/landing/Footer";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Loader2 } from "lucide-react";

interface SiteSettings {
  site_name?: string;
  logo_url?: string;
  support_email?: string;
  maintenance_mode?: boolean;
}

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("platform_settings")
          .select("key, value")
          .eq("key", "site_settings")
          .maybeSingle();

        if (!error && data) {
          const settings = data.value as SiteSettings;
          setSiteSettings(settings);
          setMaintenanceMode(settings.maintenance_mode || false);
        }
      } catch (err) {
        console.error("Error fetching site settings:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (maintenanceMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-warning" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Under Maintenance</h1>
          <p className="text-muted-foreground mb-6">
            {siteSettings.site_name || "TikPoints"} is currently undergoing scheduled maintenance. 
            We'll be back shortly. Thank you for your patience!
          </p>
          {siteSettings.support_email && (
            <p className="text-sm text-muted-foreground">
              For urgent inquiries, contact us at{" "}
              <a href={`mailto:${siteSettings.support_email}`} className="text-primary hover:underline">
                {siteSettings.support_email}
              </a>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <HowItWorks />
      <FeaturesSection />
      <PricingSection />
      <Footer />
    </div>
  );
};

export default Index;