import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { normalizePeriod, periodRange, isValidOrder, VALID_STATUSES, fetchAllPaged, pct, ok, fail } from "@/lib/analytics-server";
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
    const { from, fromPrev, to } = periodRange(period);

    // Taux de conversion d'une fenêtre = commandes valides / sessions distinctes.
    // page_views paginé (cap PostgREST 1000/req → sinon sessions sous-comptées).
    const rate = async (a: string, b: string, lt = false) => {
      const [rows, ords] = await Promise.all([
        fetchAllPaged<{ session_id: string | null }>((rf, rt) => {
          let q = supabaseServer.from("page_views").select("session_id").gte("viewed_at", a);
          q = lt ? q.lt("viewed_at", b) : q.lte("viewed_at", b);
          return q.order("viewed_at", { ascending: true }).range(rf, rt);
        }),
        (lt
          ? supabaseServer.from("orders").select("status, shipping_status").in("status", VALID_STATUSES).gte("created_at", a).lt("created_at", b).limit(100000)
          : supabaseServer.from("orders").select("status, shipping_status").in("status", VALID_STATUSES).gte("created_at", a).lte("created_at", b).limit(100000)),
      ]);
      if (ords.error) throw new Error(ords.error.message);
      const distinct  = new Set(rows.map((r: any) => r.session_id).filter(Boolean)).size;
      const sessions  = distinct > 0 ? distinct : rows.length; // fallback si session_id absent
      const purchases = (ords.data ?? []).filter(isValidOrder).length;
      return { sessions, purchases, conversion_rate: sessions > 0 ? (purchases / sessions) * 100 : 0 };
    };

    const cur = await rate(from, to);
    // Delta N vs N-1 (sauf "all" : pas de période précédente comparable).
    const conversion_delta_pct = period === "all" ? null : pct(cur.conversion_rate, (await rate(fromPrev, from, true)).conversion_rate);

    return ok({ ...cur, conversion_delta_pct, period });
  } catch (e: any) {
    return fail(e?.message ?? "Erreur interne");
  }
}
