"use client";

import { useEffect, useState, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Order = {
  id: string;
  created_at: string;
  amount_total: number;
  customer_email: string;
  customer_name: string;
  status: string;
  items: any[];
};

type Period = "7j" | "30j" | "90j" | "tout";

// ─── Couleurs ─────────────────────────────────────────────────────────────────
const C = {
  bg:    "#0d0b09",
  bg2:   "#161210",
  card:  "#1c1814",
  amber: "#c49a4a",
  warm:  "#f2ede6",
  muted: "rgba(242,237,230,0.45)",
  faint: "rgba(242,237,230,0.08)",
  green: "#22c55e",
  red:   "#ef4444",
};

// ─── Bar Chart SVG ────────────────────────────────────────────────────────────
function BarChart({ data, width = 600, height = 180 }: {
  data: { label: string; value: number }[];
  width?: number;
  height?: number;
}) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const barW = Math.max(8, (width - 40) / data.length - 6);
  const gap  = (width - 40 - barW * data.length) / (data.length + 1);

  return (
    <svg viewBox={`0 0 ${width} ${height + 30}`} style={{ width: "100%", overflow: "visible" }}>
      {/* Grilles */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = height - height * t;
        return (
          <line key={t} x1={20} x2={width - 10} y1={y} y2={y}
            stroke={C.faint} strokeWidth={1}
          />
        );
      })}
      {/* Barres */}
      {data.map((d, i) => {
        const x = 20 + gap + i * (barW + gap);
        const h = (d.value / max) * height;
        const y = height - h;
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={barW} height={h}
              rx={4} fill={C.amber} opacity={0.85}
            />
            {/* Label axe X — affiche 1 sur 3 si trop dense */}
            {(data.length <= 10 || i % Math.ceil(data.length / 10) === 0) && (
              <text
                x={x + barW / 2} y={height + 20}
                fill={C.muted} fontSize={9} textAnchor="middle"
                fontFamily="system-ui"
              >
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Donut Chart SVG ──────────────────────────────────────────────────────────
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 14 }}>Aucune donnée</div>;

  const r = 60;
  const cx = 80;
  const cy = 80;
  let offset = -Math.PI / 2;

  const slices = data.map(d => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(offset);
    const y1 = cy + r * Math.sin(offset);
    const x2 = cx + r * Math.cos(offset + angle);
    const y2 = cy + r * Math.sin(offset + angle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    const slice = { ...d, path, angle, offset };
    offset += angle;
    return slice;
  });

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
      <svg viewBox="0 0 160 160" style={{ width: 120, flexShrink: 0 }}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} opacity={0.85} />
        ))}
        <circle cx={cx} cy={cy} r={36} fill={C.card} />
        <text x={cx} y={cy - 6} fill={C.warm} fontSize={11} textAnchor="middle" fontWeight="bold" fontFamily="system-ui">
          Total
        </text>
        <text x={cx} y={cy + 10} fill={C.warm} fontSize={10} textAnchor="middle" fontFamily="system-ui">
          {total}
        </text>
      </svg>
      <div style={{ display: "grid", gap: 8 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: C.muted }}>{s.label}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.warm, marginLeft: "auto" }}>
              {((s.value / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = C.warm }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div style={{ background: C.card, borderRadius: 16, padding: "24px 22px", border: `1px solid ${C.faint}` }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 950, letterSpacing: -1, color, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminAnalytics() {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState<Period>("30j");
  const [featuredId, setFeaturedId] = useState<string>("");
  const [savingFeatured, setSavingFeatured] = useState(false);
  const [featuredOk, setFeaturedOk] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/products").then(r => r.json()),
      fetch("/api/admin/commandes-data").then(r => r.json()).catch(() => []),
    ]).then(([prods, ords]) => {
      if (Array.isArray(prods)) setProducts(prods);
      if (Array.isArray(ords))  setOrders(ords);
      setLoading(false);
    });
  }, []);

  // Filtre par période
  const filtered = useMemo(() => {
    if (period === "tout") return orders;
    const days = period === "7j" ? 7 : period === "30j" ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return orders.filter(o => new Date(o.created_at) >= cutoff);
  }, [orders, period]);

  // KPIs
  const ca = filtered.reduce((s, o) => s + Number(o.amount_total ?? 0), 0);
  const nbOrders = filtered.length;
  const avgCart  = nbOrders > 0 ? ca / nbOrders : 0;
  const clients  = new Set(filtered.map(o => o.customer_email).filter(Boolean)).size;

  // CA par jour (pour le graphique)
  const caByDay = useMemo(() => {
    const days = period === "7j" ? 7 : period === "30j" ? 30 : period === "90j" ? 90 : 30;
    const map: Record<string, number> = {};
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
      map[key] = 0;
    }
    filtered.forEach(o => {
      const key = new Date(o.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
      if (key in map) map[key] += Number(o.amount_total ?? 0);
    });
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  }, [filtered, period]);

  // Top produits
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; ca: number }> = {};
    filtered.forEach(o => {
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach((item: any) => {
        const key = item.name ?? item.slug ?? "Inconnu";
        if (!map[key]) map[key] = { name: key, qty: 0, ca: 0 };
        map[key].qty += item.quantity ?? 1;
        map[key].ca  += (item.price ?? 0) * (item.quantity ?? 1);
      });
    });
    return Object.values(map).sort((a, b) => b.ca - a.ca).slice(0, 5);
  }, [filtered]);

  // Ventes par catégorie
  const byCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    filtered.forEach(o => {
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach((item: any) => {
        const cat = item.category_slug ?? "Autre";
        cats[cat] = (cats[cat] ?? 0) + (item.quantity ?? 1);
      });
    });
    const colors = [C.amber, "#e87b4a", "#4ab5e8", "#a84ae8", "#4ae87b"];
    return Object.entries(cats).map(([label, value], i) => ({
      label, value, color: colors[i % colors.length],
    }));
  }, [filtered]);

  // Sauvegarder le produit mis en avant
  async function saveFeatured() {
    if (!featuredId) return;
    setSavingFeatured(true);
    await fetch("/api/admin/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: featuredId, featured: true }),
    });
    // Retirer featured des autres
    for (const p of products.filter(p => p.id !== featuredId && p.featured)) {
      await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, featured: false }),
      });
    }
    setSavingFeatured(false);
    setFeaturedOk(true);
    setTimeout(() => setFeaturedOk(false), 3000);
  }

  if (loading) return (
    <div style={{ padding: 60, color: C.muted, fontSize: 14 }}>Chargement...</div>
  );

  const isEmpty = orders.length === 0;

  return (
    <div style={{ padding: "36px 40px", background: C.bg, minHeight: "100vh" }}>

      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950, letterSpacing: -1, color: C.warm }}>Analytics</h1>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>
            {isEmpty ? "Aucune commande pour l'instant — aperçu en attente de données réelles" : `${orders.length} commande(s) au total`}
          </div>
        </div>

        {/* Filtre période */}
        <div style={{ display: "flex", gap: 6, background: C.card, borderRadius: 12, padding: 4, border: `1px solid ${C.faint}` }}>
          {(["7j", "30j", "90j", "tout"] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: "8px 16px", borderRadius: 9, border: "none", cursor: "pointer",
              background: period === p ? C.warm : "transparent",
              color: period === p ? "#000" : C.muted,
              fontWeight: 800, fontSize: 13, transition: "all 0.15s",
            }}>
              {p === "tout" ? "Tout" : p}
            </button>
          ))}
        </div>
      </div>

      {/* Bandeau vide */}
      {isEmpty && (
        <div style={{ marginBottom: 28, padding: "18px 22px", borderRadius: 14, background: "rgba(196,154,74,0.08)", border: `1px solid rgba(196,154,74,0.2)`, color: C.amber, fontSize: 14, fontWeight: 700 }}>
          💡 Les graphiques et KPIs se rempliront automatiquement dès les premières commandes via Stripe.
        </div>
      )}

      {/* ── KPIs ────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
        <KpiCard label="Chiffre d'affaires" value={`${ca.toFixed(2)} €`} sub={`Sur les ${period === "tout" ? "tous les temps" : period}`} color={C.amber} />
        <KpiCard label="Commandes"          value={String(nbOrders)}         sub="Commandes payées" />
        <KpiCard label="Panier moyen"       value={`${avgCart.toFixed(2)} €`} sub="Par commande" />
        <KpiCard label="Clients uniques"    value={String(clients)}           sub="Emails distincts" />
      </div>

      {/* ── GRAPHIQUE CA ────────────────────────────────────── */}
      <div style={{ background: C.card, borderRadius: 20, padding: "28px 28px 20px", border: `1px solid ${C.faint}`, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 20 }}>
          Chiffre d'affaires — {period === "tout" ? "Tout" : `${period} derniers jours`}
        </div>
        {isEmpty ? (
          <div style={{ height: 180, display: "grid", placeItems: "center", color: C.muted, fontSize: 14 }}>
            Aucune donnée disponible
          </div>
        ) : (
          <BarChart data={caByDay} height={180} />
        )}
      </div>

      {/* ── TOP PRODUITS + CATÉGORIES ───────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

        {/* Top produits */}
        <div style={{ background: C.card, borderRadius: 20, padding: 28, border: `1px solid ${C.faint}` }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 20 }}>🏆 Top produits</div>
          {topProducts.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 14, padding: "20px 0" }}>Aucune donnée</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {topProducts.map((p, i) => {
                const maxCa = topProducts[0]?.ca ?? 1;
                return (
                  <div key={p.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 900, color: C.amber, minWidth: 20 }}>#{i + 1}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.warm }}>{p.name}</span>
                      </div>
                      <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
                        <span style={{ color: C.muted }}>{p.qty} vente{p.qty > 1 ? "s" : ""}</span>
                        <span style={{ fontWeight: 900, color: C.amber }}>{p.ca.toFixed(2)} €</span>
                      </div>
                    </div>
                    <div style={{ height: 4, background: `${C.faint}`, borderRadius: 99 }}>
                      <div style={{ height: "100%", width: `${(p.ca / maxCa) * 100}%`, background: C.amber, borderRadius: 99, transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ventes par catégorie */}
        <div style={{ background: C.card, borderRadius: 20, padding: 28, border: `1px solid ${C.faint}` }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 20 }}>📦 Ventes par catégorie</div>
          {byCategory.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 14, padding: "20px 0" }}>Aucune donnée</div>
          ) : (
            <DonutChart data={byCategory} />
          )}
        </div>
      </div>

      {/* ── METTRE EN AVANT UN PRODUIT ──────────────────────── */}
      <div style={{ background: C.card, borderRadius: 20, padding: 28, border: `1px solid ${C.faint}`, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 6 }}>⭐ Mettre un produit en avant sur la homepage</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>
          Le produit sélectionné sera mis en avant dans la section "Sélection" de la page d'accueil.
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={featuredId}
            onChange={e => setFeaturedId(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: "11px 14px", borderRadius: 10, border: `1px solid ${C.faint}`, background: C.bg2, color: C.warm, fontSize: 14, fontWeight: 600, outline: "none" }}
          >
            <option value="">-- Choisir un produit --</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} {p.featured ? "⭐" : ""}
              </option>
            ))}
          </select>
          <button
            onClick={saveFeatured}
            disabled={!featuredId || savingFeatured}
            style={{ padding: "11px 24px", borderRadius: 10, background: featuredId ? C.amber : C.faint, color: featuredId ? "#000" : C.muted, fontWeight: 900, fontSize: 14, border: "none", cursor: featuredId ? "pointer" : "not-allowed", transition: "all 0.15s" }}
          >
            {savingFeatured ? "Enregistrement..." : "Mettre en avant"}
          </button>
          {featuredOk && <span style={{ fontSize: 13, color: C.green, fontWeight: 700 }}>✅ Sauvegardé !</span>}
        </div>
      </div>

      {/* ── DERNIÈRES COMMANDES ──────────────────────────────── */}
      <div style={{ background: C.card, borderRadius: 20, padding: 28, border: `1px solid ${C.faint}` }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: C.warm, marginBottom: 20 }}>📋 Dernières commandes</div>
        {filtered.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 14, padding: "20px 0" }}>Aucune commande sur cette période</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.faint}` }}>
                  {["Date", "Client", "Montant", "Produits", "Statut"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: C.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 10).map((o, i) => (
                  <tr key={o.id} style={{ borderBottom: i < Math.min(filtered.length, 10) - 1 ? `1px solid ${C.faint}` : "none" }}>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: C.muted }}>
                      {new Date(o.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.warm }}>{o.customer_name ?? "—"}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{o.customer_email}</div>
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 950, fontSize: 16, color: C.amber }}>
                      {Number(o.amount_total).toFixed(2)} €
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: C.muted }}>
                      {Array.isArray(o.items) ? `${o.items.length} article(s)` : "—"}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ padding: "4px 10px", borderRadius: 99, background: "rgba(34,197,94,0.15)", color: C.green, fontSize: 11, fontWeight: 800 }}>
                        {o.status ?? "paid"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}