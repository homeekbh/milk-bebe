import { supabaseServer } from "@/lib/server/supabase";
import type { NextRequest } from "next/server";

/**
 * POST /api/track-view
 * Enregistre une vue de fiche produit (anonyme, sans auth)
 * Body: { product_id, slug, name, category, session_id }
 */
export async function POST(req: NextRequest) {
  try {
    const { product_id, slug, name, category, session_id,
            utm_source, utm_medium, utm_campaign, referrer, device } = await req.json();
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

    const core = {
      product_id: product_id ?? null,
      slug,
      name:     name     ?? null,
      category: category ?? null,
      session_id: session_id ?? null,
    };

    // Tentative AVEC les colonnes d'attribution (migration 007). Si elles
    // n'existent pas encore en base → l'insert échoue → fallback sur le core.
    // Le tracking des vues n'est donc JAMAIS interrompu par l'absence de migration.
    const { error } = await supabaseServer.from("page_views").insert([{
      ...core,
      utm_source:   utm_source   ?? null,
      utm_medium:   utm_medium   ?? null,
      utm_campaign: utm_campaign ?? null,
      referrer:     referrer ? String(referrer).slice(0, 300) : null,
      device:       device ?? null,
    }]);
    if (error) {
      await supabaseServer.from("page_views").insert([core]);
    }

    return Response.json({ ok: true });
  } catch (e: any) {
    // Ne jamais bloquer le chargement de la fiche produit
    return Response.json({ ok: false });
  }
}