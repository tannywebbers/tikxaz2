import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  console.log("Paystack webhook called");

  if (!PAYSTACK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing environment variables");
    return new Response(
      JSON.stringify({ error: "Server not configured properly" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    console.log("Received webhook, signature:", signature ? "present" : "missing");

    // Verify webhook signature
    if (signature) {
      const hash = createHmac("sha512", PAYSTACK_SECRET_KEY)
        .update(body)
        .digest("hex");

      if (hash !== signature) {
        console.error("Invalid webhook signature");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Signature verified successfully");
    }

    const event = JSON.parse(body);
    console.log("Webhook event:", event.event);

    // Only process successful charges
    if (event.event !== "charge.success") {
      console.log("Ignoring event:", event.event);
      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = event.data;
    const { user_id, points } = data.metadata || {};
    const reference = data.reference;
    const amountPaid = data.amount / 100; // Convert from kobo to naira

    console.log("Processing payment:", { user_id, points, reference, amountPaid });

    if (!user_id || !points || !reference) {
      console.error("Missing required metadata:", data.metadata);
      return new Response(
        JSON.stringify({ error: "Missing metadata" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if this transaction was already processed
    const { data: existingTx } = await supabase
      .from("transactions")
      .select("id")
      .eq("reference_id", reference)
      .maybeSingle();

    if (existingTx) {
      console.log("Transaction already processed:", reference);
      return new Response(
        JSON.stringify({ received: true, already_processed: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current user points
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tik_points")
      .eq("user_id", user_id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pointsToAdd = parseInt(points);
    const newBalance = (profile?.tik_points || 0) + pointsToAdd;

    console.log("Updating points:", { currentBalance: profile?.tik_points, pointsToAdd, newBalance });

    // Update user's points
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ tik_points: newBalance })
      .eq("user_id", user_id);

    if (updateError) {
      console.error("Error updating points:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update points" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log transaction
    const { error: txError } = await supabase.from("transactions").insert({
      user_id,
      amount: pointsToAdd,
      type: "purchase",
      description: `Purchased ${pointsToAdd} TikPoints for ₦${amountPaid}`,
      reference_id: reference,
    });

    if (txError) {
      console.error("Error logging transaction:", txError);
    }

    // Create notification
    await supabase.from("notifications").insert({
      user_id,
      type: "purchase",
      title: "Points Purchased!",
      message: `You successfully purchased ${pointsToAdd} TikPoints.`,
    });

    console.log("Webhook processed successfully!");

    return new Response(
      JSON.stringify({ received: true, success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
