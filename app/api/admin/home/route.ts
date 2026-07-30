import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import { isValidOrder, getNetAmount } from "@/lib/orders";
import { resolveAnalyticsRange, parisDayKey, fetchAllPaged } from "@/lib/analytics-server";
import * as Sentry from "@sentry/nextjs";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/home (Lot A7.D1) — TOUTES les données de la page d'accueil en UNE
 * réponse (la page fait un seul fetch). requireAdmin + captureException.
 * Agrégats via supabaseServer (service-role), comme l'ancien dashboard.
 */

const DAY = 86400000;
const ageLabel = (fromISO: string | null): string | null => {
  if (!fromISO) return null;
  const ms = Date.now() - new Date(fromISO).getTime();
  if (ms < 0) return null;
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} jour${d > 1 ? "s" : ""}`;
};

function stockLevel(p: any): number {
  const s = Number(p.stock ?? 0);
  if (s > 0) return s;
  return p.sizes_stock && typeof p.sizes_stock === "object"
    ? Object.values(p.sizes_stock as Record<string, unknown>).reduce((a: number, v) => a + (Number(v) || 0), 0)
    : 0;
}
const slugOf = (path: string) => { const i = String(path).indexOf("/produits/"); return i < 0 ? null : String(path).slice(i + "/produits/".length).split(/[/?#]/)[0]; };

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const todayKey = parisDayKey(new Date());
    const rrToday  = resolveAnalyticsRange(new URLSearchParams({ date: todayKey }));
    const dayFrom  = rrToday.ok ? rrToday.range.from : new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const dayTo    = rrToday.ok ? rrToday.range.to   : new Date().toISOString();
    // Même jour la semaine dernière (J-7), en date Paris.
    const [ty, tm, td] = todayKey.split("-").map(Number);
    const pd = new Date(Date.UTC(ty, tm - 1, td - 7));
    const prevKey = `${pd.getUTCFullYear()}-${String(pd.getUTCMonth() + 1).padStart(2, "0")}-${String(pd.getUTCDate()).padStart(2, "0")}`;
    const rrPrev  = resolveAnalyticsRange(new URLSearchParams({ date: prevKey }));

    const [ordersRes, productsRes, reviewsRes, promosRes, popupsRes, nlRes, profilesRes, blogRes] = await Promise.all([
      supabaseServer.from("orders").select("*").order("created_at", { ascending: false }),
      supabaseServer.from("products").select("id, name, slug, stock, sizes_stock, published"),
      supabaseServer.from("reviews").select("id, approved, reply, created_at"),
      supabaseServer.from("promo_codes").select("*"),
      supabaseServer.from("popups").select("id, title, active, starts_at, ends_at").order("created_at", { ascending: false }),
      supabaseServer.from("newsletter_subscribers").select("source, created_at"),
      supabaseServer.from("profiles").select("created_at"),
      supabaseServer.from("blog_posts").select("id", { count: "exact", head: true }).eq("status", "draft"),
    ]);
    const orders   = ordersRes.data   ?? [];
    const products = productsRes.data ?? [];
    const reviews  = reviewsRes.data  ?? [];
    const promos   = promosRes.data   ?? [];
    const popups   = popupsRes.data   ?? [];
    const nl       = nlRes.data       ?? [];
    const profiles = profilesRes.data ?? [];
    const blogDrafts = blogRes.count ?? 0;

    // page_views du jour (une requête) → sessions du jour + visiteurs 30 min + top vus.
    let pvToday: any[] = [];
    try {
      pvToday = await fetchAllPaged<any>((a, b) => supabaseServer
        .from("page_views").select("session_id, page_path, viewed_at").gte("viewed_at", dayFrom).lte("viewed_at", dayTo).range(a, b));
    } catch (e) { Sentry.captureException(e, { tags: { area: "admin-home" } }); }

    const now = new Date();
    const nowMs = now.getTime();
    const in7 = new Date(nowMs + 7 * DAY);

    // ── Tâches ────────────────────────────────────────────────────────────────
    const unshipped = orders.filter(o =>
      String(o.status ?? "").toLowerCase() === "payee" &&
      ["en_preparation", "processing", ""].includes(String(o.shipping_status ?? "en_preparation").toLowerCase()));
    const toShipOldest = unshipped.reduce<string | null>((min, o) => (!min || o.created_at < min ? o.created_at : min), null);

    const pendingReviews = reviews.filter(r => !r.approved);
    const revOldest = pendingReviews.reduce<string | null>((min, r) => (!min || (r.created_at && r.created_at < min) ? r.created_at : min), null);
    const reviewsNoReply = reviews.filter(r => r.approved && !(r.reply && String(r.reply).trim())).length;

    const promoExpiring = promos.filter((c: any) => c.active && c.expires_at && new Date(c.expires_at) <= in7).length;

    // Rupture PAR TAILLE (D6).
    const ruptures: { product: string; sizes: string[] }[] = [];
    for (const p of products.filter(p => p.published !== false)) {
      const ss = p.sizes_stock && typeof p.sizes_stock === "object" ? (p.sizes_stock as Record<string, unknown>) : null;
      if (ss && Object.keys(ss).length) {
        const zero = Object.entries(ss).filter(([, v]) => (Number(v) || 0) <= 0).map(([k]) => k);
        if (zero.length) ruptures.push({ product: p.name, sizes: zero });
      } else if (Number(p.stock ?? 0) <= 0) {
        ruptures.push({ product: p.name, sizes: [] });
      }
    }

    // ── Alerte webhook (D4) — payée, webhook_processed=false, NON expédiée, > 10 min.
    // (Garde-fou « non expédiée » : les commandes déjà livrées avec le flag à false
    //  sont d'anciennes commandes traitées manuellement, pas une panne active.)
    const webhookStuck = orders.filter(o =>
      String(o.status ?? "").toLowerCase() === "payee" && o.webhook_processed === false &&
      ["en_preparation", "processing", ""].includes(String(o.shipping_status ?? "en_preparation").toLowerCase()) &&
      (nowMs - new Date(o.created_at).getTime()) > 10 * 60000);

    // ── Dernières commandes (D5) ────────────────────────────────────────────────
    const lastOrders = orders.slice(0, 5).map(o => ({
      id: o.id, date: o.created_at, amount: Number(o.amount_total ?? 0),
      shipping_status: o.shipping_status ?? null, status: o.status ?? null, name: o.customer_name ?? null,
    }));

    // ── État du site ──────────────────────────────────────────────────────────
    const promoActive = promos.filter((c: any) => {
      if (!c.active) return false;
      const expired = c.expires_at ? new Date(c.expires_at) < now : false;
      const notYet  = c.starts_at  ? new Date(c.starts_at)  > now : false;
      const maxed   = c.max_uses   ? c.uses_count >= c.max_uses : false;
      return !expired && !notYet && !maxed;
    }).length;
    const livePopup = popups.find(p => {
      const s = p.starts_at ? new Date(p.starts_at) : null;
      const e = p.ends_at   ? new Date(p.ends_at)   : null;
      return p.active && (!s || s <= now) && (!e || e >= now);
    }) ?? null;

    // Codes promo en cours (D9) — usage + échéance, avec drapeau d'alerte.
    const promoCodes = promos.filter((c: any) => {
      if (!c.active) return false;
      const expired = c.expires_at ? new Date(c.expires_at) < now : false;
      const notYet  = c.starts_at  ? new Date(c.starts_at)  > now : false;
      const maxed   = c.max_uses   ? c.uses_count >= c.max_uses : false;
      return !expired && !notYet && !maxed;
    }).map((c: any) => {
      const nearMax  = c.max_uses ? c.uses_count / c.max_uses >= 0.8 : false;
      const nearEnd  = c.expires_at ? new Date(c.expires_at) <= in7 : false;
      return { code: c.code, uses_count: c.uses_count ?? 0, max_uses: c.max_uses ?? null, expires_at: c.expires_at ?? null, warn: nearMax || nearEnd };
    }).sort((a: any, b: any) => Number(b.warn) - Number(a.warn)).slice(0, 6);

    // ── Chiffres du jour + comparaison J-7 (D7 / D12) ───────────────────────────
    const fromMs = new Date(dayFrom).getTime(), toMs = new Date(dayTo).getTime();
    const validAll = orders.filter(isValidOrder);
    const validToday = validAll.filter(o => { const t = new Date(o.created_at).getTime(); return t >= fromMs && t <= toMs; });
    const ordersToday = validToday.length;
    const caToday = validToday.reduce((s, o) => s + getNetAmount(o), 0);
    let ordersPrev = 0, caPrev = 0;
    if (rrPrev.ok) {
      const pf = new Date(rrPrev.range.from).getTime(), pt = new Date(rrPrev.range.to).getTime();
      const vp = validAll.filter(o => { const t = new Date(o.created_at).getTime(); return t >= pf && t <= pt; });
      ordersPrev = vp.length; caPrev = vp.reduce((s, o) => s + getNetAmount(o), 0);
    }
    const lastValidOrder = validAll[0]?.created_at ?? null; // orders trié desc

    // ── Pouls : visiteurs 30 min + sessions du jour ─────────────────────────────
    const cutoff = nowMs - 30 * 60000;
    const visitorsNow = new Set(pvToday.filter(r => new Date(r.viewed_at).getTime() >= cutoff).map(r => r.session_id).filter(Boolean)).size;
    const sessionsToday = new Set(pvToday.map(r => r.session_id).filter(Boolean)).size;

    // ── Top 3 produits vus aujourd'hui (D8) ─────────────────────────────────────
    const prodBySlug = new Map(products.map(p => [p.slug, p]));
    const viewCount = new Map<string, number>();
    for (const r of pvToday) { const s = slugOf(r.page_path); if (s) viewCount.set(s, (viewCount.get(s) ?? 0) + 1); }
    const topViewed = [...viewCount.entries()]
      .map(([slug, views]) => { const p = prodBySlug.get(slug); const level = p ? stockLevel(p) : null; return { name: p?.name ?? slug, views, level, rupture: level != null && level <= 0 }; })
      .sort((a, b) => b.views - a.views).slice(0, 3);

    // ── Croissance (D10) ────────────────────────────────────────────────────────
    const h24 = nowMs - DAY, d7 = nowMs - 7 * DAY;
    const nlSources: Record<string, number> = {};
    let nl24 = 0, nl7 = 0;
    for (const s of nl) {
      const t = s.created_at ? new Date(s.created_at).getTime() : 0;
      if (t >= d7) { nl7++; nlSources[s.source ?? "—"] = (nlSources[s.source ?? "—"] ?? 0) + 1; }
      if (t >= h24) nl24++;
    }
    let acc24 = 0, acc7 = 0;
    for (const p of profiles) { const t = p.created_at ? new Date(p.created_at).getTime() : 0; if (t >= d7) acc7++; if (t >= h24) acc24++; }

    return Response.json({
      data: {
        tasks: {
          toShip:            { count: unshipped.length, oldest: ageLabel(toShipOldest) },
          reviewsToModerate: { count: pendingReviews.length, oldest: ageLabel(revOldest) },
          reviewsNoReply:    { count: reviewsNoReply },
          promoExpiring:     { count: promoExpiring },
        },
        ruptures,
        webhookAlert: webhookStuck.length > 0 ? { count: webhookStuck.length, oldest: ageLabel(webhookStuck.reduce<string | null>((min, o) => (!min || o.created_at < min ? o.created_at : min), null)) } : null,
        lastOrders,
        site: { popup: livePopup?.title ?? null, promoActive },
        promoCodes,
        pulse: { visitorsNow, caToday, caPrev, ordersToday, ordersPrev },
        today: { orders: ordersToday, ca: caToday, sessions: sessionsToday, lastOrderAge: ageLabel(lastValidOrder) },
        topViewed,
        growth: { nl24, nl7, nlSources, acc24, acc7 },
        blogDrafts,
      },
      error: null,
    });
  } catch (e: any) {
    Sentry.captureException(e, { tags: { area: "admin-home" } });
    return Response.json({ data: null, error: e?.message ?? "Erreur interne" });
  }
}
