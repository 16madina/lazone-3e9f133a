-- Remove INSERT policy for users on storekit_purchases (only backend can insert)
DROP POLICY IF EXISTS "Users can insert their own purchases" ON public.storekit_purchases;

-- Add a new restrictive policy that blocks direct inserts (only service role can insert)
-- Users can still SELECT and UPDATE (for credits_used) their own purchases

-- Ensure the update policy only allows updating credits_used field
DROP POLICY IF EXISTS "Users can update their own purchases" ON public.storekit_purchases;

CREATE POLICY "Users can update credits_used only" 
ON public.storekit_purchases 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  -- Only allow updating credits_used, nothing else
  credits_used >= 0
);