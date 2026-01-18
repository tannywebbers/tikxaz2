import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, smtpConfig } = await req.json() as {
      to: string;
      smtpConfig: SMTPConfig;
    };

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

    // Validate SMTP config
    if (
      !smtpConfig?.host ||
      !smtpConfig?.port ||
      !smtpConfig?.username ||
      !smtpConfig?.password ||
      !smtpConfig?.from_email
    ) {
      return new Response(
        JSON.stringify({
          error: "Incomplete SMTP configuration",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Connecting to SMTP: ${smtpConfig.host}:${smtpConfig.port}`);

    const client = new SmtpClient();

    try {
      /**
       * IMPORTANT:
       * Brevo REQUIRES TLS (STARTTLS on 587)
       * Do NOT use client.connect()
       */
      await client.connectTLS({
        hostname: smtpConfig.host,
        port: smtpConfig.port, // 587
        username: smtpConfig.username, // e.g. 82f1da002@smtp-brevo.com
        password: smtpConfig.password, // SMTP key
      });

      console.log("SMTP TLS connection established");

      const subject = "TikPoints - Test Email";

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; background:#f9f9f9; padding:20px;">
          <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:10px;overflow:hidden">
            <div style="background:#ec4899;padding:20px;color:#fff;text-align:center">
              <h1>🎉 TikPoints</h1>
            </div>
            <div style="padding:30px;color:#333">
              <h2 style="color:#10b981">✅ Email Configuration Working!</h2>
              <p>This is a test email from your TikPoints application.</p>
              <ul>
                <li><strong>Recipient:</strong> ${to}</li>
                <li><strong>Time:</strong> ${new Date().toISOString()}</li>
                <li><strong>SMTP:</strong> ${smtpConfig.host}:${smtpConfig.port}</li>
              </ul>
            </div>
            <div style="text-align:center;font-size:12px;color:#777;padding:15px">
              © ${new Date().getFullYear()} TikPoints
            </div>
          </div>
        </body>
        </html>
      `;

      await client.send({
        from: `${smtpConfig.from_name} <${smtpConfig.from_email}>`,
        to,
        subject,
        content: "This email requires an HTML-compatible client.",
        html: htmlContent,
      });

      console.log("Email sent successfully");

      await client.close();

      return new Response(
        JSON.stringify({
          success: true,
          message: `Test email sent to ${to}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (smtpError) {
      console.error("SMTP ERROR:", smtpError);
      try { await client.close(); } catch {}

      return new Response(
        JSON.stringify({
          error: "SMTP connection or send failed",
          details: smtpError instanceof Error ? smtpError.message : smtpError,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Request error:", error);
    return new Response(
      JSON.stringify({ error: "Invalid request payload" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
