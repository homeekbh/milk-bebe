import { supabaseServer } from "@/lib/server/supabase";
import * as Sentry from "@sentry/nextjs";
import { requireAdmin }   from "@/lib/admin-auth";
import { resolveAnalyticsRange, countsInWebStats, getNetAmount, VALID_STATUSES, toParis, ok, fail } from "@/lib/analytics-server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type Gran = "day" | "week" | "month";

// ⚠️ Toutes les fonctions ci-dessous reçoivent un Date « Paris-local » (issu de
// toParis) : ses composantes locales (getFullYear/getMonth/getDate/getDay) sont
// l'heure de Paris. Le découpage jour/semaine/mois est donc en Europe/Paris,
// cohérent avec by_day / by_hour de page-views (Lot G-1a).
function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // lundi = 0
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

function bucketKey(d: Date, gran: Gran): string {
  if (gran === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  if (gran === "week")  { const w = startOfWeek(d); return `${w.getFullYear()}-${String(w.getMonth() + 1).padStart(2, "0")}-${String(w.getDate()).padStart(2, "0")}`; }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function bucketLabel(d: Date, gran: Gran): string {
  // toLocaleDateString SANS timeZone lit les composantes locales du Date (déjà
  // Paris via toParis) → libellé en heure de Paris.
  if (gran === "month") return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

// Génère tous les buckets vides de `from` à `to` (continuité du graphe).
// `from`/`to` sont des Date Paris-local (mêmes composantes que les points).
function emptyBuckets(from: Date, to: Date, gran: Gran): Map<string, { label: string; revenue: number; orders: number }> {
  const map = new Map<string, { label: string; revenue: number; orders: number }>();
  const cur = gran === "week" ? startOfWeek(from) : new Date(from);
  if (gran === "month") cur.setDate(1);
  cur.setHours(0, 0, 0, 0);
  let guard = 0;
  while (cur <= to && guard++ < 4000) {
    map.set(bucketKey(cur, gran), { label: bucketLabel(cur, gran), revenue: 0, orders: 0 });
    if (gran === "day")        cur.setDate(cur.getDate() + 1);
    else if (gran === "week")  cur.setDate(cur.getDate() + 7);
    else                       cur.setMonth(cur.getMonth() + 1);
  }
  return map;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const rr = resolveAnalyticsRange(new URL(req.url).searchParams);
    if (!rr.ok) return fail(rr.error, 400);
    const { period, from, to } = rr.range;
    // "custom" (bornes absolues) → granularité jour, comme les fenêtres courtes.
    const gran: Gran = period === "all" ? "month" : period === "90" ? "week" : "day";

    const { data, error } = await supabaseServer
      .from("orders")
      .select("amount_total, refund_amount, status, shipping_status, created_at, is_internal_test, classification, source")
      .in("status", VALID_STATUSES)
      .gte("created_at", from).lte("created_at", to)
      .limit(100000);
    if (error) return fail(error.message);

    const buckets = emptyBuckets(toParis(from), toParis(to), gran);
    (data ?? []).filter(countsInWebStats).forEach(o => {
      const d   = toParis(o.created_at); // instant → composantes Paris
      const key = bucketKey(d, gran);
      const b   = buckets.get(key);
      if (b) { b.revenue += getNetAmount(o); b.orders += 1; }
    });

    const points = [...buckets.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([, v]) => ({ label: v.label, revenue: Math.round(v.revenue * 100) / 100, orders: v.orders }));

    return ok({ points });
  } catch (e: any) {
    Sentry.captureException(e, { tags: { area: "analytics" } });
    return fail(e?.message ?? "Erreur interne");
  }
}
