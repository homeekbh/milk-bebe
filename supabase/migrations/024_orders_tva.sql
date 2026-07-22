-- ═══════════════════════════════════════════════════════════════════════════
-- 024_orders_tva.sql
-- CORRECTION DE CAP FISCAL : M!LK (EKBH SASU) est ASSUJETTIE À LA TVA (taux normal FR 20 %),
-- et NON en franchise 293 B (implémentée à tort). Les prix en base (products.price_ttc) et
-- orders.amount_total sont TTC → la TVA se calcule « EN DEDANS » : HT = TTC / 1,20, TVA = TTC − HT.
-- Les montants encaissés côté client NE CHANGENT PAS.
--
-- Ce fichier FIGE la ventilation TVA par commande (immuabilité des factures : si le taux évolue un
-- jour, les commandes déjà émises gardent leur ventilation d'origine). Le webhook remplit ces colonnes
-- à la création de commande (unifié + pack) ; ce backfill couvre les commandes ANTÉRIEURES.
--
-- Idempotent, non destructif. NON exécuté ici — à appliquer en prod.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Colonnes de ventilation (nullable : une commande non encore ventilée reste visible en NULL).
alter table orders add column if not exists montant_ht  numeric(10,2);
alter table orders add column if not exists montant_tva numeric(10,2);
alter table orders add column if not exists taux_tva    numeric(5,2) default 20.00;

-- 2) Backfill des commandes EXISTANTES à 20 % (calcul en dedans sur amount_total = TTC).
--    TVA = round(TTC × 0,20 / 1,20) ; HT = round(TTC − TVA) → HT + TVA = TTC au centime.
update orders
   set taux_tva    = 20.00,
       montant_tva = round(amount_total * 0.20 / 1.20, 2),
       montant_ht  = round(amount_total - round(amount_total * 0.20 / 1.20, 2), 2)
 where montant_ht is null;

-- ── Vérifs post-exécution suggérées ─────────────────────────────────────────
--   select column_name from information_schema.columns
--     where table_name = 'orders' and column_name in ('montant_ht','montant_tva','taux_tva'); -- 3 lignes
--   select count(*) from orders where montant_ht is null;                                     -- 0
--   select amount_total, montant_ht, montant_tva, montant_ht + montant_tva as somme
--     from orders order by created_at desc limit 5;   -- somme == amount_total
-- ═══════════════════════════════════════════════════════════════════════════
