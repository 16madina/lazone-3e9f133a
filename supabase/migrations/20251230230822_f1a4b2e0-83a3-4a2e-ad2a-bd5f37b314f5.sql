-- Update reset function to use configurable credits amount from app_settings
CREATE OR REPLACE FUNCTION public.reset_monthly_free_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  registration_day integer;
  today_day integer;
  credits_per_month integer;
BEGIN
  today_day := EXTRACT(DAY FROM now());
  
  -- Get configurable credits amount from app_settings (default 5)
  SELECT COALESCE((value->>'credits_per_month')::integer, 5) INTO credits_per_month
  FROM app_settings
  WHERE id = 'monthly_free_credits';
  
  IF credits_per_month IS NULL THEN
    credits_per_month := 5;
  END IF;
  
  -- Loop through all users
  FOR user_record IN 
    SELECT p.user_id, p.created_at, ufc.last_reset_at
    FROM profiles p
    LEFT JOIN user_free_credits ufc ON ufc.user_id = p.user_id
  LOOP
    -- Get the day of month the user registered
    registration_day := EXTRACT(DAY FROM user_record.created_at);
    
    -- Handle end of month edge cases (e.g., registered on 31st but current month has 28 days)
    IF registration_day > EXTRACT(DAY FROM (date_trunc('month', now()) + interval '1 month - 1 day')::date) THEN
      registration_day := EXTRACT(DAY FROM (date_trunc('month', now()) + interval '1 month - 1 day')::date)::integer;
    END IF;
    
    -- Check if today is the anniversary day
    IF today_day = registration_day THEN
      -- Check if we haven't already reset this month
      IF user_record.last_reset_at IS NULL OR 
         date_trunc('month', user_record.last_reset_at) < date_trunc('month', now()) THEN
        -- Upsert: reset credits to configured amount (not cumulative)
        INSERT INTO user_free_credits (user_id, credits_remaining, last_reset_at)
        VALUES (user_record.user_id, credits_per_month, now())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          credits_remaining = credits_per_month,
          last_reset_at = now();
          
        RAISE NOTICE 'Reset free credits for user % to %', user_record.user_id, credits_per_month;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Also update the initialization function to use configurable credits
CREATE OR REPLACE FUNCTION public.initialize_user_free_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  credits_per_month integer;
BEGIN
  -- Get configurable credits amount from app_settings (default 5)
  SELECT COALESCE((value->>'credits_per_month')::integer, 5) INTO credits_per_month
  FROM app_settings
  WHERE id = 'monthly_free_credits';
  
  IF credits_per_month IS NULL THEN
    credits_per_month := 5;
  END IF;

  INSERT INTO user_free_credits (user_id, credits_remaining, last_reset_at)
  VALUES (NEW.user_id, credits_per_month, now())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Remove the CHECK constraint on credits_remaining to allow flexible amounts
ALTER TABLE public.user_free_credits DROP CONSTRAINT IF EXISTS user_free_credits_credits_remaining_check;

-- Add a more flexible constraint (0-100)
ALTER TABLE public.user_free_credits ADD CONSTRAINT user_free_credits_credits_remaining_check CHECK (credits_remaining >= 0 AND credits_remaining <= 100);

-- Insert default setting if not exists
INSERT INTO public.app_settings (id, value, updated_at)
VALUES ('monthly_free_credits', '{"credits_per_month": 5}'::jsonb, now())
ON CONFLICT (id) DO NOTHING;