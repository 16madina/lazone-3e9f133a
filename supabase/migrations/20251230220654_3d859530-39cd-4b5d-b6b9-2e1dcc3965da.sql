-- Generate referral codes for users who don't have one yet
UPDATE public.profiles 
SET referral_code = UPPER(SUBSTRING(MD5(user_id::text || now()::text || random()::text) FROM 1 FOR 8))
WHERE referral_code IS NULL OR referral_code = '';

-- Create function to generate referral code on new user creation
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := UPPER(SUBSTRING(MD5(NEW.user_id::text || now()::text || random()::text) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate referral code
DROP TRIGGER IF EXISTS trigger_generate_referral_code ON public.profiles;
CREATE TRIGGER trigger_generate_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_referral_code();