import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdBannerProps {
  adType: string;
  className?: string;
}

export function AdBanner({ adType, className = "" }: AdBannerProps) {
  const [adCode, setAdCode] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAdSettings();
  }, [adType]);

  useEffect(() => {
    if (adCode && isEnabled && containerRef.current) {
      // Clear previous content
      containerRef.current.innerHTML = "";
      
      // Create a container for the ad
      const adContainer = document.createElement("div");
      adContainer.innerHTML = adCode;
      
      // Execute any scripts in the ad code
      const scripts = adContainer.querySelectorAll("script");
      scripts.forEach((script) => {
        const newScript = document.createElement("script");
        if (script.src) {
          newScript.src = script.src;
          newScript.async = true;
        } else {
          newScript.textContent = script.textContent;
        }
        // Copy attributes
        Array.from(script.attributes).forEach((attr) => {
          if (attr.name !== "src") {
            newScript.setAttribute(attr.name, attr.value);
          }
        });
        containerRef.current?.appendChild(newScript);
      });
      
      // Append non-script content
      const nonScriptContent = adContainer.cloneNode(true) as HTMLElement;
      nonScriptContent.querySelectorAll("script").forEach((s) => s.remove());
      if (nonScriptContent.innerHTML.trim()) {
        containerRef.current.appendChild(nonScriptContent);
      }
    }
  }, [adCode, isEnabled]);

  const fetchAdSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("ad_settings")
        .select("is_enabled, ad_code")
        .eq("ad_type", adType)
        .single();

      if (error) {
        console.error("Error fetching ad settings:", error);
        return;
      }

      setIsEnabled(data?.is_enabled || false);
      setAdCode(data?.ad_code || null);
    } catch (error) {
      console.error("Error fetching ad:", error);
    }
  };

  if (!isEnabled || !adCode) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className={`ad-container ${className}`}
      data-ad-type={adType}
    />
  );
}