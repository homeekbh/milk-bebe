-- Migration 010 : idempotence des effets de bord du webhook Stripe
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS webhook_processed boolean NOT NULL DEFAULT false;

-- Backfill : les commandes existantes ont déjà été traitées (stock déjà décrémenté
-- historiquement). On les marque processed=true pour qu'un rejeu Stripe ne re-décrémente pas.
UPDATE orders SET webhook_processed = true WHERE webhook_processed = false;

-- Index partiel léger (lookups des commandes non encore traitées)
CREATE INDEX IF NOT EXISTS idx_orders_webhook_unprocessed
  ON orders (webhook_processed) WHERE webhook_processed = false;
