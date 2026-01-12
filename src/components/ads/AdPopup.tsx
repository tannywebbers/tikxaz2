import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdPopupProps {
  adType: "popup" | "popunder" | "interstitial";
  showOnce?: boolean;
}

export function AdPopup({ adType, showOnce = true }: AdPopupProps) {
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    // Check if already shown in this session
    const storageKey = `ad_shown_${adType}`;
    if (showOnce && sessionStorage.getItem(storageKey)) {
      return;
    }

    const loadAd = async () => {
      try {
        const { data, error } = await supabase
          .from("ad_settings")
          .select("is_enabled, ad_code")
          .eq("ad_type", adType)
          .single();

        if (error || !data?.is_enabled || !data?.ad_code || hasShown) {
          return;
        }

        // Execute the ad script
        const script = document.createElement("script");
        const scriptMatch = data.ad_code.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
        
        if (scriptMatch) {
          // Check for src attribute
          const srcMatch = data.ad_code.match(/src=["']([^"']+)["']/);
          if (srcMatch) {
            script.src = srcMatch[1];
            script.async = true;
          } else {
            script.textContent = scriptMatch[1];
          }
          
          document.body.appendChild(script);
          
          setHasShown(true);
          if (showOnce) {
            sessionStorage.setItem(storageKey, "true");
          }
        }
      } catch (error) {
        console.error("Error loading popup ad:", error);
      }
    };

    // Delay popup ads slightly to not interrupt initial load
    const timer = setTimeout(loadAd, 3000);
    return () => clearTimeout(timer);
  }, [adType, showOnce, hasShown]);

  // This component doesn't render anything visible - the ad script handles the popup
  return null;
}