import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { email, password, pages, invited_by } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      console.error("Create user error:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user?.id!;
    if (!userId) throw new Error("Failed to create user");

    // Add moderator role
    const { error: roleError } = await supabase.from("user_roles").insert({ user_id: userId, role: "moderator" });
    if (roleError) console.error("Role error:", roleError);

    // Add moderator permissions
    const { error: permError } = await supabase.from("moderator_permissions").insert({
      user_id: userId,
      pages: pages || ["dashboard", "live-chats"],
      can_manage_chat: true,
      invited_by,
    });
    if (permError) console.error("Permissions error:", permError);

    // Send invite email via Brevo if SMTP configured
    const { data: smtpConfig } = await supabase.from("smtp_config").select("*").eq("is_enabled", true).maybeSingle();

    if (smtpConfig?.smtp_password) {
      const appUrl = process.env.APP_URL || "https://tikswap.online";

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ec4899, #8b5cf6); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .credentials { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ec4899; }
            .button { display: inline-block; background: linear-gradient(135deg, #ec4899, #8b5cf6); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>🛡️ Moderator Invitation</h1></div>
            <div class="content">
              <h2>Welcome to the Team!</h2>
              <p>You've been invited to join as a moderator. Use the credentials below to access the admin panel.</p>
              <div class="credentials">
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Password:</strong> ${password}</p>
              </div>
              <p>Click below to access the admin panel:</p>
              <a href="${appUrl}/baki/stage/admin/login" class="button">Access Admin Panel</a>
              <p style="margin-top: 30px; color: #666; font-size: 14px;">Please change your password after first login for security.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "accept": "application/json",
            "api-key": smtpConfig.smtp_password,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            sender: { email: smtpConfig.from_email, name: smtpConfig.from_name },
            to: [{ email }],
            subject: "You've Been Invited as a Moderator!",
            htmlContent: emailHtml,
          }),
        });

        if (!response.ok) console.error("Email send failed:", await response.text());
      } catch (emailErr) {
        console.error("Email error:", emailErr);
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}
