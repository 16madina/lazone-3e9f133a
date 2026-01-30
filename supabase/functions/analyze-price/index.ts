import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzePriceRequest {
  price: number;
  city: string;
  country: string;
  propertyType: 'house' | 'apartment' | 'land' | 'commercial';
  transactionType: 'sale' | 'rent';
  listingType: 'long_term' | 'short_term';
  area: number;
  bedrooms?: number;
  pricePerNight?: number;
}

interface MarketStats {
  avgPrice: number;
  avgPricePerSqm: number;
  minPrice: number;
  maxPrice: number;
  count: number;
  avgPricePerNight?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: AnalyzePriceRequest = await req.json();
    const { price, city, country, propertyType, transactionType, listingType, area, bedrooms, pricePerNight } = body;

    console.log("Analyzing price for:", { city, country, propertyType, transactionType, listingType, price, area });

    // Fetch market statistics from the database
    let query = supabase
      .from('properties')
      .select('price, area, bedrooms, price_per_night')
      .eq('is_active', true)
      .eq('property_type', propertyType)
      .eq('type', transactionType)
      .eq('listing_type', listingType);

    // Filter by city if provided
    if (city) {
      query = query.ilike('city', `%${city}%`);
    }
    
    // Filter by country if provided
    if (country) {
      query = query.eq('country', country);
    }

    const { data: properties, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching properties:", fetchError);
      throw fetchError;
    }

    // Calculate market statistics
    let marketStats: MarketStats = {
      avgPrice: 0,
      avgPricePerSqm: 0,
      minPrice: 0,
      maxPrice: 0,
      count: 0,
    };

    if (properties && properties.length > 0) {
      const prices = properties.map(p => Number(p.price)).filter(p => p > 0);
      const pricesPerSqm = properties
        .filter(p => Number(p.area) > 0)
        .map(p => Number(p.price) / Number(p.area));
      
      if (prices.length > 0) {
        marketStats = {
          avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
          avgPricePerSqm: pricesPerSqm.length > 0 
            ? Math.round(pricesPerSqm.reduce((a, b) => a + b, 0) / pricesPerSqm.length)
            : 0,
          minPrice: Math.min(...prices),
          maxPrice: Math.max(...prices),
          count: prices.length,
        };

        // For short-term rentals, also calculate average price per night
        if (listingType === 'short_term') {
          const nightPrices = properties
            .map(p => Number(p.price_per_night))
            .filter(p => p > 0);
          
          if (nightPrices.length > 0) {
            marketStats.avgPricePerNight = Math.round(
              nightPrices.reduce((a, b) => a + b, 0) / nightPrices.length
            );
          }
        }
      }
    }

    // Build the prompt for AI analysis
    const isShortTerm = listingType === 'short_term';
    const priceToAnalyze = isShortTerm && pricePerNight ? pricePerNight : price;
    const priceLabel = isShortTerm ? 'prix par nuit' : (transactionType === 'sale' ? 'prix de vente' : 'loyer mensuel');
    
    const userPricePerSqm = area > 0 ? Math.round(priceToAnalyze / area) : 0;
    
    const propertyTypeLabels: Record<string, string> = {
      house: 'maison',
      apartment: 'appartement',
      land: 'terrain',
      commercial: 'local commercial'
    };

    const contextInfo = marketStats.count > 0 
      ? `
Données du marché local (${marketStats.count} annonces similaires dans la zone):
- ${priceLabel} moyen: ${marketStats.avgPrice.toLocaleString()} FCFA
- Prix moyen au m²: ${marketStats.avgPricePerSqm.toLocaleString()} FCFA/m²
- Fourchette de prix: ${marketStats.minPrice.toLocaleString()} - ${marketStats.maxPrice.toLocaleString()} FCFA
${isShortTerm && marketStats.avgPricePerNight ? `- Prix moyen par nuit: ${marketStats.avgPricePerNight.toLocaleString()} FCFA` : ''}
`
      : `Pas assez de données comparables dans cette zone (${city}, ${country}). L'analyse sera basée sur des estimations générales.`;

    const prompt = `Tu es un expert immobilier en Afrique. Analyse ce prix et donne un avis concis.

Bien à analyser:
- Type: ${propertyTypeLabels[propertyType] || propertyType}
- Transaction: ${transactionType === 'sale' ? 'Vente' : 'Location'}
- Mode: ${isShortTerm ? 'Courte durée (résidence)' : 'Longue durée'}
- Localisation: ${city}, ${country}
- Surface: ${area} m²
${bedrooms ? `- Chambres: ${bedrooms}` : ''}
- ${priceLabel} proposé: ${priceToAnalyze.toLocaleString()} FCFA
- Prix au m² proposé: ${userPricePerSqm.toLocaleString()} FCFA/m²

${contextInfo}

Réponds en JSON avec ce format exact:
{
  "rating": "competitive" | "slightly_high" | "high" | "very_high" | "below_market" | "unknown",
  "confidence": "high" | "medium" | "low",
  "percentageVsMarket": number (ex: +15 si 15% au dessus, -10 si 10% en dessous),
  "summary": "phrase courte de 10-15 mots max",
  "details": "explication de 2-3 phrases max"
}

Si pas assez de données, utilise "unknown" pour rating et "low" pour confidence.`;

    console.log("Calling Lovable AI for price analysis...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Tu es un expert immobilier. Réponds uniquement en JSON valide, sans markdown." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes. Veuillez réessayer dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA insuffisants." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";
    
    console.log("AI response:", aiContent);

    // Parse the AI response
    let analysis;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError, aiContent);
      // Fallback response
      analysis = {
        rating: "unknown",
        confidence: "low",
        percentageVsMarket: 0,
        summary: "Analyse non disponible",
        details: "L'analyse de prix n'a pas pu être effectuée. Vérifiez vos informations et réessayez."
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        marketStats: {
          avgPrice: marketStats.avgPrice,
          avgPricePerSqm: marketStats.avgPricePerSqm,
          sampleSize: marketStats.count,
          avgPricePerNight: marketStats.avgPricePerNight,
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in analyze-price function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
