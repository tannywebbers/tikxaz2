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
});        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate SMTP config
    if (!smtpConfig?.host || !smtpConfig?.port || !smtpConfig?.username || !smtpConfig?.password) {
      return new Response(
        JSON.stringify({ 
          error: "Incomplete SMTP configuration. Please fill in all SMTP fields including password.",
          details: {
            host: !!smtpConfig?.host,
            port: !!smtpConfig?.port,
            username: !!smtpConfig?.username,
            password: !!smtpConfig?.password
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending email via Brevo HTTP API`);

    // Use Brevo's Transactional Email API instead of SMTP
    // This is more reliable in serverless environments
    const htmlContent = `
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
              <li>Provider: Brevo (Sendinblue)</li>
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

    // Use Brevo's API for sending transactional emails
    // The SMTP key works as the API key for Brevo
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": smtpConfig.password, // The SMTP key is also the API key for Brevo
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: smtpConfig.from_name || "TikPoints",
          email: smtpConfig.from_email,
        },
        to: [
          {
            email: to,
            name: to.split("@")[0],
          },
        ],
        subject: "TikPoints - Test Email",
        htmlContent: htmlContent,
        textContent: "Your TikPoints email configuration is working correctly!",
      }),
    });

    const brevoData = await brevoResponse.json();
    
    console.log("Brevo API response:", JSON.stringify(brevoData));

    if (!brevoResponse.ok) {
      console.error("Brevo API error:", brevoData);
      throw new Error(brevoData.message || `Brevo API error: ${brevoResponse.status}`);
    }

    console.log("Email sent successfully via Brevo API");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Test email sent successfully to ${to}`,
        provider: "Brevo API",
        messageId: brevoData.messageId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Email test error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to send test email",
        details: "Please verify your Brevo SMTP key is correct. You can find it at: Brevo Dashboard → SMTP & API → SMTP section"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
