-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 018 — Exclusion des commandes de TEST INTERNE des dashboards.
-- ⚠️  À EXÉCUTER MANUELLEMENT par Bou dans Supabase Studio (SQL Editor).
--     Idempotent. Non destructif.
--
-- Colonne booléenne, défaut false → toutes les commandes existantes sont
-- considérées « réelles » par défaut. On marque ensuite manuellement depuis
-- /admin/commandes les ~30 tests d'hier + les 4 anciennes.
--
-- ⚠️ ORDRE DE DÉPLOIEMENT : cette migration doit être exécutée AVANT de pousser
--    le code qui lit/filtre is_internal_test (isValidOrder + selects analytics +
--    toggle admin), sinon les requêtes analytics échouent (colonne inconnue).
-- ═══════════════════════════════════════════════════════════════════════════

alter table orders
  add column if not exists is_internal_test boolean not null default false;

-- Index partiel : les dashboards excluent is_internal_test = true (minorité de lignes).
create index if not exists idx_orders_is_internal_test
  on orders(is_internal_test)
  where is_internal_test = true;

-- Vérif : select id, customer_email, is_internal_test from orders order by created_at desc limit 40;
