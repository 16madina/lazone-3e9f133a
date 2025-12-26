import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Credits per product
const CREDITS_PER_PRODUCT: Record<string, number> = {
  'com.lazone.listing.single': 1,
  'com.lazone.listing.pack5': 5,
  'com.lazone.listing.pack10': 10,
  'com.lazone.sub.pro.monthly': 30,
  'com.lazone.sub.premium.monthly': 999,
};

// Subscription product patterns
const isSubscriptionProduct = (productId: string): boolean => {
  return productId.includes('sub.') || productId.includes('agency.');
};

// Calculate expiration date for subscriptions (1 month from purchase)
const getExpirationDate = (productId: string, purchaseDate: string): string | null => {
  if (!isSubscriptionProduct(productId)) return null;
  
  const date = new Date(purchaseDate);
  date.setMonth(date.getMonth() + 1);
  return date.toISOString();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[process-storekit] No authorization header");
      return new Response(JSON.stringify({ success: false, error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("[process-storekit] Invalid token:", authError);
      return new Response(JSON.stringify({ success: false, error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { 
      productId, 
      transactionId, 
      originalTransactionId, 
      purchaseDate,
      expirationDate,
      isRestore = false 
    } = body;

    console.log(`[process-storekit] Processing ${isRestore ? 'restore' : 'purchase'} for user ${user.id}`);
    console.log(`[process-storekit] Product: ${productId}, Transaction: ${transactionId}`);

    if (!productId || !transactionId) {
      console.error("[process-storekit] Missing productId or transactionId");
      return new Response(JSON.stringify({ success: false, error: "Missing productId or transactionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this transaction was already processed
    const { data: existingPurchase } = await supabase
      .from("storekit_purchases")
      .select("id, user_id")
      .eq("transaction_id", transactionId)
      .maybeSingle();

    if (existingPurchase) {
      console.log(`[process-storekit] Transaction ${transactionId} already exists`);
      
      // If it's the same user, return success (idempotent)
      if (existingPurchase.user_id === user.id) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Already processed",
          purchaseId: existingPurchase.id,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Different user trying to claim same transaction - fraud attempt
      console.error(`[process-storekit] FRAUD ATTEMPT: User ${user.id} trying to claim transaction ${transactionId} owned by ${existingPurchase.user_id}`);
      return new Response(JSON.stringify({ success: false, error: "Transaction already claimed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get credits amount for this product
    const creditsAmount = CREDITS_PER_PRODUCT[productId] || 1;
    const isSubscription = isSubscriptionProduct(productId);
    const actualPurchaseDate = purchaseDate || new Date().toISOString();
    const actualExpirationDate = expirationDate || getExpirationDate(productId, actualPurchaseDate);

    // Insert the purchase record (only backend can do this with service role)
    const { data: purchase, error: insertError } = await supabase
      .from("storekit_purchases")
      .insert({
        user_id: user.id,
        product_id: productId,
        transaction_id: transactionId,
        original_transaction_id: originalTransactionId || null,
        credits_amount: creditsAmount,
        credits_used: 0,
        purchase_date: actualPurchaseDate,
        expiration_date: actualExpirationDate,
        is_subscription: isSubscription,
        status: 'active',
      })
      .select()
      .single();

    if (insertError) {
      console.error("[process-storekit] Error inserting purchase:", insertError);
      return new Response(JSON.stringify({ success: false, error: "Failed to record purchase" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[process-storekit] Successfully recorded purchase ${purchase.id} for user ${user.id}`);
    console.log(`[process-storekit] Credited ${creditsAmount} credits (subscription: ${isSubscription})`);

    // If it's a subscription, also update user_subscriptions table
    if (isSubscription) {
      const subscriptionType = productId.includes('premium') ? 'premium' : 'pro';
      
      await supabase
        .from("user_subscriptions")
        .upsert({
          user_id: user.id,
          subscription_type: subscriptionType,
          is_active: true,
          active_until: actualExpirationDate,
        }, {
          onConflict: 'user_id',
        });
      
      console.log(`[process-storekit] Updated user_subscriptions: ${subscriptionType}`);
    }

    // Send notification
    await supabase
      .from("notifications")
      .insert({
        user_id: user.id,
        type: isRestore ? "payment_approved" : "payment_approved",
        actor_id: user.id,
        entity_id: purchase.id,
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        purchaseId: purchase.id,
        creditsAmount,
        isSubscription,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[process-storekit] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
