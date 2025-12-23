-- Drop the old constraint and add a new one with all notification types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    -- Social
    'follow'::text, 
    'review'::text, 
    'message'::text,
    -- Réservations (mode résidence)
    'reservation_request'::text,
    'reservation_approved'::text,
    'reservation_rejected'::text,
    -- Rendez-vous (mode immobilier)
    'appointment_request'::text,
    'appointment_approved'::text,
    'appointment_rejected'::text,
    -- Badges
    'badge'::text,
    -- Email verification
    'verify_email'::text,
    -- Promotions
    'promotion'::text,
    -- Delete listing
    'delete_listing'::text,
    -- Reports (admin)
    'user_report'::text,
    'property_report'::text,
    -- Test
    'test'::text
  ])
);