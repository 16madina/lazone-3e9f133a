import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { amount, currency, listingType, propertyId, successUrl, cancelUrl } = await req.json();

    if (!amount || !currency || !listingType) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    // Create a unique reference for this payment
    const transactionRef = `LZ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Zero-decimal currencies don't need to multiply by 100
    const zeroDecimalCurrencies = ['xof', 'xaf', 'xpf', 'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv'];
    const currencyLower = currency.toLowerCase();
    const unitAmount = zeroDecimalCurrencies.includes(currencyLower) 
      ? Math.round(amount) 
      : Math.round(amount * 100);

    console.log(`Creating checkout: amount=${amount}, currency=${currencyLower}, unitAmount=${unitAmount}`);

    const modeParam = listingType === "short_term" ? "residence" : "lazone";

    const withParams = (baseUrl: string, params: Record<string, string>) => {
      try {
        const url = new URL(baseUrl);
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined && value !== null && value !== "") {
            url.searchParams.set(key, value);
          }
        }
        return url.toString();
      } catch {
        return baseUrl;
      }
    };

    const defaultOrigin = req.headers.get("origin") || "";
    const successUrlFinal = withParams(
      successUrl || `${defaultOrigin}/publish?payment=success`,
      {
        mode: modeParam,
        listingType,
        propertyId: propertyId || "",
        transactionRef,
      }
    );

    const cancelUrlFinal = withParams(
      cancelUrl || `${defaultOrigin}/publish?payment=cancelled`,
      {
        mode: modeParam,
        listingType,
        propertyId: propertyId || "",
        transactionRef,
      }
    );

    const successUrlWithSessionId = successUrlFinal.includes("?")
      ? `${successUrlFinal}&session_id={CHECKOUT_SESSION_ID}`
      : `${successUrlFinal}?session_id={CHECKOUT_SESSION_ID}`;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currencyLower,
            product_data: {
              name: "Crédit annonce LaZone",
              description: listingType === "short_term"
                ? "1 crédit pour publier une annonce (Mode Résidence)"
                : "1 crédit pour publier une annonce (Mode Immobilier)",
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrlWithSessionId,
      cancel_url: cancelUrlFinal,
      metadata: {
        user_id: user.id,
        listing_type: listingType,
        property_id: propertyId || "",
        transaction_ref: transactionRef,
      },
      customer_email: user.email,
    });

    // Create a pending payment record
    const { error: paymentError } = await supabase
      .from("listing_payments")
      .insert({
        user_id: user.id,
        amount: amount,
        currency: currency,
        status: "pending",
        payment_method: "stripe",
        transaction_ref: transactionRef,
        listing_type: listingType,
        property_id: propertyId || null,
      });

    if (paymentError) {
      console.error("Error creating payment record:", paymentError);
    }

    console.log(`Checkout session created for user ${user.id}: ${session.id}`);

    return new Response(
      JSON.stringify({ 
        sessionId: session.id,
        url: session.url,
        transactionRef,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
