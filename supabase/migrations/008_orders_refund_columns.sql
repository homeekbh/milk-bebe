-- ════════════════════════════════════════════════════════════════════════════
-- 008 — Colonnes de remboursement sur orders
-- ════════════════════════════════════════════════════════════════════════════
-- Le code écrit ET lit déjà refund_amount / refunded_at à plusieurs endroits :
--   - webhook Stripe charge.refunded (status remboursee + refund_amount + refunded_at)
--   - admin annulation/remboursement (app/api/admin/commandes/[id])
--   - lib/orders getNetAmount (montant net = amount_total - refund_amount)
--   - dashboard, comptabilité, export CSV
-- Mais les colonnes N'EXISTAIENT PAS en base. Conséquences observées :
--   1. Dashboard : un select explicite de refund_amount FAISAIT ÉCHOUER la requête
--      d'agrégation → CA aujourd'hui = 0 et CA total = 0.
--   2. Les UPDATE de remboursement (webhook + admin) échouaient silencieusement
--      (colonne absente) → statut "remboursee" potentiellement non persisté.
--
-- À exécuter dans le SQL Editor Supabase (Studio). Idempotent (IF NOT EXISTS).
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at   timestamptz;

-- RLS : inchangée (orders est déjà verrouillée, migration 006).
