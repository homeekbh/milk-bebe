"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string; name: string; slug: string;
  price_ttc: number; promo_price?: number | null;
  stock: number; category_slug: string;
  image_url?: string; published: boolean;
  label?: string; supplier_ref?: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  bodies: "Bodies", pyjamas: "Pyjamas",
  gigoteuses: "Gigoteuses", accessoires: "Accessoires",
};

// ✅ Extraction du motif depuis le nom "Produit — Motif"
// Fonctionne avec N'IMPORTE QUEL motif, même inédit
function extractMotif(name: string): string | null {
  const parts = name.split(" — ");
  return parts.length > 1 ? parts[parts.length - 1].trim() : null;
}

// Icônes connues — fallback "◆" pour tout nouveau motif
const MOTIF_ICONS: Record<string, string> = {
  "Éclair": "⚡", "Smileys": "☺", "Damier": "✦", "Uni": "▤",
};

function motifIcon(label: string): string {
  return MOTIF_ICONS[label] ?? "◆";
}

export default function AdminProduitsListe() {
  const router = useRouter();
  const [products,    setProducts]    = useState<Product[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [catFilter,   setCatFilter]   = useState("");
  const [motifFilter, setMotifFilter] = useState("");
  const [pubFilter,   setPubFilter]   = useState("");
  const [deleting,    setDeleting]    = useState<string | null>(null);
  const [exporting,   setExporting]   = useState(false);

  async function load() {
    setLoading(true);
    const res  = await fetch("/api/admin/products");
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function togglePublish(id: string, published: boolean) {
    await fetch("/api/admin/products", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, published: !published }),
    });
    await load();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer "${name}" définitivement ?`)) return;
    setDeleting(id);
    await fetch("/api/admin/products", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
    setDeleting(null);
  }

  async function handleExportStock() {
    setExporting(true);
    try {
      const res  = await fetch("/api/admin/export/stock");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `MILK_Stock_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Erreur lors de l'export."); }
    finally  { setExporting(false); }
  }

  // ✅ Motifs extraits dynamiquement — s'adapte à tout nouveau motif créé
  const allMotifs: string[] = Array.from(new Set(
    products
      .map(p => extractMotif(p.name))
      .filter((m): m is string => Boolean(m))
  )).sort();

  const cats = Array.from(new Set(products.map(p => p.category_slug).filter(Boolean)));

  const filtered = products.filter(p => {
    const q           = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.slug ?? "").includes(q);
    const matchCat    = !catFilter   || p.category_slug === catFilter;
    const matchMotif  = !motifFilter || extractMotif(p.name) === motifFilter;
    const matchPub    = !pubFilter   || (pubFilter === "online" ? p.published !== false : p.published === false);
    return matchSearch && matchCat && matchMotif && matchPub;
  });

  const onlineCount  = products.filter(p => p.published !== false).length;
  const offlineCount = products.filter(p => p.published === false).length;
  const totalStock   = products.reduce((s, p) => s + (p.stock ?? 0), 0);
  const totalValue   = products.reduce((s, p) => s + (p.stock ?? 0) * p.price_ttc, 0);

  const statsByCat = Object.entries(CATEGORY_LABEL).map(([slug, label]) => ({
    slug, label,
    count: products.filter(p => p.category_slug === slug).length,
    stock: products.filter(p => p.category_slug === slug).reduce((s, p) => s + (p.stock ?? 0), 0),
  }));

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1120 }}>
      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>

      {/* ── En-tête ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>Produits</h1>
          <p style={{ margin: "4px 0 0", color: "rgba(26,20,16,0.5)", fontSize: 15, fontWeight: 600 }}>
            {products.length} produit{products.length !== 1 ? "s" : ""} ·{" "}
            <span style={{ color: "#16a34a" }}>{onlineCount} en ligne</span>
            {offlineCount > 0 && <> · <span style={{ color: "#9ca3af" }}>{offlineCount} hors ligne</span></>}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={handleExportStock} disabled={exporting}
            style={{ padding: "12px 20px", borderRadius: 12, background: exporting ? "rgba(196,154,74,0.06)" : "rgba(196,154,74,0.12)", border: "1px solid rgba(196,154,74,0.3)", color: exporting ? "rgba(196,154,74,0.4)" : "#c49a4a", fontWeight: 800, fontSize: 14, cursor: exporting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            {exporting ? (
              <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}><circle cx="12" cy="12" r="9" stroke="#c49a4a" strokeWidth="2" strokeOpacity="0.3"/><path d="M12 3a9 9 0 0 1 9 9" stroke="#c49a4a" strokeWidth="2" strokeLinecap="round"/></svg>Export...</>
            ) : (
              <><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3v13M7 12l5 5 5-5M4 20h16" stroke="#c49a4a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Export stock</>
            )}
          </button>
          <button onClick={() => router.push("/admin/produits/new")}
            style={{ padding: "12px 22px", borderRadius: 12, background: "#1a1410", color: "#c49a4a", fontWeight: 900, fontSize: 15, border: "none", cursor: "pointer" }}>
            + Nouveau produit
          </button>
        </div>
      </div>

      {/* ── Stats globales ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total",          value: products.length,  color: "#1a1410" },
          { label: "En ligne",       value: onlineCount,      color: "#16a34a" },
          { label: "Hors ligne",     value: offlineCount,     color: "#9ca3af" },
          { label: "Épuisés",        value: products.filter(p => !p.stock).length, color: "#b91c1c" },
          { label: "Unités totales", value: totalStock,       color: "#1a1410" },
          { label: "Valeur stock",   value: `${Math.round(totalValue).toLocaleString("fr-FR")} €`, color: "#c49a4a" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)", padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: typeof s.value === "string" ? 16 : 24, fontWeight: 950, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "rgba(26,20,16,0.4)", marginTop: 5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Stats par catégorie ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 28 }}>
        {statsByCat.map(s => (
          <button key={s.slug}
            onClick={() => setCatFilter(prev => prev === s.slug ? "" : s.slug)}
            style={{ padding: "14px 16px", borderRadius: 14, border: `1px solid ${catFilter === s.slug ? "rgba(196,154,74,0.4)" : "rgba(0,0,0,0.07)"}`, background: catFilter === s.slug ? "rgba(196,154,74,0.08)" : "#fff", cursor: "pointer", textAlign: "left" }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: "#1a1410" }}>{s.label}</div>
            <div style={{ fontSize: 12, color: "rgba(26,20,16,0.45)", marginTop: 4 }}>
              {s.count} produit{s.count !== 1 ? "s" : ""} · {s.stock} unités
            </div>
          </button>
        ))}
      </div>

      {/* ── Filtres ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 180, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", fontSize: 14, fontWeight: 600, background: "#fff", outline: "none" }} />
        <select value={pubFilter} onChange={e => setPubFilter(e.target.value)}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", fontSize: 13, fontWeight: 600, background: "#fff", outline: "none" }}>
          <option value="">Tous statuts</option>
          <option value="online">En ligne</option>
          <option value="offline">Hors ligne</option>
        </select>
      </div>

      {/* ✅ Filtre motifs dynamique — affiche tous les motifs existants */}
      {allMotifs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.35)", marginBottom: 8 }}>
            Filtrer par motif
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              onClick={() => setMotifFilter("")}
              style={{ padding: "8px 14px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: !motifFilter ? "#1a1410" : "rgba(26,20,16,0.07)", color: !motifFilter ? "#c49a4a" : "rgba(26,20,16,0.6)", transition: "all 0.15s" }}>
              Tous
            </button>
            {allMotifs.map(m => (
              <button key={m}
                onClick={() => setMotifFilter(prev => prev === m ? "" : m)}
                style={{ padding: "8px 14px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: motifFilter === m ? "#1a1410" : "rgba(26,20,16,0.07)", color: motifFilter === m ? "#c49a4a" : "rgba(26,20,16,0.6)", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5 }}>
                {motifIcon(m)} {m}
                <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 600 }}>
                  ({products.filter(p => extractMotif(p.name) === m).length})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(search || catFilter || motifFilter || pubFilter) && (
        <div style={{ fontSize: 13, color: "rgba(26,20,16,0.4)", fontWeight: 600, marginBottom: 12 }}>
          <span style={{ color: "#1a1410", fontWeight: 900 }}>{filtered.length}</span> résultat{filtered.length !== 1 ? "s" : ""}
          <button onClick={() => { setSearch(""); setCatFilter(""); setMotifFilter(""); setPubFilter(""); }}
            style={{ marginLeft: 10, fontSize: 12, color: "#c49a4a", background: "none", border: "none", cursor: "pointer", fontWeight: 700, textDecoration: "underline" }}>
            Effacer les filtres
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.4 }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.4, fontSize: 16 }}>
            {products.length === 0 ? "Aucun produit — clique sur « + Nouveau produit »" : "Aucun résultat"}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9f7f4" }}>
                {["Statut", "Photo", "Nom", "Motif", "Catégorie", "Prix", "Stock", "Actions"].map(h => (
                  <th key={h} style={{ padding: "13px 14px", textAlign: "left", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", borderBottom: "2px solid rgba(0,0,0,0.07)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => {
                const motif = extractMotif(p.name);
                return (
                  <tr key={p.id}
                    style={{ borderBottom: idx < filtered.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", opacity: p.published === false ? 0.65 : 1 }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fafaf9"}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}
                  >
                    {/* Statut */}
                    <td style={{ padding: "13px 14px" }}>
                      <button onClick={() => togglePublish(p.id, p.published !== false)}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 99 }}>
                        <div style={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, background: p.published !== false ? "#16a34a" : "#d1d5db", boxShadow: p.published !== false ? "0 0 6px rgba(22,163,74,0.5)" : "none" }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: p.published !== false ? "#16a34a" : "#9ca3af", whiteSpace: "nowrap" }}>
                          {p.published !== false ? "En ligne" : "Hors ligne"}
                        </span>
                      </button>
                    </td>

                    {/* Photo */}
                    <td style={{ padding: "13px 14px" }}>
                      <div style={{ width: 46, height: 46, borderRadius: 10, background: "#f5f0e8", overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)" }}>
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                          : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 18, opacity: 0.2 }}>📦</div>
                        }
                      </div>
                    </td>

                    {/* Nom */}
                    <td style={{ padding: "13px 14px", maxWidth: 240 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#1a1410", marginBottom: 2, lineHeight: 1.3 }}>{p.name}</div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}>
                        <span style={{ fontSize: 10, color: "rgba(26,20,16,0.3)", fontFamily: "monospace" }}>{p.slug}</span>
                        {p.supplier_ref && (
                          <span style={{ fontSize: 10, fontWeight: 800, color: "#c49a4a", background: "rgba(196,154,74,0.1)", padding: "2px 6px", borderRadius: 99 }}>{p.supplier_ref}</span>
                        )}
                      </div>
                    </td>

                    {/* ✅ Motif — dynamique, fonctionne avec tout nouveau motif */}
                    <td style={{ padding: "13px 14px" }}>
                      {motif ? (
                        <button
                          onClick={() => setMotifFilter(prev => prev === motif ? "" : motif)}
                          style={{ padding: "5px 12px", borderRadius: 99, background: motifFilter === motif ? "#1a1410" : "rgba(26,20,16,0.07)", border: "none", fontSize: 13, fontWeight: 800, color: motifFilter === motif ? "#c49a4a" : "#1a1410", whiteSpace: "nowrap", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
                          {motifIcon(motif)} {motif}
                        </button>
                      ) : (
                        <span style={{ color: "rgba(26,20,16,0.25)", fontSize: 12 }}>—</span>
                      )}
                    </td>

                    {/* Catégorie */}
                    <td style={{ padding: "13px 14px" }}>
                      <span style={{ padding: "4px 10px", borderRadius: 99, background: "#f5f0e8", fontSize: 12, fontWeight: 700, color: "#1a1410", whiteSpace: "nowrap" }}>
                        {CATEGORY_LABEL[p.category_slug] ?? p.category_slug}
                      </span>
                    </td>

                    {/* Prix */}
                    <td style={{ padding: "13px 14px", whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: 900, fontSize: 15, color: "#1a1410" }}>{Number(p.price_ttc).toFixed(2)} €</div>
                      {p.promo_price && <div style={{ fontSize: 11, color: "#c49a4a", fontWeight: 800 }}>Promo {Number(p.promo_price).toFixed(2)} €</div>}
                    </td>

                    {/* Stock */}
                    <td style={{ padding: "13px 14px" }}>
                      <span style={{ padding: "4px 12px", borderRadius: 99, fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", background: !p.stock ? "#f3f4f6" : p.stock <= 5 ? "rgba(196,154,74,0.15)" : "#dcfce7", color: !p.stock ? "#6b7280" : p.stock <= 5 ? "#c49a4a" : "#166534" }}>
                        {p.stock ?? 0} u.
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "13px 14px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => router.push(`/admin/produits/${p.id}`)}
                          style={{ padding: "7px 14px", borderRadius: 8, background: "#f5f0e8", color: "#1a1410", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer" }}>
                          Modifier
                        </button>
                        <button onClick={() => handleDelete(p.id, p.name)} disabled={deleting === p.id}
                          style={{ padding: "7px 11px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 13, border: "none", cursor: deleting === p.id ? "not-allowed" : "pointer", opacity: deleting === p.id ? 0.4 : 1 }}>
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}