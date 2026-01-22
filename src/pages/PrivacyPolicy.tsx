import { useState, useEffect } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function PrivacyPolicy() {
  const [content, setContent] = useState<{
    title: string;
    content: string;
    updated_at?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appName, setAppName] = useState("TikPoints");

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const [{ data: pageData }, { data: appSettings }] = await Promise.all([
        supabase
          .from("landing_content")
          .select("*")
          .eq("section_key", "privacy_policy")
          .maybeSingle(),
        supabase.from("app_settings").select("app_name").limit(1).maybeSingle(),
      ]);

      if (appSettings?.app_name) {
        setAppName(appSettings.app_name);
      }

      if (pageData) {
        setContent({
          title: pageData.title || "Privacy Policy",
          content: pageData.content || getDefaultPrivacyPolicy(appSettings?.app_name || "TikPoints"),
          updated_at: pageData.updated_at,
        });
      } else {
        setContent({
          title: "Privacy Policy",
          content: getDefaultPrivacyPolicy(appSettings?.app_name || "TikPoints"),
        });
      }
    } catch (error) {
      console.error("Error fetching privacy policy:", error);
      setContent({
        title: "Privacy Policy",
        content: getDefaultPrivacyPolicy("TikPoints"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultPrivacyPolicy = (name: string) => `
<h2>Introduction</h2>
<p>Welcome to ${name}. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you about how we handle your personal data when you visit our website and use our services.</p>

<h2>Information We Collect</h2>
<p>We collect information you provide directly to us, such as:</p>
<ul>
<li>Account information (email, username, profile details)</li>
<li>TikTok username and display name</li>
<li>Transaction history and points balance</li>
<li>Screenshots submitted for task verification</li>
<li>Communications with our support team</li>
</ul>

<h2>How We Use Your Information</h2>
<p>We use the information we collect to:</p>
<ul>
<li>Provide, maintain, and improve our services</li>
<li>Process transactions and send related information</li>
<li>Send technical notices and support messages</li>
<li>Respond to your comments and questions</li>
<li>Detect and prevent fraudulent activity</li>
</ul>

<h2>Data Security</h2>
<p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>

<h2>Your Rights</h2>
<p>You have the right to:</p>
<ul>
<li>Access your personal data</li>
<li>Correct inaccurate data</li>
<li>Request deletion of your data</li>
<li>Object to processing of your data</li>
</ul>

<h2>Contact Us</h2>
<p>If you have any questions about this Privacy Policy, please contact us through our support channels.</p>
  `;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">{content?.title}</h1>
        {content?.updated_at && (
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date(content.updated_at).toLocaleDateString()}
          </p>
        )}
        <div 
          className="prose prose-lg dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: content?.content || "" }}
        />
      </main>
      <Footer />
    </div>
  );
}
