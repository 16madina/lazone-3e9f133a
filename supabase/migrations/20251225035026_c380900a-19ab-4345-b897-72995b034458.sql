-- Add user_type enum and columns for user classification
CREATE TYPE public.user_type AS ENUM ('particulier', 'proprietaire', 'demarcheur', 'agence');

-- Add user_type and agency_name columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN user_type public.user_type DEFAULT 'particulier',
ADD COLUMN agency_name text;

-- Update the public_profiles view to include user_type
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
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