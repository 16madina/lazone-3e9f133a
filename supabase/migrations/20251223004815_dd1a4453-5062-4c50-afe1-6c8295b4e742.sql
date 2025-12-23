-- Remove duplicate push notifications by keeping only trigger_push_notification()
DO $$
BEGIN
  -- Drop the older duplicate trigger (if present)
  EXECUTE 'DROP TRIGGER IF EXISTS trigger_send_push_notification ON public.notifications';

  -- Drop the now-unused function behind the duplicate trigger (if present)
  EXECUTE 'DROP FUNCTION IF EXISTS public.send_push_notification_on_insert()';
END $$;