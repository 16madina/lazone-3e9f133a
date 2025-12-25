-- Add columns to listing_payments to track sender phone and listing type
ALTER TABLE public.listing_payments 
ADD COLUMN IF NOT EXISTS sender_phone text,
ADD COLUMN IF NOT EXISTS listing_type text DEFAULT 'long_term';

-- Add a comment to explain the columns
COMMENT ON COLUMN public.listing_payments.sender_phone IS 'Phone number used by user to send the payment';
COMMENT ON COLUMN public.listing_payments.listing_type IS 'The mode: long_term (Immobilier) or short_term (Résidence)';