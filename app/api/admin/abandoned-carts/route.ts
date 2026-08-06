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
 *
 * Nom complet : jointure par email sur `profiles` (compte client). Bornée aux emails
 * de la période (jamais toute la table). Une visiteuse SANS compte n'a pas de ligne
 * profiles → `customer_name` reste null → l'UI retombe sur le prénom + email.
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
  const carts = list.data ?? [];

  // Nom complet via le COMPTE (profiles) — jointure par email, bornée aux emails de
  // la période (l'email d'abandoned_carts est déjà en minuscules, cf. /api/cart/save).
  // Aucun compte ⇒ pas de ligne ⇒ customer_name null (fallback prénom côté UI).
  const emails = [...new Set(carts.map(c => String(c.email ?? "").toLowerCase()).filter(Boolean))];
  const nameByEmail = new Map<string, string>();
  if (emails.length > 0) {
    const { data: profs } = await supabaseServer
      .from("profiles").select("email, first_name, last_name").in("email", emails);
    for (const p of profs ?? []) {
      const full = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
      if (p.email && full) nameByEmail.set(String(p.email).toLowerCase(), full);
    }
  }
  const cartsOut = carts.map(c => ({
    ...c,
    customer_name: nameByEmail.get(String(c.email ?? "").toLowerCase()) ?? null,
  }));

  return Response.json({
    carts: cartsOut,
    all_time: { total: allTotal.count ?? 0, converted: allConv.count ?? 0 },
  });
}
