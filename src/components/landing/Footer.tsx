import { Link } from "react-router-dom";
import { Coins, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FooterBannerAd } from "@/components/ads/GlobalAdSlots";

interface FooterContent {
  app_name: string;
  description: string;
  platform_links: { label: string; url: string }[];
  support_links: { label: string; url: string }[];
  legal_links: { label: string; url: string }[];
  copyright: string;
}

const defaultContent: FooterContent = {
  app_name: "TikPoints",
  description: "The leading platform for TikTok engagement exchange. Earn and advertise smarter.",
  platform_links: [
    { label: "Browse Tasks", url: "/tasks" },
    { label: "Create Ad", url: "/create-ad" },
    { label: "Wallet", url: "/wallet" },
    { label: "Leaderboard", url: "/leaderboard" },
  ],
  support_links: [
    { label: "Help Center", url: "#" },
    { label: "Contact Us", url: "#" },
    { label: "FAQs", url: "#" },
    { label: "Community", url: "#" },
  ],
  legal_links: [
    { label: "Terms of Service", url: "#" },
    { label: "Privacy Policy", url: "#" },
    { label: "Cookie Policy", url: "#" },
  ],
  copyright: "TikPoints Exchange. All rights reserved.",
};

export function Footer() {
  const [content, setContent] = useState<FooterContent>(defaultContent);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFooterContent();
  }, []);

  const fetchFooterContent = async () => {
    try {
      // Fetch footer section from landing_content
      const { data: footerData } = await supabase
        .from("landing_content")
        .select("*")
        .eq("section_key", "footer")
        .eq("is_visible", true)
        .maybeSingle();

      // Also fetch app settings for app name
      const { data: appSettings } = await supabase
        .from("app_settings")
        .select("app_name, app_description")
        .limit(1)
        .maybeSingle();

      if (footerData?.content) {
        try {
          const parsed = JSON.parse(footerData.content);
          setContent({
            ...defaultContent,
            ...parsed,
            app_name: appSettings?.app_name || parsed.app_name || defaultContent.app_name,
            description: footerData.subtitle || appSettings?.app_description || defaultContent.description,
            copyright: parsed.copyright || `${appSettings?.app_name || defaultContent.app_name} Exchange. All rights reserved.`,
          });
        } catch {
          // If parsing fails, use defaults with app settings
          if (appSettings) {
            setContent(prev => ({
              ...prev,
              app_name: appSettings.app_name || prev.app_name,
              description: appSettings.app_description || prev.description,
            }));
          }
        }
      } else if (appSettings) {
        setContent(prev => ({
          ...prev,
          app_name: appSettings.app_name || prev.app_name,
          description: appSettings.app_description || prev.description,
          copyright: `${appSettings.app_name || prev.app_name} Exchange. All rights reserved.`,
        }));
      }
    } catch (error) {
      console.error("Error fetching footer content:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <footer className="py-12 border-t border-border">
      {/* Footer Ad Banner */}
      <FooterBannerAd className="mb-8" />
      
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Coins className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">{content.app_name}</span>
            </Link>
            <p className="text-muted-foreground text-sm">
              {content.description}
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {content.platform_links.map((link, index) => (
                <li key={index}>
                  <Link to={link.url} className="hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {content.support_links.map((link, index) => (
                <li key={index}>
                  <a href={link.url} className="hover:text-primary transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {content.legal_links.map((link, index) => (
                <li key={index}>
                  <a href={link.url} className="hover:text-primary transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border mt-12 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {content.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
