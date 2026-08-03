import { supabaseServer } from "@/lib/server/supabase";
import * as Sentry from "@sentry/nextjs";
import { requireAdmin }   from "@/lib/admin-auth";
import { resolveAnalyticsRange, deltaVal, comparisonWindow, ok, fail } from "@/lib/analytics-server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Nombre de COMPTES Supabase Auth créés (inscriptions) sur la période sélectionnée,
 * avec delta vs période précédente de même durée.
 *
 * ⚠️ À ne pas confondre avec /api/admin/clients-count, qui compte les adresses email
 * DISTINCTES ayant COMMANDÉ (table orders) — deux métriques différentes, on garde
 * les deux. Ici on lit auth.users via l'API Admin GoTrue (service role) : aucune
 * table applicative, donc aucune politique RLS ni SQL requis.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const sp = new URL(req.url).searchParams;
    const rr = resolveAnalyticsRange(sp);
    if (!rr.ok) return fail(rr.error, 400);
    const { from } = rr.range;
    const cmp    = comparisonWindow(sp, rr.range); // base unifiée (défaut #6)
    const fromMs = new Date(from).getTime();

    // Pagination complète des comptes Auth. perPage 1000 = plafond GoTrue par défaut ;
    // on s'arrête dès qu'une page renvoie moins que perPage (dernière page).
    const createdAts: number[] = [];
    const perPage = 1000;
    for (let page = 1; page <= 1000; page++) {          // garde-fou 1000 pages
      const { data, error } = await supabaseServer.auth.admin.listUsers({ page, perPage });
      if (error) return fail(error.message);
      const users = data?.users ?? [];
      for (const u of users) {
        if (u.created_at) createdAts.push(new Date(u.created_at).getTime());
      }
      if (users.length < perPage) break;
    }

    const count      = createdAts.filter(t => t >= fromMs).length;
    const prev_count = cmp
      ? createdAts.filter(t => { const b = new Date(cmp.to).getTime(), a = new Date(cmp.from).getTime(); return t >= a && t < b; }).length
      : 0;
    const delta_pct  = cmp ? deltaVal(count, prev_count) : null;

    return ok({ count, prev_count, delta_pct, total: createdAts.length });
  } catch (e: any) {
    Sentry.captureException(e, { tags: { area: "analytics" } });
    return fail(e?.message ?? "Erreur interne");
  }
}
