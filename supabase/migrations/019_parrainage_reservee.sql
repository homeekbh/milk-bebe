-- ═══════════════════════════════════════════════════════════════════════════
-- 019_parrainage_reservee.sql
-- VERSIONNE la réservation atomique des récompenses parrainage (fix R2), appliquée
-- MANUELLEMENT en prod mais absente des migrations jusqu'ici → base non reproductible
-- (staging / restauration / DR / nouvel environnement régénéraient l'ancien schéma et
-- ré-ouvriraient le bug de double-dépense).
--
-- Idempotent, non destructif. NE PAS ré-exécuter en prod si déjà appliqué (aucun effet).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Colonne d'horodatage de réservation (statut disponible → reservee posé à create-session ;
--    remis à NULL à la libération).
alter table parrainage_recompenses
  add column if not exists reserved_at timestamptz;

-- 2) Autoriser le statut "reservee" dans la contrainte CHECK de `status`.
--    ⚠️ Reprend les 4 valeurs de la migration 017 (dont 'annulee', écrit par le flux
--    remboursement/litige) + ajoute 'reservee'. On supprime d'abord toute contrainte CHECK
--    existante sur `status` (son nom varie selon l'historique) puis on recrée la version à
--    5 valeurs — même approche que 017_parrainage_annulation.sql.
do $$
declare cname text;
begin
  for cname in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    where rel.relname = 'parrainage_recompenses'
      and con.contype  = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table parrainage_recompenses drop constraint %I', cname);
  end loop;
end $$;

alter table parrainage_recompenses
  add constraint parrainage_recompenses_status_check
  check (status in ('disponible', 'reservee', 'utilisee', 'expiree', 'annulee'));

-- 3) Index partiel pour la libération des réservations bloquées (cron/daily étape 6 :
--    reservee dont reserved_at > 2 h → disponible).
create index if not exists idx_parrainage_reservee
  on parrainage_recompenses (status, reserved_at)
  where status = 'reservee';

-- ── Vérifs post-exécution suggérées ─────────────────────────────────────────
--   select pg_get_constraintdef(oid) from pg_constraint
--     where conrelid = 'parrainage_recompenses'::regclass and contype = 'c';
--     -- doit inclure À LA FOIS 'reservee' ET 'annulee' (5 valeurs)
--   select column_name from information_schema.columns
--     where table_name = 'parrainage_recompenses' and column_name = 'reserved_at';  -- 1 ligne
--   select indexname from pg_indexes where indexname = 'idx_parrainage_reservee';   -- 1 ligne
-- ═══════════════════════════════════════════════════════════════════════════
