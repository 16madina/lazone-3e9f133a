import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (STRIPE_WEBHOOK_SECRET && signature) {
      try {
        // Deno uses WebCrypto; Stripe requires async verification here
        event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // For development without webhook secret
      if (!body || body.trim() === '') {
        console.log("Empty body received, likely a test ping");
        return new Response(JSON.stringify({ received: true, message: "Empty body - test ping" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      try {
        event = JSON.parse(body);
      } catch (parseError) {
        console.error("Failed to parse webhook body:", parseError);
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("Warning: Processing webhook without signature verification");
    }

    console.log(`Processing webhook event: ${event.type}`);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.metadata?.user_id;
      const transactionRef = session.metadata?.transaction_ref;
      const listingType = session.metadata?.listing_type;
      const propertyId = session.metadata?.property_id;
      
      // Check if this is a credit/subscription purchase
      const productId = session.metadata?.product_id;
      const creditsAmount = session.metadata?.credits_amount;
      const isSubscription = session.metadata?.is_subscription === 'true';

      if (!userId) {
        console.error("Missing user_id in session:", session.id);
        return new Response(JSON.stringify({ error: "Missing user_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Handle CREDITS purchase (from create-credits-checkout)
      if (productId && creditsAmount) {
        console.log(`[stripe-webhook] Processing credit purchase: ${productId} for user ${userId}`);
        
        // Check if already processed
        const { data: existingPurchase } = await supabase
          .from("storekit_purchases")
          .select("id")
          .eq("transaction_id", transactionRef || session.id)
          .maybeSingle();

        if (existingPurchase) {
          console.log(`[stripe-webhook] Transaction ${transactionRef} already processed`);
          return new Response(JSON.stringify({ received: true, message: "Already processed" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Calculate expiration date for subscriptions
        let expirationDate: string | null = null;
        if (isSubscription) {
          const date = new Date();
          date.setMonth(date.getMonth() + 1);
          expirationDate = date.toISOString();
        }

        // Insert into storekit_purchases (unified table for all credit purchases)
        const { data: purchase, error: insertError } = await supabase
          .from("storekit_purchases")
          .insert({
            user_id: userId,
            product_id: productId,
            transaction_id: transactionRef || session.id,
            original_transaction_id: session.id,
            credits_amount: parseInt(creditsAmount, 10),
            credits_used: 0,
            purchase_date: new Date().toISOString(),
            expiration_date: expirationDate,
            is_subscription: isSubscription,
            status: 'active',
          })
          .select()
          .single();

        if (insertError) {
          console.error("[stripe-webhook] Error inserting credit purchase:", insertError);
        } else {
          console.log(`[stripe-webhook] Credit purchase recorded: ${purchase.id}`);
        }

        // If subscription, update user_subscriptions table
        if (isSubscription) {
          const subscriptionType = productId.includes('premium') ? 'premium' : 'pro';
          
          await supabase
            .from("user_subscriptions")
            .upsert({
              user_id: userId,
              subscription_type: subscriptionType,
              is_active: true,
              active_until: expirationDate,
            }, {
              onConflict: 'user_id',
            });
          
          console.log(`[stripe-webhook] User subscription updated: ${subscriptionType}`);
        }

        // Send notification
        await supabase
          .from("notifications")
          .insert({
            user_id: userId,
            type: "payment_approved",
            actor_id: userId,
            entity_id: purchase?.id || transactionRef,
          });

        console.log(`[stripe-webhook] Credit payment completed for user ${userId}`);
        
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Handle LISTING payment (from create-checkout-session)
      if (!transactionRef) {
        console.error("Missing transaction_ref in session:", session.id);
        return new Response(JSON.stringify({ error: "Missing metadata" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update payment status to completed
      const { data: payment, error: updateError } = await supabase
        .from("listing_payments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("transaction_ref", transactionRef)
        .eq("user_id", userId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating payment:", updateError);
        
        // If payment doesn't exist, create it
        if (updateError.code === "PGRST116") {
          const { error: insertError } = await supabase
            .from("listing_payments")
            .insert({
              user_id: userId,
              amount: session.amount_total ? session.amount_total / 100 : 0,
              currency: session.currency?.toUpperCase() || "XOF",
              status: "completed",
              payment_method: "stripe",
              transaction_ref: transactionRef,
              listing_type: listingType || "long_term",
              property_id: propertyId || null,
              completed_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error("Error creating payment:", insertError);
          }
        }
      }

      // If there's a property_id, activate the property
      if (propertyId) {
        const { error: propertyError } = await supabase
          .from("properties")
          .update({ is_active: true })
          .eq("id", propertyId)
          .eq("user_id", userId);

        if (propertyError) {
          console.error("Error activating property:", propertyError);
        } else {
          console.log(`Property ${propertyId} activated for user ${userId}`);

          // Clean up other pending attempts for the same property
          const { error: cleanupError } = await supabase
            .from("listing_payments")
            .update({ status: "failed" })
            .eq("user_id", userId)
            .eq("property_id", propertyId)
            .eq("status", "pending")
            .neq("transaction_ref", transactionRef);

          if (cleanupError) {
            console.error("Error cleaning up duplicate pending payments:", cleanupError);
          }
        }
      }

      // Send notification to user
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          type: "payment_approved",
          actor_id: userId,
          entity_id: payment?.id || transactionRef,
        });

      if (notifError) {
        console.error("Error creating notification:", notifError);
      }

      console.log(`Payment completed for user ${userId}, ref: ${transactionRef}`);
    }

    if (event.type === "checkout.session.expired" || event.type === "payment_intent.payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const transactionRef = session.metadata?.transaction_ref;
      const userId = session.metadata?.user_id;

      if (transactionRef && userId) {
        // Update payment status to failed
        const { error } = await supabase
          .from("listing_payments")
          .update({ status: "failed" })
          .eq("transaction_ref", transactionRef)
          .eq("user_id", userId);

        if (error) {
          console.error("Error updating failed payment:", error);
        }

        console.log(`Payment failed for ref: ${transactionRef}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
