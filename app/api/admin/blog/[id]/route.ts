import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { logActivity }    from "@/lib/server/audit";
import type { NextRequest } from "next/server";

function slugify(s: string) {
  return String(s ?? "").trim().toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// PUT : mettre à jour un article
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const clean: Record<string, any> = { ...body, updated_at: new Date().toISOString() };
  delete clean.id;
  delete clean.created_at;

  if ("slug" in body)   clean.slug   = slugify(body.slug || body.title || "");
  if ("author" in body) clean.author = body.author || "Erika";
  if ("status" in body) {
    clean.status = body.status === "published" ? "published" : "draft";
    // Publication sans date explicite → maintenant.
    if (clean.status === "published" && !body.published_at) clean.published_at = new Date().toISOString();
  }

  const { data, error } = await supabaseServer.from("blog_posts").update(clean).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  await logActivity("blog_update", `Article modifié : ${data.title ?? id}`, {
    entity_id: id, entity_name: data.title ?? null, meta: { status: data.status },
  });
  return Response.json(data);
}

// DELETE : supprimer un article
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { data: before } = await supabaseServer.from("blog_posts").select("title").eq("id", id).single();
  const { error } = await supabaseServer.from("blog_posts").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });

  await logActivity("blog_delete", `Article supprimé : ${before?.title ?? id}`, {
    entity_id: id, entity_name: before?.title ?? null,
  });
  return Response.json({ ok: true });
}
