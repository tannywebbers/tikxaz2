import { useState, useEffect } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function CookiesPolicy() {
  const [content, setContent] = useState<{
    title: string;
    content: string;
    updated_at?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const [{ data: pageData }, { data: appSettings }] = await Promise.all([
        supabase
          .from("landing_content")
          .select("*")
          .eq("section_key", "cookies_policy")
          .maybeSingle(),
        supabase.from("app_settings").select("app_name").limit(1).maybeSingle(),
      ]);

      const appName = appSettings?.app_name || "TikPoints";

      if (pageData) {
        setContent({
          title: pageData.title || "Cookie Policy",
          content: pageData.content || getDefaultCookies(appName),
          updated_at: pageData.updated_at,
        });
      } else {
        setContent({
          title: "Cookie Policy",
          content: getDefaultCookies(appName),
        });
      }
    } catch (error) {
      console.error("Error fetching cookies policy:", error);
      setContent({
        title: "Cookie Policy",
        content: getDefaultCookies("TikPoints"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultCookies = (name: string) => `
<h2>What Are Cookies</h2>
<p>Cookies are small text files stored on your device when you visit ${name}. They help us provide you with a better experience.</p>

<h2>How We Use Cookies</h2>
<p>We use cookies for:</p>
<ul>
<li><strong>Essential cookies:</strong> Required for the website to function properly (login sessions, security)</li>
<li><strong>Preference cookies:</strong> Remember your settings (theme, language)</li>
<li><strong>Analytics cookies:</strong> Help us understand how visitors interact with our website</li>
<li><strong>Advertising cookies:</strong> Used to deliver relevant advertisements</li>
</ul>

<h2>Types of Cookies We Use</h2>
<h3>Session Cookies</h3>
<p>Temporary cookies that expire when you close your browser. Used for authentication and security.</p>

<h3>Persistent Cookies</h3>
<p>Remain on your device for a set period. Used to remember your preferences and login status.</p>

<h3>Third-Party Cookies</h3>
<p>Set by external services we use, such as analytics and advertising platforms.</p>

<h2>Managing Cookies</h2>
<p>You can control cookies through your browser settings:</p>
<ul>
<li>Block all cookies</li>
<li>Delete existing cookies</li>
<li>Allow cookies from specific websites</li>
</ul>
<p>Note: Disabling cookies may affect the functionality of ${name}.</p>

<h2>Updates to This Policy</h2>
<p>We may update this policy periodically. Check back for the latest information on our cookie practices.</p>

<h2>Contact Us</h2>
<p>If you have questions about our use of cookies, please contact our support team.</p>
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
