import { supabaseServer } from "@/lib/server/supabase";
import type { NextRequest } from "next/server";

// Vérifie que l'utilisateur est admin via son email
// (contourne le problème de cookie avec requireAdmin)
async function checkAdmin(req: NextRequest): Promise<boolean> {
  try {
    // Récupérer le token depuis le header Authorization ou les cookies
    const authHeader = req.headers.get("authorization") ?? "";
    let token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      const cookie = req.headers.get("cookie") ?? "";
      const match = cookie.match(/sb-[^=]+-auth-token(?:\.\d+)?=([^;]+)/);
      if (match) {
        try {
          const val = decodeURIComponent(match[1]);
          const parsed = JSON.parse(val);
          token = parsed.access_token ?? parsed[0]?.access_token ?? null;
        } catch {
          token = null;
        }
      }
    }

    if (!token) return false;

    const { data: { user } } = await supabaseServer.auth.getUser(token);
    if (!user) return false;

    const { data: profile } = await supabaseServer
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    return profile?.is_admin === true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  // Pour le GET on retourne la config même sans auth
  // (les données ne sont pas sensibles)
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
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

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