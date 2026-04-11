"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  slug: string;
  price_ttc: number;
  promo_price?: number | null;
  stock: number;
  category_slug: string;
  image_url?: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  bodies:      "Bodies",
  pyjamas:     "Pyjamas",
  gigoteuses:  "Gigoteuses",
  accessoires: "Accessoires",
};

const S = {
  badge: (color: string): React.CSSProperties => ({
    display: "inline-block", padding: "3px 10px",
    borderRadius: 99, background: color, fontSize: 11, fontWeight: 800,
  }),
};

export default function AdminProduitsListe() {
  const router = useRouter();
  const [products,  setProducts]  = useState<Product[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [deleting,  setDeleting]  = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res  = await fetch("/api/admin/products");
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer "${name}" définitivement ?`)) return;
    setDeleting(id);
    await fetch("/api/admin/products", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id }),
    });
    await load();
    setDeleting(null);
  }

  const cats = Array.from(new Set(products.map(p => p.category_slug).filter(Boolean)));

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.slug ?? "").includes(q);
    const matchCat    = !catFilter || p.category_slug === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1000 }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 950, letterSpacing: -0.5 }}>📦 Produits</h1>
          <p style={{ margin: "4px 0 0", opacity: 0.5, fontSize: 14 }}>{products.length} produit{products.length !== 1 ? "s" : ""} au total</p>
        </div>
        <button
          style={{ padding: "12px 24px", borderRadius: 12, background: "#1a1410", color: "#f2ede6", fontWeight: 900, fontSize: 14, border: "none", cursor: "pointer" }}
          onClick={() => router.push("/admin/produits/new")}
        >
          + Nouveau produit
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total produits",  value: products.length,                                              color: "#1a1410" },
          { label: "En stock",        value: products.filter(p => (p.stock ?? 0) > 0).length,              color: "#16a34a" },
          { label: "Épuisés",         value: products.filter(p => (p.stock ?? 0) === 0).length,            color: "#b91c1c" },
          { label: "En promo",        value: products.filter(p => p.promo_price).length,                   color: "#f59e0b" },
        ].map(stat => (
          <div key={stat.label} style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)", padding: "18px 22px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: -1, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2, fontWeight: 700 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text" placeholder="🔍 Rechercher par nom ou slug..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", fontSize: 14, fontWeight: 600, background: "#fff", outline: "none" }}
        />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", fontSize: 14, fontWeight: 600, background: "#fff", outline: "none" }}>
          <option value="">Toutes les catégories</option>
          {cats.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.4, fontSize: 15 }}>⏳ Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.4, fontSize: 15 }}>
            {products.length === 0 ? "Aucun produit — clique sur « + Nouveau produit » pour commencer" : "Aucun résultat"}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Photo", "Nom / Slug", "Catégorie", "Prix", "Stock", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", opacity: 0.4, borderBottom: "2px solid rgba(0,0,0,0.07)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>

                  <td style={{ padding: "14px 16px", width: 60 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 10, background: "#f5f0e8", overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)" }}>
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                        : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 20 }}>🧸</div>
                      }
                    </div>
                  </td>

                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 3 }}>{p.name}</div>
                    <div style={{ fontSize: 11, opacity: 0.4, fontFamily: "monospace" }}>{p.slug || "—"}</div>
                  </td>

                  <td style={{ padding: "14px 16px" }}>
                    <span style={S.badge("#f5f0e8")}>{CATEGORY_LABEL[p.category_slug] ?? p.category_slug}</span>
                  </td>

                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 900, fontSize: 15 }}>{Number(p.price_ttc).toFixed(2)} €</div>
                    {p.promo_price && <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 800 }}>Promo : {Number(p.promo_price).toFixed(2)} €</div>}
                  </td>

                  <td style={{ padding: "14px 16px" }}>
                    <span style={S.badge((p.stock ?? 0) === 0 ? "#fee2e2" : (p.stock ?? 0) <= 3 ? "#fef9c3" : "#dcfce7")}>
                      <span style={{ color: (p.stock ?? 0) === 0 ? "#b91c1c" : (p.stock ?? 0) <= 3 ? "#92400e" : "#166534" }}>
                        {p.stock ?? 0} unité{(p.stock ?? 0) !== 1 ? "s" : ""}
                      </span>
                    </span>
                  </td>

                  <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => router.push(`/admin/produits/${p.id}`)}
                        style={{ padding: "7px 14px", borderRadius: 8, background: "#f5f0e8", color: "#1a1410", fontWeight: 800, fontSize: 12, border: "none", cursor: "pointer" }}>
                        ✏️ Modifier
                      </button>
                      <button onClick={() => handleDelete(p.id, p.name)} disabled={deleting === p.id}
                        style={{ padding: "7px 14px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 12, border: "none", cursor: "pointer", opacity: deleting === p.id ? 0.5 : 1 }}>
                        {deleting === p.id ? "..." : "🗑"}
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.35, textAlign: "right" }}>
        {filtered.length} produit{filtered.length !== 1 ? "s" : ""} affiché{filtered.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}