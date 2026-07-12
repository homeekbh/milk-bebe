-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 016 — Cumul de codes promo classiques entre eux (étape 21)
-- ⚠️  À EXÉCUTER MANUELLEMENT par Bou dans Supabase Studio.
--
-- La colonne `cumulable` (boolean) existe déjà sur promo_codes (on la RÉUTILISE
-- pour "ce code accepte d'être cumulé à d'autres codes"). On ajoute la liste des
-- codes explicitement compatibles.
--
-- ⚠️ On NE touche PAS à l'ancienne colonne `cumulable_avec` (texte legacy,
--    orpheline, non lue par le calcul) → nom distinct pour éviter toute collision.
-- ═══════════════════════════════════════════════════════════════════════════

alter table promo_codes
  add column if not exists cumulable_codes text[] default null;

-- (`cumulable` boolean déjà présent, défaut false = code exclusif.)

-- Vérif : select code, cumulable, cumulable_codes from promo_codes;
-- ═══════════════════════════════════════════════════════════════════════════
