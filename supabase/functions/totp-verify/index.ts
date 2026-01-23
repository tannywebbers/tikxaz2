import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// RFC 4648 Base32 decoding
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input: string): Uint8Array {
  const cleanInput = input.toUpperCase().replace(/=+$/, "");
  const output: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of cleanInput) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    
    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      output.push((value >>> bits) & 0xff);
    }
  }

  return new Uint8Array(output);
}

// HMAC-SHA1 implementation for TOTP
async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  // Create a new ArrayBuffer from the Uint8Array to avoid SharedArrayBuffer issues
  const keyBuffer = new ArrayBuffer(key.length);
  new Uint8Array(keyBuffer).set(key);
  
  const messageBuffer = new ArrayBuffer(message.length);
  new Uint8Array(messageBuffer).set(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageBuffer);
  return new Uint8Array(signature);
}

// Verify TOTP with window tolerance
async function verifyTOTP(secret: string, token: string, window = 1): Promise<boolean> {
  const key = base32Decode(secret);
  
  for (let i = -window; i <= window; i++) {
    const timeStep = 30;
    const time = Math.floor(Date.now() / 1000 / timeStep) + i;
    
    // Convert time to 8-byte buffer (big endian)
    const timeBuffer = new Uint8Array(8);
    let t = time;
    for (let j = 7; j >= 0; j--) {
      timeBuffer[j] = t & 0xff;
      t = Math.floor(t / 256);
    }

    const hmac = await hmacSha1(key, timeBuffer);
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = (
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)
    ) % 1000000;

    if (code.toString().padStart(6, "0") === token) {
      return true;
    }
  }
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { user_id, code, action } = await req.json();

    if (!user_id || !code) {
      return new Response(
        JSON.stringify({ error: "User ID and code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get stored secret
    const { data: totpData, error: fetchError } = await supabase
      .from("admin_totp_secrets")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    if (fetchError || !totpData) {
      return new Response(
        JSON.stringify({ error: "TOTP not set up for this user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if it's a backup code
    if (totpData.backup_codes?.includes(code.toUpperCase())) {
      // Remove used backup code
      const newCodes = totpData.backup_codes.filter((c: string) => c !== code.toUpperCase());
      await supabase
        .from("admin_totp_secrets")
        .update({ backup_codes: newCodes })
        .eq("user_id", user_id);

      return new Response(
        JSON.stringify({ success: true, backup_code_used: true, remaining_codes: newCodes.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify TOTP code
    const isValid = await verifyTOTP(totpData.secret_encrypted, code);

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid code", success: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If this is initial verification, mark as verified
    if (action === "verify-setup" && !totpData.is_verified) {
      await supabase
        .from("admin_totp_secrets")
        .update({ is_verified: true })
        .eq("user_id", user_id);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
