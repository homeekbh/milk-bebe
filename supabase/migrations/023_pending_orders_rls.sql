-- ═══════════════════════════════════════════════════════════════════════════
-- 023_pending_orders_rls.sql
-- VERSIONNE l'état PROD ACTUEL : RLS activée sur public.pending_orders.
--
-- Vérifié en prod : relrowsecurity = true. MAIS cette activation n'était dans AUCUNE
-- migration → perdue à toute reconstruction de la base (staging / DR / nouvel env), ce qui
-- rouvrirait une exposition de PII. La table n'est ni créée ni verrouillée dans
-- 006_rls_lockdown.sql (qui couvre orders, customers, abandoned_carts, admin_logs, reviews,
-- order_items, stock_alerts, waitlist, add_to_cart_events, product_images) — ce fichier comble
-- ce trou de versionnement.
--
-- pending_orders = le « draft » de commande : contient des PII (email invité, téléphone,
-- adresse domicile/relais, contenu du panier — davantage depuis l'international : adresse Stripe,
-- tél E.164). RLS active + AUCUNE policy anon/authenticated = DENY par défaut. Seul service_role
-- (clés serveur : create-session, webhook Stripe, cron daily) accède, en BYPASS de RLS et des GRANTs.
--
-- Idempotent, non destructif. NON exécuté (déjà appliqué en prod — ne rien casser).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) RLS active (idempotent : ré-activer si déjà actif n'a aucun effet). C'est l'état prod actuel.
alter table public.pending_orders enable row level security;

-- 2) Défense en profondeur (même approche que 006_rls_lockdown) : retirer tout droit direct aux rôles
--    publics. service_role BYPASSE et RLS et les GRANTs → les écritures serveur restent possibles.
revoke select, insert, update, delete on public.pending_orders from anon, authenticated;

-- AUCUNE `create policy` : RLS active + zéro policy = deny TOTAL pour anon/authenticated (lecture,
-- écriture). C'est l'intention (seul le serveur, via service_role, manipule les drafts).

-- ── Vérif post-exécution suggérée ───────────────────────────────────────────
--   select relrowsecurity from pg_class where relname = 'pending_orders';   -- attendu : true (prod)
--   select grantee, privilege_type from information_schema.role_table_grants
--     where table_name = 'pending_orders' and grantee in ('anon','authenticated');  -- attendu : 0 ligne
-- ═══════════════════════════════════════════════════════════════════════════
