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
    const { to, smtpConfig } = await req.json() as { to: string; smtpConfig: SMTPConfig };

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

    console.log(`Attempting to send email via SMTP: ${smtpConfig.host}:${smtpConfig.port}`);

    // Create SMTP client
    const client = new SmtpClient();

    // Determine if we should use TLS based on port
    const useTLS = smtpConfig.port === 465;
    const useSTARTTLS = smtpConfig.port === 587 || smtpConfig.port === 25;

    try {
      // Connect to SMTP server
      if (useTLS) {
        await client.connectTLS({
          hostname: smtpConfig.host,
          port: smtpConfig.port,
          username: smtpConfig.username,
          password: smtpConfig.password,
        });
      } else {
        await client.connect({
          hostname: smtpConfig.host,
          port: smtpConfig.port,
          username: smtpConfig.username,
          password: smtpConfig.password,
        });
      }

      console.log("SMTP connection established");

      const subject = "TikPoints - Test Email";
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
              <p>This is a test email from your TikPoints application. If you're receiving this, your SMTP configuration is working correctly!</p>
              <p><strong>Test Details:</strong></p>
              <ul>
                <li>Sent to: ${to}</li>
                <li>Timestamp: ${new Date().toISOString()}</li>
                <li>SMTP Host: ${smtpConfig.host}</li>
                <li>SMTP Port: ${smtpConfig.port}</li>
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

      // Send the email
      await client.send({
        from: smtpConfig.from_email,
        to: to,
        subject: subject,
        content: "Your email client does not support HTML. Please view this in a modern email client.",
        html: htmlContent,
      });

      console.log("Email sent successfully");

      // Close connection
      await client.close();

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Test email sent successfully to ${to}`,
          provider: "SMTP",
          host: smtpConfig.host
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (smtpError) {
      console.error("SMTP Error:", smtpError);
      
      // Try to close connection if open
      try { await client.close(); } catch {}
      
      return new Response(
        JSON.stringify({ 
          error: `SMTP Error: ${smtpError instanceof Error ? smtpError.message : "Connection failed"}`,
          details: "Please check your SMTP credentials and server settings. Common issues: wrong password, blocked port, or server requires specific security settings."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("SMTP test error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to send test email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
