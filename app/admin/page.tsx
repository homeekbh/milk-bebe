"use client";
// app/admin/page.tsx (Lot A7.D) — ACCUEIL admin (thème sombre). UN SEUL fetch vers
// /api/admin/home (jamais 15). Accueil + pouls + horloges + tâches (avec ancienneté
// et rupture par taille) + alerte webhook + codes promo + croissance + dernières
// commandes. Règle : une carte ne s'affiche que si elle a quelque chose à dire.
import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/components/admin/analytics/useAnalyticsData";
import { C } from "@/components/admin/analytics/tokens";
import ClocksBar from "@/components/admin/AdminClocks";

const eur = (n: number) => `${Math.round(Number(n) || 0).toLocaleString("fr-FR")} €`;
const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const deltaPct = (cur: number, prev: number): number | "nouveau" | "—" => {
  if (prev > 0) return ((cur - prev) / prev) * 100;  // variation normale (0 % = stagnation LÉGITIME ici)
  if (cur > 0)  return "nouveau";                     // S-1 à 0, aujourd'hui > 0 → jamais « 0 % »
  return "—";                                         // les deux à 0
};
const SHIP_LABEL: Record<string, string> = { en_preparation: "En préparation", processing: "En préparation", label_created: "Étiquette créée", expediee: "Expédiée", livree: "Livrée", retour: "Retour", annulee: "Annulée" };

function Delta({ d }: { d: number | "nouveau" | "—" }) {
  if (d === "nouveau") return <span style={{ color: C.green, fontSize: 12, fontWeight: 800 }}>nouveau</span>;
  if (d === "—")       return <span style={{ color: C.muted, fontSize: 12, fontWeight: 800 }}>—</span>;
  return <span style={{ color: d >= 0 ? C.green : C.red, fontSize: 12, fontWeight: 800 }}>{d >= 0 ? "▲ +" : "▼ "}{d.toFixed(0)}%</span>;
}

export default function AdminHome() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await adminFetch("/api/admin/home");
        const j = await r.json();
        if (!cancelled) { if (j?.error || !j?.data) setErr(true); else setD(j.data); }
      } catch { if (!cancelled) setErr(true); }
    })();
    return () => { cancelled = true; };
  }, []);

  const now = new Date();
  const parisHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false }).format(now).slice(0, 2)) % 24;
  const greeting = parisHour >= 5 && parisHour < 13 ? "Bonjour" : parisHour >= 13 && parisHour < 18 ? "Bon après-midi" : "Bonsoir";
  const dateStr = cap(now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }));

  const sectionTitle = (txt: string) => (
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase" as const, color: C.amber, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 1, background: "rgba(196,154,74,0.15)" }} />{txt}<div style={{ flex: 1, height: 1, background: "rgba(196,154,74,0.15)" }} />
    </div>
  );
  const card: React.CSSProperties = { background: C.card, borderRadius: 16, padding: "20px 22px", border: `1px solid ${C.faint}` };

  // ── Tâches (compte > 0 uniquement) ──────────────────────────────────────────
  const tasks: { count: number; label: string; href: string; sub?: string }[] = [];
  if (d) {
    const rupLines = (d.ruptures ?? []).map((r: any) => r.sizes.length ? `${r.product} — ${r.sizes.join(", ")}` : `${r.product} — en rupture`);
    if (d.tasks.reviewsToModerate.count > 0) tasks.push({ count: d.tasks.reviewsToModerate.count, label: "Avis à modérer", href: "/admin/avis", sub: d.tasks.reviewsToModerate.oldest ? `le plus ancien depuis ${d.tasks.reviewsToModerate.oldest}` : undefined });
    if (d.tasks.reviewsNoReply.count > 0)    tasks.push({ count: d.tasks.reviewsNoReply.count, label: "Avis sans réponse", href: "/admin/avis" });
    if (rupLines.length > 0)                 tasks.push({ count: rupLines.length, label: "En rupture", href: "/admin/produits", sub: rupLines.slice(0, 2).join(" · ") });
    if (d.tasks.promoExpiring.count > 0)     tasks.push({ count: d.tasks.promoExpiring.count, label: "Promos qui expirent", href: "/admin/codes-promos" });
    if (d.blogDrafts > 0)                     tasks.push({ count: d.blogDrafts, label: "Articles en attente de publication", href: "/admin/blog" });
  }

  return (
    <div style={{ padding: "32px 40px", background: C.bg, minHeight: "100vh", color: C.warm }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* ── Accueil ── */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: "clamp(28px,4vw,40px)", fontWeight: 950, letterSpacing: -1.5, color: C.warm }}>{greeting}</h1>
          <div style={{ fontSize: 15, color: C.muted, marginTop: 8, fontWeight: 600 }}>{dateStr}</div>
        </div>

        {err && <div style={{ ...card, color: C.red, marginBottom: 24 }}>Données momentanément indisponibles.</div>}
        {!d && !err && <div style={{ color: C.muted, fontSize: 14, padding: "8px 0" }}>Chargement…</div>}

        {d && (
          <>
            {/* ── Pouls du site (D7 / D12) ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 28 }}>
              <div style={card}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>Visiteurs en ce moment</div>
                <div style={{ fontSize: 30, fontWeight: 950, color: C.green, lineHeight: 1 }}>{d.pulse.visitorsNow}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>30 dernières minutes</div>
              </div>
              <div style={card}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>CA du jour</div>
                {d.today.orders === 0 ? (
                  <div style={{ fontSize: 14, color: C.muted, fontWeight: 600, lineHeight: 1.4 }}>Aucune vente aujourd'hui{d.today.lastOrderAge ? ` · dernière il y a ${d.today.lastOrderAge}` : ""}</div>
                ) : (
                  <>
                    <div style={{ fontSize: 30, fontWeight: 950, color: C.amber, lineHeight: 1 }}>{eur(d.pulse.caToday)}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}><Delta d={deltaPct(d.pulse.caToday, d.pulse.caPrev)} /> vs même jour S-1</div>
                  </>
                )}
              </div>
              <div style={card}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>Commandes du jour</div>
                {d.today.orders === 0 ? (
                  <div style={{ fontSize: 14, color: C.muted, fontWeight: 600, lineHeight: 1.4 }}>Aucune commande{d.today.lastOrderAge ? ` · dernière il y a ${d.today.lastOrderAge}` : ""}</div>
                ) : (
                  <>
                    <div style={{ fontSize: 30, fontWeight: 950, color: C.warm, lineHeight: 1 }}>{d.pulse.ordersToday}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}><Delta d={deltaPct(d.pulse.ordersToday, d.pulse.ordersPrev)} /> vs même jour S-1</div>
                  </>
                )}
              </div>
            </div>

            {/* ── Horloges (dark, réduites) ── */}
            <div style={{ marginBottom: 28, display: "flex", justifyContent: "center" }}>
              <ClocksBar size={66} dark />
            </div>

            {/* ── À préparer — tuile NEUTRE (ex-alerte webhook mensongère retirée) ── */}
            {d.aPreparer && (
              <Link href="/admin/commandes" style={{ display: "block", textDecoration: "none", ...card, marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: C.warm }}>{d.aPreparer.count} commande(s) à préparer</div>
                {d.aPreparer.oldest && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>la plus ancienne depuis {d.aPreparer.oldest}</div>}
              </Link>
            )}

            {/* ── À traiter ── */}
            <div style={{ marginBottom: 28 }}>
              {sectionTitle("À traiter")}
              {tasks.length === 0 ? (
                <div style={{ color: C.muted, fontSize: 15 }}>Rien en attente aujourd'hui.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
                  {tasks.map(t => (
                    <Link key={t.label} href={t.href} style={{ display: "block", textDecoration: "none", ...card }}>
                      <div style={{ fontSize: 38, fontWeight: 950, letterSpacing: -1.5, color: C.amber, lineHeight: 1 }}>{t.count}</div>
                      <div style={{ fontSize: 14, color: C.warm, fontWeight: 700, marginTop: 8 }}>{t.label}</div>
                      {t.sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.4 }}>{t.sub}</div>}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* ── Top 3 produits vus aujourd'hui (D8) ── */}
            {d.topViewed.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                {sectionTitle("Produits les plus vus aujourd'hui")}
                <div style={{ display: "grid", gap: 8 }}>
                  {d.topViewed.map((p: any, i: number) => (
                    <div key={i} style={{ ...card, padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderColor: p.rupture ? "rgba(239,68,68,0.5)" : C.faint }}>
                      <span style={{ fontSize: 14, color: C.warm, fontWeight: 700 }}>
                        {p.name}
                        {p.rupture && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 900, color: "#fff", background: C.red, borderRadius: 6, padding: "2px 8px" }}>EN RUPTURE</span>}
                      </span>
                      <span style={{ fontSize: 13, color: C.amber, fontWeight: 800, whiteSpace: "nowrap" }}>{p.views} vue{p.views > 1 ? "s" : ""}{p.level != null && !p.rupture ? ` · stock ${p.level}` : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Codes promo en cours (D9) ── */}
            {d.promoCodes.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                {sectionTitle("Codes promo en cours")}
                <div style={{ display: "grid", gap: 8 }}>
                  {d.promoCodes.map((c: any) => (
                    <Link key={c.code} href="/admin/codes-promos" style={{ ...card, padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, textDecoration: "none", borderColor: c.warn ? "rgba(196,154,74,0.5)" : C.faint }}>
                      <span style={{ fontSize: 14, color: C.warm, fontWeight: 800 }}>{c.code}{c.warn && <span style={{ marginLeft: 8, fontSize: 16 }}>⚠️</span>}</span>
                      <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>
                        {c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ""} util.{c.expires_at ? ` · fin ${new Date(c.expires_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}` : ""}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── Dernières commandes (D5) ── */}
            {d.lastOrders.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                {sectionTitle("Dernières commandes")}
                <div style={{ ...card, padding: 0, overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <tbody>
                        {d.lastOrders.map((o: any, i: number) => (
                          <tr key={o.id} style={{ borderTop: i > 0 ? `1px solid ${C.faint}` : "none" }}>
                            <td style={{ padding: "12px 18px", color: C.muted, whiteSpace: "nowrap" }}>{new Date(o.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</td>
                            <td style={{ padding: "12px 18px", color: C.warm, fontWeight: 700 }}>{o.name ?? "—"}</td>
                            <td style={{ padding: "12px 18px", color: C.amber, fontWeight: 800, whiteSpace: "nowrap" }}>{Number(o.amount).toFixed(2)} €</td>
                            <td style={{ padding: "12px 18px", color: C.muted, whiteSpace: "nowrap" }}>{SHIP_LABEL[String(o.shipping_status ?? "en_preparation").toLowerCase()] ?? "En préparation"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Link href="/admin/commandes" style={{ display: "block", padding: "12px 18px", textAlign: "right", fontSize: 13, fontWeight: 700, color: C.amber, textDecoration: "none", borderTop: `1px solid ${C.faint}` }}>Toutes les commandes →</Link>
                </div>
              </div>
            )}

            {/* ── Croissance (D10) + État du site (bloc 4) ── */}
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center", fontSize: 13, color: C.muted, marginBottom: 8 }}>
              <span>Newsletter : <span style={{ color: C.warm, fontWeight: 800 }}>+{d.growth.nl24}</span> (24h) · <span style={{ color: C.warm, fontWeight: 800 }}>+{d.growth.nl7}</span> (7j){Object.keys(d.growth.nlSources).length ? ` — ${Object.entries(d.growth.nlSources).map(([s, n]) => `${n} ${s}`).join(", ")}` : ""}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>Comptes : <span style={{ color: C.warm, fontWeight: 800 }}>+{d.growth.acc24}</span> (24h) · <span style={{ color: C.warm, fontWeight: 800 }}>+{d.growth.acc7}</span> (7j)</span>
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center", fontSize: 13, color: C.muted }}>
              <Link href="/admin/popups" style={{ color: C.muted, textDecoration: "none" }}>Pop-up : <span style={{ color: d.site.popup ? C.green : C.muted, fontWeight: 800 }}>{d.site.popup ? `actif — ${d.site.popup}` : "inactif"}</span></Link>
              <span style={{ opacity: 0.4 }}>·</span>
              <Link href="/admin/codes-promos" style={{ color: C.muted, textDecoration: "none" }}>Codes promo actifs : <span style={{ color: C.warm, fontWeight: 800 }}>{d.site.promoActive}</span></Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
