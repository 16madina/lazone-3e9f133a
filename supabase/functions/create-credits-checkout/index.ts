import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Product definitions matching iOS StoreKit products
const PRODUCTS: Record<string, { name: string; amount: number; credits: number; type: 'one_time' | 'subscription'; interval?: 'month' }> = {
  'com.lazone.listing.single': {
    name: '1 Crédit Annonce',
    amount: 500,
    credits: 1,
    type: 'one_time',
  },
  'com.lazone.listing.pack5': {
    name: 'Pack 5 Crédits',
    amount: 2250,
    credits: 5,
    type: 'one_time',
  },
  'com.lazone.listing.pack10': {
    name: 'Pack 10 Crédits',
    amount: 4000,
    credits: 10,
    type: 'one_time',
  },
  'com.lazone.sub.pro.monthly': {
    name: 'Abonnement Pro',
    amount: 12000,
    credits: 30,
    type: 'subscription',
    interval: 'month',
  },
  'com.lazone.sub.premium.monthly': {
    name: 'Abonnement Premium',
    amount: 25000,
    credits: 999,
    type: 'subscription',
    interval: 'month',
  },
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

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { productId, successUrl, cancelUrl } = body;

    console.log(`[create-credits-checkout] User ${user.id} requesting product: ${productId}`);

    if (!productId || !PRODUCTS[productId]) {
      return new Response(JSON.stringify({ error: "Produit invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const product = PRODUCTS[productId];
    const transactionRef = `cr_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    // Create Stripe checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'xof',
            product_data: {
              name: product.name,
              description: `${product.credits} crédit(s) pour publier des annonces`,
            },
            unit_amount: product.amount,
            recurring: product.type === 'subscription' ? { interval: product.interval! } : undefined,
          },
          quantity: 1,
        },
      ],
      mode: product.type === 'subscription' ? 'subscription' : 'payment',
      success_url: successUrl || `${req.headers.get('origin')}/credits?payment=success`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/credits?payment=cancelled`,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        product_id: productId,
        credits_amount: product.credits.toString(),
        transaction_ref: transactionRef,
        is_subscription: product.type === 'subscription' ? 'true' : 'false',
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`[create-credits-checkout] Created session: ${session.id} for ref: ${transactionRef}`);

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
        transactionRef,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[create-credits-checkout] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
