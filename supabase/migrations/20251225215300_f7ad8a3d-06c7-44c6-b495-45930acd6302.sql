-- Create table to store StoreKit purchases and credits
CREATE TABLE public.storekit_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL UNIQUE,
  original_transaction_id TEXT,
  credits_amount INTEGER NOT NULL DEFAULT 1,
  credits_used INTEGER NOT NULL DEFAULT 0,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expiration_date TIMESTAMP WITH TIME ZONE,
  is_subscription BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.storekit_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view their own purchases"
ON public.storekit_purchases
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own purchases (after StoreKit validation)
CREATE POLICY "Users can insert their own purchases"
ON public.storekit_purchases
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own purchases (to use credits)
CREATE POLICY "Users can update their own purchases"
ON public.storekit_purchases
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all purchases
CREATE POLICY "Admins can view all purchases"
ON public.storekit_purchases
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update any purchase
CREATE POLICY "Admins can update any purchase"
ON public.storekit_purchases
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for fast lookups
CREATE INDEX idx_storekit_purchases_user_id ON public.storekit_purchases(user_id);
CREATE INDEX idx_storekit_purchases_transaction_id ON public.storekit_purchases(transaction_id);

-- Add trigger for updated_at
CREATE TRIGGER update_storekit_purchases_updated_at
BEFORE UPDATE ON public.storekit_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();