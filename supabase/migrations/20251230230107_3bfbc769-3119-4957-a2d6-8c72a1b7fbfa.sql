-- Create table to track monthly free credits for each user
CREATE TABLE public.user_free_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_remaining integer NOT NULL DEFAULT 5 CHECK (credits_remaining >= 0 AND credits_remaining <= 5),
  last_reset_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_free_credits ENABLE ROW LEVEL SECURITY;

-- Users can view their own free credits
CREATE POLICY "Users can view their own free credits"
ON public.user_free_credits
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own free credits (for consuming credits)
CREATE POLICY "Users can update their own free credits"
ON public.user_free_credits
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow insert for new users (via trigger or edge function)
CREATE POLICY "System can insert free credits"
ON public.user_free_credits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to reset monthly credits
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
BEGIN
  today_day := EXTRACT(DAY FROM now());
  
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
        -- Upsert: reset credits to 5 (not cumulative)
        INSERT INTO user_free_credits (user_id, credits_remaining, last_reset_at)
        VALUES (user_record.user_id, 5, now())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          credits_remaining = 5,
          last_reset_at = now();
          
        RAISE NOTICE 'Reset free credits for user %', user_record.user_id;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Initialize free credits for all existing users
INSERT INTO user_free_credits (user_id, credits_remaining, last_reset_at)
SELECT user_id, 5, now()
FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- Create trigger to give new users their initial 5 free credits
CREATE OR REPLACE FUNCTION public.initialize_user_free_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_free_credits (user_id, credits_remaining, last_reset_at)
  VALUES (NEW.user_id, 5, now())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_init_credits
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.initialize_user_free_credits();