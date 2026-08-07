-- 031_newsletter_has_ordered_rpc.sql
-- Point B (envoi newsletter ciblé) : booléen « a déjà commandé » PAR ABONNÉ,
-- calculé ENTIÈREMENT côté SQL — la route ne fait AUCUN croisement en JS.
--
-- newsletter_subscribers_with_orders() renvoie chaque abonné + has_ordered =
-- EXISTS(commande CLIENTE pour cet email). Le croisement est PAR EMAIL, avec la
-- casse normalisée des DEUX côtés (lower). classification='cliente' est filtrée
-- EN SQL (NULL / '' = défaut projet, cf. lib/orders.classificationOf) → exclut
-- collab / cadeau / vente_directe ; is_internal_test exclut les tests. Un EXISTS
-- PAR abonné = sondage indexé, JAMAIS un scan complet de la table orders.
--
-- ⚠️ LIMITE ASSUMÉE : le rapprochement est PAR EMAIL. Une cliente qui a commandé
-- avec une adresse DIFFÉRENTE de son inscription newsletter apparaîtra « jamais
-- commandé ». Imprécision inhérente au match par email, pas un bug.

create or replace function public.newsletter_subscribers_with_orders()
returns table (
  id                uuid,
  email             text,
  source            text,
  promo_code        text,
  created_at        timestamptz,
  active            boolean,
  unsubscribe_token text,
  has_ordered       boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ns.id, ns.email, ns.source, ns.promo_code, ns.created_at, ns.active, ns.unsubscribe_token,
    exists (
      select 1
      from orders o
      where lower(o.customer_email) = lower(ns.email)                    -- casse normalisée des DEUX côtés
        and coalesce(nullif(o.classification, ''), 'cliente') = 'cliente' -- cliente uniquement (NULL/'' = défaut)
        and o.is_internal_test is not true                               -- exclut les tests internes
    ) as has_ordered
  from newsletter_subscribers ns
  order by ns.created_at desc;
$$;

-- SÉCURITÉ : la fonction lit des emails + l'historique de commande (PII) et est
-- SECURITY DEFINER (bypass RLS). Elle ne doit être appelable QUE par la service_role
-- (la route admin l'invoque avec la clé service, après avoir vérifié is_admin).
-- On révoque l'accès public/anon/authenticated pour qu'elle ne soit pas exposée via
-- l'endpoint REST /rpc.
revoke all    on function public.newsletter_subscribers_with_orders() from public, anon, authenticated;
grant  execute on function public.newsletter_subscribers_with_orders() to service_role;

-- PERFORMANCE : index fonctionnel sur lower(customer_email). Sans lui, chaque EXISTS
-- ferait un scan séquentiel d'orders → la page ralentirait à volume. Avec lui, chaque
-- abonné = un sondage d'index. (Recommandé, à créer en même temps que la fonction.)
create index if not exists idx_orders_lower_customer_email on public.orders (lower(customer_email));
