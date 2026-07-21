import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  // GET réservé à l'admin (seul l'écran d'admin l'appelle ; la home publique lit la table côté
  // serveur). Sans ce garde, la config (sélection produits) était lisible/énumérable publiquement.
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseServer
    .from("homepage_config")
    .select("id, section_title, product_ids")
    .eq("id", "main")
    .single();

  if (error && error.code !== "PGRST116") {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(
    data ?? { id: "main", section_title: "Sélection du moment", product_ids: [] }
  );
}

export async function POST(req: NextRequest) {
  // ✅ Protection admin
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { section_title, product_ids } = body;

  if (!section_title) {
    return Response.json({ error: "section_title requis" }, { status: 400 });
  }
  if (!Array.isArray(product_ids)) {
    return Response.json({ error: "product_ids doit être un tableau" }, { status: 400 });
  }

  // ── Étape 1 : colonnes CORE (toujours présentes) — sauvegarde garantie ──
  const { data, error } = await supabaseServer
    .from("homepage_config")
    .upsert(
      { id: "main", section_title, product_ids, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // ── Étape 2 : coffret_active en BEST-EFFORT (colonne optionnelle) ──
  // Si la colonne n'existe pas encore en base, on ne casse PAS la sauvegarde
  // principale des produits mis en avant (cause du bug observé).
  let coffretPersisted = false;
  if (typeof body.coffret_active === "boolean") {
    const { error: cErr } = await supabaseServer
      .from("homepage_config")
      .update({ coffret_active: body.coffret_active })
      .eq("id", "main");
    if (cErr) console.warn("[admin/homepage] coffret_active non persisté (colonne manquante ?):", cErr.message);
    else coffretPersisted = true;
  }

  return Response.json({ ...data, coffret_active: coffretPersisted ? body.coffret_active : (data as any).coffret_active ?? false });
}