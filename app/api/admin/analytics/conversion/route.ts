import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { normalizePeriod, periodRange, isValidOrder, VALID_STATUSES, ok, fail } from "@/lib/analytics-server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Taux de conversion = commandes valides / sessions, sur la MÊME fenêtre
 * temporelle (fix clé : avant, sessions=30j figé vs ventes=période).
 * Sessions = sessions distinctes dans page_views (viewed_at) sur la période.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const period = normalizePeriod(new URL(req.url).searchParams.get("period"));
    const { from, to } = periodRange(period);

    const [pv, ords] = await Promise.all([
      supabaseServer.from("page_views").select("session_id")
        .gte("viewed_at", from).lte("viewed_at", to).limit(200000),
      supabaseServer.from("orders").select("status, shipping_status")
        .in("status", VALID_STATUSES).gte("created_at", from).lte("created_at", to).limit(100000),
    ]);
    if (pv.error)   return fail(pv.error.message);
    if (ords.error) return fail(ords.error.message);

    const rows     = pv.data ?? [];
    const distinct = new Set(rows.map((r: any) => r.session_id).filter(Boolean)).size;
    // Fallback : si aucune session_id renseignée, on retombe sur le nb de vues.
    const sessions  = distinct > 0 ? distinct : rows.length;
    const purchases = (ords.data ?? []).filter(isValidOrder).length;
    const conversion_rate = sessions > 0 ? (purchases / sessions) * 100 : 0;

    return ok({ sessions, purchases, conversion_rate, period });
  } catch (e: any) {
    return fail(e?.message ?? "Erreur interne");
  }
}
