import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function SocialBar() {
  const [adCode, setAdCode] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    fetchAdSettings();
  }, []);

  useEffect(() => {
    if (adCode && isEnabled && containerRef.current && !isLoaded) {
      // Execute the ad script
      const scriptMatch = adCode.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      const srcMatch = adCode.match(/src=["']([^"']+)["']/);
      
      if (srcMatch || scriptMatch) {
        const script = document.createElement("script");
        
        if (srcMatch) {
          script.src = srcMatch[1];
          script.async = true;
        } else if (scriptMatch) {
          script.textContent = scriptMatch[1];
        }
        
        document.body.appendChild(script);
        setIsLoaded(true);
      }
    }
  }, [adCode, isEnabled, isLoaded]);

  const fetchAdSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("ad_settings")
        .select("is_enabled, ad_code")
        .eq("ad_type", "social_bar")
        .single();

      if (error) {
        console.error("Error fetching social bar settings:", error);
        return;
      }

      setIsEnabled(data?.is_enabled || false);
      setAdCode(data?.ad_code || null);
    } catch (error) {
      console.error("Error fetching social bar:", error);
    }
  };

  if (!isEnabled || !adCode) {
    return null;
  }

  // Social bar is typically fixed positioned by the ad script itself
  return <div ref={containerRef} className="social-bar-container" />;
}