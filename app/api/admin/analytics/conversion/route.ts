import { supabaseServer } from "@/lib/server/supabase";
import * as Sentry from "@sentry/nextjs";
import { requireAdmin }   from "@/lib/admin-auth";
import { resolveAnalyticsRange, countsInWebStats, VALID_STATUSES, fetchAllPaged, deltaVal, comparisonWindow, ok, fail, botSessionIds } from "@/lib/analytics-server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Seuil « échantillon insuffisant » (défaut #9). Sous CES bornes, le taux affiché ne permet
// AUCUNE conclusion et doit être signalé visuellement :
//   • < 5 ventes  : le NUMÉRATEUR est trop petit — une seule vente déplace le taux de ~0,4 pt,
//     donc « 0,41 % » ≠ une performance, c'est « 1 vente sur 244 » ;
//   • < 100 sessions : le DÉNOMINATEUR ne distingue pas un taux de 1 % d'un taux de 3 %.
// Choix assumé (justifié dans le rapport) : volumétrie M!LK (early-stage), on veut alerter tôt.
const CONVERSION_MIN_PURCHASES = 5;
const CONVERSION_MIN_SESSIONS  = 100;

/**
 * Taux de conversion = commandes valides / sessions, sur la MÊME fenêtre
 * temporelle (fix clé : avant, sessions=30j figé vs ventes=période).
 * Sessions = sessions distinctes dans page_views (viewed_at) sur la période.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const sp = new URL(req.url).searchParams;
    const rr = resolveAnalyticsRange(sp);
    if (!rr.ok) return fail(rr.error, 400);
    const { period, from, to } = rr.range;
    const cmp = comparisonWindow(sp, rr.range); // base de comparaison unifiée (défaut #6)
    const excludeBots = sp.get("bots") === "exclude";

    // Taux de conversion d'une fenêtre = commandes valides / sessions distinctes.
    // page_views paginé (cap PostgREST 1000/req → sinon sessions sous-comptées).
    // Si excludeBots : sessions bots retirées du dénominateur (même heuristique que
    // /api/admin/page-views) → taux de conversion plus juste (bots gonflaient les sessions).
    const rate = async (a: string, b: string, lt = false) => {
      const [rows, ords] = await Promise.all([
        fetchAllPaged<any>((rf, rt) => {
          let q = supabaseServer.from("page_views")
            .select("session_id, time_on_page, scroll_depth, is_bounce, user_agent, country, region, city, os, page_path")
            .gte("viewed_at", a);
          q = lt ? q.lt("viewed_at", b) : q.lte("viewed_at", b);
          return q.order("viewed_at", { ascending: true }).range(rf, rt);
        }),
        (lt
          ? supabaseServer.from("orders").select("status, shipping_status, is_internal_test, classification, source").in("status", VALID_STATUSES).gte("created_at", a).lt("created_at", b).limit(100000)
          : supabaseServer.from("orders").select("status, shipping_status, is_internal_test, classification, source").in("status", VALID_STATUSES).gte("created_at", a).lte("created_at", b).limit(100000)),
      ]);
      if (ords.error) throw new Error(ords.error.message);
      const botSet    = excludeBots ? botSessionIds(rows) : new Set<string>();
      const distinct  = new Set(rows.map((r: any) => r.session_id).filter(Boolean).filter((s: string) => !botSet.has(s))).size;
      const sessions  = distinct > 0 ? distinct : rows.length; // fallback si session_id absent
      const purchases = (ords.data ?? []).filter(countsInWebStats).length;
      return { sessions, purchases, conversion_rate: sessions > 0 ? (purchases / sessions) * 100 : 0 };
    };

    const cur = await rate(from, to);
    // Delta vs la MÊME base que la courbe (préset tronqué) ; null si pas de base ("all"/weekday sans cmp).
    const prev = cmp ? await rate(cmp.from, cmp.to, true) : null;
    const conversion_delta_pct = prev ? deltaVal(cur.conversion_rate, prev.conversion_rate) : null;

    // Dénominateur + garde-fou échantillon (défaut #9) : sous le seuil, la valeur est fragile.
    const low_sample = cur.purchases < CONVERSION_MIN_PURCHASES || cur.sessions < CONVERSION_MIN_SESSIONS;

    return ok({ ...cur, conversion_delta_pct, period, low_sample });
  } catch (e: any) {
    Sentry.captureException(e, { tags: { area: "analytics" } });
    return fail(e?.message ?? "Erreur interne");
  }
}
