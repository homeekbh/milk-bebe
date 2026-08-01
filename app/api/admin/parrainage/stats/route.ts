import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { countsInWebStats } from "@/lib/orders";

export const dynamic = "force-dynamic";

// Vue d'ensemble du programme de parrainage (lecture seule, "depuis le début").
// Requêtes GROUPÉES (orders + parrainage_recompenses + profiles), aucune écriture.
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  // 1) orders → filleuls (commandes payées valides avec code) + remise filleul €.
  const { data: ords } = await supabaseServer
    .from("orders").select("parrain_code, parrain_discount, status, shipping_status, is_internal_test, classification");
  const filleulsByCode = new Map<string, number>();
  let filleulsTotaux = 0;
  let remiseFilleulTotal = 0;
  for (const o of ords ?? []) {
    if (!o.parrain_code || !countsInWebStats(o as any)) continue;
    filleulsTotaux++;
    remiseFilleulTotal += Number(o.parrain_discount) || 0;
    filleulsByCode.set(o.parrain_code, (filleulsByCode.get(o.parrain_code) ?? 0) + 1);
  }
  const parrainsActifs = filleulsByCode.size; // comptes avec ≥ 1 filleul payé

  // 2) récompenses → répartition + valeur par statut EFFECTIF (calcul-à-la-lecture :
  //    une 'disponible' expirée compte comme 'expiree', comme partout ailleurs).
  const now = Date.now();
  const counts = { total: 0, disponible: 0, utilisee: 0, expiree: 0, annulee: 0 };
  const valeur = { disponible: 0, utilisee: 0, expiree: 0, annulee: 0 };
  const soldeByParrain = new Map<string, number>();
  const { data: recs } = await supabaseServer
    .from("parrainage_recompenses").select("parrain_id, montant, status, expires_at");
  for (const r of recs ?? []) {
    const m = Number(r.montant) || 0;
    let st = String(r.status);
    if (st === "disponible" && r.expires_at && new Date(r.expires_at).getTime() <= now) st = "expiree";
    // Annulée = jamais réellement acquise (commande filleul remboursée) → EXCLUE du total.
    if (st === "annulee") { counts.annulee++; valeur.annulee += m; continue; }
    counts.total++;
    if (st === "disponible") {
      counts.disponible++; valeur.disponible += m;
      if (r.parrain_id) soldeByParrain.set(r.parrain_id, (soldeByParrain.get(r.parrain_id) ?? 0) + m);
    } else if (st === "utilisee") { counts.utilisee++; valeur.utilisee += m; }
    else if (st === "expiree")  { counts.expiree++;  valeur.expiree += m; }
  }

  // 3) Top parrains (par nb de filleuls) → jointure code → compte via profiles.
  const codes = [...filleulsByCode.keys()];
  const codeToAccount = new Map<string, { id: string; email: string; prenom: string }>();
  if (codes.length > 0) {
    const { data: profs } = await supabaseServer
      .from("profiles").select("id, email, prenom, parrain_code").in("parrain_code", codes);
    for (const p of profs ?? []) if (p.parrain_code) codeToAccount.set(p.parrain_code, { id: p.id, email: p.email ?? "", prenom: p.prenom ?? "" });
  }
  const topParrains = codes
    .map(code => {
      const acc = codeToAccount.get(code);
      return {
        email:    acc?.email ?? "—",
        prenom:   acc?.prenom ?? "",
        filleuls: filleulsByCode.get(code) ?? 0,
        solde:    acc ? round2(soldeByParrain.get(acc.id) ?? 0) : 0,
      };
    })
    .sort((a, b) => b.filleuls - a.filleuls)
    .slice(0, 10);

  // 4) Récompenses À VÉRIFIER MANUELLEMENT — flaguées par le webhook charge.refunded
  //    (récompense déjà utilisée sur une commande filleul remboursée, ou remboursement
  //    partiel ambigu). Un humain tranche au cas par cas → aucune annulation auto ici.
  const { data: reviewRows } = await supabaseServer
    .from("parrainage_recompenses")
    .select("id, parrain_id, montant, status, filleul_order_id, used_on_order_id, annulation_reason, created_at")
    .eq("annulation_en_attente", true)
    .order("created_at", { ascending: false });
  const reviewPids = [...new Set((reviewRows ?? []).map(r => r.parrain_id).filter(Boolean))];
  const parrainInfoById = new Map<string, { email: string; prenom: string }>();
  if (reviewPids.length > 0) {
    const { data: pp } = await supabaseServer
      .from("profiles").select("id, email, prenom").in("id", reviewPids);
    for (const p of pp ?? []) parrainInfoById.set(p.id, { email: p.email ?? "", prenom: p.prenom ?? "" });
  }
  const aVerifier = (reviewRows ?? []).map(r => {
    const info = parrainInfoById.get(r.parrain_id) ?? { email: "—", prenom: "" };
    return {
      id:               r.id,
      parrain_email:    info.email,
      parrain_prenom:   info.prenom,
      montant:          Number(r.montant) || 0,
      status:           r.status,
      reason:           r.annulation_reason ?? "",
      filleul_order_id: r.filleul_order_id,
      used_on_order_id: r.used_on_order_id,
    };
  });

  return Response.json({
    parrainsActifs,
    filleulsTotaux,
    remiseFilleulTotal: round2(remiseFilleulTotal),
    recompenses: counts,
    valeur: { disponible: round2(valeur.disponible), utilisee: round2(valeur.utilisee), expiree: round2(valeur.expiree), annulee: round2(valeur.annulee) },
    topParrains,
    aVerifier,
  });
}
