-- ════════════════════════════════════════════════════════════════════════════
-- 007 — Attribution 1st-party sur page_views
-- ════════════════════════════════════════════════════════════════════════════
-- Ajoute les colonnes de source d'acquisition à page_views pour l'attribution
-- interne (zéro API externe : ni GA4 ni Meta). Capté côté client (first-touch)
-- via lib/attribution.ts et persisté par /api/track-view.
--
-- À exécuter dans le SQL Editor Supabase (Studio). Idempotent (IF NOT EXISTS).
-- Le code (track-view + dashboard) est MIGRATION-SAFE : il fonctionne déjà
-- avant cette migration (les colonnes manquantes sont simplement ignorées) et
-- commence à remplir/afficher l'attribution dès qu'elle est exécutée.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE page_views ADD COLUMN IF NOT EXISTS utm_source   text;
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS utm_medium   text;
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS referrer     text;
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS device       text;  -- 'mobile' | 'tablet' | 'desktop'

-- Index pour l'agrégation par canal dans le dashboard (filtré sur 30j).
CREATE INDEX IF NOT EXISTS idx_page_views_utm_source ON page_views (utm_source);
CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at  ON page_views (viewed_at);

-- RLS : inchangée. page_views est déjà verrouillée (migration 006). Les colonnes
-- héritent de la policy existante (insert via service_role uniquement, côté serveur).
