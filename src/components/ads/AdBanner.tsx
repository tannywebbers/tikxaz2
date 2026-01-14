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
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    fetchAdSettings();
  }, [adType]);

  useEffect(() => {
    if (adCode && isEnabled && containerRef.current && !isLoaded) {
      // Clear previous content
      containerRef.current.innerHTML = "";
      
      // Parse and execute the ad code
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = adCode;
      
      // Find all scripts
      const scripts = tempDiv.querySelectorAll("script");
      const nonScriptContent: Node[] = [];
      
      // Clone non-script elements
      tempDiv.childNodes.forEach((node) => {
        if (node.nodeName !== "SCRIPT") {
          nonScriptContent.push(node.cloneNode(true));
        }
      });
      
      // Append non-script content first (like divs with IDs that scripts target)
      nonScriptContent.forEach((node) => {
        containerRef.current?.appendChild(node);
      });
      
      // Execute scripts in order
      scripts.forEach((script) => {
        const newScript = document.createElement("script");
        
        // Copy all attributes
        Array.from(script.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });
        
        // Handle inline script content vs src
        if (script.src) {
          newScript.src = script.src;
          newScript.async = true;
        } else if (script.textContent) {
          newScript.textContent = script.textContent;
        }
        
        // Append to document body for proper execution context
        document.body.appendChild(newScript);
      });
      
      setIsLoaded(true);
    }
  }, [adCode, isEnabled, isLoaded]);

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