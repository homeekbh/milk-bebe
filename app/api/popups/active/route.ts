import { supabaseServer } from "@/lib/server/supabase";

export async function GET() {
  const now = new Date().toISOString();
  const { data, error } = await supabaseServer
    .from("popups")
    .select("*")
    .eq("active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return Response.json({ error: "Aucun popup actif" }, { status: 404 });
  return Response.json(data);
}