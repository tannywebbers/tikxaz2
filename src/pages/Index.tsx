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
import { AdBanner } from "@/components/ads/AdBanner";
import { AdPopup } from "@/components/ads/AdPopup";
import { SocialBar } from "@/components/ads/SocialBar";

interface SiteSettings {
  site_name?: string;
  site_logo?: string;
  support_email?: string;
  maintenance_mode?: boolean;
}

interface LandingSection {
  section_key: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  image_url: string | null;
  button_text: string | null;
  button_url: string | null;
  is_visible: boolean;
}

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({});
  const [sections, setSections] = useState<Record<string, LandingSection>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch site settings
        const { data: settingsData } = await supabase
          .from("platform_settings")
          .select("key, value")
          .eq("key", "site_settings")
          .maybeSingle();

        if (settingsData) {
          const settings = settingsData.value as SiteSettings;
          setSiteSettings(settings);
          setMaintenanceMode(settings.maintenance_mode || false);

          // Update PWA manifest dynamically if logo is set
          if (settings.site_logo) {
            updatePWAManifest(settings);
          }
        }

        // Fetch landing content
        const { data: landingData } = await supabase
          .from("landing_content")
          .select("*")
          .order("sort_order");

        if (landingData) {
          const sectionsMap: Record<string, LandingSection> = {};
          landingData.forEach((section) => {
            sectionsMap[section.section_key] = section;
          });
          setSections(sectionsMap);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update PWA manifest with admin-configured logo
  const updatePWAManifest = (settings: SiteSettings) => {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink && settings.site_logo) {
      // Create a dynamic manifest
      const manifest = {
        name: settings.site_name || "TikPoints",
        short_name: settings.site_name || "TikPoints",
        description: "Earn points by engaging with TikTok content",
        theme_color: "#ec4899",
        background_color: "#0a0a0f",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: settings.site_logo,
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: settings.site_logo,
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: settings.site_logo,
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      };

      const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
      const manifestURL = URL.createObjectURL(blob);
      manifestLink.setAttribute('href', manifestURL);
    }

    // Update document title
    if (settings.site_name) {
      document.title = `${settings.site_name} - TikTok Engagement Exchange`;
    }
  };

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

  // Prepare hero content from DB
  const heroContent = sections.hero ? {
    title: sections.hero.title || "Earn & Grow on TikTok",
    subtitle: sections.hero.subtitle || "AI-Powered TikTok Engagement Exchange",
    content: sections.hero.content || "Exchange engagement for TikPoints. Complete tasks to earn, or boost your content with authentic engagement from real users.",
    button_text: sections.hero.button_text || "Start Earning Now",
    button_url: sections.hero.button_url || "/register",
    is_visible: sections.hero.is_visible,
  } : undefined;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Top Banner Ad */}
      <AdBanner adType="banner_top" className="w-full flex justify-center py-2 bg-muted/30" />
      
      {/* Hero Section - pass DB content */}
      <HeroSection content={heroContent} />
      
      {/* Stats Section */}
      {sections.stats?.is_visible !== false && <StatsSection />}
      
      {/* How It Works */}
      {sections.how_it_works?.is_visible !== false && <HowItWorks />}
      
      {/* Features Section */}
      {sections.features?.is_visible !== false && <FeaturesSection />}
      
      {/* Pricing Section */}
      <PricingSection />
      
      {/* Bottom Banner Ad */}
      <AdBanner adType="banner_bottom" className="w-full flex justify-center py-4 bg-muted/30" />
      
      <Footer />
      
      {/* Popup Ads */}
      <AdPopup adType="popup" />
      <AdPopup adType="popunder" />
      <AdPopup adType="interstitial" />
      
      {/* Social Bar */}
      <SocialBar />
    </div>
  );
};

export default Index;
