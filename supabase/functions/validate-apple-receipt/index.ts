import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Apple's verification endpoints
const APPLE_PRODUCTION_URL = "https://buy.itunes.apple.com/verifyReceipt";
const APPLE_SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";

interface AppleReceiptResponse {
  status: number;
  receipt?: {
    in_app?: Array<{
      product_id: string;
      transaction_id: string;
      purchase_date_ms: string;
      quantity: string;
    }>;
  };
  latest_receipt_info?: Array<{
    product_id: string;
    transaction_id: string;
    purchase_date_ms: string;
  }>;
}

async function verifyReceipt(receiptData: string, isSandbox = false): Promise<AppleReceiptResponse> {
  const url = isSandbox ? APPLE_SANDBOX_URL : APPLE_PRODUCTION_URL;
  
  // Note: For production, you should use App Store Connect shared secret
  const APP_STORE_SHARED_SECRET = Deno.env.get("APP_STORE_SHARED_SECRET") || "";
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "receipt-data": receiptData,
      "password": APP_STORE_SHARED_SECRET,
      "exclude-old-transactions": true,
    }),
  });

  return response.json();
}

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

    const { receiptData, productId, listingType, propertyId } = await req.json();

    if (!receiptData || !productId) {
      return new Response(JSON.stringify({ error: "Missing receipt data or product ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Validating Apple receipt for user ${user.id}, product: ${productId}`);

    // Try production first
    let result = await verifyReceipt(receiptData, false);
    
    // Status 21007 means it's a sandbox receipt
    if (result.status === 21007) {
      console.log("Switching to sandbox validation");
      result = await verifyReceipt(receiptData, true);
    }

    // Check validation status
    // Status 0 = valid
    if (result.status !== 0) {
      console.error("Apple receipt validation failed with status:", result.status);
      return new Response(JSON.stringify({ 
        error: "Invalid receipt",
        status: result.status,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the transaction for our product
    const inAppPurchases = result.receipt?.in_app || result.latest_receipt_info || [];
    const purchase = inAppPurchases.find(p => p.product_id === productId);

    if (!purchase) {
      return new Response(JSON.stringify({ error: "Product not found in receipt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transactionId = purchase.transaction_id;

    // Check if this transaction was already processed
    const { data: existingPayment } = await supabase
      .from("listing_payments")
      .select("id")
      .eq("transaction_ref", transactionId)
      .single();

    if (existingPayment) {
      console.log(`Transaction ${transactionId} already processed`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Already processed",
        paymentId: existingPayment.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get price from settings (or use default)
    const { data: settings } = await supabase
      .from("app_settings")
      .select("value")
      .eq("id", "listing_limit")
      .single();

    const pricePerExtra = (settings?.value as any)?.price_per_extra || 1000;

    // Create completed payment record
    const { data: payment, error: paymentError } = await supabase
      .from("listing_payments")
      .insert({
        user_id: user.id,
        amount: pricePerExtra,
        currency: "XOF",
        status: "completed",
        payment_method: "apple_iap",
        transaction_ref: transactionId,
        listing_type: listingType || "long_term",
        property_id: propertyId || null,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Error creating payment record:", paymentError);
      return new Response(JSON.stringify({ error: "Failed to create payment record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If there's a property_id, activate the property
    if (propertyId) {
      const { error: propertyError } = await supabase
        .from("properties")
        .update({ is_active: true })
        .eq("id", propertyId)
        .eq("user_id", user.id);

      if (propertyError) {
        console.error("Error activating property:", propertyError);
      } else {
        console.log(`Property ${propertyId} activated for user ${user.id}`);
      }
    }

    // Send notification to user
    await supabase
      .from("notifications")
      .insert({
        user_id: user.id,
        type: "payment_approved",
        actor_id: user.id,
        entity_id: payment.id,
      });

    console.log(`Apple IAP validated for user ${user.id}, transaction: ${transactionId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        paymentId: payment.id,
        transactionId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error validating Apple receipt:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
