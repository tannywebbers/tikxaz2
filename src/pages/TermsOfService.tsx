import { useState, useEffect } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function TermsOfService() {
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
          .eq("section_key", "terms_of_service")
          .maybeSingle(),
        supabase.from("app_settings").select("app_name").limit(1).maybeSingle(),
      ]);

      const appName = appSettings?.app_name || "TikPoints";

      if (pageData) {
        setContent({
          title: pageData.title || "Terms of Service",
          content: pageData.content || getDefaultTerms(appName),
          updated_at: pageData.updated_at,
        });
      } else {
        setContent({
          title: "Terms of Service",
          content: getDefaultTerms(appName),
        });
      }
    } catch (error) {
      console.error("Error fetching terms:", error);
      setContent({
        title: "Terms of Service",
        content: getDefaultTerms("TikPoints"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultTerms = (name: string) => `
<h2>1. Acceptance of Terms</h2>
<p>By accessing and using ${name}, you accept and agree to be bound by the terms and provisions of this agreement.</p>

<h2>2. Description of Service</h2>
<p>${name} provides a platform for users to:</p>
<ul>
<li>Complete engagement tasks on TikTok and earn points</li>
<li>Create advertisements to promote TikTok content</li>
<li>Exchange points for services or rewards</li>
</ul>

<h2>3. User Accounts</h2>
<p>To use our services, you must:</p>
<ul>
<li>Be at least 13 years of age</li>
<li>Provide accurate and complete registration information</li>
<li>Maintain the security of your account credentials</li>
<li>Notify us immediately of any unauthorized use</li>
</ul>

<h2>4. Acceptable Use</h2>
<p>You agree not to:</p>
<ul>
<li>Submit fraudulent or fake task completions</li>
<li>Use bots or automated tools</li>
<li>Create multiple accounts</li>
<li>Violate TikTok's terms of service</li>
<li>Engage in any illegal activities</li>
</ul>

<h2>5. Points and Transactions</h2>
<p>Points earned on ${name}:</p>
<ul>
<li>Have no cash value outside the platform</li>
<li>Cannot be transferred between accounts</li>
<li>May be forfeited for policy violations</li>
</ul>

<h2>6. Termination</h2>
<p>We reserve the right to suspend or terminate accounts that violate these terms without prior notice.</p>

<h2>7. Limitation of Liability</h2>
<p>${name} is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the service.</p>

<h2>8. Changes to Terms</h2>
<p>We may modify these terms at any time. Continued use of the service constitutes acceptance of modified terms.</p>

<h2>9. Contact</h2>
<p>For questions about these terms, please contact our support team.</p>
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
