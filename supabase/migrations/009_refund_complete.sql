-- ════════════════════════════════════════════════════════════════════════════
-- 009 — Colonnes de remboursement/annulation manquantes (complète la 008)
-- ════════════════════════════════════════════════════════════════════════════
-- L'UPDATE de remboursement/annulation admin (app/api/admin/commandes/[id])
-- écrit refund_id / cancelled_at / cancelled_reason DANS LE MÊME UPDATE que
-- refund_amount + refunded_at. Comme ces 3 colonnes n'existaient pas, TOUT
-- l'UPDATE échouait d'un bloc → refund_amount/refunded_at (pourtant ajoutés
-- par la 008) n'étaient JAMAIS persistés via l'admin → CA faux sur les commandes
-- remboursées (getNetAmount = amount_total - refund_amount).
--
-- À exécuter dans le SQL Editor Supabase (Studio). Idempotent (IF NOT EXISTS).
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_id        text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at     timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_reason text;

CREATE INDEX IF NOT EXISTS idx_orders_refund_id    ON orders (refund_id);
CREATE INDEX IF NOT EXISTS idx_orders_cancelled_at ON orders (cancelled_at);

-- RLS : inchangée (orders verrouillée, migration 006).
