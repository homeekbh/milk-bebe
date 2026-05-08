import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

/**
 * Table Supabase nécessaire (à créer si absente) :
 *
 * CREATE TABLE IF NOT EXISTS homepage_config (
 *   id          text PRIMARY KEY DEFAULT 'main',
 *   section_title text NOT NULL DEFAULT 'Sélection du moment',
 *   product_ids   jsonb NOT NULL DEFAULT '[]',
 *   updated_at  timestamptz DEFAULT now()
 * );
 * INSERT INTO homepage_config (id) VALUES ('main') ON CONFLICT DO NOTHING;
 */

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseServer
    .from("homepage_config")
    .select("*")
    .eq("id", "main")
    .single();

  if (error && error.code !== "PGRST116") {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Valeur par défaut si aucune config
  return Response.json(data ?? { id: "main", section_title: "Sélection du moment", product_ids: [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { section_title, product_ids } = body;

  if (!section_title) return Response.json({ error: "section_title requis" }, { status: 400 });
  if (!Array.isArray(product_ids)) return Response.json({ error: "product_ids doit être un tableau" }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("homepage_config")
    .upsert({
      id:            "main",
      section_title,
      product_ids,
      updated_at:    new Date().toISOString(),
    }, { onConflict: "id" })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}