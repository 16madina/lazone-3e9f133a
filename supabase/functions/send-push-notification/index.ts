import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

// Check if token is APNs format (hex string) vs FCM format (longer, contains colons or letters)
function isApnsToken(token: string): boolean {
  // APNs tokens are 64-character hex strings (device token)
  // FCM tokens are longer and contain more varied characters
  const isHex = /^[0-9A-Fa-f]+$/.test(token);
  const isApnsLength = token.length === 64;
  return isHex && isApnsLength;
}

// Convert APNs token to FCM token using Firebase Instance ID API
async function convertApnsToFcm(
  apnsToken: string, 
  accessToken: string,
  projectId: string
): Promise<string | null> {
  console.log("Converting APNs token to FCM token...");
  console.log("APNs token:", apnsToken);
  
  // Firebase IID API to import APNs token
  // This creates/retrieves an FCM registration token for the APNs device token
  const iidUrl = `https://iid.googleapis.com/iid/v1:batchImport`;
  
  const requestBody = {
    application: `app.lovable.8555b7d95bbc422ab78d1f70f2b81296`, // Your app bundle ID
    sandbox: true, // Set to false for production APNs
    apns_tokens: [apnsToken]
  };
  
  try {
    const response = await fetch(iidUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "access_token_auth": "true"
      },
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    console.log("IID batchImport response:", JSON.stringify(result));
    
    if (result.results && result.results.length > 0) {
      const firstResult = result.results[0];
      if (firstResult.registration_token) {
        console.log("Got FCM token from APNs conversion:", firstResult.registration_token.substring(0, 30) + "...");
        return firstResult.registration_token;
      } else if (firstResult.status) {
        console.error("APNs conversion failed:", firstResult.status);
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error converting APNs to FCM:", error);
    return null;
  }
}

// Generate JWT for FCM v1 OAuth 2.0
async function generateAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 hour

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/cloud-platform",
    aud: serviceAccount.token_uri,
    iat: now,
    exp: expiry,
  };

  // Base64url encode
  const base64urlEncode = (obj: object) => {
    const str = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const headerB64 = base64urlEncode(header);
  const payloadB64 = base64urlEncode(payload);
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key and sign
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = serviceAccount.private_key
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
  console.log("Exchanging JWT for access token...");
  
  const tokenResponse = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const responseText = await tokenResponse.text();
  console.log("Token exchange status:", tokenResponse.status);

  if (!tokenResponse.ok) {
    console.error("Token exchange failed:", responseText);
    throw new Error(`Failed to get access token: ${responseText}`);
  }

  const tokenData = JSON.parse(responseText);
  console.log("Got access token, length:", tokenData.access_token?.length);
  return tokenData.access_token;
}

// Send via legacy FCM API (supports APNs tokens directly with device_token field)
async function sendViaLegacyFcm(
  apnsToken: string,
  title: string,
  body: string,
  data: Record<string, string>,
  serverKey: string
): Promise<{ success: boolean; result: any }> {
  console.log("Attempting to send via legacy FCM with APNs token...");
  
  // Legacy FCM HTTP API can accept APNs tokens if properly configured
  const legacyUrl = "https://fcm.googleapis.com/fcm/send";
  
  const message = {
    to: apnsToken,
    notification: {
      title,
      body,
      sound: "default",
      badge: 1
    },
    data,
    priority: "high",
    content_available: true
  };
  
  try {
    const response = await fetch(legacyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `key=${serverKey}`
      },
      body: JSON.stringify(message)
    });
    
    const result = await response.json();
    console.log("Legacy FCM response:", JSON.stringify(result));
    
    return { success: response.ok && result.success === 1, result };
  } catch (error) {
    console.error("Legacy FCM error:", error);
    return { success: false, result: { error } };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");

    if (!serviceAccountJson) {
      console.error("FIREBASE_SERVICE_ACCOUNT not configured");
      return new Response(
        JSON.stringify({ error: "Firebase service account not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let serviceAccount: ServiceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
      console.log("Service account project_id:", serviceAccount.project_id);
    } catch (e) {
      console.error("Invalid service account JSON:", e);
      return new Response(
        JSON.stringify({ error: "Invalid service account JSON format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, title, body, data, imageUrl }: PushPayload = await req.json();

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: "userId, title, and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending push notification to user: ${userId}`);

    // Get push_token from profiles table
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("push_token")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile?.push_token) {
      console.log("No push_token found for user");
      return new Response(
        JSON.stringify({ message: "No push token registered for user", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let token = profile.push_token;
    console.log(`Found push_token, length: ${token.length}, prefix: ${token.substring(0, 20)}...`);
    
    // Check if this is an APNs token that needs conversion
    const tokenIsApns = isApnsToken(token);
    console.log(`Token is APNs format: ${tokenIsApns}`);

    // Get OAuth 2.0 access token
    console.log("Starting OAuth token generation...");
    const accessToken = await generateAccessToken(serviceAccount);
    console.log("Access token obtained");

    // If it's an APNs token, try to convert it to FCM
    if (tokenIsApns) {
      console.log("Detected APNs token, attempting conversion to FCM...");
      const fcmToken = await convertApnsToFcm(token, accessToken, serviceAccount.project_id);
      
      if (fcmToken) {
        console.log("Successfully converted APNs to FCM token");
        token = fcmToken;
        
        // Update the token in the database for future use
        await supabaseClient
          .from("profiles")
          .update({ push_token: fcmToken })
          .eq("user_id", userId);
        console.log("Updated profile with FCM token");
      } else {
        console.log("APNs conversion failed, will try sending with original token anyway");
      }
    }

    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

    // Build FCM message
    const message: Record<string, any> = {
      message: {
        token,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channel_id: "lazone_notifications",
            ...(imageUrl && { image: imageUrl }),
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
              "mutable-content": 1,
            },
          },
          fcm_options: {
            ...(imageUrl && { image: imageUrl }),
          },
        },
      },
    };

    try {
      console.log("FCM URL:", fcmUrl);
      console.log("Message payload:", JSON.stringify(message));
      
      const response = await fetch(fcmUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      console.log(`FCM v1 response status:`, response.status);
      console.log(`FCM v1 response:`, JSON.stringify(result));

      // If token is invalid, clear it from profiles
      if (!response.ok && result.error?.details?.some((d: any) => 
        d.errorCode === "UNREGISTERED" || d.errorCode === "INVALID_ARGUMENT"
      )) {
        console.log("Removing invalid token from profiles");
        await supabaseClient
          .from("profiles")
          .update({ push_token: null })
          .eq("user_id", userId);
      }

      if (response.ok) {
        console.log("Push notification sent successfully");
        return new Response(
          JSON.stringify({
            message: "Push notification sent",
            sent: 1,
            result,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        console.error("FCM error:", result);
        return new Response(
          JSON.stringify({
            error: "FCM request failed",
            details: result,
            sent: 0,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (error) {
      console.error(`Error sending push notification:`, error);
      return new Response(
        JSON.stringify({ error: "Failed to send notification", sent: 0 }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    console.error("Error in send-push-notification:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
