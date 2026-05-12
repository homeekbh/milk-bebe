import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

const BASE_CATEGORIES = ["bodies", "pyjamas", "gigoteuses", "accessoires"];

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  // 1. Catégories depuis la table categories (si elle existe)
  let fromTable: { slug: string; label: string }[] = [];
  try {
    const { data } = await supabaseServer
      .from("categories")
      .select("slug, label")
      .order("created_at", { ascending: true });
    fromTable = data ?? [];
  } catch {}

  // 2. Catégories utilisées dans les produits
  const { data: fromProducts } = await supabaseServer
    .from("products")
    .select("category_slug");

  const usedSlugs = [...new Set(
    (fromProducts ?? []).map((p: any) => p.category_slug).filter(Boolean)
  )];

  // 3. Compter les produits par catégorie
  const countMap: Record<string, number> = {};
  for (const slug of usedSlugs) {
    const { count } = await supabaseServer
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_slug", slug);
    countMap[slug] = count ?? 0;
  }

  // 4. Fusionner tout
  const allSlugs = [...new Set([
    ...BASE_CATEGORIES,
    ...fromTable.map(c => c.slug),
    ...usedSlugs,
  ])];

  const labelMap: Record<string, string> = {};
  fromTable.forEach(c => { labelMap[c.slug] = c.label || c.slug; });

  const result = allSlugs.map(slug => ({
    slug,
    label:         labelMap[slug] || slug,
    product_count: countMap[slug] ?? 0,
  }));

  return Response.json(result);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { slug, label } = await req.json();
  if (!slug) return Response.json({ error: "slug manquant" }, { status: 400 });

  const clean = slug.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  try {
    const { error } = await supabaseServer
      .from("categories")
      .upsert([{ slug: clean, label: label || clean }], { onConflict: "slug" });
    if (error && !error.message.includes("does not exist")) {
      return Response.json({ error: error.message }, { status: 400 });
    }
  } catch {}

  return Response.json({ ok: true, slug: clean, label: label || clean });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { slug, label } = await req.json();
  if (!slug || !label) {
    return Response.json({ error: "slug et label requis" }, { status: 400 });
  }

  try {
    const { error } = await supabaseServer
      .from("categories")
      .upsert([{ slug, label }], { onConflict: "slug" });
    if (error && !error.message.includes("does not exist")) {
      return Response.json({ error: error.message }, { status: 400 });
    }
  } catch {}

  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { slug } = await req.json();
  if (!slug) return Response.json({ error: "slug manquant" }, { status: 400 });

  // Bloquer si des produits utilisent cette catégorie
  const { count } = await supabaseServer
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_slug", slug);

  if ((count ?? 0) > 0) {
    return Response.json({
      error: `Impossible — ${count} produit(s) utilisent cette catégorie. Réassignez-les d'abord.`
    }, { status: 400 });
  }

  try {
    await supabaseServer.from("categories").delete().eq("slug", slug);
  } catch {}

  return Response.json({ ok: true });
}