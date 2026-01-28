import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const APP_URL = process.env.APP_URL || "https://tikswap.online";

  if (!PAYSTACK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing environment variables");
    return Response.redirect(`${APP_URL}/dashboard/wallet?payment=error&reason=config`, 302);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const url = new URL(req.url);
    const reference = url.searchParams.get("reference") || url.searchParams.get("trxref");

    if (!reference) {
      console.error("No reference provided");
      return Response.redirect(`${APP_URL}/dashboard/wallet?payment=error&reason=no_reference`, 302);
    }

    // Verify transaction with Paystack
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const verifyData = await verifyResponse.json();

    if (!verifyData.status || verifyData.data.status !== "success") {
      console.error("Payment verification failed:", verifyData);
      return Response.redirect(`${APP_URL}/dashboard/wallet?payment=failed&reason=not_successful`, 302);
    }

    const { user_id, points } = verifyData.data.metadata;
    const amountPaid = verifyData.data.amount / 100;

    if (!user_id || !points) {
      console.error("Missing metadata:", verifyData.data.metadata);
      return Response.redirect(`${APP_URL}/dashboard/wallet?payment=error&reason=missing_metadata`, 302);
    }

    const pointsToAdd = parseInt(points);
    if (!Number.isFinite(pointsToAdd) || pointsToAdd <= 0) {
      console.error("Invalid points:", points);
      return Response.redirect(`${APP_URL}/dashboard/wallet?payment=error&reason=invalid_points`, 302);
    }

    // Call Supabase RPC function to credit points atomically
    const { data: creditResult, error: creditError } = await supabase.rpc("credit_purchase_points", {
      _user_id: user_id,
      _points: pointsToAdd,
      _amount_paid: amountPaid,
      _reference: reference,
    });

    if (creditError) {
      console.error("Error crediting purchase points:", creditError);
      return Response.redirect(`${APP_URL}/dashboard/wallet?payment=error&reason=credit_failed`, 302);
    }

    const alreadyProcessed = Boolean((creditResult as any)?.already_processed);

    return Response.redirect(
      `${APP_URL}/dashboard/wallet?payment=success&points=${pointsToAdd}&already_processed=${alreadyProcessed}`,
      302
    );
  } catch (error) {
    console.error("Error processing payment:", error);
    return Response.redirect(`${APP_URL}/dashboard/wallet?payment=error&reason=exception`, 302);
  }
}
