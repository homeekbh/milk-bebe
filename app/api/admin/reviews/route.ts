import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { logActivity }    from "@/lib/server/audit";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { data } = await supabaseServer
    .from("reviews")
    .select("*, products(name)")
    .order("created_at", { ascending: false });

  return Response.json(data ?? []);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id, approved, reply } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });

  const update: Record<string, any> = {};
  if (approved !== undefined) update.approved = approved;
  if (reply    !== undefined) update.reply    = reply;

  const { data, error } = await supabaseServer
    .from("reviews").update(update).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  // Journal : la modération d'un avis change ce que voient les clientes (publication / masquage).
  const parts: string[] = [];
  if (approved !== undefined) parts.push(approved ? "approuvé (publié)" : "rejeté (masqué)");
  if (reply    !== undefined) parts.push(reply && String(reply).trim() ? "réponse ajoutée" : "réponse retirée");
  await logActivity("avis_modere", `Avis ${parts.join(", ") || "modifié"}`, {
    entity_id: String(id),
    meta: { approved, has_reply: !!(reply && String(reply).trim()) },
  });
  return Response.json(data);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id } = await req.json();
  if (!id) return Response.json({ error: "id manquant" }, { status: 400 });

  const { error } = await supabaseServer.from("reviews").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });

  await logActivity("avis_supprime", "Avis supprimé", { entity_id: String(id) });
  return Response.json({ ok: true });
}
