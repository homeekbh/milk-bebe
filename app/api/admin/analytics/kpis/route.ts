import { supabaseServer } from "@/lib/server/supabase";
import * as Sentry from "@sentry/nextjs";
import { requireAdmin }   from "@/lib/admin-auth";
import { resolveAnalyticsRange, countsInWebStats, getNetAmount, VALID_STATUSES, deltaVal, comparisonWindow, ok, fail } from "@/lib/analytics-server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const COLS = "amount_total, refund_amount, status, shipping_status, customer_email, created_at, is_internal_test, classification, source";

function summarize(rows: any[]) {
  const valid   = (rows ?? []).filter(countsInWebStats);
  const revenue = valid.reduce((s, o) => s + getNetAmount(o), 0);
  const count   = valid.length;
  const avg     = count > 0 ? revenue / count : 0;
  const unique  = new Set(valid.map(o => o.customer_email).filter(Boolean)).size;
  return { revenue, count, avg, unique };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const sp = new URL(req.url).searchParams;
    const rr = resolveAnalyticsRange(sp);
    if (!rr.ok) return fail(rr.error, 400);
    const { from, to } = rr.range;
    // Base de comparaison UNIFIÉE (même que la courbe : préset tronqué), défaut #6.
    const cmp = comparisonWindow(sp, rr.range);

    const [cur, prev] = await Promise.all([
      supabaseServer.from("orders").select(COLS).in("status", VALID_STATUSES)
        .gte("created_at", from).lte("created_at", to).limit(100000),
      cmp
        ? supabaseServer.from("orders").select(COLS).in("status", VALID_STATUSES)
            .gte("created_at", cmp.from).lt("created_at", cmp.to).limit(100000)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);
    if (cur.error)  return fail(cur.error.message);

    const c = summarize(cur.data ?? []);
    const p = summarize(prev.data ?? []);

    return ok({
      revenue:           c.revenue,
      orders_count:      c.count,
      avg_basket:        c.avg,
      unique_customers:  c.unique,
      prev_revenue:      p.revenue,
      prev_orders:       p.count,
      prev_avg_basket:   p.avg,
      // Valeurs d'affichage discriminées (number | "new" | null), défauts #4/#5.
      revenue_delta_pct: deltaVal(c.revenue, p.revenue),
      orders_delta_pct:  deltaVal(c.count,   p.count),
      basket_delta_pct:  deltaVal(c.avg,     p.avg),
    });
  } catch (e: any) {
    Sentry.captureException(e, { tags: { area: "analytics" } });
    return fail(e?.message ?? "Erreur interne");
  }
}
