-- Add pas_de_porte column to properties table for commercial rentals
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS pas_de_porte numeric DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.properties.pas_de_porte IS 'Key money amount for commercial rental properties';