import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { resolveAnalyticsRange, isValidOrder, getNetAmount, VALID_STATUSES, ok, fail } from "@/lib/analytics-server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const rr = resolveAnalyticsRange(new URL(req.url).searchParams);
    if (!rr.ok) return fail(rr.error, 400);
    const { from, to } = rr.range;

    const { data, error } = await supabaseServer
      .from("orders")
      .select("customer_email, customer_name, amount_total, refund_amount, status, shipping_status, created_at, is_internal_test")
      .in("status", VALID_STATUSES)
      .gte("created_at", from).lte("created_at", to)
      .limit(100000);
    if (error) return fail(error.message);

    const map = new Map<string, { email: string; name: string; orders_count: number; total_revenue: number; last_order_at: string }>();

    (data ?? []).filter(isValidOrder).forEach(o => {
      const email = o.customer_email;
      if (!email) return;
      const cur = map.get(email) ?? { email, name: "", orders_count: 0, total_revenue: 0, last_order_at: o.created_at };
      cur.orders_count  += 1;
      cur.total_revenue += getNetAmount(o);
      if (o.customer_name) cur.name = o.customer_name;
      if (new Date(o.created_at) > new Date(cur.last_order_at)) cur.last_order_at = o.created_at;
      map.set(email, cur);
    });

    const customers = [...map.values()]
      .map(c => ({ ...c, total_revenue: Math.round(c.total_revenue * 100) / 100 }))
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 10);

    return ok({ customers });
  } catch (e: any) {
    return fail(e?.message ?? "Erreur interne");
  }
}
