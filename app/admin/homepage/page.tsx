"use client";
import { useIsNarrow } from "@/lib/useIsNarrow";

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

import { useEffect, useState, useCallback } from "react";

const SECTION_TITLES = [
  "Sélection du moment",
  "Nos coups de cœur",
  "Top ventes",
  "Nouveautés",
  "Essentiels du moment",
  "Les incontournables",
  "Notre sélection bambou",
];

const CATS = [
  { value: "",            label: "Toutes catégories" },
  { value: "bodies",      label: "Bodies" },
  { value: "pyjamas",     label: "Pyjamas" },
  { value: "gigoteuses",  label: "Gigoteuses" },
  { value: "accessoires", label: "Accessoires" },
];

// Texte de remise pour le dropdown / la card sticker. Schéma réel :
// discount_type = "percent" | "fixed" | "free_shipping".
function discountText(p: any): string {
  if (!p) return "";
  if (p.discount_type === "free_shipping") return "Livraison offerte";
  if (p.discount_type === "percent")       return `${p.discount_value}% off`;
  return `${p.discount_value}€ off`;
}

const S = {
  page:   { padding: "32px 32px 64px", maxWidth: 1100 } as React.CSSProperties,
  h1:     { margin: "0 0 4px", fontSize: 32, fontWeight: 950, letterSpacing: -1, color: "#1a1410" } as React.CSSProperties,
  sub:    { fontSize: 14, color: "rgba(26,20,16,0.45)", marginBottom: 32 } as React.CSSProperties,
  card:   { background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.08)", padding: 24, marginBottom: 24 } as React.CSSProperties,
  cardH:  { margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#1a1410" } as React.CSSProperties,
  label:  { fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "rgba(26,20,16,0.4)", marginBottom: 6, display: "block" },
  select: { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(26,20,16,0.12)", fontSize: 14, fontWeight: 600, color: "#1a1410", background: "#faf8f4", outline: "none", cursor: "pointer" } as React.CSSProperties,
  input:  { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(26,20,16,0.12)", fontSize: 14, color: "#1a1410", background: "#faf8f4", outline: "none", boxSizing: "border-box" as const },
  btnSave:{ padding: "12px 28px", borderRadius: 12, background: "#c49a4a", color: "#1a1410", fontWeight: 900, fontSize: 14, border: "none", cursor: "pointer" } as React.CSSProperties,
};

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, background: ok ? "#1a1410" : "#dc2626", color: "#fff", padding: "12px 22px", borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
      {ok ? "✓ " : "✕ "}{msg}
    </div>
  );
}

export default function AdminHomePage() {
  const narrow = useIsNarrow();
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null);
  const [sectionTitle, setSectionTitle] = useState("Sélection du moment");
  const [selectedIds,  setSelectedIds]  = useState<string[]>([]);
  const [allProducts,  setAllProducts]  = useState<any[]>([]);
  const [filterCat,    setFilterCat]    = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [apiError,     setApiError]     = useState("");

  // ── Sticker promo ──
  const [promos,         setPromos]         = useState<any[]>([]);
  const [featured,       setFeatured]       = useState<any | null>(null); // vue publique (/api/promo/featured, cache ~60s)
  const [stickerPromoId, setStickerPromoId] = useState("");
  const [stickerLabel,   setStickerLabel]   = useState("");
  const [stickerBusy,    setStickerBusy]    = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      setApiError("");
      try {
        // Config homepage
        const cfgRes = await adminFetch("/api/admin/homepage");
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          setSectionTitle(cfg.section_title ?? "Sélection du moment");
          setSelectedIds(Array.isArray(cfg.product_ids) ? cfg.product_ids : []);
        }

        // Catalogue produits — on essaie les deux routes possibles
        let prods: any[] = [];
        const r1 = await adminFetch("/api/admin/products");
        if (r1.ok) {
          const j = await r1.json();
          prods = Array.isArray(j) ? j : [];
        }
        // Fallback sur /api/produits si la route admin ne répond pas
        if (prods.length === 0) {
          const r2 = await adminFetch("/api/produits");
          if (r2.ok) {
            const j = await r2.json();
            prods = Array.isArray(j) ? j : [];
          }
        }

        if (prods.length === 0) {
          setApiError("Aucun produit chargé. Vérifie que tu es bien connecté en admin.");
        }
        setAllProducts(prods);
      } catch (e: any) {
        setApiError("Erreur réseau : " + e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/homepage", {
        method: "POST",
        body: JSON.stringify({ section_title: sectionTitle, product_ids: selectedIds }),
      });
      if (res.ok) {
        showToast("Homepage sauvegardée !");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast("Erreur " + res.status + " : " + (err.error ?? "inconnue"), false);
      }
    } catch (e: any) { showToast("Erreur réseau : " + e.message, false); }
    finally { setSaving(false); }
  };

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setSelectedIds(prev => { const n = [...prev]; [n[idx-1], n[idx]] = [n[idx], n[idx-1]]; return n; });
  };
  const moveDown = (idx: number) => {
    setSelectedIds(prev => {
      if (idx >= prev.length - 1) return prev;
      const n = [...prev]; [n[idx], n[idx+1]] = [n[idx+1], n[idx]]; return n;
    });
  };
  const remove = (id: string) => setSelectedIds(prev => prev.filter(x => x !== id));

  // ── Sticker promo : chargement (liste des codes + code publié) ──
  const loadSticker = useCallback(async () => {
    try {
      const [pRes, fRes] = await Promise.all([
        adminFetch("/api/admin/promos"),
        adminFetch("/api/promo/featured"),
      ]);
      const list = pRes.ok ? await pRes.json() : [];
      const feat = fRes.ok ? (await fRes.json())?.promo : null;
      setPromos(Array.isArray(list) ? list : []);
      setFeatured(feat ?? null);
    } catch { /* silencieux */ }
  }, []);

  useEffect(() => { loadSticker(); }, [loadSticker]);

  const publishSticker = async () => {
    if (!stickerPromoId) return;
    setStickerBusy(true);
    try {
      // 1. MAJ du label si saisi — route PUT existante (/api/admin/promos {id,...})
      if (stickerLabel.trim()) {
        await adminFetch("/api/admin/promos", {
          method: "PUT",
          body:   JSON.stringify({ id: stickerPromoId, label: stickerLabel.trim() }),
        });
      }
      // 2. Publier (un seul featured à la fois — géré côté API + index unique DB)
      const res = await adminFetch("/api/admin/promos/feature", {
        method: "POST",
        body:   JSON.stringify({ promo_id: stickerPromoId, action: "publish" }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        showToast("Erreur : " + (e.error ?? res.status), false);
      } else {
        showToast("Sticker publié !");
        setStickerPromoId(""); setStickerLabel("");
      }
      await loadSticker();
    } catch (e: any) { showToast("Erreur réseau : " + e.message, false); }
    finally { setStickerBusy(false); }
  };

  const unpublishSticker = async (promoId: string) => {
    setStickerBusy(true);
    try {
      const res = await adminFetch("/api/admin/promos/feature", {
        method: "POST",
        body:   JSON.stringify({ promo_id: promoId, action: "unpublish" }),
      });
      if (!res.ok) showToast("Erreur dépublication", false);
      else showToast("Sticker dépublié");
      await loadSticker();
    } catch (e: any) { showToast("Erreur réseau : " + e.message, false); }
    finally { setStickerBusy(false); }
  };

  const filtered = allProducts.filter(p => {
    const matchCat    = !filterCat    || p.category_slug === filterCat;
    const matchSearch = !filterSearch || p.name?.toLowerCase().includes(filterSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  const selectedProducts = selectedIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean);

  // Source de vérité du code publié = la liste admin (fraîche, non cachée,
  // contient id + is_featured). `featured` (API publique) sert juste à afficher
  // ce que voient réellement les visiteurs (cache ~60s).
  const publishedPromo = promos.find((p: any) => p.is_featured) ?? null;
  const activePromos   = promos.filter((p: any) => p.active);

  if (loading) return (
    <div style={{ display: "grid", placeItems: "center", height: 300, color: "rgba(26,20,16,0.4)", fontSize: 14 }}>
      Chargement…
    </div>
  );

  return (
    <div style={S.page}>
      <style>{`@keyframes milk-blink-adm { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <h1 style={S.h1}>Homepage</h1>
      <p style={S.sub}>Configure la section produits affichée sur la page d'accueil.</p>

      {apiError && (
        <div style={{ marginBottom: 20, padding: "12px 18px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", fontSize: 13, fontWeight: 600 }}>
          ⚠️ {apiError}
        </div>
      )}

      {/* ── STICKER PROMO ── */}
      <div style={S.card}>
        <h2 style={S.cardH}>📣 Sticker promo homepage</h2>
        <p style={{ fontSize: 13, color: "rgba(26,20,16,0.45)", margin: "0 0 16px" }}>
          Affiche un sticker rouge clignotant en bas à droite du site.
        </p>

        {publishedPromo ? (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fca5a5" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 900, color: "#dc2626", letterSpacing: 0.5 }}>
              <span style={{ animation: "milk-blink-adm 1s step-start infinite" }}>●</span> EN LIGNE
            </span>
            <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 15, color: "#1a1410", background: "#fff", padding: "4px 10px", borderRadius: 8 }}>{publishedPromo.code}</span>
            {publishedPromo.label && <span style={{ fontSize: 13, color: "rgba(26,20,16,0.7)" }}>{publishedPromo.label}</span>}
            <span style={{ fontWeight: 900, fontSize: 14, color: "#16a34a" }}>{discountText(publishedPromo)}</span>
            <button
              onClick={() => unpublishSticker(publishedPromo.id)}
              disabled={stickerBusy}
              style={{ marginLeft: "auto", padding: "10px 18px", borderRadius: 10, background: "#6b7280", color: "#fff", fontWeight: 800, fontSize: 13, border: "none", cursor: stickerBusy ? "default" : "pointer", opacity: stickerBusy ? 0.6 : 1 }}
            >
              Dépublier
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={S.label}>Code à publier</label>
              <select
                value={stickerPromoId}
                onChange={e => {
                  const id = e.target.value;
                  setStickerPromoId(id);
                  const p = promos.find((x: any) => x.id === id);
                  setStickerLabel(p?.label ?? "");
                }}
                style={S.select}
              >
                <option value="">— Sélectionner un code —</option>
                {activePromos.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.code} — {discountText(p)}</option>
                ))}
              </select>
              {activePromos.length === 0 && (
                <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", marginTop: 6 }}>
                  Aucun code actif — crée-en un dans « Codes promos ».
                </div>
              )}
            </div>
            <div>
              <label style={S.label}>Titre affiché</label>
              <input
                type="text"
                value={stickerLabel}
                onChange={e => setStickerLabel(e.target.value)}
                placeholder="ex : Soldes été — profitez-en !"
                style={S.input}
              />
            </div>
            <div>
              <button
                onClick={publishSticker}
                disabled={!stickerPromoId || stickerBusy}
                style={{ ...S.btnSave, opacity: (!stickerPromoId || stickerBusy) ? 0.5 : 1, cursor: (!stickerPromoId || stickerBusy) ? "not-allowed" : "pointer" }}
              >
                {stickerBusy ? "Publication…" : "📢 Publier le sticker"}
              </button>
            </div>
          </div>
        )}

        {/* État réel côté site (API publique mise en cache ~60s) */}
        <div style={{ marginTop: 12, fontSize: 12, color: "rgba(26,20,16,0.4)" }}>
          Côté site : {featured ? `« ${featured.code} » affiché` : "aucun sticker visible"} <span style={{ opacity: 0.7 }}>(cache ~60s)</span>
        </div>
      </div>

      {/* ── 1. TITRE ── */}
      <div style={S.card}>
        <h2 style={S.cardH}>🏷️ Titre de la section</h2>
        <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 16 }}>
          <div>
            <label style={S.label}>Choisir un titre</label>
            <select
              value={SECTION_TITLES.includes(sectionTitle) ? sectionTitle : ""}
              onChange={e => { if (e.target.value) setSectionTitle(e.target.value); }}
              style={S.select}
            >
              <option value="">— Sélectionner —</option>
              {SECTION_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Ou personnaliser</label>
            <input
              type="text"
              value={sectionTitle}
              onChange={e => setSectionTitle(e.target.value)}
              placeholder="Titre personnalisé..."
              style={S.input}
              maxLength={60}
            />
          </div>
        </div>
        <div style={{ marginTop: 14, padding: "12px 18px", borderRadius: 10, background: "#f5f0e8", border: "1px solid rgba(196,154,74,0.2)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,20,16,0.4)", marginBottom: 4 }}>APERÇU</div>
          <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>{sectionTitle || "—"}</div>
        </div>
      </div>

      {/* ── 2. PRODUITS SÉLECTIONNÉS ── */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ ...S.cardH, margin: 0 }}>
            ✦ Produits sélectionnés
            <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 700, color: selectedIds.length > 0 ? "#c49a4a" : "rgba(26,20,16,0.3)" }}>
              {selectedIds.length} produit{selectedIds.length !== 1 ? "s" : ""}
            </span>
          </h2>
        </div>

        {selectedProducts.length === 0 ? (
          <div style={{ padding: "28px 0", textAlign: "center", color: "rgba(26,20,16,0.3)", fontSize: 14 }}>
            Aucun produit sélectionné — choisis des produits dans le catalogue ci-dessous
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {selectedProducts.map((p: any, idx) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: "#faf8f4", border: "1px solid rgba(26,20,16,0.08)" }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#c49a4a", minWidth: 20, textAlign: "center" }}>{idx + 1}</div>
                {/* Image avec img classique pour éviter les restrictions Next.js */}
                <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", background: "#ede8df", flexShrink: 0 }}>
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 9, color: "rgba(26,20,16,0.2)", fontWeight: 900 }}>M!LK</div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#1a1410", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)" }}>{p.category_slug} · {Number(p.price_ttc).toFixed(2)} €{p.stock <= 0 ? " · ⚠️ rupture" : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => moveUp(idx)} disabled={idx === 0}
                    style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(26,20,16,0.12)", background: "transparent", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.3 : 1, fontSize: 12 }}>↑</button>
                  <button onClick={() => moveDown(idx)} disabled={idx === selectedIds.length - 1}
                    style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(26,20,16,0.12)", background: "transparent", cursor: idx === selectedIds.length - 1 ? "default" : "pointer", opacity: idx === selectedIds.length - 1 ? 0.3 : 1, fontSize: 12 }}>↓</button>
                  <button onClick={() => remove(p.id)}
                    style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.05)", cursor: "pointer", color: "#dc2626", fontSize: 14, fontWeight: 900 }}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 3. CATALOGUE ── */}
      <div style={S.card}>
        <h2 style={S.cardH}>
          📦 Catalogue
          <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 600, color: "rgba(26,20,16,0.4)" }}>
            {allProducts.length} produit{allProducts.length !== 1 ? "s" : ""} chargé{allProducts.length !== 1 ? "s" : ""}
          </span>
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 2fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={S.label}>Catégorie</label>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={S.select}>
              {CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Rechercher</label>
            <input
              type="text"
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              placeholder="Nom du produit..."
              style={S.input}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
          {filtered.map((p: any) => {
            const isSelected = selectedIds.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                style={{
                  borderRadius: 12,
                  border: isSelected ? "2.5px solid #c49a4a" : "1px solid rgba(26,20,16,0.1)",
                  background: isSelected ? "rgba(196,154,74,0.08)" : "#faf8f4",
                  cursor: "pointer",
                  padding: 0,
                  overflow: "hidden",
                  transition: "all 0.15s",
                  position: "relative",
                  textAlign: "left",
                }}
              >
                {isSelected && (
                  <div style={{ position: "absolute", top: 6, right: 6, zIndex: 2, width: 22, height: 22, borderRadius: 99, background: "#c49a4a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#1a1410", fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>
                  </div>
                )}
                {p.stock <= 0 && (
                  <div style={{ position: "absolute", top: 6, left: 6, zIndex: 2, padding: "2px 7px", borderRadius: 99, background: "rgba(220,38,38,0.85)", color: "#fff", fontSize: 9, fontWeight: 800 }}>
                    RUPTURE
                  </div>
                )}
                {/* img classique — pas de restriction domaine */}
                <div style={{ width: "100%", aspectRatio: "1/1", background: "#ede8df", overflow: "hidden" }}>
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 900, color: "rgba(26,20,16,0.2)" }}>M!LK</div>
                  }
                </div>
                <div style={{ padding: "8px 10px 10px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#1a1410", lineHeight: 1.3, marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(26,20,16,0.45)" }}>{Number(p.price_ttc).toFixed(2)} €</div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && allProducts.length > 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "28px 0", color: "rgba(26,20,16,0.3)", fontSize: 14 }}>
              Aucun produit ne correspond à ta recherche
            </div>
          )}
          {allProducts.length === 0 && !apiError && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "28px 0", color: "rgba(26,20,16,0.3)", fontSize: 14 }}>
              Aucun produit trouvé
            </div>
          )}
        </div>
      </div>

      {/* ── SAVE ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "rgba(26,20,16,0.4)" }}>
          {selectedIds.length} produit{selectedIds.length !== 1 ? "s" : ""} · "{sectionTitle}"
        </span>
        <button onClick={save} disabled={saving} style={{ ...S.btnSave, opacity: saving ? 0.6 : 1 }}>
          {saving ? "Sauvegarde…" : "Sauvegarder →"}
        </button>
      </div>
    </div>
  );
}