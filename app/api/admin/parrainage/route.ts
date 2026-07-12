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

  // Construction explicite — jamais de ...body.
  const clean = {
    actif:                        Boolean(body.actif),
    montant_recompense:           Math.max(0, Number(body.montant_recompense) || 0),
    seuil_filleul:                Math.max(0, Number(body.seuil_filleul) || 0),
    seuil_parrain:                Math.max(0, Number(body.seuil_parrain) || 0),
    max_recompenses_par_commande: Math.max(0, parseInt(body.max_recompenses_par_commande) || 0),
    duree_validite_jours:         Math.max(1, parseInt(body.duree_validite_jours) || 30),
    categories_restriction:       restriction,
  };

  const { error } = await supabaseServer
    .from("parrainage_settings").update(clean).eq("id", 1);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  await logActivity("parrainage_settings", `Réglages parrainage mis à jour (actif=${clean.actif}, filleul=${clean.seuil_filleul}€, parrain=${clean.seuil_parrain}€)`, clean);
  return Response.json({ ok: true });
}
