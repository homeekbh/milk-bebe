import { supabaseServer } from "@/lib/server/supabase";
import { UAParser }       from "ua-parser-js";
import { cookieIsInternal } from "@/lib/internal-traffic";
import { isCrawlerUA } from "@/lib/bot-detection";
import * as Sentry from "@sentry/nextjs";
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
    // Trafic interne (cookie posé via ?internal=milk2026) → aucun enregistrement.
    if (cookieIsInternal(req.headers.get("cookie"))) return Response.json({ ok: true, skipped: "internal" });

    const b: any = await req.json().catch(() => ({}));
    const page_path = b.page_path ?? b.slug ?? null;

    // ── Parsing user-agent (device / os / browser) ──────────────────────────
    const uaString = req.headers.get("user-agent") ?? "";
    const ua = UAParser(uaString);
    const rawType = ua.device.type;
    const device_type = rawType === "mobile" ? "mobile" : rawType === "tablet" ? "tablet" : "desktop";
    const os      = ua.os.name ?? null;
    const browser = ua.browser.name ?? null;

    // user-agent brut + flag bot basique (crawlers connus). Colonnes OPTIONNELLES :
    // tant que le SQL 011 n'est pas passé, l'insert retombe proprement sans ces
    // champs (aucune perte des autres colonnes).
    const user_agent = uaString ? uaString.slice(0, 500) : null;
    // Détection crawler via la source UNIQUE (lib/bot-detection.ts) — même regex
    // que les agrégats dashboard (botSessionIds réutilise ce is_bot).
    const is_bot = isCrawlerUA(uaString);

    // ── Géolocalisation Vercel (sans IP tracking explicite) ─────────────────
    const h = req.headers;
    const country = h.get("x-vercel-ip-country") ?? null;
    const region  = h.get("x-vercel-ip-country-region") ?? null;
    const cityRaw = h.get("x-vercel-ip-city");
    const city    = cityRaw ? decodeURIComponent(cityRaw) : null;
    // RGPD : latitude/longitude (géo PRÉCISE) volontairement NON collectées. On garde
    // seulement country/region/city (granularité ville, mesure d'audience acceptable).

    // ── Dérivés temporels (heure de Paris, pas UTC serveur) ─────────────────
    const nowParis = new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" });
    const parisDt  = new Date(nowParis);
    const hour_of_day = parisDt.getHours();
    const day_of_week = parisDt.getDay();

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
      // Géo (granularité ville — pas de lat/long précises, cf. RGPD ci-dessus)
      country, region, city,
      // Temporel
      hour_of_day, day_of_week,
      is_new_visitor,
    };

    // Insert à 3 niveaux : (1) complet + user_agent/is_bot ; (2) si ces colonnes
    // n'existent pas encore (SQL 011 non exécuté) → complet SANS ces champs, pour
    // ne perdre NI device NI géo ; (3) filet minimal historique.
    //
    // ⚠️ Les replis étaient SILENCIEUX : quand les colonnes 011 n'existaient pas, le tier-1
    // échouait à CHAQUE vue et user_agent/is_bot étaient perdus ~2 mois sans que personne le
    // voie (leçon des 138 catch muets du dépôt). On rend désormais l'échec VISIBLE (console +
    // Sentry, message CONSTANT → une seule issue dédupliquée, pas un flood) mais NON bloquant :
    // la ligne s'écrit quand même par un niveau inférieur, et un plantage ici ne casse pas l'UX.
    let { error } = await supabaseServer.from("page_views").insert([{ ...row, user_agent, is_bot }]);
    if (error) {
      console.error("[track-view] insert tier-1 (user_agent/is_bot) échec — repli sans ces champs:", error.message);
      Sentry.captureMessage("track-view: perte user_agent/is_bot (repli tier-2) — signal bots dégradé", { level: "warning", extra: { pgError: error.message } });
      ({ error } = await supabaseServer.from("page_views").insert([row]));
    }
    if (error) {
      console.error("[track-view] insert tier-2 (row complet) échec — repli minimal (os/géo perdus):", error.message);
      Sentry.captureMessage("track-view: perte os/géo (repli minimal) — colonne manquante ?", { level: "warning", extra: { pgError: error.message } });
      await supabaseServer.from("page_views").insert([{
        slug: page_path, name: b.page_title ?? null, category: b.category_slug ?? null,
        session_id: b.session_id ?? null, product_id: b.product_id ?? null,
        utm_source: b.utm_source ?? null, utm_medium: b.utm_medium ?? null,
        utm_campaign: b.utm_campaign ?? null, referrer, device: device_type,
      }]);
    }

    return Response.json({ ok: true });
  } catch (e) {
    Sentry.captureException(e, { tags: { area: "analytics" } });
    return Response.json({ ok: false });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (cookieIsInternal(req.headers.get("cookie"))) return Response.json({ ok: true, skipped: "internal" });

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
  } catch (e) {
    Sentry.captureException(e, { tags: { area: "analytics" } });
    return Response.json({ ok: true });
  }
}
