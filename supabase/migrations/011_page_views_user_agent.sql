-- ════════════════════════════════════════════════════════════════
-- 011 — page_views : user_agent + is_bot (filtrage bots fiable)
-- À EXÉCUTER MANUELLEMENT dans Supabase Studio (SQL Editor).
--
-- Le tracker (app/api/track-view/route.ts) alimente déjà ces colonnes ; le code
-- gère leur absence (insert à 3 niveaux), donc l'ordre d'exécution n'a aucune
-- importance et rien ne casse tant que ce script n'est pas passé.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE page_views ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS is_bot boolean DEFAULT false;

-- Index léger pour filtrer/exclure les bots rapidement côté agrégats.
CREATE INDEX IF NOT EXISTS page_views_is_bot_idx ON page_views (is_bot);
