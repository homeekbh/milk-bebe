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

  // ── Sortie manuelle (B1/B2) ─────────────────────────────────────────────────
  type MLine = { product_id: string; motif_id: string; size: string; qty: number };
  const [mOpen, setMOpen]     = useState(false);
  const [mClass, setMClass]   = useState<"cadeau" | "influenceuse" | "vente_directe">("cadeau");
  const [mLines, setMLines]   = useState<MLine[]>([{ product_id: "", motif_id: "", size: "", qty: 1 }]);
  const [mCust, setMCust]     = useState({ prenom: "", nom: "", email: "", phone: "", line1: "", line2: "", postal: "", city: "", country: "FR" });
  const [mAmount, setMAmount] = useState("0");
  const [mPromo, setMPromo]   = useState("");
  const [mFreeShip, setMFree] = useState(true);
  const [mNote, setMNote]     = useState("");
  const [mReview, setMReview] = useState(false);
  const [mGiven, setMGiven]   = useState(false);
  const [mPromos, setMPromos] = useState<{ code: string }[]>([]);
  const [mBusy, setMBusy]     = useState(false);
  const [mErr, setMErr]       = useState<string[]>([]);

  const mLbl: React.CSSProperties  = { display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(26,20,16,0.45)", marginBottom: 6 };
  const mInp: React.CSSProperties  = { padding: "9px 11px", borderRadius: 9, border: "1px solid rgba(26,20,16,0.15)", fontSize: 13, background: "#fff", color: "#1a1410", outline: "none", width: "100%", boxSizing: "border-box" };
  const mSec: React.CSSProperties  = { padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(26,20,16,0.2)", background: "#fff", color: "#1a1410", fontWeight: 800, fontSize: 13, cursor: "pointer" };
  const mChk: React.CSSProperties  = { display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#1a1410", cursor: "pointer" };

  const mProd  = (id: string) => products.find(p => p.id === id);
  const mAvail = (l: MLine) => {
    const p = mProd(l.product_id); if (!p) return 0;
    if (l.motif_id) { const m = p.motifs.find(x => x.id === l.motif_id); if (!m) return 0; return l.size ? Number(m.sizes_stock?.[l.size] ?? 0) : m.stock; }
    return l.size ? Number(p.sizes_stock?.[l.size] ?? 0) : p.total;
  };
  const setLine = (i: number, patch: Partial<MLine>) => setMLines(prev => prev.map((l, j) => j === i ? { ...l, ...patch } : l));
  const mAutoAmount = (cls: string) => (cls === "cadeau" || cls === "influenceuse") ? "0" : mAmount;

  // Codes promo ACTIFS pour le menu (à l'ouverture) — GET /api/admin/promos, filtré client (doc. seulement).
  useEffect(() => {
    if (!mOpen || mPromos.length) return;
    adminFetch("/api/admin/promos").then(r => r.json()).then((d: any) => {
      const now = Date.now();
      const list = (Array.isArray(d) ? d : Array.isArray(d?.promos) ? d.promos : []).filter((c: any) =>
        c?.active && (!c.expires_at || new Date(c.expires_at).getTime() > now) && (!c.max_uses || (c.uses_count ?? 0) < c.max_uses));
      setMPromos(list.map((c: any) => ({ code: c.code })));
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mOpen]);

  async function submitManual() {
    setMErr([]);
    const valid = mLines.filter(l => l.product_id && l.qty > 0);
    if (!valid.length) { setMErr(["Ajoute au moins un article."]); return; }
    const over = valid.filter(l => l.qty > mAvail(l));
    if (over.length) { setMErr(over.map(l => { const p = mProd(l.product_id); return `« ${p?.name ?? l.product_id} »${l.size ? ` — ${l.size}` : ""} : demandé ${l.qty}, dispo ${mAvail(l)}`; })); return; }
    const items = valid.map(l => {
      const p = mProd(l.product_id)!;
      const m = l.motif_id ? p.motifs.find(x => x.id === l.motif_id) : null;
      return { product_id: l.product_id, slug: p.slug, category_slug: p.category_slug ?? "", motif_id: l.motif_id || null, size: l.size || null, qty: l.qty, price: 0,
        name: `${p.name}${l.size ? ` — ${l.size}` : ""}${m ? ` — ${m.name}` : ""}` };
    });
    const shipping_address = (mCust.line1 || mCust.city || mCust.postal)
      ? { name: `${mCust.prenom} ${mCust.nom}`.trim(), line1: mCust.line1, line2: mCust.line2, city: mCust.city, postal_code: mCust.postal, country: mCust.country }
      : null;
    setMBusy(true);
    try {
      const res = await adminFetch("/api/admin/stock/manual-order", { method: "POST", body: JSON.stringify({
        classification: mClass, items,
        customer_name: `${mCust.prenom} ${mCust.nom}`.trim(), customer_email: mCust.email, customer_phone: mCust.phone, shipping_address,
        amount_total: Number(mAutoAmount(mClass)) || 0, promo_code: mPromo || null,
        free_shipping: mFreeShip, classification_note: mNote, request_review: mReview, already_delivered: mGiven,
      }) });
      const d = await res.json();
      if (d?.ok) {
        setMOpen(false);
        setMLines([{ product_id: "", motif_id: "", size: "", qty: 1 }]); setMNote(""); setMAmount("0");
        setMCust({ prenom: "", nom: "", email: "", phone: "", line1: "", line2: "", postal: "", city: "", country: "FR" });
        setLoading(true);
        adminFetch("/api/admin/stock").then(r => r.json()).then(dd => { setProducts(Array.isArray(dd?.products) ? dd.products : []); setLoading(false); }).catch(() => setLoading(false));
      } else {
        setMErr(Array.isArray(d?.details) ? d.details : [d?.error ?? "Échec de l'enregistrement."]);
      }
    } catch { setMErr(["Erreur réseau."]); }
    finally { setMBusy(false); }
  }

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
      {/* Carte produit : ligne compacte, identique desktop/mobile, ajustée par media query.
          min-width:0 sur la colonne texte + nowrap/ellipsis = anti-débordement (le titre ne
          peut plus pousser/chevaucher le bloc « stock »). */}
      <style>{`
        .stk-card { display:flex; align-items:center; gap:14px; width:100%; padding:14px 18px; background:none; border:none; cursor:pointer; text-align:left; -webkit-tap-highlight-color:transparent; transition:background 0.12s; }
        .stk-card:hover  { background:rgba(26,20,16,0.025); }
        .stk-card:active { background:rgba(26,20,16,0.06); }
        .stk-thumb { width:48px; height:48px; border-radius:10px; background:#ede8df; overflow:hidden; flex-shrink:0; }
        .stk-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
        .stk-main  { flex:1; min-width:0; }
        .stk-title { font-size:15px; font-weight:900; color:#1a1410; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .stk-meta  { display:flex; align-items:center; gap:8px; min-width:0; margin-top:2px; }
        .stk-pills { flex-shrink:0; display:flex; align-items:center; gap:8px; }
        .stk-pill  { font-size:11px; font-weight:800; white-space:nowrap; letter-spacing:-0.2px; }
        .stk-meta-txt { min-width:0; font-size:12px; font-weight:600; color:rgba(26,20,16,0.45); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .stk-count { flex-shrink:0; text-align:right; line-height:1.1; }
        .stk-count-n { font-size:24px; font-weight:950; letter-spacing:-1px; }
        .stk-count-l { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; margin-top:1px; }
        .stk-chevron { flex-shrink:0; width:22px; text-align:center; font-size:20px; color:rgba(26,20,16,0.4); transition:transform 0.2s; }
        .stk-chevron.open { transform:rotate(90deg); }
        @media (max-width:640px) {
          .stk-card { gap:12px; padding:12px 14px; }
          .stk-count-n { font-size:20px; }
          .stk-count-l:not(.low) { display:none; }
        }
      `}</style>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 950, letterSpacing: -1.5, color: "#1a1410" }}>Stock</h1>
          <div style={{ fontSize: 14, color: "rgba(26,20,16,0.5)", marginTop: 6, fontWeight: 600 }}>
            Vue en lecture · l'édition du stock reste dans la fiche produit. {visible.length} produit(s).
          </div>
        </div>
        <button onClick={() => setMOpen(true)}
          style={{ padding: "12px 20px", borderRadius: 12, background: "#1a1410", color: "#c49a4a", fontWeight: 900, fontSize: 14, border: "none", cursor: "pointer", flexShrink: 0 }}>
          + Enregistrer une sortie manuelle
        </button>
      </div>

      {/* Contrôles : recherche, puis filtre classification avec son titre explicatif */}
      <div style={{ marginBottom: 20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un produit…" style={{ ...inp, display: "block", width: "100%", maxWidth: 360, marginBottom: 16 }} />
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#c49a4a", marginBottom: 8 }}>Filtrer les commandes par type</div>
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
            // Pastilles : résumé des classifications NON-'cliente' des commandes de ce produit
            // (« ● N » coloré, sans libellé). 'cliente' est omis — redondant avec « N commande(s) ».
            // Conteneur non rétrécissable placé AVANT le texte tronqué → jamais avalé par l'ellipse.
            const classCounts = p.orders.reduce((a, o) => { a[o.classification] = (a[o.classification] ?? 0) + 1; return a; }, {} as Record<string, number>);
            const allPills = (["vente_directe", "influenceuse", "cadeau"] as const).filter(c => (classCounts[c] ?? 0) > 0).map(c => ({ c, n: classCounts[c] }));
            // Filtre actif → on ne montre que la pastille de cette classe, mise en avant (chip bordé).
            // ('cliente' n'a pas de pastille → un filtre 'cliente' n'en affiche aucune, cohérent.)
            const emphasized = classFilter !== "all";
            const pills = emphasized ? allPills.filter(x => x.c === classFilter) : allPills;
            return (
              <div key={p.id} id={`stock-prod-${p.id}`} style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.1)", overflow: "hidden", scrollMarginTop: STICKY_H + 8 }}>
                {/* En-tête cliquable — carte compacte en ligne (mobile + desktop via classes). */}
                <button onClick={() => toggle(p.id)} className="stk-card">
                  <div className="stk-thumb">
                    {p.image_url ? <img src={p.image_url} alt="" /> : null}
                  </div>
                  <div className="stk-main">
                    <div className="stk-title">{p.name}</div>
                    <div className="stk-meta">
                      {pills.length > 0 && (
                        <span className="stk-pills">
                          {pills.map(({ c, n }) => (
                            <span key={c} className="stk-pill" title={CLASS_META[c].label}
                              style={{ color: CLASS_META[c].color, ...(emphasized ? { background: CLASS_META[c].bg, border: `1px solid ${CLASS_META[c].border}`, borderRadius: 99, padding: "2px 9px" } : {}) }}>● {n}</span>
                          ))}
                        </span>
                      )}
                      <span className="stk-meta-txt">{p.category_slug ?? "—"} · {p.motifs.length} motif(s) · {p.orders.length} commande(s)</span>
                    </div>
                  </div>
                  <div className="stk-count">
                    <div className="stk-count-n" style={{ color: low ? "#b91c1c" : "#1a1410" }}>{p.total}</div>
                    <div className={`stk-count-l${low ? " low" : ""}`} style={{ color: low ? "#b91c1c" : "rgba(26,20,16,0.4)" }}>{low ? "⚠ bas" : "en stock"}</div>
                  </div>
                  <span className={`stk-chevron${isOpen ? " open" : ""}`} aria-hidden>▸</span>
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

      {/* ── Modale : enregistrer une sortie manuelle (B2) ── */}
      {mOpen && (
        <div onClick={() => !mBusy && setMOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "grid", placeItems: "start center", padding: "32px 16px", overflowY: "auto" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 660, padding: "26px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 950, color: "#1a1410" }}>Sortie manuelle de stock</h2>
              <button onClick={() => !mBusy && setMOpen(false)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "rgba(26,20,16,0.4)", lineHeight: 1 }}>×</button>
            </div>

            {/* Type */}
            <label style={mLbl}>Type de sortie</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {(["cadeau", "influenceuse", "vente_directe"] as const).map(c => (
                <button key={c} onClick={() => setMClass(c)}
                  style={{ padding: "8px 14px", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer",
                    border: `1px solid ${mClass === c ? CLASS_META[c].color : CLASS_META[c].border}`, background: mClass === c ? CLASS_META[c].bg : "#fff", color: CLASS_META[c].color }}>
                  {CLASS_META[c].label}
                </button>
              ))}
            </div>

            {/* Articles */}
            <label style={mLbl}>Articles (le stock disponible est indiqué ; le serveur refuse toute sortie sous zéro)</label>
            <div style={{ display: "grid", gap: 8, marginBottom: 8 }}>
              {mLines.map((l, i) => {
                const p = mProd(l.product_id);
                const sizes = p ? p.sizes : [];
                const avail = mAvail(l);
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto auto 62px auto", gap: 6, alignItems: "center" }}>
                    <select value={l.product_id} onChange={e => setLine(i, { product_id: e.target.value, motif_id: "", size: "" })} style={mInp}>
                      <option value="">— produit —</option>
                      {products.map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                    </select>
                    <select value={l.motif_id} onChange={e => setLine(i, { motif_id: e.target.value })} disabled={!p || !p.motifs.length} style={{ ...mInp, width: "auto", opacity: (!p || !p.motifs.length) ? 0.5 : 1 }}>
                      <option value="">{p && p.motifs.length ? "— motif —" : "—"}</option>
                      {(p?.motifs ?? []).map(m => <option key={m.id ?? m.name} value={m.id ?? ""}>{m.name}</option>)}
                    </select>
                    <select value={l.size} onChange={e => setLine(i, { size: e.target.value })} disabled={!sizes.length} style={{ ...mInp, width: "auto", opacity: sizes.length ? 1 : 0.5 }}>
                      <option value="">{sizes.length ? "— taille —" : "—"}</option>
                      {sizes.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input type="number" min={1} value={l.qty} onChange={e => setLine(i, { qty: Math.max(1, Number(e.target.value) || 1) })} style={mInp} />
                    <span style={{ fontSize: 12, fontWeight: 700, textAlign: "right", minWidth: 58, color: !l.product_id ? "transparent" : (l.qty > avail ? "#b91c1c" : "rgba(26,20,16,0.5)") }}>dispo {l.product_id ? avail : ""}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <button onClick={() => setMLines(prev => [...prev, { product_id: "", motif_id: "", size: "", qty: 1 }])} style={mSec}>+ ligne</button>
              {mLines.length > 1 && <button onClick={() => setMLines(prev => prev.slice(0, -1))} style={mSec}>− ligne</button>}
            </div>

            {/* Coordonnées */}
            <label style={mLbl}>Coordonnées (optionnel)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <input placeholder="Prénom" value={mCust.prenom} onChange={e => setMCust(v => ({ ...v, prenom: e.target.value }))} style={mInp} />
              <input placeholder="Nom" value={mCust.nom} onChange={e => setMCust(v => ({ ...v, nom: e.target.value }))} style={mInp} />
              <input placeholder="Email" value={mCust.email} onChange={e => setMCust(v => ({ ...v, email: e.target.value }))} style={mInp} />
              <input placeholder="Téléphone" value={mCust.phone} onChange={e => setMCust(v => ({ ...v, phone: e.target.value }))} style={mInp} />
              <input placeholder="Adresse" value={mCust.line1} onChange={e => setMCust(v => ({ ...v, line1: e.target.value }))} style={{ ...mInp, gridColumn: "1 / -1" }} />
              <input placeholder="Code postal" value={mCust.postal} onChange={e => setMCust(v => ({ ...v, postal: e.target.value }))} style={mInp} />
              <input placeholder="Ville" value={mCust.city} onChange={e => setMCust(v => ({ ...v, city: e.target.value }))} style={mInp} />
            </div>

            {/* Montant + promo */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12, alignItems: "end" }}>
              <div>
                <label style={mLbl}>Montant (€)</label>
                <input type="number" min={0} step="0.01" value={mAutoAmount(mClass)} disabled={mClass === "cadeau" || mClass === "influenceuse"}
                  onChange={e => setMAmount(e.target.value)} style={{ ...mInp, opacity: (mClass === "cadeau" || mClass === "influenceuse") ? 0.6 : 1 }} />
              </div>
              <div>
                <label style={mLbl}>Code promo (documentaire)</label>
                <select value={mPromo} onChange={e => setMPromo(e.target.value)} style={mInp}>
                  <option value="">— aucun —</option>
                  {mPromos.map(pc => <option key={pc.code} value={pc.code}>{pc.code}</option>)}
                </select>
              </div>
            </div>

            {/* Note */}
            <label style={mLbl}>Note (optionnel)</label>
            <input placeholder="ex. collab @machin, code 100%" value={mNote} onChange={e => setMNote(e.target.value)} style={{ ...mInp, marginBottom: 14 }} />

            {/* Cases */}
            <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
              <label style={mChk}><input type="checkbox" checked={mFreeShip} onChange={e => setMFree(e.target.checked)} /> Livraison offerte</label>
              <label style={mChk}><input type="checkbox" checked={mReview} onChange={e => setMReview(e.target.checked)} /> Demander un avis <span style={{ color: "rgba(26,20,16,0.45)", fontWeight: 500 }}>(sinon les emails avis / taille suivante sont neutralisés)</span></label>
              <label style={mChk}><input type="checkbox" checked={mGiven} onChange={e => setMGiven(e.target.checked)} /> Article déjà remis en main propre <span style={{ color: "rgba(26,20,16,0.45)", fontWeight: 500 }}>(marque « livrée »)</span></label>
            </div>

            {mErr.length > 0 && (
              <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#b91c1c", fontSize: 13, fontWeight: 700, lineHeight: 1.6 }}>
                {mErr.map((e, i) => <div key={i}>❌ {e}</div>)}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => !mBusy && setMOpen(false)} style={mSec}>Annuler</button>
              <button onClick={submitManual} disabled={mBusy}
                style={{ padding: "12px 24px", borderRadius: 12, background: mBusy ? "#d1cdc8" : "#1a1410", color: "#c49a4a", fontWeight: 900, fontSize: 15, border: "none", cursor: mBusy ? "wait" : "pointer" }}>
                {mBusy ? "Enregistrement…" : "Enregistrer la sortie"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
