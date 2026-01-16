import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Send email using Resend API
async function sendWithResend(to: string, subject: string, html: string, fromEmail: string, fromName: string): Promise<{ success: boolean; error?: string }> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  
  if (!RESEND_API_KEY) {
    return { success: false, error: "Resend API key not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject: subject,
        html: html
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Failed to send email" };
    }

    const result = await response.json();
    console.log("Email sent successfully:", result);
    return { success: true };
  } catch (error) {
    console.error("Resend error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Send email using SMTP (generic implementation)
async function sendWithSMTP(
  to: string, 
  subject: string, 
  html: string, 
  config: { host: string; port: number; username: string; password: string; from_email: string; from_name: string }
): Promise<{ success: boolean; error?: string }> {
  // For SMTP, we'd need a library like nodemailer in Node.js
  // In Deno edge functions, we use external services instead
  // This is a placeholder that validates the config
  
  if (!config.host || !config.port || !config.username || !config.password) {
    return { success: false, error: "Incomplete SMTP configuration" };
  }

  // Try using Resend as the actual email sender even with SMTP config
  // since direct SMTP from edge functions is unreliable
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (RESEND_API_KEY) {
    return await sendWithResend(to, subject, html, config.from_email, config.from_name);
  }

  return { 
    success: false, 
    error: "SMTP directly from edge functions is not supported. Please configure Resend API key in secrets."
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, smtpConfig, action } = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Email address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subject = "TikPoints - Test Email";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ec4899, #8b5cf6); padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success { color: #10b981; font-size: 24px; text-align: center; margin-bottom: 20px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 TikPoints</h1>
          </div>
          <div class="content">
            <p class="success">✅ Email Configuration Working!</p>
            <p>Hello!</p>
            <p>This is a test email from your TikPoints application. If you're receiving this, your email configuration is working correctly!</p>
            <p><strong>Test Details:</strong></p>
            <ul>
              <li>Sent to: ${to}</li>
              <li>Timestamp: ${new Date().toISOString()}</li>
              <li>Service: ${Deno.env.get("RESEND_API_KEY") ? "Resend" : "SMTP"}</li>
            </ul>
            <p>You can now use email features in your application like:</p>
            <ul>
              <li>Email verification for new users</li>
              <li>Password reset emails</li>
              <li>Notification emails</li>
            </ul>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} TikPoints. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Try Resend first (recommended)
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (RESEND_API_KEY) {
      const fromEmail = smtpConfig?.from_email || "noreply@tikpoints.com";
      const fromName = smtpConfig?.from_name || "TikPoints";
      
      const result = await sendWithResend(to, subject, html, fromEmail, fromName);
      
      if (result.success) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Test email sent successfully to ${to}`,
            provider: "Resend"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ 
            error: result.error || "Failed to send email via Resend",
            provider: "Resend"
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fall back to SMTP config if provided
    if (smtpConfig) {
      const result = await sendWithSMTP(to, subject, html, smtpConfig);
      
      if (result.success) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Test email sent successfully to ${to}`,
            provider: "SMTP"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: result.error }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // No email provider configured
    return new Response(
      JSON.stringify({ 
        error: "No email provider configured. Please add RESEND_API_KEY to your secrets or configure SMTP settings.",
        instructions: "Go to your project secrets and add RESEND_API_KEY. Get your API key from https://resend.com"
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("SMTP test error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to send test email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
