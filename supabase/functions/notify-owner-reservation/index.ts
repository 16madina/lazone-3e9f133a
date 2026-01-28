import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotifyOwnerRequest {
  reservationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-owner-reservation function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reservationId }: NotifyOwnerRequest = await req.json();
    console.log("Processing reservation notification for:", reservationId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch reservation details with property info only (no FK to profiles)
    const { data: reservation, error: reservationError } = await supabase
      .from('appointments')
      .select(`
        *,
        property:properties(title, address, city, country)
      `)
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservation) {
      console.error('Error fetching reservation:', reservationError);
      return new Response(
        JSON.stringify({ error: 'Reservation not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Reservation found:", reservation.id);

    // Fetch requester profile separately
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', reservation.requester_id)
      .maybeSingle();

    // Fetch owner profile separately
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', reservation.owner_id)
      .maybeSingle();

    // Get owner email from auth.users
    const { data: ownerData, error: ownerError } = await supabase.auth.admin.getUserById(
      reservation.owner_id
    );

    if (ownerError || !ownerData.user?.email) {
      console.error('Error fetching owner email:', ownerError);
      return new Response(
        JSON.stringify({ error: 'Owner email not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ownerEmail = ownerData.user.email;
    const ownerName = ownerProfile?.full_name || 'Propriétaire';
    const requesterName = requesterProfile?.full_name || 'Un voyageur';
    const propertyTitle = reservation.property?.title || 'Votre logement';
    const propertyAddress = `${reservation.property?.address || ''}, ${reservation.property?.city || ''}`;
    
    const checkInDate = new Date(reservation.check_in_date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const checkOutDate = new Date(reservation.check_out_date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    console.log("Sending email to owner:", ownerEmail);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">📬 Nouvelle demande de réservation !</h1>
          </div>
          
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">Bonjour ${ownerName},</p>
            
            <p style="font-size: 16px; color: #333;">
              <strong>${requesterName}</strong> souhaite réserver votre logement. Voici les détails de la demande :
            </p>

            <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h2 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">📋 Détails de la demande</h2>
              
              <p style="margin: 8px 0; color: #555;">
                <strong>🏠 Logement :</strong> ${propertyTitle}
              </p>
              <p style="margin: 8px 0; color: #555;">
                <strong>📍 Adresse :</strong> ${propertyAddress}
              </p>
              <p style="margin: 8px 0; color: #555;">
                <strong>📅 Arrivée :</strong> ${checkInDate}
              </p>
              <p style="margin: 8px 0; color: #555;">
                <strong>📅 Départ :</strong> ${checkOutDate}
              </p>
              <p style="margin: 8px 0; color: #555;">
                <strong>🌙 Durée :</strong> ${reservation.total_nights} nuit${reservation.total_nights > 1 ? 's' : ''}
              </p>
              <p style="margin: 8px 0; color: #333; font-size: 18px;">
                <strong>💰 Total estimé :</strong> ${reservation.total_price?.toLocaleString('fr-FR')} FCFA
              </p>
            </div>

            ${reservation.message ? `
            <div style="background: #f8f9fa; border-left: 4px solid #6b7280; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; color: #333;">
                <strong>💬 Message du voyageur :</strong><br>
                "${reservation.message}"
              </p>
            </div>
            ` : ''}

            ${reservation.contact_phone ? `
            <div style="background: #eff6ff; border-radius: 8px; padding: 12px; margin: 15px 0;">
              <p style="margin: 0; color: #333; font-size: 14px;">
                <strong>📱 Téléphone du voyageur :</strong> ${reservation.contact_phone}
              </p>
            </div>
            ` : ''}

            <p style="font-size: 16px; color: #333;">
              ⏰ <strong>Action requise :</strong> Veuillez examiner cette demande et y répondre dans les plus brefs délais.
            </p>

            <div style="text-align: center; margin-top: 30px;">
              <a href="https://lazone.app/profile" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: bold; margin: 5px;">
                Voir la demande
              </a>
            </div>

            <p style="font-size: 14px; color: #888; margin-top: 20px; text-align: center;">
              Vous pouvez approuver ou refuser cette demande depuis votre espace personnel.
            </p>
          </div>

          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="margin: 0; color: #888; font-size: 14px;">
              LaZone Résidence - Location de courte durée en Afrique
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "LaZone <noreply@lazone.app>",
      to: [ownerEmail],
      subject: `📬 Nouvelle demande de réservation - ${propertyTitle}`,
      html: htmlContent,
    });

    console.log("Email sent successfully to owner:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-owner-reservation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
