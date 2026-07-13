import { supabaseServer } from "@/lib/server/supabase";
import { cookieIsInternal } from "@/lib/internal-traffic";
import type { NextRequest } from "next/server";

/**
 * POST /api/stats/view
 * Enregistre une vue de produit côté serveur (alias de track-view)
 * Body: { product_id, slug, name, category, session_id }
 */
export async function POST(req: NextRequest) {
  try {
    if (cookieIsInternal(req.headers.get("cookie"))) return Response.json({ ok: true, skipped: "internal" });

    const { product_id, slug, name, category, session_id } = await req.json();
    if (!slug) return Response.json({ ok: false });

    // Déduplication : pas deux fois le même slug + session dans la même heure
    if (session_id) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: existing } = await supabaseServer
        .from("page_views")
        .select("id")
        .eq("slug", slug)
        .eq("session_id", session_id)
        .gte("viewed_at", oneHourAgo)
        .limit(1);
      if (existing && existing.length > 0) {
        return Response.json({ ok: true, deduplicated: true });
      }
    }

    await supabaseServer.from("page_views").insert([{
      product_id:  product_id ?? null,
      slug,
      name:        name       ?? null,
      category:    category   ?? null,
      session_id:  session_id ?? null,
    }]);

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false });
  }
}