import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { logActivity }    from "@/lib/server/audit";
import type { NextRequest } from "next/server";

function slugify(s: string) {
  return String(s ?? "").trim().toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// GET : liste complète (brouillons + publiés) OU un article par ?id=
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const { data, error } = await supabaseServer.from("blog_posts").select("*").eq("id", id).single();
    if (error) return Response.json({ error: error.message }, { status: 404 });
    return Response.json(data);
  }

  const { data, error } = await supabaseServer
    .from("blog_posts").select("*").order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

// POST : créer un article
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const status = body.status === "published" ? "published" : "draft";
  const clean: Record<string, any> = {
    slug:            (body.slug && String(body.slug).trim()) ? slugify(body.slug) : slugify(body.title ?? ""),
    title:           body.title ?? "",
    excerpt:         body.excerpt ?? null,
    content:         body.content ?? null,
    image_url:       body.image_url ?? null,
    author:          body.author || "Erika",
    category:        body.category ?? null,
    status,
    published_at:    body.published_at || (status === "published" ? new Date().toISOString() : null),
    seo_title:       body.seo_title ?? null,
    seo_description: body.seo_description ?? null,
  };

  const { data, error } = await supabaseServer.from("blog_posts").insert([clean]).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });

  await logActivity("blog_create", `Article créé : ${data.title ?? data.id}`, {
    entity_id: data.id, entity_name: data.title ?? null, meta: { status: data.status },
  });
  return Response.json(data);
}
