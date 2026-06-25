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
      .select("shipping_address, relay_city, amount_total, refund_amount, status, shipping_status, created_at")
      .in("status", VALID_STATUSES)
      .gte("created_at", from).lte("created_at", to)
      .limit(100000);
    if (error) return fail(error.message);

    const map = new Map<string, { city: string; orders_count: number; revenue: number }>();

    (data ?? []).filter(isValidOrder).forEach(o => {
      const raw = o.shipping_address?.city ?? o.relay_city ?? "Inconnu";
      const city = String(raw).trim() || "Inconnu";
      const key  = city.toLowerCase();
      const cur  = map.get(key) ?? { city, orders_count: 0, revenue: 0 };
      cur.orders_count += 1;
      cur.revenue      += getNetAmount(o);
      map.set(key, cur);
    });

    const cities = [...map.values()]
      .map(c => ({ ...c, revenue: Math.round(c.revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);

    return ok({ cities });
  } catch (e: any) {
    return fail(e?.message ?? "Erreur interne");
  }
}
