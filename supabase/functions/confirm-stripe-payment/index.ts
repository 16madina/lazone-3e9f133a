import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const transactionRef = String(body?.transactionRef || "").trim();

    if (!transactionRef) {
      return new Response(JSON.stringify({ error: "Missing transactionRef" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure this payment belongs to the current user
    const { data: payment, error: paymentError } = await supabase
      .from("listing_payments")
      .select("id, user_id, property_id, status, listing_type")
      .eq("transaction_ref", transactionRef)
      .eq("user_id", user.id)
      .maybeSingle();

    if (paymentError) {
      console.error("Error loading payment:", paymentError);
      return new Response(JSON.stringify({ error: "Failed to load payment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If already completed, ensure property is active (best-effort)
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

    console.log(`[confirm-stripe-payment] Reconciling transactionRef=${transactionRef} user=${user.id}`);

    // Find the matching checkout session by metadata.transaction_ref
    const sessions = await stripe.checkout.sessions.list({ limit: 100 });
    const session = sessions.data.find((s) => s.metadata?.transaction_ref === transactionRef);

    if (!session) {
      console.warn(`[confirm-stripe-payment] No session found for transactionRef=${transactionRef}`);
      return new Response(JSON.stringify({ error: "Stripe session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionUserId = session.metadata?.user_id;
    if (sessionUserId && sessionUserId !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPaid = session.payment_status === "paid";
    const isComplete = session.status === "complete";

    if (!isPaid || !isComplete) {
      console.log(
        `[confirm-stripe-payment] Not paid/complete yet: payment_status=${session.payment_status} status=${session.status}`,
      );
      return new Response(
        JSON.stringify({
          ok: false,
          payment_status: session.payment_status,
          status: session.status,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const propertyId = (session.metadata?.property_id || payment.property_id || "").trim() || null;

    // Mark payment as completed
    const { error: completeError } = await supabase
      .from("listing_payments")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        property_id: propertyId,
      })
      .eq("transaction_ref", transactionRef)
      .eq("user_id", user.id);

    if (completeError) {
      console.error("Error completing payment:", completeError);
      return new Response(JSON.stringify({ error: "Failed to complete payment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Activate property if present
    if (propertyId) {
      const { error: activateError } = await supabase
        .from("properties")
        .update({ is_active: true })
        .eq("id", propertyId)
        .eq("user_id", user.id);

      if (activateError) {
        console.error("Error activating property:", activateError);
      } else {
        // Clean up duplicate pending attempts
        const { error: cleanupError } = await supabase
          .from("listing_payments")
          .update({ status: "failed" })
          .eq("user_id", user.id)
          .eq("property_id", propertyId)
          .eq("status", "pending")
          .neq("transaction_ref", transactionRef);

        if (cleanupError) {
          console.error("Error cleaning up duplicate pending payments:", cleanupError);
        }
      }
    }

    console.log(`[confirm-stripe-payment] Completed and activated property=${propertyId ?? """}`);

    return new Response(
      JSON.stringify({ ok: true, propertyId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("confirm-stripe-payment error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
