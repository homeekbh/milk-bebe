import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

async function logActivity(type: string, message: string, meta?: any) {
  try { await supabaseServer.from("activity_log").insert([{ type, message, meta: meta ?? null }]); } catch {}
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { data } = await supabaseServer
    .from("parrainage_settings").select("*").eq("id", 1).maybeSingle();
  return Response.json(data ?? {});
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const restriction = Array.isArray(body.categories_restriction) && body.categories_restriction.length > 0
    ? body.categories_restriction.map(String)
    : null;

  // Barème progressif : tableau de seuils, un par position de récompense.
  // Doit être CROISSANT (chaque palier ≥ le précédent) → sinon incohérence.
  const rawTiers = Array.isArray(body.seuils_parrain)
    ? body.seuils_parrain.map((v: any) => Math.max(0, Number(v) || 0))
    : [];
  for (let i = 1; i < rawTiers.length; i++) {
    if (rawTiers[i] < rawTiers[i - 1]) {
      return Response.json({ error: "Les seuils du barème doivent être croissants (chaque palier ≥ le précédent)." }, { status: 400 });
    }
  }
  const seuils_parrain = rawTiers.length > 0 ? rawTiers : [60, 80, 90, 100];

  // Construction explicite — jamais de ...body.
  const clean = {
    actif:                        Boolean(body.actif),
    montant_recompense:           Math.max(0, Number(body.montant_recompense) || 0),
    seuil_filleul:                Math.max(0, Number(body.seuil_filleul) || 0),
    seuils_parrain,
    max_recompenses_par_commande: Math.max(0, parseInt(body.max_recompenses_par_commande) || 0),
    duree_validite_jours:         Math.max(1, parseInt(body.duree_validite_jours) || 30),
    categories_restriction:       restriction,
  };

  const { error } = await supabaseServer
    .from("parrainage_settings").update(clean).eq("id", 1);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  await logActivity("parrainage_settings", `Réglages parrainage mis à jour (actif=${clean.actif}, filleul=${clean.seuil_filleul}€, barème=[${seuils_parrain.join(", ")}])`, clean);
  return Response.json({ ok: true });
}
