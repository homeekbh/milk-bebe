-- ============================================================================
-- Migration 005 — Colonne customer_phone sur orders
-- À exécuter manuellement dans Supabase Studio (SQL Editor)
-- ============================================================================
--
-- Sendcloud v3 exige `phone_number` sur to_address pour TOUS les
-- transporteurs (Colissimo, Mondial Relay, etc.). On ajoute customer_phone
-- pour persister la valeur saisie au checkout panier.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_phone text;

-- Backfill rétroactif depuis shipping_address->phone si renseigné
UPDATE orders
   SET customer_phone = shipping_address->>'phone'
 WHERE customer_phone IS NULL
   AND shipping_address ? 'phone'
   AND shipping_address->>'phone' <> '';
