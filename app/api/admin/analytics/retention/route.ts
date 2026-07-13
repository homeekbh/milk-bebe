import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { normalizePeriod, periodRange, isValidOrder, VALID_STATUSES, ok, fail } from "@/lib/analytics-server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Nouveaux vs récurrents sur la PÉRIODE sélectionnée (pas tout-temps mélangé).
 * - Pour chaque client actif dans [from, to] :
 *     nouveau  → sa toute première commande (ever) tombe dans [from, to]
 *     récurrent → il avait déjà commandé AVANT `from`
 * loyalty_rate = récurrents / (nouveaux + récurrents).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const period = normalizePeriod(new URL(req.url).searchParams.get("period"));
    const { from, to } = periodRange(period);

    // Toutes les commandes valides (depuis l'origine) pour situer la 1re commande.
    const { data, error } = await supabaseServer
      .from("orders")
      .select("customer_email, status, shipping_status, created_at, is_internal_test")
      .in("status", VALID_STATUSES)
      .gte("created_at", "2024-01-01")
      .limit(200000);
    if (error) return fail(error.message);

    const valid = (data ?? []).filter(isValidOrder).filter(o => o.customer_email);

    const firstOrder = new Map<string, number>();     // email → 1re commande (ms)
    const activeInPeriod = new Set<string>();
    const fromMs = new Date(from).getTime();
    const toMs   = new Date(to).getTime();

    valid.forEach(o => {
      const email = o.customer_email as string;
      const t = new Date(o.created_at).getTime();
      const prev = firstOrder.get(email);
      if (prev === undefined || t < prev) firstOrder.set(email, t);
      if (t >= fromMs && t <= toMs) activeInPeriod.add(email);
    });

    let new_customers = 0, returning_customers = 0;
    activeInPeriod.forEach(email => {
      const first = firstOrder.get(email)!;
      if (first >= fromMs) new_customers += 1;
      else                 returning_customers += 1;
    });

    const total = new_customers + returning_customers;
    const loyalty_rate = total > 0 ? (returning_customers / total) * 100 : 0;

    return ok({ new_customers, returning_customers, loyalty_rate });
  } catch (e: any) {
    return fail(e?.message ?? "Erreur interne");
  }
}
