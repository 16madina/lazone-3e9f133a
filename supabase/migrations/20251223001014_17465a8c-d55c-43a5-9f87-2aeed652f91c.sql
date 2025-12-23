-- Update the trigger_push_notification function to handle all notification types
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name TEXT;
  notification_title TEXT;
  notification_body TEXT;
BEGIN
  -- Get actor name
  SELECT full_name INTO actor_name 
  FROM profiles 
  WHERE user_id = NEW.actor_id;
  
  IF actor_name IS NULL THEN
    actor_name := 'Quelqu''un';
  END IF;

  -- Build notification content based on type
  CASE NEW.type
    -- Social
    WHEN 'follow' THEN
      notification_title := 'Nouveau follower';
      notification_body := actor_name || ' a commencé à vous suivre';
    WHEN 'review' THEN
      notification_title := 'Nouvel avis ⭐';
      notification_body := actor_name || ' vous a laissé un avis';
    WHEN 'message' THEN
      notification_title := 'Nouveau message 💬';
      notification_body := actor_name || ' vous a envoyé un message';
    
    -- Réservations (mode résidence)
    WHEN 'reservation_request' THEN
      notification_title := '📬 Nouvelle demande de réservation';
      notification_body := actor_name || ' a demandé une réservation pour votre logement';
    WHEN 'reservation_approved' THEN
      notification_title := '🎉 Réservation confirmée !';
      notification_body := actor_name || ' a accepté votre demande de réservation';
    WHEN 'reservation_rejected' THEN
      notification_title := 'Réservation refusée';
      notification_body := actor_name || ' a refusé votre demande de réservation';
    
    -- Rendez-vous (mode immobilier)
    WHEN 'appointment_request' THEN
      notification_title := '📅 Nouvelle demande de visite';
      notification_body := actor_name || ' souhaite visiter votre bien';
    WHEN 'appointment_approved' THEN
      notification_title := '✅ Visite confirmée';
      notification_body := actor_name || ' a accepté votre demande de visite';
    WHEN 'appointment_rejected' THEN
      notification_title := 'Visite refusée';
      notification_body := actor_name || ' a refusé votre demande de visite';
    
    -- Badges
    WHEN 'badge' THEN
      notification_title := '🏆 Nouveau badge obtenu !';
      notification_body := 'Félicitations ! Vous avez obtenu un nouveau badge';
    
    -- Email verification
    WHEN 'verify_email' THEN
      notification_title := '📧 Vérifiez votre email';
      notification_body := 'N''oubliez pas de vérifier votre adresse email';
    
    -- Promotions
    WHEN 'promotion' THEN
      notification_title := '🎁 Nouvelle promotion !';
      notification_body := 'Une nouvelle promotion est disponible';
    
    -- Delete listing warning
    WHEN 'delete_listing' THEN
      notification_title := '⚠️ Annonce supprimée';
      notification_body := 'Une de vos annonces a été supprimée par un administrateur';
    
    -- Reports (admin)
    WHEN 'user_report' THEN
      notification_title := '🚨 Signalement utilisateur';
      notification_body := 'Un utilisateur a été signalé';
    WHEN 'property_report' THEN
      notification_title := '🚨 Signalement annonce';
      notification_body := 'Une annonce a été signalée';
    
    ELSE
      notification_title := 'LaZone';
      notification_body := 'Nouvelle notification';
  END CASE;

  -- Call edge function via pg_net extension (async HTTP request)
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
    ),
    body := jsonb_build_object(
      'userId', NEW.user_id,
      'title', notification_title,
      'body', notification_body,
      'data', jsonb_build_object(
        'type', NEW.type,
        'actor_id', NEW.actor_id,
        'entity_id', COALESCE(NEW.entity_id, ''),
        'notification_id', NEW.id
      )
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
    RETURN NEW;
END;
$$;