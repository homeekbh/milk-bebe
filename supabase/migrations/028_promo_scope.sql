-- ─────────────────────────────────────────────────────────────────────────────
-- 028 — PORTÉE DES CODES PROMO (all | category | product) — validée CÔTÉ SERVEUR
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠️ NON EXÉCUTÉ. Additif. À relire puis lancer à la main (Bou).
--
-- Permet de restreindre un code promo à : TOUS les produits (all), une CATÉGORIE, ou UN produit.
-- La portée est LUE EN BASE et vérifiée côté serveur (create-session) contre les items validés —
-- JAMAIS depuis le body client (D5 : remise sur le sous-total ÉLIGIBLE seulement).
--
--   • scope_type  : 'all' (défaut) | 'category' | 'product'
--   • scope_value : NULL si 'all' ; slug de catégorie si 'category' ; id (uuid) du produit si
--                   'product' (id immuable → robuste au renommage de slug).
--
-- Défaut 'all' → tous les codes EXISTANTS restent valables partout (aucune régression).
-- ═════════════════════════════════════════════════════════════════════════════

alter table promo_codes add column if not exists scope_type  text not null default 'all';
alter table promo_codes add column if not exists scope_value text;   -- NULL | category_slug | product_id

-- Contrainte de domaine (idempotente).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'promo_codes_scope_type_chk') then
    alter table promo_codes
      add constraint promo_codes_scope_type_chk
      check (scope_type in ('all', 'category', 'product'));
  end if;
end $$;
