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

  const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const APP_URL = Deno.env.get("APP_URL") || "https://tikswap.online";
  
  console.log("paystack-verify called, method:", req.method);
  console.log("APP_URL:", APP_URL);

  if (!PAYSTACK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing environment variables");
    return Response.redirect(`${APP_URL}/dashboard/wallet?payment=error&reason=config`, 302);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get reference from URL query params (Paystack callback)
    const url = new URL(req.url);
    const reference = url.searchParams.get("reference") || url.searchParams.get("trxref");

    console.log("Reference from URL:", reference);

    if (!reference) {
      console.error("No reference provided");
      return Response.redirect(`${APP_URL}/dashboard/wallet?payment=error&reason=no_reference`, 302);
    }

    // Verify transaction with Paystack
    console.log("Verifying with Paystack...");
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const verifyData = await verifyResponse.json();
    console.log("Paystack verification response:", JSON.stringify(verifyData, null, 2));

    if (!verifyData.status || verifyData.data.status !== "success") {
      console.error("Payment verification failed:", verifyData);
      return Response.redirect(`${APP_URL}/dashboard/wallet?payment=failed&reason=not_successful`, 302);
    }

    const { user_id, points } = verifyData.data.metadata;
    const amountPaid = verifyData.data.amount / 100; // Convert from kobo to naira

    console.log("Payment details:", { user_id, points, amountPaid });

    if (!user_id || !points) {
      console.error("Missing metadata:", verifyData.data.metadata);
      return Response.redirect(`${APP_URL}/dashboard/wallet?payment=error&reason=missing_metadata`, 302);
    }

    // Check if this transaction was already processed (by webhook)
    const { data: existingTx, error: txCheckError } = await supabase
      .from("transactions")
      .select("id")
      .eq("reference_id", reference)
      .maybeSingle();

    if (txCheckError) {
      console.error("Error checking existing transaction:", txCheckError);
    }

    // If already processed by webhook, just redirect to success
    if (existingTx) {
      console.log("Transaction already processed by webhook, redirecting to success");
      return Response.redirect(`${APP_URL}/dashboard/wallet?payment=success&points=${points}`, 302);
    }

    // If webhook hasn't processed it yet, process it here (fallback)
    console.log("Webhook hasn't processed yet, processing as fallback...");

    // Get current user points
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tik_points")
      .eq("user_id", user_id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return Response.redirect(`${APP_URL}/dashboard/wallet?payment=error&reason=profile_not_found`, 302);
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
      return Response.redirect(`${APP_URL}/dashboard/wallet?payment=error&reason=update_failed`, 302);
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
      // Don't fail the whole thing, points were already added
    }

    // Create notification
    await supabase.from("notifications").insert({
      user_id,
      type: "purchase",
      title: "Points Purchased!",
      message: `You successfully purchased ${pointsToAdd} TikPoints.`,
    });

    console.log("Payment processed successfully via callback fallback!");

    // Redirect to wallet with success
    return Response.redirect(`${APP_URL}/dashboard/wallet?payment=success&points=${pointsToAdd}`, 302);
  } catch (error) {
    console.error("Error processing payment:", error);
    return Response.redirect(`${APP_URL}/dashboard/wallet?payment=error&reason=exception`, 302);
  }
});
