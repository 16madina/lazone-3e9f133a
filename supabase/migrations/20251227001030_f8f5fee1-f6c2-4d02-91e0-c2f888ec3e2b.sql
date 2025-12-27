-- Fix: When a new subscription is purchased, deactivate older subscriptions of the same user
-- This ensures the recalc function only considers the most recent active subscription

-- Step 1: Create a function to expire old subscriptions when a new one is purchased
CREATE OR REPLACE FUNCTION public.expire_old_subscriptions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process subscription products
  IF NEW.product_id LIKE '%sub%' OR NEW.product_id LIKE '%agency%' THEN
    -- Mark all previous subscription purchases for this user as expired
    UPDATE public.storekit_purchases
    SET status = 'expired'
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND status = 'active'
      AND (product_id LIKE '%sub%' OR product_id LIKE '%agency%');
    
    RAISE NOTICE 'Expired old subscriptions for user %', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 2: Create trigger that runs BEFORE the recalc trigger
DROP TRIGGER IF EXISTS trg_expire_old_subscriptions ON public.storekit_purchases;
CREATE TRIGGER trg_expire_old_subscriptions
AFTER INSERT ON public.storekit_purchases
FOR EACH ROW
EXECUTE FUNCTION public.expire_old_subscriptions();

-- Step 3: Also update recalc function to use the most recent subscription if multiple are active
CREATE OR REPLACE FUNCTION public.recalc_user_subscription(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_type text;
  v_active_until timestamptz;
BEGIN
  -- Get the most recent active subscription (by created_at)
  SELECT
    CASE
      WHEN lower(product_id) LIKE '%premium%' THEN 'premium'
      WHEN lower(product_id) LIKE '%pro%' THEN 'pro'
      ELSE NULL
    END,
    expiration_date
  INTO v_type, v_active_until
  FROM public.storekit_purchases
  WHERE user_id = p_user_id
    AND status = 'active'
    AND (expiration_date IS NULL OR expiration_date > now())
    AND (lower(product_id) LIKE '%sub%' OR lower(product_id) LIKE '%agency%')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_type IS NULL THEN
    UPDATE public.user_subscriptions
      SET is_active = false,
          active_until = NULL,
          updated_at = now()
    WHERE user_id = p_user_id;
    RETURN;
  END IF;

  INSERT INTO public.user_subscriptions (user_id, subscription_type, active_until, is_active, updated_at)
  VALUES (p_user_id, v_type, v_active_until, true, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    subscription_type = EXCLUDED.subscription_type,
    active_until = EXCLUDED.active_until,
    is_active = EXCLUDED.is_active,
    updated_at = now();
END;
$$;

-- Step 4: Fix existing data - expire old subscriptions for users with multiple active subs
WITH ranked_subs AS (
  SELECT 
    id,
    user_id,
    product_id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM public.storekit_purchases
  WHERE status = 'active'
    AND (product_id LIKE '%sub%' OR product_id LIKE '%agency%')
)
UPDATE public.storekit_purchases sp
SET status = 'expired'
FROM ranked_subs rs
WHERE sp.id = rs.id
  AND rs.rn > 1;

-- Step 5: Recalculate subscription for the affected user
SELECT public.recalc_user_subscription('ed11a880-bb01-46a3-8772-6a119f71bfdf'::uuid);