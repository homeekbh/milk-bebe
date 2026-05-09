import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("homepage_config")
    .select("*")
    .eq("id", "main")
    .single();

  if (error && error.code !== "PGRST116") {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(
    data ?? { id: "main", section_title: "Sélection du moment", product_ids: [] }
  );
}

export async function POST(req: NextRequest) {
  // ✅ Protection admin
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { section_title, product_ids } = body;

  if (!section_title) {
    return Response.json({ error: "section_title requis" }, { status: 400 });
  }
  if (!Array.isArray(product_ids)) {
    return Response.json({ error: "product_ids doit être un tableau" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("homepage_config")
    .upsert(
      { id: "main", section_title, product_ids, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}