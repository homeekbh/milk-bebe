"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string; name: string; slug: string;
  price_ttc: number; promo_price?: number | null;
  stock: number; category_slug: string;
  image_url?: string; published: boolean;
  label?: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  bodies: "Bodies", pyjamas: "Pyjamas",
  gigoteuses: "Gigoteuses", accessoires: "Accessoires",
};

export default function AdminProduitsListe() {
  const router = useRouter();
  const [products,  setProducts]  = useState<Product[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [pubFilter, setPubFilter] = useState("");
  const [deleting,  setDeleting]  = useState<string | null>(null);

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

  const cats = Array.from(new Set(products.map(p => p.category_slug).filter(Boolean)));

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.slug ?? "").includes(q);
    const matchCat    = !catFilter || p.category_slug === catFilter;
    const matchPub    = !pubFilter || (pubFilter === "online" ? p.published !== false : p.published === false);
    return matchSearch && matchCat && matchPub;
  });

  const onlineCount  = products.filter(p => p.published !== false).length;
  const offlineCount = products.filter(p => p.published === false).length;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1000 }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>Produits</h1>
          <p style={{ margin: "4px 0 0", color: "rgba(26,20,16,0.5)", fontSize: 15, fontWeight: 600 }}>
            {products.length} produit{products.length !== 1 ? "s" : ""} ·{" "}
            <span style={{ color: "#16a34a" }}>{onlineCount} en ligne</span>
            {offlineCount > 0 && <> · <span style={{ color: "#9ca3af" }}>{offlineCount} hors ligne</span></>}
          </p>
        </div>
        <button
          style={{ padding: "13px 24px", borderRadius: 12, background: "#1a1410", color: "#c49a4a", fontWeight: 900, fontSize: 15, border: "none", cursor: "pointer" }}
          onClick={() => router.push("/admin/produits/new")}>
          + Nouveau produit
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total",         value: products.length,                                       color: "#1a1410" },
          { label: "En ligne",      value: onlineCount,                                            color: "#16a34a" },
          { label: "Hors ligne",    value: offlineCount,                                           color: "#9ca3af" },
          { label: "En stock",      value: products.filter(p => (p.stock ?? 0) > 0).length,        color: "#166534" },
          { label: "Épuisés",       value: products.filter(p => (p.stock ?? 0) === 0).length,      color: "#b91c1c" },
        ].map(stat => (
          <div key={stat.label} style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)", padding: "16px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: -1, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", marginTop: 4, fontWeight: 700 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input type="text" placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", fontSize: 14, fontWeight: 600, background: "#fff", outline: "none" }} />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", fontSize: 14, fontWeight: 600, background: "#fff", outline: "none" }}>
          <option value="">Toutes les catégories</option>
          {cats.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>)}
        </select>
        <select value={pubFilter} onChange={e => setPubFilter(e.target.value)}
          style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", fontSize: 14, fontWeight: 600, background: "#fff", outline: "none" }}>
          <option value="">Tous les statuts</option>
          <option value="online">En ligne</option>
          <option value="offline">Hors ligne</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.4, fontSize: 16 }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.4, fontSize: 16 }}>
            {products.length === 0 ? "Aucun produit — clique sur « + Nouveau produit »" : "Aucun résultat"}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Statut", "Photo", "Nom", "Catégorie", "Prix", "Stock", "Actions"].map(h => (
                  <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", borderBottom: "2px solid rgba(0,0,0,0.07)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => (
                <tr key={p.id} style={{ borderBottom: idx < filtered.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", opacity: p.published === false ? 0.6 : 1 }}>

                  {/* Voyant statut */}
                  <td style={{ padding: "14px 16px" }}>
                    <button onClick={() => togglePublish(p.id, p.published !== false)}
                      title={p.published !== false ? "Cliquer pour dépublier" : "Cliquer pour publier"}
                      style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 99, transition: "background 0.15s" }}>
                      <div style={{
                        width: 12, height: 12, borderRadius: "50%",
                        background: p.published !== false ? "#16a34a" : "#9ca3af",
                        boxShadow: p.published !== false ? "0 0 8px rgba(22,163,74,0.5)" : "none",
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: p.published !== false ? "#16a34a" : "#9ca3af", whiteSpace: "nowrap" }}>
                        {p.published !== false ? "En ligne" : "Hors ligne"}
                      </span>
                    </button>
                  </td>

                  <td style={{ padding: "14px 16px", width: 56 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 10, background: "#f5f0e8", overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)" }}>
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                        : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 18, opacity: 0.3 }}>📦</div>
                      }
                    </div>
                  </td>

                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1410", marginBottom: 2 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(26,20,16,0.35)", fontFamily: "monospace" }}>{p.slug || "—"}</div>
                  </td>

                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ padding: "4px 10px", borderRadius: 99, background: "#f5f0e8", fontSize: 12, fontWeight: 700, color: "#1a1410" }}>
                      {CATEGORY_LABEL[p.category_slug] ?? p.category_slug}
                    </span>
                  </td>

                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 900, fontSize: 16, color: "#1a1410" }}>{Number(p.price_ttc).toFixed(2)} €</div>
                    {p.promo_price && <div style={{ fontSize: 12, color: "#c49a4a", fontWeight: 800 }}>Promo : {Number(p.promo_price).toFixed(2)} €</div>}
                  </td>

                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ padding: "4px 12px", borderRadius: 99, fontSize: 13, fontWeight: 800,
                      background: (p.stock ?? 0) === 0 ? "#f3f4f6" : (p.stock ?? 0) <= 3 ? "#c49a4a" : "#dcfce7",
                      color:      (p.stock ?? 0) === 0 ? "#6b7280" : (p.stock ?? 0) <= 3 ? "#1a1410" : "#166534",
                    }}>
                      {p.stock ?? 0} unité{(p.stock ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </td>

                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => router.push(`/admin/produits/${p.id}`)}
                        style={{ padding: "8px 14px", borderRadius: 8, background: "#f5f0e8", color: "#1a1410", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer" }}>
                        Modifier
                      </button>
                      <button onClick={() => handleDelete(p.id, p.name)} disabled={deleting === p.id}
                        style={{ padding: "8px 12px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", opacity: deleting === p.id ? 0.5 : 1 }}>
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}