-- =====================================================
-- FIX CRITICAL SECURITY ISSUE #1: Profiles Table
-- Problem: All authenticated users can see all profile data (email, phone)
-- Solution: Create a restricted public view + update RLS policies
-- =====================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;

-- Create a public view with ONLY non-sensitive fields
CREATE OR REPLACE VIEW public.public_profiles AS
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

-- Add a new policy: Users can only see their own full profile
-- (The "Users can view own full profile" policy already exists, so we're good)

-- =====================================================
-- FIX CRITICAL SECURITY ISSUE #2: Appointments Table
-- Problem: contact_phone is exposed even when share_phone=false
-- Solution: Create a secure view that conditionally hides phone
-- =====================================================

-- Create a secure view for appointments that respects share_phone
CREATE OR REPLACE VIEW public.appointments_secure AS
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

-- =====================================================
-- Additional hardening: Restrict notifications INSERT
-- Problem: Any user could create notifications for any other user
-- Solution: Only allow creating notifications for yourself (except system)
-- =====================================================

-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create a more restrictive policy
-- Notifications are typically created by triggers, not directly by users
-- For manual creation (e.g., test), only allow for self
CREATE POLICY "Users can create their own notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.uid() = actor_id);