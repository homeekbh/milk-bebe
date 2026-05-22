-- ============================================================================
-- Migration commit D — Race condition stock + colonnes Sendcloud manquantes
-- À exécuter manuellement dans Supabase Studio (SQL Editor)
-- ============================================================================

-- ── 1. Colonnes Stripe & Sendcloud potentiellement manquantes ──────────────
-- Le code admin/sendcloud/create-label fait un UPDATE multi-colonnes qui
-- rejette TOUT silencieusement si une seule colonne manque. On garantit ici
-- leur existence.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS sendcloud_parcel_id text;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS label_url text;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Index pour lookup rapide depuis charge.refunded / payment_intent.payment_failed
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_id
  ON orders(stripe_payment_intent_id);

-- Index pour lookup retry sur sendcloud_parcel_id
CREATE INDEX IF NOT EXISTS idx_orders_sendcloud_parcel_id
  ON orders(sendcloud_parcel_id);


-- ── 2. RPC atomique — décrément stock anti race condition ──────────────────
-- Verrou SELECT FOR UPDATE = deux paiements simultanés sur le dernier
-- exemplaire ne peuvent plus réussir tous les deux.
--
-- Retour :
--   { ok: true,  new_stock: N, new_size_stock: M }
--   { ok: false, error: "insufficient_global_stock", available, requested }
--   { ok: false, error: "insufficient_size_stock",   size, available, requested }
--   { ok: false, error: "product_not_found" }

CREATE OR REPLACE FUNCTION decrement_stock_atomic(
  p_product_id uuid,
  p_quantity   integer,
  p_size       text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock        integer;
  v_sizes_stock  jsonb;
  v_size_stock   integer;
  v_new_stock    integer;
  v_new_sizes    jsonb;
BEGIN
  SELECT stock, sizes_stock
    INTO v_stock, v_sizes_stock
    FROM products
   WHERE id = p_product_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'product_not_found');
  END IF;

  IF v_stock < p_quantity THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'insufficient_global_stock',
      'available', v_stock,
      'requested', p_quantity
    );
  END IF;

  IF p_size IS NOT NULL THEN
    v_size_stock := COALESCE((v_sizes_stock->>p_size)::integer, 0);
    IF v_size_stock < p_quantity THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'insufficient_size_stock',
        'size', p_size,
        'available', v_size_stock,
        'requested', p_quantity
      );
    END IF;
    v_new_sizes := jsonb_set(
      COALESCE(v_sizes_stock, '{}'::jsonb),
      ARRAY[p_size],
      to_jsonb(v_size_stock - p_quantity)
    );
  ELSE
    v_new_sizes := COALESCE(v_sizes_stock, '{}'::jsonb);
  END IF;

  v_new_stock := v_stock - p_quantity;

  UPDATE products
     SET stock       = v_new_stock,
         sizes_stock = v_new_sizes
   WHERE id = p_product_id;

  RETURN jsonb_build_object(
    'ok',             true,
    'new_stock',      v_new_stock,
    'new_size_stock', CASE WHEN p_size IS NOT NULL THEN v_new_sizes->p_size ELSE NULL END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION decrement_stock_atomic(uuid, integer, text) TO service_role;
