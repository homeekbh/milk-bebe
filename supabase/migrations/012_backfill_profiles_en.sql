-- 012_backfill_profiles_en.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill des colonnes canoniques EN de `public.profiles` (first_name, last_name,
-- phone, shipping_address) à partir des colonnes FR (prenom, nom, telephone,
-- adresse_livraison, ville, code_postal, pays), pour les comptes créés AVANT
-- l'unification. Depuis, app/[locale]/inscription/page.tsx écrit LES DEUX jeux ;
-- cette migration ne concerne donc que l'historique.
--
-- ⚠️ À EXÉCUTER MANUELLEMENT par Bou dans Supabase Studio → SQL Editor.
--    L'application ne l'exécute jamais automatiquement.
-- Idempotent : ne touche que les lignes dont la colonne EN est vide/nulle.
-- Note : suppose que profiles.shipping_address est de type JSONB (défaut Supabase).
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.profiles
SET
  first_name = COALESCE(NULLIF(first_name, ''), prenom),
  last_name  = COALESCE(NULLIF(last_name,  ''), nom),
  phone      = COALESCE(NULLIF(phone,      ''), telephone)
WHERE
  (first_name IS NULL OR first_name = '')
  OR (last_name IS NULL OR last_name = '')
  OR (phone IS NULL OR phone = '');

UPDATE public.profiles
SET shipping_address = jsonb_build_object(
      'name',        trim(concat_ws(' ', prenom, nom)),
      'line1',       COALESCE(adresse_livraison, ''),
      'line2',       '',
      'postal_code', COALESCE(code_postal, ''),
      'city',        COALESCE(ville, ''),
      'country',     COALESCE(pays, 'France')
    )
WHERE shipping_address IS NULL
  AND (adresse_livraison IS NOT NULL OR ville IS NOT NULL OR code_postal IS NOT NULL);
