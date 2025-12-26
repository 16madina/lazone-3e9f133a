-- Fix: Public subscription summary so non-logged-in users can see Premium/Pro badges

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  user_id UUID NOT NULL PRIMARY KEY,
  subscription_type TEXT NOT NULL,
  active_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT user_subscriptions_type_chk CHECK (subscription_type IN ('pro','premium'))
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_subscriptions' AND policyname='Subscription status is viewable by everyone'
  ) THEN
    CREATE POLICY "Subscription status is viewable by everyone"
    ON public.user_subscriptions
    FOR SELECT
    USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_subscriptions' AND policyname='Users can insert their own subscription summary'
  ) THEN
    CREATE POLICY "Users can insert their own subscription summary"
    ON public.user_subscriptions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_subscriptions' AND policyname='Users can update their own subscription summary'
  ) THEN
    CREATE POLICY "Users can update their own subscription summary"
    ON public.user_subscriptions
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Timestamp helper (safe to replace)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Compute subscription tier from purchases
CREATE OR REPLACE FUNCTION public.recalc_user_subscription(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_type text;
  v_active_until timestamptz;
BEGIN
  SELECT
    CASE
      WHEN bool_or(lower(product_id) LIKE '%premium%') THEN 'premium'
      WHEN bool_or(lower(product_id) LIKE '%pro%') THEN 'pro'
      ELSE NULL
    END,
    CASE
      WHEN bool_or(expiration_date IS NULL) THEN NULL
      ELSE max(expiration_date)
    END
  INTO v_type, v_active_until
  FROM public.storekit_purchases
  WHERE user_id = p_user_id
    AND status = 'active'
    AND (expiration_date IS NULL OR expiration_date > now())
    AND (lower(product_id) LIKE '%sub%' OR lower(product_id) LIKE '%agency%');

  IF v_type IS NULL THEN
    UPDATE public.user_subscriptions
      SET is_active = false,
          active_until = NULL
    WHERE user_id = p_user_id;
    RETURN;
  END IF;

  INSERT INTO public.user_subscriptions (user_id, subscription_type, active_until, is_active)
  VALUES (p_user_id, v_type, v_active_until, true)
  ON CONFLICT (user_id)
  DO UPDATE SET
    subscription_type = EXCLUDED.subscription_type,
    active_until = EXCLUDED.active_until,
    is_active = EXCLUDED.is_active;
END;
$$;

-- Trigger wrapper (trigger functions cannot take arguments)
CREATE OR REPLACE FUNCTION public.trg_recalc_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalc_user_subscription(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_user_subscription ON public.storekit_purchases;
CREATE TRIGGER trg_recalc_user_subscription
AFTER INSERT OR UPDATE OF status, expiration_date, product_id
ON public.storekit_purchases
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalc_user_subscription();

-- Backfill
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT DISTINCT user_id
    FROM public.storekit_purchases
    WHERE status = 'active'
      AND (expiration_date IS NULL OR expiration_date > now())
      AND (lower(product_id) LIKE '%sub%' OR lower(product_id) LIKE '%agency%')
  ) LOOP
    PERFORM public.recalc_user_subscription(r.user_id);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active ON public.user_subscriptions (is_active, subscription_type);