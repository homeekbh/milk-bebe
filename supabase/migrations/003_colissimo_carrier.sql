-- ============================================================================
-- Migration 003 — Colonne carrier (transporteur) sur orders
-- À exécuter manuellement dans Supabase Studio (SQL Editor)
-- ============================================================================
--
-- Contexte : bascule Mondial Relay → Colissimo (commits A/B). On ajoute une
-- colonne carrier qui sera persistée par le stripe webhook
-- (/api/stripe/webhook/route.ts → "carrier": "colissimo" en best-effort
-- 2-step update). Utile pour les futurs filtres comptables, exports CSV,
-- et l'analytics par transporteur.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS carrier text DEFAULT 'colissimo';

CREATE INDEX IF NOT EXISTS idx_orders_carrier
  ON orders(carrier);

-- Backfill : toutes les commandes existantes deviennent Colissimo.
-- (M!LK n'a expédié qu'en Colissimo en prod ; les rares parcels Mondial
-- Relay créés en sandbox Sendcloud avant la bascule restent en 'colissimo'
-- côté finance — c'est un détail cosmétique sans impact comptable.)
UPDATE orders
   SET carrier = 'colissimo'
 WHERE carrier IS NULL;

-- Sanity check : il ne doit plus rester de carrier NULL
SELECT COUNT(*) AS still_null
  FROM orders
 WHERE carrier IS NULL;

-- Filet de sécurité idempotent : si la migration 002 n'a pas été exécutée,
-- on convertit les anciennes commandes 'locker' → 'point_relais' ici aussi.
UPDATE orders
   SET delivery_type = 'point_relais'
 WHERE delivery_type = 'locker';
