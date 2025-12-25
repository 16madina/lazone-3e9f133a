-- Create app_settings table for global configuration
CREATE TABLE public.app_settings (
  id text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Settings are viewable by everyone" 
ON public.app_settings FOR SELECT 
USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can insert settings" 
ON public.app_settings FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update settings" 
ON public.app_settings FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default listing limit setting
INSERT INTO public.app_settings (id, value) VALUES 
('listing_limit', '{"enabled": true, "free_listings": 3, "price_per_extra": 1000, "currency": "XOF"}');

-- Create payments table to track listing payments
CREATE TABLE public.listing_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  transaction_ref text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.listing_payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view their own payments" 
ON public.listing_payments FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own payments
CREATE POLICY "Users can create their own payments" 
ON public.listing_payments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending payments
CREATE POLICY "Users can update their own payments" 
ON public.listing_payments FOR UPDATE 
USING (auth.uid() = user_id AND status = 'pending');

-- Admins can view all payments
CREATE POLICY "Admins can view all payments" 
ON public.listing_payments FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update any payment
CREATE POLICY "Admins can update any payment" 
ON public.listing_payments FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));