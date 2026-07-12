-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 014 — Système de parrainage (étape 12 du chantier)
-- ⚠️  À EXÉCUTER MANUELLEMENT par Bou dans Supabase Studio (SQL Editor).
--     Rien n'est exécuté automatiquement. Idempotent (ré-exécutable sans casse).
--
-- Deux mécaniques :
--   1. Remise filleul : -montant_recompense si total après promo >= seuil_filleul.
--   2. Récompenses parrain : +montant_recompense par filleul payé, valables
--      duree_validite_jours, utilisables sur les commandes du parrain (>= seuil_parrain,
--      max_recompenses_par_commande).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1) parrain_code sur profiles ───────────────────────────────────────────
-- Généré automatiquement à la création du compte (trigger), unique, jamais
-- supprimé tant que le compte existe. Format : 8 caractères A-Z2-9 (sans les
-- ambigus 0/O/1/I) → lisible, dictable, ~1e12 combinaisons.

create or replace function gen_parrain_code() returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code  text := '';
  i     int;
begin
  for i in 1..8 loop
    code := code || substr(chars, floor(random() * length(chars))::int + 1, 1);
  end loop;
  return code;
end;
$$ language plpgsql volatile;

alter table profiles add column if not exists parrain_code text;

-- Backfill des comptes déjà créés (codes uniques garantis).
do $$
declare
  r record;
  c text;
begin
  for r in select id from profiles where parrain_code is null loop
    loop
      c := gen_parrain_code();
      exit when not exists (select 1 from profiles where parrain_code = c);
    end loop;
    update profiles set parrain_code = c where id = r.id;
  end loop;
end $$;

-- Trigger : garantit un code unique à chaque INSERT (couvre le insert app-side
-- de l'inscription, l'admin, ou tout autre chemin) si aucun code fourni.
create or replace function set_parrain_code() returns trigger as $$
declare c text;
begin
  if new.parrain_code is null then
    loop
      c := gen_parrain_code();
      exit when not exists (select 1 from profiles where parrain_code = c);
    end loop;
    new.parrain_code := c;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_parrain_code on profiles;
create trigger trg_set_parrain_code
  before insert on profiles
  for each row execute function set_parrain_code();

do $$ begin
  alter table profiles add constraint profiles_parrain_code_unique unique (parrain_code);
exception when duplicate_table or duplicate_object then null;
end $$;

create index if not exists idx_profiles_parrain_code on profiles(parrain_code);

-- ── 2) parrainage_recompenses (mécanique 2) ────────────────────────────────
-- Une ligne = une récompense de 5€ (montant FIGÉ à la génération) gagnée par un
-- parrain quand un filleul paie avec son code.
create table if not exists parrainage_recompenses (
  id                uuid primary key default gen_random_uuid(),
  parrain_id        uuid not null references profiles(id) on delete cascade,
  filleul_order_id  uuid references orders(id) on delete set null,
  montant           numeric(10,2) not null,
  status            text not null default 'disponible'
                      check (status in ('disponible', 'utilisee', 'expiree')),
  used_on_order_id  uuid references orders(id) on delete set null,
  created_at        timestamptz not null default now(),
  expires_at        timestamptz not null
);
create index if not exists idx_recompenses_parrain on parrainage_recompenses(parrain_id, status);
create index if not exists idx_recompenses_expires on parrainage_recompenses(status, expires_at);

alter table parrainage_recompenses enable row level security;
revoke select, insert, update, delete on parrainage_recompenses from anon, authenticated;

-- ── 3) parrainage_settings (singleton) ─────────────────────────────────────
-- Tout est configurable depuis l'admin.
create table if not exists parrainage_settings (
  id                            int primary key default 1 check (id = 1),
  actif                         boolean       not null default true,
  montant_recompense            numeric(10,2) not null default 5.00,
  seuil_filleul                 numeric(10,2) not null default 60.00,
  seuil_parrain                 numeric(10,2) not null default 100.00,
  max_recompenses_par_commande  integer       not null default 4,
  duree_validite_jours          integer       not null default 30,
  categories_restriction        text[]        default null
);
insert into parrainage_settings (id) values (1) on conflict (id) do nothing;

alter table parrainage_settings enable row level security;
revoke select, insert, update, delete on parrainage_settings from anon, authenticated;

-- ── 4) Réconciliation sur orders ───────────────────────────────────────────
-- Ce qui a réellement été appliqué sur la commande (pour l'admin + le webhook).
alter table orders add column if not exists parrain_code        text;
alter table orders add column if not exists parrain_discount    numeric(10,2) not null default 0;
alter table orders add column if not exists recompense_discount numeric(10,2) not null default 0;

-- ── 5) Payload parrainage sur le brouillon de commande ─────────────────────
-- create-session valide + calcule côté serveur puis stocke ici ce qui devra
-- être appliqué au paiement confirmé (webhook) : code parrain + id du parrain,
-- montant remise filleul, ids des récompenses consommées + montant. Le webhook
-- est la SEULE étape qui rattache le filleul et consomme/crée les récompenses.
alter table pending_orders add column if not exists parrainage jsonb;

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN migration 014. Vérifs post-exécution suggérées :
--   select parrain_code from profiles limit 5;           -- codes présents/uniques
--   select * from parrainage_settings;                   -- singleton id=1, défauts
--   select count(*) from parrainage_recompenses;         -- 0 au départ
-- ═══════════════════════════════════════════════════════════════════════════
