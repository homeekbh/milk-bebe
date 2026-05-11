import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { data: fromProducts } = await supabaseServer
    .from("products")
    .select("category_slug")
    .not("category_slug", "is", null);

  let fromCats: string[] = [];
  try {
    const { data } = await supabaseServer
      .from("categories")
      .select("slug")
      .order("created_at", { ascending: true });
    fromCats = (data ?? []).map((c: any) => c.slug).filter(Boolean);
  } catch {}

  const base      = ["bodies", "pyjamas", "gigoteuses", "accessoires"];
  const fromProds = [...new Set((fromProducts ?? []).map((p: any) => p.category_slug).filter(Boolean))];
  const all       = [...new Set([...base, ...fromProds, ...fromCats])];

  return Response.json(all);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { slug } = await req.json();
  if (!slug) return Response.json({ error: "slug manquant" }, { status: 400 });

  try {
    await supabaseServer
      .from("categories")
      .upsert([{ slug: slug.toLowerCase().trim() }], { onConflict: "slug" });
  } catch {}

  return Response.json({ ok: true, slug });
}