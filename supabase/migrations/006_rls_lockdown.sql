-- ─────────────────────────────────────────────────────────────────────────────
-- 006 — RLS lockdown
--
-- Contexte : audit du 2026-05-24 a révélé que `newsletter_subscribers` était
-- lisible publiquement avec la clé NEXT_PUBLIC_SUPABASE_ANON_KEY (6 emails +
-- unsubscribe_token exposés). Plusieurs autres tables sensibles n'avaient pas
-- de RLS — elles sont vides aujourd'hui, mais accumulent des PII (orders,
-- customers, abandoned_carts, etc.).
--
-- Cette migration :
--   1. Active RLS sur toutes les tables sensibles
--   2. Révoque les droits de lecture/écriture aux rôles `anon` et `authenticated`
--   3. Laisse `service_role` libre (utilisé par lib/server/supabase.ts pour
--      toutes les routes /api/admin/*)
--
-- Important : aucune `CREATE POLICY` ici. Avec RLS activée + REVOKE des droits,
-- les rôles anon/authenticated voient simplement "table vide" — le mode le plus
-- strict possible. Si un jour on veut exposer certaines colonnes aux clients
-- connectés (ex : un client voit ses propres `orders`), il faudra ajouter une
-- policy explicite via une migration ultérieure.
--
-- À exécuter dans Supabase Studio → SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. FUITE CRITIQUE : newsletter_subscribers (6 lignes exposées au moment de l'audit) ──
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
REVOKE SELECT, INSERT, UPDATE, DELETE ON newsletter_subscribers FROM anon, authenticated;

-- ── 2. Tables sensibles (PII / business) — RLS préventive ──
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE abandoned_carts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist           ENABLE ROW LEVEL SECURITY;
ALTER TABLE add_to_cart_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images     ENABLE ROW LEVEL SECURITY;

REVOKE SELECT, INSERT, UPDATE, DELETE ON
  orders, customers, abandoned_carts, admin_logs, reviews,
  order_items, stock_alerts, waitlist, add_to_cart_events, product_images
FROM anon, authenticated;

-- ── 3. Tables volontairement publiques (catalogue, popups, livraison) ──
-- Pas de changement. Restent lisibles via clé anon parce que le site les affiche
-- côté client (catalogue produits, popup promo, méthodes de livraison).
-- Tables concernées : products, categories, popups, homepage_config, shipping_methods.

-- ── Vérification post-migration (à exécuter après) ──
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
