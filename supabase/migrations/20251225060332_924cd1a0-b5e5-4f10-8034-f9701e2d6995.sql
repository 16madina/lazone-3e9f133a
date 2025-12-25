-- Allow users to consume a validated payment credit by linking it to a property,
-- without allowing them to modify protected payment fields.

-- 1) Update RLS policy for user updates
DROP POLICY IF EXISTS "Users can update their own payments" ON public.listing_payments;

CREATE POLICY "Users can update their own payments"
ON public.listing_payments
FOR UPDATE
USING (
  auth.uid() = user_id
  AND (
    status = 'pending'
    OR (status = 'completed' AND property_id IS NULL)
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND (
    status = 'pending'
    OR (status = 'completed' AND property_id IS NOT NULL)
  )
);

-- 2) Add a trigger to prevent users from tampering with completed payments
CREATE OR REPLACE FUNCTION public.enforce_listing_payment_user_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow backend/service-role contexts and admins to do their work
  IF auth.uid() IS NULL OR has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Only the owner can update
  IF auth.uid() <> OLD.user_id THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  -- Pending payments: users must NOT be able to change core fields or status
  IF OLD.status = 'pending' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Cannot change payment status';
    END IF;

    IF NEW.amount IS DISTINCT FROM OLD.amount
      OR NEW.currency IS DISTINCT FROM OLD.currency
      OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
      OR NEW.listing_type IS DISTINCT FROM OLD.listing_type
      OR NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
      OR NEW.property_id IS DISTINCT FROM OLD.property_id THEN
      RAISE EXCEPTION 'Cannot modify payment fields';
    END IF;

    -- Allow sender_phone / transaction_ref edits (if ever needed)
    RETURN NEW;
  END IF;

  -- Completed payments: allow ONLY linking to a property (consume credit)
  IF OLD.status = 'completed' THEN
    IF OLD.property_id IS NOT NULL THEN
      RAISE EXCEPTION 'Payment already used';
    END IF;

    IF NEW.property_id IS NULL THEN
      RAISE EXCEPTION 'property_id required';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status
      OR NEW.amount IS DISTINCT FROM OLD.amount
      OR NEW.currency IS DISTINCT FROM OLD.currency
      OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
      OR NEW.transaction_ref IS DISTINCT FROM OLD.transaction_ref
      OR NEW.sender_phone IS DISTINCT FROM OLD.sender_phone
      OR NEW.listing_type IS DISTINCT FROM OLD.listing_type
      OR NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
      RAISE EXCEPTION 'Cannot modify completed payment';
    END IF;

    RETURN NEW;
  END IF;

  -- For any other status, block user updates
  RAISE EXCEPTION 'Cannot modify payment';
END;
$$;

DROP TRIGGER IF EXISTS enforce_listing_payment_user_updates ON public.listing_payments;

CREATE TRIGGER enforce_listing_payment_user_updates
BEFORE UPDATE ON public.listing_payments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_listing_payment_user_updates();