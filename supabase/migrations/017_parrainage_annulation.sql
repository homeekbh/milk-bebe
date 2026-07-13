-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 017 — Annulation d'une récompense parrain si la commande filleul
-- qui l'a générée est remboursée (anti-abus).
-- ⚠️  À EXÉCUTER MANUELLEMENT par Bou dans Supabase Studio (SQL Editor).
--     Rien n'est exécuté automatiquement. Idempotent (ré-exécutable sans casse).
--
-- Contexte : le webhook charge.refunded annule automatiquement la récompense
-- (statut 'disponible' → 'annulee') sur remboursement TOTAL de la commande
-- filleul. Les cas ambigus (remboursement partiel, récompense déjà 'utilisee')
-- sont FLAGUÉS pour révision manuelle (annulation_en_attente) — jamais annulés
-- automatiquement.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1) Étendre la contrainte CHECK de status : + 'annulee' (4e valeur) ───────
-- La contrainte de la migration 014 est INLINE → auto-nommée par Postgres. On la
-- retrouve DYNAMIQUEMENT (quel que soit son nom réel) puis on la remplace, plutôt
-- que de deviner le nom. (Il n'existe qu'une seule check-constraint sur status.)
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
  check (status in ('disponible', 'utilisee', 'expiree', 'annulee'));

-- ── 2) Traçabilité de l'annulation + flag de révision manuelle ───────────────
alter table parrainage_recompenses
  add column if not exists annulee_at            timestamptz,
  add column if not exists annulation_reason     text,
  add column if not exists annulation_en_attente boolean not null default false;

-- Liste rapide des cas à revoir côté admin (index partiel).
create index if not exists idx_recompenses_a_verifier
  on parrainage_recompenses(annulation_en_attente)
  where annulation_en_attente = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- Vérifs post-exécution suggérées :
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--     where conrelid = 'parrainage_recompenses'::regclass and contype = 'c';
--   -- doit inclure 'annulee'
--   select status, annulation_en_attente, annulation_reason, annulee_at
--     from parrainage_recompenses;
-- ═══════════════════════════════════════════════════════════════════════════
