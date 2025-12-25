-- Create function to notify admins on new payment
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_record RECORD;
  user_name TEXT;
  formatted_amount TEXT;
  listing_type_label TEXT;
  supabase_url TEXT := 'https://yzydlthexjbtdmacqzey.supabase.co';
BEGIN
  -- Only trigger for pending payments
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get user name
  SELECT full_name INTO user_name
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  -- Format amount
  formatted_amount := NEW.amount || ' ' || NEW.currency;

  -- Get listing type label
  IF NEW.listing_type = 'short_term' THEN
    listing_type_label := 'Résidence';
  ELSE
    listing_type_label := 'Immobilier';
  END IF;

  -- Loop through all admins and send push notification
  FOR admin_record IN 
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-push-notification',
      body := jsonb_build_object(
        'userId', admin_record.user_id::text,
        'title', '💳 Nouveau paiement en attente',
        'body', COALESCE(user_name, 'Un utilisateur') || ' a soumis un paiement de ' || formatted_amount || ' (' || listing_type_label || ')',
        'data', jsonb_build_object(
          'type', 'payment_pending',
          'payment_id', NEW.id,
          'user_id', NEW.user_id,
          'amount', NEW.amount,
          'currency', NEW.currency
        )
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send admin notification for new payment: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- Create trigger for new payments
DROP TRIGGER IF EXISTS on_new_payment_notify_admins ON public.listing_payments;
CREATE TRIGGER on_new_payment_notify_admins
  AFTER INSERT ON public.listing_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_new_payment();