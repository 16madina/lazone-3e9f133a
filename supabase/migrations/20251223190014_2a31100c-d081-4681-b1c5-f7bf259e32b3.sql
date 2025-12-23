
-- Update the trigger function to include listing_type in notification data
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

  -- Try to get listing_type from related property (for message notifications)
  -- entity_id for message type points to the message id
  IF NEW.type = 'message' AND NEW.entity_id IS NOT NULL THEN
    SELECT p.listing_type INTO property_listing_type
    FROM messages m
    JOIN properties p ON p.id = m.property_id
    WHERE m.id = NEW.entity_id;
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
    
    -- Réservations (mode résidence)
    WHEN 'reservation_request' THEN
      notification_title := '📬 Nouvelle demande de réservation';
      notification_body := actor_name || ' souhaite réserver votre logement';
      property_listing_type := 'short_term'; -- Force short_term for reservations
    WHEN 'reservation_approved' THEN
      notification_title := '🎉 Réservation confirmée !';
      notification_body := 'Bonne nouvelle ! ' || actor_name || ' a accepté votre réservation';
      property_listing_type := 'short_term';
    WHEN 'reservation_rejected' THEN
      notification_title := '😔 Réservation refusée';
      notification_body := actor_name || ' n''a pas pu accepter votre demande';
      property_listing_type := 'short_term';
    
    -- Rendez-vous (mode immobilier)
    WHEN 'appointment_request' THEN
      notification_title := '📅 Demande de visite';
      notification_body := actor_name || ' souhaite visiter votre bien';
      property_listing_type := 'long_term'; -- Force long_term for appointments
    WHEN 'appointment_approved' THEN
      notification_title := '✅ Visite confirmée !';
      notification_body := 'Super ! ' || actor_name || ' a accepté votre demande de visite';
      property_listing_type := 'long_term';
    WHEN 'appointment_rejected' THEN
      notification_title := '😔 Visite refusée';
      notification_body := actor_name || ' n''a pas pu accepter votre demande de visite';
      property_listing_type := 'long_term';
    
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
    body := jsonb_build_object(
      'userId', NEW.user_id::text,
      'title', notification_title,
      'body', notification_body,
      'data', jsonb_build_object(
        'type', NEW.type,
        'actor_id', NEW.actor_id::text,
        'entity_id', COALESCE(NEW.entity_id::text, ''),
        'notification_id', NEW.id::text,
        'listing_type', COALESCE(property_listing_type, '')
      )
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
    RETURN NEW;
END;
$function$;
