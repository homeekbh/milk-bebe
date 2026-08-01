"use client";

import { useEffect, useMemo, useState } from "react";

// Auth admin : Bearer lu depuis le token Supabase en localStorage (même patron que
// les autres pages admin — cf. comptabilite/page.tsx). L'édition du stock N'EST PAS ici :
// cette page est en LECTURE, seule la reclassification d'une commande écrit (via B3).
function adminFetch(url: string, options: RequestInit = {}) {
  let token = "";
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? "";
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const parsed = JSON.parse(localStorage.getItem(key) ?? "{}");
        token = parsed.access_token ?? "";
        if (token) break;
      }
    }
  } catch {}
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    },
  });
}

type Motif = { id: string | null; name: string; hex: string | null; image_url: string | null; sizes_stock: Record<string, number>; stock: number };
type OrderRow = {
  id: string; created_at: string; customer_name: string | null; customer_email: string | null;
  quantity: number; sizes: string[]; motif_ids: string[]; amount_total: number;
  promo_code: string | null; classification: string; source: string | null; shipping_status: string | null;
};
type ProductRow = {
  id: string; name: string; slug: string; category_slug: string | null; image_url: string | null;
  sizes: string[]; sizes_stock: Record<string, number>; motifs: Motif[]; total: number; orders: OrderRow[];
};

const CLASSES = ["cliente", "vente_directe", "influenceuse", "cadeau"] as const;
const CLASS_META: Record<string, { label: string; bg: string; color: string; border: string }> = {
  cliente:       { label: "Cliente",       bg: "rgba(26,20,16,0.06)",  color: "rgba(26,20,16,0.65)", border: "rgba(26,20,16,0.18)" },
  vente_directe: { label: "Vente directe", bg: "rgba(37,99,235,0.12)",  color: "#2563eb",             border: "rgba(37,99,235,0.35)" },
  influenceuse:  { label: "Influenceuse",  bg: "rgba(196,154,74,0.16)", color: "#a8791f",             border: "rgba(196,154,74,0.4)" },
  cadeau:        { label: "Cadeau",        bg: "rgba(22,163,74,0.12)",  color: "#16a34a",             border: "rgba(22,163,74,0.35)" },
};
const LOW_STOCK = 5;
const STICKY_H  = 72; // hauteur approx. du header admin sticky (offset du scroll sous le header)

const cellColor = (n: number): string => n <= 0 ? "#b91c1c" : n <= LOW_STOCK ? "#a8791f" : "#1a1410";
const fmtEUR = (n: number) => `${(Number(n) || 0).toFixed(2)} €`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });

export default function AdminStockPage() {
  const [products, setProducts]   = useState<ProductRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");
  const [classFilter, setFilter]  = useState<string>("all");
  const [open, setOpen]           = useState<string | null>(null); // un seul produit déplié à la fois
  const [saving, setSaving]       = useState<string | null>(null);

  useEffect(() => {
    adminFetch("/api/admin/stock")
      .then(r => r.json())
      .then(d => {
        if (d?.error) { setError(String(d.error)); setProducts([]); }
        else setProducts(Array.isArray(d?.products) ? d.products : []);
        setLoading(false);
      })
      .catch(() => { setError("Erreur de chargement."); setLoading(false); });
  }, []);

  // Accordéon exclusif : après ouverture, si l'en-tête du produit n'est plus
  // confortablement visible (le bloc précédent, plus haut, vient de se refermer),
  // on scrolle jusqu'à lui, sous le header admin sticky. Sur mobile en particulier.
  useEffect(() => {
    if (!open) return;
    const el = document.getElementById(`stock-prod-${open}`);
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < STICKY_H || top > window.innerHeight - 80) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [open]);

  // Un seul produit déplié : ouvrir referme le précédent ; re-cliquer sur l'ouvert le referme.
  const toggle = (id: string) => setOpen(prev => (prev === id ? null : id));
  const motifNameOf = (p: ProductRow, motifId: string) => p.motifs.find(m => m.id === motifId)?.name ?? motifId.slice(0, 6);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter(p => !q || p.name.toLowerCase().includes(q))
      .filter(p => classFilter === "all" || p.orders.some(o => o.classification === classFilter));
  }, [products, search, classFilter]);

  const ordersOf = (p: ProductRow) => classFilter === "all" ? p.orders : p.orders.filter(o => o.classification === classFilter);

  async function reclassify(orderId: string, next: string) {
    setSaving(orderId);
    try {
      const res = await adminFetch(`/api/admin/orders/${orderId}/classification`, { method: "PATCH", body: JSON.stringify({ classification: next }) });
      const d = await res.json();
      if (d?.ok) {
        setProducts(prev => prev.map(p => ({ ...p, orders: p.orders.map(o => o.id === orderId ? { ...o, classification: next } : o) })));
      } else {
        alert(d?.error ?? "Échec de la reclassification.");
      }
    } catch { alert("Erreur réseau."); }
    finally { setSaving(null); }
  }

  const inp: React.CSSProperties = { padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(26,20,16,0.15)", fontSize: 14, fontWeight: 600, background: "#fff", color: "#1a1410", outline: "none" };
  const th: React.CSSProperties = { padding: "6px 10px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(26,20,16,0.45)", textAlign: "center", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "6px 10px", fontSize: 14, fontWeight: 800, textAlign: "center", whiteSpace: "nowrap" };

  return (
    <div style={{ padding: "36px 40px", maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 36, fontWeight: 950, letterSpacing: -1.5, color: "#1a1410" }}>Stock</h1>
        <div style={{ fontSize: 14, color: "rgba(26,20,16,0.5)", marginTop: 6, fontWeight: 600 }}>
          Vue en lecture · l'édition du stock reste dans la fiche produit. {visible.length} produit(s).
        </div>
      </div>

      {/* Contrôles : recherche + filtre classification */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un produit…" style={{ ...inp, flex: "1 1 240px" }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["all", ...CLASSES].map(c => {
            const active = classFilter === c;
            const meta = c === "all" ? { label: "Toutes", color: "#1a1410", border: "rgba(26,20,16,0.2)", bg: "rgba(26,20,16,0.06)" } : CLASS_META[c];
            return (
              <button key={c} onClick={() => setFilter(c)}
                style={{ padding: "9px 14px", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer",
                  border: `1px solid ${active ? meta.color : meta.border}`,
                  background: active ? meta.color : meta.bg,
                  color: active ? "#fff" : meta.color }}>
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, color: "rgba(26,20,16,0.5)", fontWeight: 700 }}>Chargement…</div>
      ) : error ? (
        <div style={{ padding: 20, borderRadius: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#b91c1c", fontWeight: 700 }}>❌ {error}</div>
      ) : visible.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.1)", padding: 60, textAlign: "center", color: "rgba(26,20,16,0.4)", fontSize: 16 }}>Aucun produit.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {visible.map(p => {
            const isOpen = open === p.id;
            const orders = ordersOf(p);
            const low    = p.total <= LOW_STOCK;
            return (
              <div key={p.id} id={`stock-prod-${p.id}`} style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.1)", overflow: "hidden", scrollMarginTop: STICKY_H + 8 }}>
                {/* En-tête cliquable */}
                <button onClick={() => toggle(p.id)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: "#ede8df", overflow: "hidden", flexShrink: 0 }}>
                    {p.image_url ? <img src={p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#1a1410" }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(26,20,16,0.45)", fontWeight: 600 }}>
                      {p.category_slug ?? "—"} · {p.motifs.length} motif(s) · {p.orders.length} commande(s)
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -1, color: low ? "#b91c1c" : "#1a1410" }}>{p.total}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: low ? "#b91c1c" : "rgba(26,20,16,0.4)" }}>
                      {low ? "⚠ stock bas" : "en stock"}
                    </div>
                  </div>
                  <span style={{ fontSize: 18, color: "rgba(26,20,16,0.35)", flexShrink: 0 }}>{isOpen ? "▾" : "▸"}</span>
                </button>

                {isOpen && (
                  <div style={{ padding: "4px 20px 20px", borderTop: "1px solid rgba(26,20,16,0.08)" }}>
                    {/* Matrice motif × taille */}
                    <div style={{ margin: "16px 0 8px", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#c49a4a" }}>Stock par motif × taille</div>
                    <div style={{ overflowX: "auto" }}>
                      {p.motifs.length > 0 && p.sizes.length > 0 ? (
                        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 320 }}>
                          <thead>
                            <tr>
                              <th style={{ ...th, textAlign: "left" }}>Motif</th>
                              {p.sizes.map(s => <th key={s} style={th}>{s}</th>)}
                              <th style={th}>Σ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.motifs.map(m => (
                              <tr key={m.id ?? m.name} style={{ borderTop: "1px solid rgba(26,20,16,0.06)" }}>
                                <td style={{ ...td, textAlign: "left", fontWeight: 700 }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ width: 14, height: 14, borderRadius: 4, background: m.hex ?? "#ede8df", border: "1px solid rgba(26,20,16,0.15)", flexShrink: 0 }} />
                                    {m.name}
                                  </span>
                                </td>
                                {p.sizes.map(s => { const q = Number(m.sizes_stock?.[s] ?? 0); return <td key={s} style={{ ...td, color: cellColor(q) }}>{q}</td>; })}
                                <td style={{ ...td, color: cellColor(m.stock) }}>{m.stock}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : p.motifs.length > 0 ? (
                        /* Motifs sans axe taille (produit sans taille) */
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          {p.motifs.map(m => (
                            <div key={m.id ?? m.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "#ede8df" }}>
                              <span style={{ width: 14, height: 14, borderRadius: 4, background: m.hex ?? "#fff", border: "1px solid rgba(26,20,16,0.15)" }} />
                              <span style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</span>
                              <span style={{ fontWeight: 900, fontSize: 14, color: cellColor(m.stock) }}>{m.stock}</span>
                            </div>
                          ))}
                        </div>
                      ) : Object.keys(p.sizes_stock).length > 0 ? (
                        /* Aucun motif : repli sur les tailles produit */
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          {Object.entries(p.sizes_stock).map(([s, q]) => (
                            <div key={s} style={{ padding: "8px 12px", borderRadius: 10, background: "#ede8df", fontWeight: 700, fontSize: 14 }}>
                              {s} · <span style={{ fontWeight: 900, color: cellColor(Number(q)) }}>{Number(q)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 14, color: "rgba(26,20,16,0.5)" }}>Stock global : <strong style={{ color: cellColor(p.total) }}>{p.total}</strong></div>
                      )}
                    </div>

                    {/* Commandes contenant ce produit */}
                    <div style={{ margin: "22px 0 8px", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#c49a4a" }}>
                      Commandes ({orders.length})
                    </div>
                    {orders.length === 0 ? (
                      <div style={{ fontSize: 14, color: "rgba(26,20,16,0.4)" }}>Aucune commande{classFilter !== "all" ? " pour ce filtre" : ""}.</div>
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        {orders.map(o => {
                          const meta = CLASS_META[o.classification] ?? CLASS_META.cliente;
                          return (
                            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "12px 14px", borderRadius: 12, background: "#faf8f4", border: "1px solid rgba(26,20,16,0.07)" }}>
                              <div style={{ minWidth: 150, flex: "1 1 150px" }}>
                                <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1410" }}>{o.customer_name ?? "—"}</div>
                                <div style={{ fontSize: 12, color: "rgba(26,20,16,0.5)" }}>{o.customer_email ?? "—"} · {fmtDate(o.created_at)}</div>
                              </div>
                              <div style={{ fontSize: 13, color: "rgba(26,20,16,0.7)", minWidth: 120 }}>
                                × {o.quantity}
                                {o.sizes.length ? ` · ${o.sizes.join(", ")}` : ""}
                                {o.motif_ids.length ? ` · ${o.motif_ids.map(mid => motifNameOf(p, mid)).join(", ")}` : ""}
                              </div>
                              <div style={{ fontSize: 13, color: "rgba(26,20,16,0.7)", minWidth: 110 }}>
                                {fmtEUR(o.amount_total)}
                                {o.promo_code ? ` · ${o.promo_code}` : ""}
                              </div>
                              <div style={{ fontSize: 12, color: "rgba(26,20,16,0.45)", minWidth: 90 }}>
                                {o.source ?? "—"}{o.shipping_status ? ` · ${o.shipping_status}` : ""}
                              </div>
                              {/* Badge = sélecteur de classification (B3) */}
                              <select value={o.classification} disabled={saving === o.id}
                                onChange={e => reclassify(o.id, e.target.value)}
                                style={{ marginLeft: "auto", padding: "7px 10px", borderRadius: 99, fontSize: 12.5, fontWeight: 800, cursor: saving === o.id ? "wait" : "pointer",
                                  background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, outline: "none" }}>
                                {CLASSES.map(c => <option key={c} value={c}>{CLASS_META[c].label}</option>)}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
