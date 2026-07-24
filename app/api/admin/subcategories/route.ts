import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { logActivity }    from "@/lib/server/audit";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function slugify(s: string) {
  return String(s ?? "").toLowerCase().trim()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// GET — liste des sous-catégories (+ nb de produits qui les utilisent, pour une suppression sûre).
// Défensif : table absente/erreur → []. Filtrable par ?category=<slug>.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  let subs: { category_slug: string; slug: string; label: string }[] = [];
  try {
    let q = supabaseServer
      .from("subcategories")
      .select("category_slug, slug, label")
      .order("created_at", { ascending: true });
    if (category) q = q.eq("category_slug", category);
    const { data } = await q;
    subs = Array.isArray(data) ? data : [];
  } catch { subs = []; }

  // Comptage produits par (category_slug, subcategory_slug).
  const result = await Promise.all(subs.map(async (s) => {
    let product_count = 0;
    try {
      const { count } = await supabaseServer
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category_slug", s.category_slug)
        .eq("subcategory_slug", s.slug);
      product_count = count ?? 0;
    } catch {}
    return { ...s, product_count };
  }));

  return Response.json(result);
}

// POST — créer / mettre à jour (upsert) une sous-catégorie rattachée à une catégorie.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { category_slug, slug, label } = await req.json();
  if (!category_slug) return Response.json({ error: "category_slug manquant" }, { status: 400 });

  const cleanSlug = slugify(slug || label || "");
  if (!cleanSlug) return Response.json({ error: "Nom de sous-catégorie invalide" }, { status: 400 });
  const finalLabel = (label && String(label).trim()) || cleanSlug;

  const { error } = await supabaseServer
    .from("subcategories")
    .upsert([{ category_slug, slug: cleanSlug, label: finalLabel }], { onConflict: "category_slug,slug" });
  if (error) return Response.json({ error: error.message }, { status: 400 });

  await logActivity(
    "sous_categorie_creee",
    `Sous-catégorie : ${finalLabel} (${category_slug}/${cleanSlug})`,
    { entity_name: finalLabel, meta: { category_slug, slug: cleanSlug, label: finalLabel } },
  );

  return Response.json({ ok: true, category_slug, slug: cleanSlug, label: finalLabel });
}

// DELETE — supprimer une sous-catégorie. BLOQUÉ si des produits l'utilisent encore.
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { category_slug, slug } = await req.json();
  if (!category_slug || !slug) return Response.json({ error: "category_slug et slug requis" }, { status: 400 });

  const { count } = await supabaseServer
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_slug", category_slug)
    .eq("subcategory_slug", slug);
  if ((count ?? 0) > 0) {
    return Response.json({
      error: `Impossible — ${count} produit(s) utilisent cette sous-catégorie. Réassignez-les d'abord.`,
    }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("subcategories").delete()
    .eq("category_slug", category_slug).eq("slug", slug);
  if (error) return Response.json({ error: error.message }, { status: 400 });

  await logActivity(
    "sous_categorie_supprimee",
    `Sous-catégorie supprimée : ${category_slug}/${slug}`,
    { entity_name: slug, meta: { category_slug, slug } },
  );

  return Response.json({ ok: true });
}
