-- Create referrals table to track referral relationships
CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  bonus_granted boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  UNIQUE(referred_id),
  UNIQUE(referrer_id, referred_id)
);

-- Add referral_code to profiles for unique sharing codes
ALTER TABLE public.profiles 
ADD COLUMN referral_code text UNIQUE;

-- Generate unique referral codes for existing users
UPDATE public.profiles 
SET referral_code = UPPER(SUBSTRING(MD5(user_id::text || now()::text) FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- Make referral_code NOT NULL with default for new users
ALTER TABLE public.profiles 
ALTER COLUMN referral_code SET DEFAULT UPPER(SUBSTRING(MD5(gen_random_uuid()::text) FROM 1 FOR 8));

-- Create index for faster lookups
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);
CREATE INDEX idx_profiles_referral_code ON public.profiles(referral_code);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals
CREATE POLICY "Users can view their own referrals" 
ON public.referrals 
FOR SELECT 
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can create referrals as referred" 
ON public.referrals 
FOR INSERT 
WITH CHECK (auth.uid() = referred_id);

-- Function to grant referral bonus when first listing is published
CREATE OR REPLACE FUNCTION public.grant_referral_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_listings_count integer;
BEGIN
  -- Only trigger for active listings
  IF NEW.is_active != true THEN
    RETURN NEW;
  END IF;

  -- Count existing active listings for this user
  SELECT COUNT(*) INTO v_listings_count
  FROM properties
  WHERE user_id = NEW.user_id 
    AND is_active = true 
    AND id != NEW.id;

  -- If this is NOT the first listing, skip
  IF v_listings_count > 0 THEN
    RETURN NEW;
  END IF;

  -- Find pending referral for this user
  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_id = NEW.user_id 
    AND status = 'pending'
    AND bonus_granted = false
  LIMIT 1;

  -- If no referral found, skip
  IF v_referral IS NULL THEN
    RETURN NEW;
  END IF;

  -- Grant bonus credit to referrer (insert a virtual credit pack)
  INSERT INTO storekit_purchases (
    user_id, 
    product_id, 
    transaction_id, 
    credits_amount, 
    credits_used, 
    status,
    is_subscription
  )
  VALUES (
    v_referral.referrer_id,
    'referral_bonus',
    'referral_' || v_referral.id::text,
    1,
    0,
    'active',
    false
  );

  -- Grant bonus credit to referred user
  INSERT INTO storekit_purchases (
    user_id, 
    product_id, 
    transaction_id, 
    credits_amount, 
    credits_used, 
    status,
    is_subscription
  )
  VALUES (
    v_referral.referred_id,
    'referral_bonus',
    'referred_' || v_referral.id::text,
    1,
    0,
    'active',
    false
  );

  -- Update referral status
  UPDATE referrals
  SET status = 'completed',
      bonus_granted = true,
      completed_at = now()
  WHERE id = v_referral.id;

  -- Send notification to referrer
  INSERT INTO notifications (user_id, type, actor_id, entity_id)
  VALUES (v_referral.referrer_id, 'referral_bonus', v_referral.referred_id, v_referral.id);

  RETURN NEW;
END;
$$;

-- Create trigger for granting referral bonus
CREATE TRIGGER trigger_grant_referral_bonus
AFTER INSERT OR UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.grant_referral_bonus();

-- Add realtime for referrals
ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;