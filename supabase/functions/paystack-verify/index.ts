import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!PAYSTACK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Server not configured properly" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get reference from URL query params
    const url = new URL(req.url);
    const reference = url.searchParams.get("reference");

    if (!reference) {
      // Redirect to wallet with error
      return Response.redirect(`${url.origin.replace('functions/v1/paystack-verify', '')}/dashboard/wallet?payment=error`, 302);
    }

    // Verify transaction with Paystack
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const verifyData = await verifyResponse.json();

    if (!verifyData.status || verifyData.data.status !== "success") {
      console.error("Payment verification failed:", verifyData);
      // Redirect to wallet with error
      const appUrl = Deno.env.get("APP_URL") || "https://tikswap.online";
      return Response.redirect(`${appUrl}/dashboard/wallet?payment=failed`, 302);
    }

    const { user_id, points } = verifyData.data.metadata;
    const amountPaid = verifyData.data.amount / 100; // Convert from kobo to naira

    // Check if this transaction was already processed
    const { data: existingTx } = await supabase
      .from("transactions")
      .select("id")
      .eq("reference_id", reference)
      .single();

    if (existingTx) {
      // Already processed, redirect to success
      const appUrl = Deno.env.get("APP_URL") || "https://tikswap.online";
      return Response.redirect(`${appUrl}/dashboard/wallet?payment=success`, 302);
    }

    // Update user's points
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tik_points")
      .eq("user_id", user_id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      const appUrl = Deno.env.get("APP_URL") || "https://tikswap.online";
      return Response.redirect(`${appUrl}/dashboard/wallet?payment=error`, 302);
    }

    const newBalance = (profile?.tik_points || 0) + parseInt(points);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ tik_points: newBalance })
      .eq("user_id", user_id);

    if (updateError) {
      console.error("Error updating points:", updateError);
      const appUrl = Deno.env.get("APP_URL") || "https://tikswap.online";
      return Response.redirect(`${appUrl}/dashboard/wallet?payment=error`, 302);
    }

    // Log transaction
    await supabase.from("transactions").insert({
      user_id,
      amount: parseInt(points),
      type: "purchase",
      description: `Purchased ${points} TikPoints for ₦${amountPaid}`,
      reference_id: reference,
    });

    // Create notification
    await supabase.from("notifications").insert({
      user_id,
      type: "purchase",
      title: "Points Purchased!",
      message: `You successfully purchased ${points} TikPoints.`,
    });

    // Redirect to wallet with success
    const appUrl = Deno.env.get("APP_URL") || "https://tikswap.online";
    return Response.redirect(`${appUrl}/dashboard/wallet?payment=success`, 302);
  } catch (error) {
    console.error("Error:", error);
    const appUrl = Deno.env.get("APP_URL") || "https://tikswap.online";
    return Response.redirect(`${appUrl}/dashboard/wallet?payment=error`, 302);
  }
});