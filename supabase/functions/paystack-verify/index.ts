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

    // Credit points + create transaction + notification atomically (idempotent by reference)
    const pointsToAdd = parseInt(points);
    if (!Number.isFinite(pointsToAdd) || pointsToAdd <= 0) {
      console.error("Invalid points:", points);
      return Response.redirect(`${APP_URL}/dashboard/wallet?payment=error&reason=invalid_points`, 302);
    }

    const { data: creditResult, error: creditError } = await supabase.rpc(
      "credit_purchase_points",
      {
        _user_id: user_id,
        _points: pointsToAdd,
        _amount_paid: amountPaid,
        _reference: reference,
      }
    );

    if (creditError) {
      console.error("Error crediting purchase points:", creditError);
      return Response.redirect(`${APP_URL}/dashboard/wallet?payment=error&reason=credit_failed`, 302);
    }

    const alreadyProcessed = Boolean((creditResult as any)?.already_processed);
    console.log("credit_purchase_points result:", creditResult);

    return Response.redirect(
      `${APP_URL}/dashboard/wallet?payment=success&points=${pointsToAdd}&already_processed=${alreadyProcessed}`,
      302
    );
  } catch (error) {
    console.error("Error processing payment:", error);
    return Response.redirect(`${APP_URL}/dashboard/wallet?payment=error&reason=exception`, 302);
  }
});
