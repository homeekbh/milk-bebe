import { supabaseServer } from "@/lib/server/supabase";

/**
 * Note produit — SOURCE UNIQUE (Lot T). Utilisée par le JSON-LD (aggregateRating,
 * produits/[slug]/layout.tsx) ET par la note visible de la fiche (page.tsx →
 * ProductClient) → la note affichée == celle du schema, garanti. Avis APPROUVÉS
 * uniquement. Renvoie null si 0 avis → on n'affiche RIEN (pas d'étoiles vides).
 */
export async function getProductRating(productId: string): Promise<{ avg: number; count: number } | null> {
  const { data } = await supabaseServer
    .from("reviews")
    .select("rating")
    .eq("product_id", productId)
    .eq("approved", true);
  if (!data || data.length === 0) return null;
  const sum = data.reduce((s, r) => s + Number(r.rating ?? 0), 0);
  return { avg: sum / data.length, count: data.length };
}
