import { supabaseServer } from "@/lib/server/supabase";
import { UAParser }       from "ua-parser-js";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/track-view — enregistre une vue de page (anonyme, sans auth).
 * PATCH /api/track-view — met à jour les métriques de comportement au départ
 *                         de la page (time_on_page, scroll_depth, clicks, bounce).
 *
 * ⚠️ Horodatage de page_views = `viewed_at` (jamais created_at).
 * Service-role (bypass RLS). Toujours 200 (jamais bloquant pour l'UX).
 */

function domainOf(referrer?: string | null): string | null {
  if (!referrer) return null;
  try { return new URL(referrer).hostname.replace(/^www\./, ""); } catch { return null; }
}

export async function POST(req: NextRequest) {
  try {
    const b: any = await req.json().catch(() => ({}));
    const page_path = b.page_path ?? b.slug ?? null;

    // ── Parsing user-agent (device / os / browser) ──────────────────────────
    const uaString = req.headers.get("user-agent") ?? "";
    const ua = UAParser(uaString);
    const rawType = ua.device.type;
    const device_type = rawType === "mobile" ? "mobile" : rawType === "tablet" ? "tablet" : "desktop";
    const os      = ua.os.name ?? null;
    const browser = ua.browser.name ?? null;

    // ── Géolocalisation Vercel (sans IP tracking explicite) ─────────────────
    const h = req.headers;
    const country = h.get("x-vercel-ip-country") ?? null;
    const region  = h.get("x-vercel-ip-country-region") ?? null;
    const cityRaw = h.get("x-vercel-ip-city");
    const city    = cityRaw ? decodeURIComponent(cityRaw) : null;
    const latitude  = parseFloat(h.get("x-vercel-ip-latitude") ?? "")  || null;
    const longitude = parseFloat(h.get("x-vercel-ip-longitude") ?? "") || null;

    // ── Dérivés temporels (serveur UTC) ─────────────────────────────────────
    const now = new Date();
    const hour_of_day = now.getHours();
    const day_of_week = (now.getDay() + 6) % 7; // 0 = lundi … 6 = dimanche

    // ── Visiteur nouveau vs récurrent ───────────────────────────────────────
    let is_new_visitor: boolean | null = null;
    if (b.visitor_id) {
      const { count } = await supabaseServer
        .from("page_views")
        .select("id", { count: "exact", head: true })
        .eq("visitor_id", b.visitor_id);
      is_new_visitor = !(count && count > 0);
    }

    const referrer = b.referrer ? String(b.referrer).slice(0, 500) : null;

    const row: Record<string, any> = {
      // Compat colonnes historiques
      slug:       page_path,
      name:       b.page_title ?? null,
      category:   b.category_slug ?? null,
      device:     device_type,
      // Identité session / visiteur
      session_id: b.session_id ?? null,
      visitor_id: b.visitor_id ?? null,
      user_id:    b.user_id ?? null,
      // Page
      page_path,
      page_title: b.page_title ?? null,
      entry_page: b.entry_page ?? page_path,
      product_id: b.product_id ?? null,
      category_slug: b.category_slug ?? null,
      // Référent / attribution
      referrer,
      referrer_domain: domainOf(referrer),
      utm_source:   b.utm_source   ?? null,
      utm_medium:   b.utm_medium   ?? null,
      utm_campaign: b.utm_campaign ?? null,
      utm_content:  b.utm_content  ?? null,
      utm_term:     b.utm_term     ?? null,
      // Device / écran / langue
      device_type,
      os,
      browser,
      screen_width:  Number.isFinite(b.screen_width)  ? b.screen_width  : null,
      screen_height: Number.isFinite(b.screen_height) ? b.screen_height : null,
      language: b.language ? String(b.language).slice(0, 12) : null,
      // Géo
      country, region, city, latitude, longitude,
      // Temporel
      hour_of_day, day_of_week,
      is_new_visitor,
    };

    const { error } = await supabaseServer.from("page_views").insert([row]);
    if (error) {
      // Filet de sécurité : si une colonne manque (migration partielle), on
      // retombe sur le coeur historique pour ne jamais perdre la vue.
      await supabaseServer.from("page_views").insert([{
        slug: page_path, name: b.page_title ?? null, category: b.category_slug ?? null,
        session_id: b.session_id ?? null, product_id: b.product_id ?? null,
        utm_source: b.utm_source ?? null, utm_medium: b.utm_medium ?? null,
        utm_campaign: b.utm_campaign ?? null, referrer, device: device_type,
      }]);
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const b: any = await req.json().catch(() => ({}));
    if (!b.session_id || !b.page_path) return Response.json({ ok: true });

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const patch: Record<string, any> = {};
    if (b.time_on_page !== undefined) patch.time_on_page = Math.max(0, Math.round(Number(b.time_on_page) || 0));
    if (b.scroll_depth !== undefined) patch.scroll_depth = Math.min(100, Math.max(0, Math.round(Number(b.scroll_depth) || 0)));
    if (b.clicks_count !== undefined) patch.clicks_count = Math.max(0, Math.round(Number(b.clicks_count) || 0));
    if (b.is_bounce    !== undefined) patch.is_bounce    = !!b.is_bounce;
    if (b.exit_page    !== undefined) patch.exit_page    = b.exit_page ?? null;

    if (Object.keys(patch).length > 0) {
      await supabaseServer
        .from("page_views")
        .update(patch)
        .eq("session_id", b.session_id)
        .eq("page_path", b.page_path)
        .gte("viewed_at", oneHourAgo);
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: true });
  }
}
