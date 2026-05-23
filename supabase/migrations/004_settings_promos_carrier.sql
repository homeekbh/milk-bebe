-- ============================================================================
-- Migration 004 — Table settings + colonnes promo free_shipping / cumul + relay_postal_code
-- À exécuter manuellement dans Supabase Studio (SQL Editor)
-- ============================================================================
--
-- Contexte : refonte complète du système de livraison (2 transporteurs, 5
-- options) et des codes promo (free_shipping orthogonal + cumul livraison).

-- ── 1. Table settings — config admin dynamique (seuil livraison, etc.) ─────
CREATE TABLE IF NOT EXISTS settings (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Seed valeurs par défaut
INSERT INTO settings (key, value) VALUES
  ('free_shipping_threshold', '60')
ON CONFLICT (key) DO NOTHING;

-- RLS strict : seul service_role peut lire/écrire. L'exposition publique
-- du seuil passe par /api/settings/public (server-side).
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS settings_service_role_all ON settings;
CREATE POLICY settings_service_role_all ON settings
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ── 2. promo_codes — free_shipping + cumulable_avec_livraison ──────────────
-- free_shipping (boolean) : ce code offre la livraison gratuite EN PLUS du
-- type de remise éventuel. Indépendant du seuil automatique. Si TRUE → la
-- livraison passe à 0 peu importe le montant.
--
-- cumulable_avec_livraison (boolean) : si TRUE → quand ce code % ou € est
-- appliqué, le seuil automatique de livraison gratuite continue de jouer.
-- Si FALSE → le seuil auto est désactivé tant que ce code est actif.
ALTER TABLE promo_codes
  ADD COLUMN IF NOT EXISTS free_shipping boolean NOT NULL DEFAULT false;

ALTER TABLE promo_codes
  ADD COLUMN IF NOT EXISTS cumulable_avec_livraison boolean NOT NULL DEFAULT true;

-- Backfill rétroactif : les codes déjà en discount_type='free_shipping'
-- ont free_shipping=true pour cohérence visuelle.
UPDATE promo_codes
   SET free_shipping = true
 WHERE discount_type = 'free_shipping' AND free_shipping = false;


-- ── 3. orders — relay_postal_code (si manquant) ────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS relay_postal_code text;

-- Petit récap des colonnes attendues côté livraison (rappel — rien à ajouter
-- si déjà créé par les migrations précédentes) :
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier text DEFAULT 'colissimo';
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type text;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS relay_id text;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS relay_name text;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS relay_address text;
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS relay_city text;
