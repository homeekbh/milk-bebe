-- ─────────────────────────────────────────────────────────────────────────────
-- 030 — TABLE D'OBSERVATION du moteur promo scopé (Lot 7c-1, SHADOW)
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠️ NON EXÉCUTÉ. Additif. À relire puis lancer à la main (Bou).
--
-- create-session calcule EN PARALLÈLE (shadow) ce que le moteur scopé produirait, et logue ici la
-- comparaison avec le calcul LEGACY facturé. AUCUN impact facturation : le coupon Stripe reste le
-- calcul legacy tant que PROMO_ENGINE!=='scoped' (flip = Lot 7c-2). L'insert est best-effort
-- (try/catch) → un échec (table absente comprise) ne fait JAMAIS échouer un checkout.
--
-- Sert à VÉRIFIER, sur du trafic réel anonymisé, que scoped == legacy (is_match) avant de basculer.
-- ═════════════════════════════════════════════════════════════════════════════

create table if not exists promo_shadow_log (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  cart_hash            text,          -- hash panier (réutilise la signature du coupon)
  email_masked         text,          -- 1re lettre + ***@ + domaine (jamais l'email en clair)
  subtotal             numeric,
  promo_codes          jsonb,         -- array des codes saisis (ordre de saisie)
  parrain_code         text,
  reward_count         integer,
  legacy_discount      numeric,       -- remise produit LEGACY (facturée) — valeur pure, même en mode scoped
  scoped_discount      numeric,       -- remise produit du moteur scopé (shadow)
  scoped_ratio         numeric,       -- scoped totalDiscount / subtotal
  scoped_cap_exceeded  boolean,       -- ratio scopé > 60 %
  scoped_free_shipping boolean,
  discount_delta       numeric,       -- scoped_discount - legacy_discount
  is_match             boolean,       -- |delta| < 0,01
  scoped_rejected      jsonb,         -- [{ code, reason }] rejetés par le moteur scopé
  notes                text           -- message si shadow null / fallback, sinon NULL
);

-- Lecture admin (comparaison) — service_role bypass RLS ; pas d'exposition anon prévue.
create index if not exists idx_promo_shadow_log_created on promo_shadow_log (created_at desc);
create index if not exists idx_promo_shadow_log_match   on promo_shadow_log (is_match);
