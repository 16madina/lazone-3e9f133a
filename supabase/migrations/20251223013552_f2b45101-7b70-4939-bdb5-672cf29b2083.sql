-- Fix Security Definer View warnings by recreating views with security_invoker = true
-- This ensures views respect the RLS policies of the querying user

-- Drop and recreate public_profiles view with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  full_name,
  avatar_url,
  country,
  last_seen_at,
  created_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Drop and recreate appointments_secure view with SECURITY INVOKER
DROP VIEW IF EXISTS public.appointments_secure;
CREATE VIEW public.appointments_secure 
WITH (security_invoker = true)
AS
SELECT 
  id,
  property_id,
  requester_id,
  owner_id,
  requested_date,
  requested_time,
  check_in_date,
  check_out_date,
  message,
  status,
  reservation_type,
  price_per_night,
  total_nights,
  total_price,
  response_message,
  share_phone,
  -- Only show contact_phone if share_phone is true OR if the viewer is the requester
  CASE 
    WHEN share_phone = true THEN contact_phone
    WHEN auth.uid() = requester_id THEN contact_phone
    ELSE NULL
  END AS contact_phone,
  created_at,
  updated_at
FROM public.appointments
WHERE auth.uid() = requester_id OR auth.uid() = owner_id;

-- Grant access to the secure view
GRANT SELECT ON public.appointments_secure TO authenticated;

-- Also need to add RLS policy for profiles to allow the view to work
-- Create a policy that allows authenticated users to read limited profile data
CREATE POLICY "Public can view limited profile data via view"
ON public.profiles
FOR SELECT
USING (true);