// app/admin/page.tsx (Lot A6) — PAGE D'ACCUEIL admin (thème sombre, tokens A2).
// Accueil + 4 horloges (composant existant réutilisé) + tâches « à traiter » +
// état du site + chiffres du jour. Server component : agrégats via supabaseServer
// (service-role), comme l'ancien dashboard. Aucune donnée inventée : une carte ne
// s'affiche qu'avec une donnée réelle et un compte > 0.
import { supabaseServer } from "@/lib/server/supabase";
import { isValidOrder, getNetAmount } from "@/lib/orders";
import { resolveAnalyticsRange, parisDayKey, fetchAllPaged } from "@/lib/analytics-server";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { C } from "@/components/admin/analytics/tokens";
import ClocksBar from "@/components/admin/AdminClocks";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const eur = (n: number) => `${(Number(n) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;

// Stock effectif d'un produit : scalaire `stock` s'il est > 0, sinon somme des
// tailles (sizes_stock) — même notion d'« en stock » que le Product JSON-LD.
function stockLevel(p: any): number {
  const s = Number(p.stock ?? 0);
  if (s > 0) return s;
  const ss = p.sizes_stock && typeof p.sizes_stock === "object"
    ? Object.values(p.sizes_stock as Record<string, unknown>).reduce((a: number, v) => a + (Number(v) || 0), 0)
    : 0;
  return ss;
}

async function getHomeData() {
  try {
    // Bornes du JOUR en heure de Paris (réutilise l'infra analytics).
    const todayKey = parisDayKey(new Date());
    const rr = resolveAnalyticsRange(new URLSearchParams({ date: todayKey }));
    const dayFrom = rr.ok ? rr.range.from : new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const dayTo   = rr.ok ? rr.range.to   : new Date().toISOString();

    const [ordersRes, productsRes, reviewsRes, promosRes, popupsRes] = await Promise.all([
      supabaseServer.from("orders").select("*"),
      supabaseServer.from("products").select("id, stock, sizes_stock, published"),
      supabaseServer.from("reviews").select("id, approved, reply"),
      supabaseServer.from("promo_codes").select("id, active, expires_at, starts_at, max_uses, uses_count"),
      supabaseServer.from("popups").select("id, title, active, starts_at, ends_at").order("created_at", { ascending: false }),
    ]);
    const orders   = ordersRes.data   ?? [];
    const products = productsRes.data ?? [];
    const reviews  = reviewsRes.data  ?? [];
    const promos   = promosRes.data   ?? [];
    const popups   = popupsRes.data   ?? [];

    // Sessions du jour (page_views, Paris) — distinct session_id.
    let sessionsToday = 0;
    try {
      const pv = await fetchAllPaged<any>((a, b) => supabaseServer
        .from("page_views").select("session_id").gte("viewed_at", dayFrom).lte("viewed_at", dayTo).range(a, b));
      sessionsToday = new Set(pv.map(r => r.session_id).filter(Boolean)).size;
    } catch (e) { Sentry.captureException(e, { tags: { area: "admin-home" } }); }

    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 86400000);

    // ── Tâches ────────────────────────────────────────────────────────────────
    // Commandes payées non expédiées (= badge NAV « Commandes »).
    const toShip = orders.filter(o =>
      String(o.status ?? "").toLowerCase() === "payee" &&
      ["en_preparation", "processing", ""].includes(String(o.shipping_status ?? "en_preparation").toLowerCase())
    ).length;

    const reviewsToModerate = reviews.filter(r => !r.approved).length;                                   // approved=false = en attente
    const reviewsNoReply    = reviews.filter(r => r.approved && !(r.reply && String(r.reply).trim())).length; // publié, sans réponse M!LK

    const published = products.filter(p => p.published !== false);
    const outOfStock = published.filter(p => stockLevel(p) <= 0).length;
    const lowStock   = published.filter(p => { const l = stockLevel(p); return l > 0 && l <= 5; }).length;

    const promoExpiring = promos.filter(c => c.active && c.expires_at && new Date(c.expires_at) <= in7).length;

    // ── État du site ──────────────────────────────────────────────────────────
    const promoActive = promos.filter(c => {
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

    // ── Chiffres du jour ────────────────────────────────────────────────────────
    const fromMs = new Date(dayFrom).getTime(), toMs = new Date(dayTo).getTime();
    const validToday = orders.filter(isValidOrder).filter(o => {
      const t = new Date(o.created_at).getTime(); return t >= fromMs && t <= toMs;
    });
    const ordersToday = validToday.length;
    const caToday = validToday.reduce((s, o) => s + getNetAmount(o), 0);

    return {
      toShip, reviewsToModerate, reviewsNoReply, outOfStock, lowStock, promoExpiring,
      promoActive, livePopupTitle: livePopup?.title ?? null,
      ordersToday, caToday, sessionsToday,
    };
  } catch (e) {
    Sentry.captureException(e, { tags: { area: "admin-home" } });
    return null;
  }
}

export default async function AdminHome() {
  const d = await getHomeData();

  // Accueil (heure de Paris) — sobre, sans emoji ni exclamation.
  const parisHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false }).format(new Date()).slice(0, 2)) % 24;
  const greeting = parisHour >= 5 && parisHour < 13 ? "Bonjour" : parisHour >= 13 && parisHour < 18 ? "Bon après-midi" : "Bonsoir";
  const rawDate  = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
  const dateStr  = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  const tasks = d ? [
    { count: d.toShip,             label: "Commandes à expédier", href: "/admin/commandes" },
    { count: d.reviewsToModerate,  label: "Avis à modérer",       href: "/admin/avis" },
    { count: d.reviewsNoReply,     label: "Avis sans réponse",    href: "/admin/avis" },
    { count: d.outOfStock,         label: "Produits en rupture",  href: "/admin/produits" },
    { count: d.lowStock,           label: "Produits en stock bas", href: "/admin/produits" },
    { count: d.promoExpiring,      label: "Promos qui expirent",  href: "/admin/codes-promos" },
  ].filter(t => t.count > 0) : [];

  const sectionTitle = (txt: string) => (
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase" as const, color: C.amber, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 1, background: "rgba(196,154,74,0.15)" }} />
      {txt}
      <div style={{ flex: 1, height: 1, background: "rgba(196,154,74,0.15)" }} />
    </div>
  );

  return (
    <div style={{ padding: "36px 40px", background: C.bg, minHeight: "100vh", color: C.warm }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* ── BLOC 1 · Accueil ── */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ margin: 0, fontSize: "clamp(30px,4vw,44px)", fontWeight: 950, letterSpacing: -1.5, color: C.warm }}>{greeting}</h1>
          <div style={{ fontSize: 16, color: C.muted, marginTop: 8, fontWeight: 600 }}>{dateStr}</div>
        </div>

        {/* ── BLOC 2 · Les 4 horloges (composant existant, agrandi) ──
            Le composant reste clair (thème du header) → posé sur une carte claire
            pour rester lisible sans le réécrire (heure digitale/libellés sombres). */}
        <div style={{ marginBottom: 36, background: "#f5f0e8", borderRadius: 20, padding: 24, display: "flex", justifyContent: "center" }}>
          <ClocksBar size={110} />
        </div>

        {/* ── BLOC 3 · À traiter ── */}
        <div style={{ marginBottom: 36 }}>
          {sectionTitle("À traiter")}
          {tasks.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 15, padding: "8px 2px" }}>Rien en attente aujourd'hui.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              {tasks.map(t => (
                <Link key={t.label} href={t.href}
                  style={{ display: "block", textDecoration: "none", background: C.card, borderRadius: 16, padding: "22px 22px", border: `1px solid ${C.faint}` }}>
                  <div style={{ fontSize: 40, fontWeight: 950, letterSpacing: -1.5, color: C.amber, lineHeight: 1 }}>{t.count}</div>
                  <div style={{ fontSize: 14, color: C.warm, fontWeight: 700, marginTop: 8 }}>{t.label}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Voir →</div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── BLOC 4 · État du site (ligne discrète, indicateurs) ── */}
        {d && (
          <div style={{ marginBottom: 36, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center", fontSize: 13, color: C.muted }}>
            <Link href="/admin/popups" style={{ color: C.muted, textDecoration: "none" }}>
              Pop-up : <span style={{ color: d.livePopupTitle ? C.green : C.muted, fontWeight: 800 }}>{d.livePopupTitle ? `actif — ${d.livePopupTitle}` : "inactif"}</span>
            </Link>
            <span style={{ opacity: 0.4 }}>·</span>
            <Link href="/admin/codes-promos" style={{ color: C.muted, textDecoration: "none" }}>
              Codes promo actifs : <span style={{ color: C.warm, fontWeight: 800 }}>{d.promoActive}</span>
            </Link>
          </div>
        )}

        {/* ── BLOC 5 · Aujourd'hui en chiffres ── */}
        {d && (
          <div>
            {sectionTitle("Aujourd'hui en chiffres")}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              {[
                { label: "Commandes", value: String(d.ordersToday) },
                { label: "Chiffre d'affaires", value: eur(d.caToday) },
                { label: "Sessions", value: String(d.sessionsToday) },
              ].map(k => (
                <div key={k.label} style={{ background: C.card, borderRadius: 16, padding: "22px 22px", border: `1px solid ${C.faint}` }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>{k.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 950, letterSpacing: -1, color: C.warm, lineHeight: 1 }}>{k.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!d && (
          <div style={{ color: C.muted, fontSize: 14 }}>Données momentanément indisponibles.</div>
        )}
      </div>
    </div>
  );
}
