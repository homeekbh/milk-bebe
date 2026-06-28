import { supabaseServer } from "@/lib/server/supabase";

// Article public par slug (publié uniquement). 404 si non trouvé.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const { data, error } = await supabaseServer
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error || !data) return Response.json({ error: "Article introuvable" }, { status: 404 });
    return Response.json(data);
  } catch {
    return Response.json({ error: "Article introuvable" }, { status: 404 });
  }
}
