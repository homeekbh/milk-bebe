/**
 * lib/analytics-server.ts — Helpers partagés par les routes /api/admin/analytics/*.
 *
 * - Fenêtre temporelle dérivée de ?period=7|30|90|all (tolère aussi 7j/30j/90j/tout).
 * - Réutilise la SOURCE UNIQUE de vérité du CA (lib/orders.ts) : isValidOrder + getNetAmount.
 */
import { VALID_STATUSES, isValidOrder, getNetAmount } from "@/lib/orders";

export { VALID_STATUSES, isValidOrder, getNetAmount };

export type PeriodKey = "7" | "30" | "90" | "all";

/** Normalise la query (?period=) vers une clé canonique. Défaut: 30. */
export function normalizePeriod(raw: string | null | undefined): PeriodKey {
  const v = String(raw ?? "30").toLowerCase().replace(/j$/, "");
  if (v === "tout" || v === "all") return "all";
  if (v === "7" || v === "30" || v === "90") return v as PeriodKey;
  return "30";
}

export type PeriodRange = {
  period:   PeriodKey;
  days:     number | null;  // null pour "all"
  from:     string;         // ISO — début de la période courante
  fromPrev: string;         // ISO — début de la période précédente (= from pour "all")
  to:       string;         // ISO — maintenant
};

/** Calcule la fenêtre courante + précédente (même durée) pour les deltas. */
export function periodRange(period: PeriodKey): PeriodRange {
  const now = new Date();
  if (period === "all") {
    const from = new Date("2024-01-01T00:00:00.000Z").toISOString();
    return { period, days: null, from, fromPrev: from, to: now.toISOString() };
  }
  const days = period === "7" ? 7 : period === "30" ? 30 : 90;
  const MS   = 24 * 60 * 60 * 1000;
  const from     = new Date(now.getTime() - days * MS).toISOString();
  const fromPrev = new Date(now.getTime() - 2 * days * MS).toISOString();
  return { period, days, from, fromPrev, to: now.toISOString() };
}

/** Variation en % (0 si pas de base de comparaison). */
export function pct(cur: number, prev: number): number {
  if (!prev || prev <= 0) return 0;
  return ((cur - prev) / prev) * 100;
}

/** Ratio net/brut d'une commande (pour ventiler un remboursement partiel sur ses items). */
export function netRatio(o: { amount_total?: number | null }): number {
  const total = Number(o?.amount_total ?? 0);
  if (total <= 0) return 1;
  return getNetAmount(o as any) / total;
}

/** Réponse standardisée OK. */
export function ok(data: any) {
  return Response.json({ data, error: null });
}

/** Réponse standardisée erreur (200 côté transport pour ne pas casser Promise.all client). */
export function fail(message: string) {
  return Response.json({ data: null, error: message }, { status: 200 });
}
