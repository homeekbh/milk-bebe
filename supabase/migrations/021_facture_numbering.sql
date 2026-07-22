-- ═══════════════════════════════════════════════════════════════════════════
-- 021_facture_numbering.sql
-- VERSIONNE la numérotation séquentielle des factures (variante retenue par Bou :
-- pas de PDF auto ; numéro séquentiel par commande payée + journal admin + impression
-- + export). Franchise 293 B → AUCUNE TVA (pas de ventilation HT/TVA sur les factures).
--
-- DÉJÀ APPLIQUÉ EN PROD (ne pas ré-exécuter) : le compteur 2026 est calé à 7 et les 7
-- commandes existantes sont numérotées MILK-2026-000001 → MILK-2026-000007. Ce fichier
-- reproduit uniquement le SCHÉMA (idempotent) pour tout NOUVEL environnement (staging / DR /
-- restauration) — le calage du compteur + la numérotation rétroactive des commandes sont
-- des données propres à la prod, hors de cette migration de schéma (un env neuf part à 0,
-- sans commande).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Compteur de facture, séquentiel PAR ANNÉE, sans trou (art. 289 CGI).
create table if not exists facture_seq (
  year        integer primary key,
  last_number integer not null default 0
);

-- 2) Attribution atomique du prochain numéro d'une année (verrou de ligne → aucune
--    collision concurrente ; renvoie l'entier, l'appli le formate MILK-<année>-<n padé 6>).
create or replace function next_facture_number(p_year integer)
returns integer language plpgsql as $$
declare n integer;
begin
  insert into facture_seq(year, last_number) values (p_year, 0)
    on conflict (year) do nothing;
  update facture_seq set last_number = last_number + 1
    where year = p_year
    returning last_number into n;
  return n;
end $$;

-- 3) Colonne du numéro sur la commande (figé à la 1re émission par le webhook).
alter table orders add column if not exists invoice_number text;

-- 4) Unicité des numéros émis (index partiel : ignore les NULL des commandes sans numéro).
create unique index if not exists orders_invoice_number_key
  on orders (invoice_number) where invoice_number is not null;

-- ── Vérifs post-exécution suggérées ─────────────────────────────────────────
--   select * from facture_seq;                              -- prod : (2026, 7)
--   select invoice_number, created_at from orders
--     where invoice_number is not null order by invoice_number;  -- prod : MILK-2026-000001..7
--   select next_facture_number(extract(year from now())::int); -- renverrait 8 en prod (NE PAS lancer si non voulu)
-- ═══════════════════════════════════════════════════════════════════════════
