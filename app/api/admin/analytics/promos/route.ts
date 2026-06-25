import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { normalizePeriod, periodRange, isValidOrder, getNetAmount, VALID_STATUSES, ok, fail } from "@/lib/analytics-server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const period = normalizePeriod(new URL(req.url).searchParams.get("period"));
    const { from, to } = periodRange(period);

    const { data, error } = await supabaseServer
      .from("orders")
      .select("promo_code, discount, amount_total, refund_amount, status, shipping_status, created_at")
      .in("status", VALID_STATUSES)
      .gte("created_at", from).lte("created_at", to)
      .limit(100000);
    if (error) return fail(error.message);

    const valid = (data ?? []).filter(isValidOrder);

    const map = new Map<string, { code: string; uses_count: number; revenue: number; discount_total: number }>();
    let withCount = 0,  withRevenue = 0;
    let withoutCount = 0, withoutRevenue = 0;

    valid.forEach(o => {
      const net  = getNetAmount(o);
      const code = (o.promo_code ?? "").trim();
      if (code) {
        withCount += 1; withRevenue += net;
        const cur = map.get(code) ?? { code, uses_count: 0, revenue: 0, discount_total: 0 };
        cur.uses_count     += 1;
        cur.revenue        += net;
        cur.discount_total += Number(o.discount ?? 0);
        map.set(code, cur);
      } else {
        withoutCount += 1; withoutRevenue += net;
      }
    });

    const promos = [...map.values()]
      .map(p => ({
        code:           p.code,
        uses_count:     p.uses_count,
        revenue:        Math.round(p.revenue * 100) / 100,
        avg_basket:     p.uses_count > 0 ? Math.round((p.revenue / p.uses_count) * 100) / 100 : 0,
        discount_total: Math.round(p.discount_total * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return ok({
      promos,
      with_promo:    { count: withCount,    revenue: Math.round(withRevenue * 100) / 100 },
      without_promo: { count: withoutCount, revenue: Math.round(withoutRevenue * 100) / 100 },
    });
  } catch (e: any) {
    return fail(e?.message ?? "Erreur interne");
  }
}
