import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { resolveAnalyticsRange, isValidOrder, getNetAmount, VALID_STATUSES, pct, ok, fail } from "@/lib/analytics-server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const COLS = "amount_total, refund_amount, status, shipping_status, customer_email, created_at, is_internal_test";

function summarize(rows: any[]) {
  const valid   = (rows ?? []).filter(isValidOrder);
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
    const rr = resolveAnalyticsRange(new URL(req.url).searchParams);
    if (!rr.ok) return fail(rr.error, 400);
    const { period, from, fromPrev, to } = rr.range;

    const [cur, prev] = await Promise.all([
      supabaseServer.from("orders").select(COLS).in("status", VALID_STATUSES)
        .gte("created_at", from).lte("created_at", to).limit(100000),
      supabaseServer.from("orders").select(COLS).in("status", VALID_STATUSES)
        .gte("created_at", fromPrev).lt("created_at", from).limit(100000),
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
      revenue_delta_pct: pct(c.revenue, p.revenue),
      orders_delta_pct:  pct(c.count,   p.count),
      basket_delta_pct:  pct(c.avg,     p.avg),
    });
  } catch (e: any) {
    return fail(e?.message ?? "Erreur interne");
  }
}
