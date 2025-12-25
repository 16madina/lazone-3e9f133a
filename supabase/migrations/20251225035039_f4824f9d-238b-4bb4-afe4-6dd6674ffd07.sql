-- Fix security definer view issue by using SECURITY INVOKER
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
  created_at,
  user_type,
  agency_name
FROM public.profiles;