import { supabaseServer } from "@/lib/server/supabase";

// Liste publique des articles publiés (lecture, pas d'auth).
// Résilient : renvoie [] si la table n'existe pas encore / erreur → la page
// /blog affiche un état vide propre, jamais une 500.
export const revalidate = 60;

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("blog_posts")
      .select("id, slug, title, excerpt, image_url, author, published_at, category")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (error) return Response.json([]);
    return Response.json(data ?? []);
  } catch {
    return Response.json([]);
  }
}
