-- 013_abandoned_carts_email_unique.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Contrainte UNIQUE sur abandoned_carts.email — DURCISSEMENT (sécurité concurrence).
--
-- Contexte : /api/cart/save et le webhook checkout.session.expired faisaient un
-- .upsert({ onConflict: "email" }) SANS que la table n'ait de contrainte UNIQUE sur
-- email → l'upsert échouait silencieusement (Postgres 42P10) et AUCUN panier abandonné
-- n'était jamais enregistré. Le code a été corrigé en update-or-insert manuel, qui
-- fonctionne DÉJÀ sans cette contrainte.
--
-- Cette contrainte est un bonus : elle empêche la création de doublons en cas de
-- requêtes concurrentes pour le même email (le update-or-insert manuel a une petite
-- fenêtre de course). Recommandée mais non bloquante.
--
-- ⚠️ À EXÉCUTER MANUELLEMENT par Bou dans Supabase Studio → SQL Editor.
--    Table actuellement vide → aucun doublon à dédupliquer au préalable.
--    (Si des doublons existaient : les fusionner/supprimer avant de lancer l'ALTER.)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.abandoned_carts
  ADD CONSTRAINT abandoned_carts_email_unique UNIQUE (email);
