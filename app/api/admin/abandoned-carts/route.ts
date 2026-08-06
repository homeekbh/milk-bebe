import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { resolveAnalyticsRange } from "@/lib/analytics-server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/abandoned-carts — paniers IDENTIFIÉS (une ligne = un email saisi).
 *
 * 🔴 Cohérence des unités : la LISTE est bornée à la période sélectionnée (created_at),
 * comme toutes les autres cartes du dashboard. `all_time` fournit en plus les compteurs
 * TOUT-TEMPS (référence explicite dans l'UI) via des head-counts (aucune ligne rapatriée).
 *
 * ⚠️ Ne capte QUE les paniers avec email saisi (cf. /api/cart/save) — les paniers
 * anonymes n'existent pas côté serveur ; c'est une limite assumée, signalée dans l'UI.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const rr = resolveAnalyticsRange(new URL(req.url).searchParams);

  // ⚠️ Pas de colonne promo_code sur abandoned_carts (la sélectionner faisait
  // échouer la requête → 500 → bandeau "Données incomplètes" côté dashboard).
  let listQ = supabaseServer
    .from("abandoned_carts")
    .select("id, email, prenom, items, total, converted, relance_1, relance_2, relance_3, created_at, updated_at, email_sent_at")
    .order("created_at", { ascending: false });
  if (rr.ok) listQ = listQ.gte("created_at", rr.range.from).lte("created_at", rr.range.to);

  // Compteurs tout-temps (unité « entités ») — head-count, ne rapatrie aucune ligne.
  const allTotalQ = supabaseServer.from("abandoned_carts").select("id", { count: "exact", head: true });
  const allConvQ  = supabaseServer.from("abandoned_carts").select("id", { count: "exact", head: true }).eq("converted", true);

  const [list, allTotal, allConv] = await Promise.all([listQ, allTotalQ, allConvQ]);
  if (list.error) return Response.json({ error: list.error.message }, { status: 500 });

  return Response.json({
    carts: list.data ?? [],
    all_time: { total: allTotal.count ?? 0, converted: allConv.count ?? 0 },
  });
}
