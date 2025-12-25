-- Update the trigger_push_notification function to handle payment notifications
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  actor_name TEXT;
  notification_title TEXT;
  notification_body TEXT;
  property_listing_type TEXT;
  supabase_url TEXT := 'https://yzydlthexjbtdmacqzey.supabase.co';
BEGIN
  -- Get actor name
  SELECT full_name INTO actor_name 
  FROM profiles 
  WHERE user_id = NEW.actor_id;
  
  IF actor_name IS NULL THEN
    actor_name := 'Quelqu''un';
  END IF;

  -- Try to get listing_type from related property for ALL notification types with entity_id
  IF NEW.entity_id IS NOT NULL THEN
    -- For messages: entity_id is the message id
    IF NEW.type = 'message' THEN
      -- If the message has a property_id, use properties.listing_type.
      -- Otherwise (e.g., admin message), fall back to messages.listing_type.
      SELECT COALESCE(p.listing_type, m.listing_type)
      INTO property_listing_type
      FROM messages m
      LEFT JOIN properties p ON p.id = m.property_id
      WHERE m.id = NEW.entity_id;

    -- For reservations and appointments: entity_id is the appointment id
    ELSIF NEW.type IN ('reservation_request', 'reservation_approved', 'reservation_rejected',
                        'appointment_request', 'appointment_approved', 'appointment_rejected') THEN
      SELECT p.listing_type INTO property_listing_type
      FROM appointments a
      JOIN properties p ON p.id = a.property_id
      WHERE a.id = NEW.entity_id;
    END IF;
  END IF;

  -- Build notification content based on type
  CASE NEW.type
    -- Social
    WHEN 'follow' THEN
      notification_title := '👤 Nouveau follower';
      notification_body := actor_name || ' a commencé à vous suivre';
    WHEN 'review' THEN
      notification_title := '⭐ Nouvel avis';
      notification_body := actor_name || ' vous a laissé un avis';
    WHEN 'message' THEN
      notification_title := '💬 Nouveau message';
      notification_body := actor_name || ' vous a envoyé un message';
    
    -- Réservations (mode résidence si short_term, sinon immobilier)
    WHEN 'reservation_request' THEN
      notification_title := '📬 Nouvelle demande de réservation';
      notification_body := actor_name || ' souhaite réserver votre logement';
    WHEN 'reservation_approved' THEN
      notification_title := '🎉 Réservation confirmée !';
      notification_body := 'Bonne nouvelle ! ' || actor_name || ' a accepté votre réservation';
    WHEN 'reservation_rejected' THEN
      notification_title := '😔 Réservation refusée';
      notification_body := actor_name || ' n''a pas pu accepter votre demande';
    
    -- Rendez-vous (mode immobilier si long_term, sinon résidence)
    WHEN 'appointment_request' THEN
      notification_title := '📅 Demande de visite';
      notification_body := actor_name || ' souhaite visiter votre bien';
    WHEN 'appointment_approved' THEN
      notification_title := '✅ Visite confirmée !';
      notification_body := 'Super ! ' || actor_name || ' a accepté votre demande de visite';
    WHEN 'appointment_rejected' THEN
      notification_title := '😔 Visite refusée';
      notification_body := actor_name || ' n''a pas pu accepter votre demande de visite';
    
    -- Badges
    WHEN 'badge' THEN
      notification_title := '🏆 Nouveau badge !';
      notification_body := 'Félicitations ! Vous avez débloqué un nouveau badge';
    
    -- Email verification
    WHEN 'verify_email' THEN
      notification_title := '📧 Vérifiez votre email';
      notification_body := 'Confirmez votre adresse email pour profiter de toutes les fonctionnalités';
    
    -- Promotions
    WHEN 'promotion' THEN
      notification_title := '🎁 Offre spéciale !';
      notification_body := 'Une nouvelle promotion vous attend sur LaZone';
    
    -- Delete listing
    WHEN 'delete_listing' THEN
      notification_title := '⚠️ Annonce supprimée';
      notification_body := 'Votre annonce a été retirée par un modérateur';
    
    -- Payment notifications
    WHEN 'payment_approved' THEN
      notification_title := '✅ Paiement validé !';
      notification_body := 'Votre paiement a été confirmé. Vous pouvez maintenant publier votre annonce.';
    WHEN 'payment_rejected' THEN
      notification_title := '❌ Paiement refusé';
      notification_body := 'Votre paiement n''a pas pu être validé. Veuillez réessayer ou nous contacter.';
    
    -- Reports (admin)
    WHEN 'user_report' THEN
      notification_title := '🚨 Signalement';
      notification_body := 'Un utilisateur a été signalé - Action requise';
    WHEN 'property_report' THEN
      notification_title := '🚨 Annonce signalée';
      notification_body := 'Une annonce a été signalée - Action requise';
    
    -- Test
    WHEN 'test' THEN
      notification_title := '🔔 Test notification';
      notification_body := 'Ceci est une notification de test';
    
    ELSE
      notification_title := '🔔 LaZone';
      notification_body := 'Vous avez une nouvelle notification';
  END CASE;

  -- Call edge function via pg_net (fire and forget)
  -- Include listing_type in data payload for app mode switching
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6eWRsdGhleGpidGRtYWNxemV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgzNjY0MywiZXhwIjoyMDgxNDEyNjQzfQ.D8-Nxi95YKRW7_wVEk5K7bFE-PcLpILpjPq62Mbe8q8'
    ),
    body := jsonb_build_object(
      'userId', NEW.user_id,
      'title', notification_title,
      'body', notification_body,
      'data', jsonb_build_object(
        'type', NEW.type,
        'actor_id', NEW.actor_id,
        'entity_id', NEW.entity_id,
        'listing_type', COALESCE(property_listing_type, '')
      )
    )
  );

  RETURN NEW;
END;
$function$;