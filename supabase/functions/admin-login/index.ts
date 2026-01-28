import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function checkRateLimit(ip: string) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  if (entry.count >= MAX_ATTEMPTS) return { allowed: false, remaining: 0 };

  entry.count++;
  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count };
}

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

    const body = await req.json();
    const { email, password, action } = body;

    // Handle log_success
    if (action === "log_success") {
      await supabase.from("admin_login_attempts").insert({
        email,
        is_successful: true,
        attempt_type: body.with2FA ? "2fa_login" : "password",
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
      });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";

    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      await supabase.from("admin_login_attempts").insert({
        email: email || "unknown",
        is_successful: false,
        attempt_type: "rate_limited",
        ip_address: ip,
      });
      return new Response(JSON.stringify({ success: false, rateLimited: true, error: "Too many login attempts" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!email || !password) {
      return new Response(JSON.stringify({ success: false, error: "Email and password are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      await supabase.from("admin_login_attempts").insert({
        email,
        is_successful: false,
        attempt_type: "password",
        ip_address: ip,
      });
      return new Response(JSON.stringify({ success: false, error: "Invalid credentials" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = authData.user.id;
    await supabase.auth.signOut();

    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", userId).in("role", ["admin", "moderator"]);
    if (!roleData || roleData.length === 0) {
      await supabase.from("admin_login_attempts").insert({ email, user_id: userId, is_successful: false, attempt_type: "unauthorized", ip_address: ip });
      return new Response(JSON.stringify({ success: false, error: "Not authorized to access admin panel" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: totpData } = await supabase.from("admin_totp_secrets").select("is_verified, locked_until, failed_attempts").eq("user_id", userId).maybeSingle();

    if (totpData?.locked_until && new Date(totpData.locked_until) > new Date()) {
      const diffMs = new Date(totpData.locked_until).getTime() - Date.now();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return new Response(JSON.stringify({ success: false, locked: true, lockTimeRemaining: `${hours}h ${minutes}m`, error: "Account locked" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (totpData?.is_verified) {
      return new Response(JSON.stringify({ success: true, requires2FA: true, userId }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, requires2FA: false, userId }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}
