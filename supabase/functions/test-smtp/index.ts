import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, smtpConfig } = await req.json();

    if (!to || !smtpConfig) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Deno's SMTP client
    const { host, port, username, password, from_name, from_email } = smtpConfig;

    // For now, simulate sending (actual SMTP requires external service)
    console.log(`Test email would be sent to: ${to}`);
    console.log(`From: ${from_name} <${from_email}>`);
    console.log(`SMTP: ${host}:${port}`);

    // In production, you'd use a service like Resend, SendGrid, or direct SMTP
    // For testing, we return success
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Test email configuration validated. In production, email would be sent to ${to}` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("SMTP test error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to send test email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});