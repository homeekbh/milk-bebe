"use client";

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
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null);
  const [sectionTitle, setSectionTitle] = useState("Sélection du moment");
  const [selectedIds,  setSelectedIds]  = useState<string[]>([]);
  const [allProducts,  setAllProducts]  = useState<any[]>([]);
  const [filterCat,    setFilterCat]    = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [apiError,     setApiError]     = useState("");

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
        const cfgRes = await fetch("/api/admin/homepage", { credentials: "include" });
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          setSectionTitle(cfg.section_title ?? "Sélection du moment");
          setSelectedIds(Array.isArray(cfg.product_ids) ? cfg.product_ids : []);
        }

        // Catalogue produits — on essaie les deux routes possibles
        let prods: any[] = [];
        const r1 = await fetch("/api/admin/products", { credentials: "include" });
        if (r1.ok) {
          const j = await r1.json();
          prods = Array.isArray(j) ? j : [];
        }
        // Fallback sur /api/produits si la route admin ne répond pas
        if (prods.length === 0) {
          const r2 = await fetch("/api/produits");
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
      const res = await fetch("/api/admin/homepage", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_title: sectionTitle, product_ids: selectedIds }),
      });
      if (res.ok) showToast("Homepage sauvegardée !");
      else showToast("Erreur lors de la sauvegarde", false);
    } catch { showToast("Erreur réseau", false); }
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

  const filtered = allProducts.filter(p => {
    const matchCat    = !filterCat    || p.category_slug === filterCat;
    const matchSearch = !filterSearch || p.name?.toLowerCase().includes(filterSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  const selectedProducts = selectedIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean);

  if (loading) return (
    <div style={{ display: "grid", placeItems: "center", height: 300, color: "rgba(26,20,16,0.4)", fontSize: 14 }}>
      Chargement…
    </div>
  );

  return (
    <div style={S.page}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <h1 style={S.h1}>Homepage</h1>
      <p style={S.sub}>Configure la section produits affichée sur la page d'accueil.</p>

      {apiError && (
        <div style={{ marginBottom: 20, padding: "12px 18px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", fontSize: 13, fontWeight: 600 }}>
          ⚠️ {apiError}
        </div>
      )}

      {/* ── 1. TITRE ── */}
      <div style={S.card}>
        <h2 style={S.cardH}>🏷️ Titre de la section</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 16 }}>
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