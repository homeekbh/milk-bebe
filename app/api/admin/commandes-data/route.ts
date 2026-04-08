import { supabaseServer } from "@/lib/server/supabase";

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return Response.json([]);
    return Response.json(data ?? []);
  } catch {
    return Response.json([]);
  }
}