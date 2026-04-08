import { supabaseServer } from "@/lib/server/supabase";

type Product = {
  id: string;
  name: string;
  slug: string;
  price_ttc: number;
  promo_price?: number;
  stock: number;
  category_slug?: string;
  created_at: string;
};

async function getStats() {
  const { data: products, error } = await supabaseServer
    .from("products")
    .select("*")
    .order("stock", { ascending: true });

  if (error || !products) {
    return { products: [], totalProducts: 0, stockValue: 0, lowStock: 0, outOfStock: 0, alerts: [] };
  }

  const totalProducts = products.length;
  const stockValue = products.reduce((sum, p) => sum + (p.stock ?? 0) * (p.price_ttc ?? 0), 0);
  const lowStock = products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5).length;
  const outOfStock = products.filter((p) => (p.stock ?? 0) <= 0).length;
  const alerts = products.filter((p) => (p.stock ?? 0) <= 10).slice(0, 8);

  return { products, totalProducts, stockValue, lowStock, outOfStock, alerts };
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      background: accent ? "#111" : "#fff",
      color: accent ? "#fff" : "#111",
      borderRadius: 16,
      padding: "24px 28px",
      border: accent ? "none" : "1px solid rgba(0,0,0,0.07)",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", opacity: accent ? 0.55 : 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 950, letterSpacing: -1, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 13, opacity: 0.6, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0)
    return <span style={{ padding: "4px 10px", borderRadius: 99, background: "#fee2e2", color: "#b91c1c", fontSize: 12, fontWeight: 800 }}>Épuisé</span>;
  if (stock <= 5)
    return <span style={{ padding: "4px 10px", borderRadius: 99, background: "#fef3c7", color: "#92400e", fontSize: 12, fontWeight: 800 }}>Faible · {stock}</span>;
  return <span style={{ padding: "4px 10px", borderRadius: 99, background: "#dcfce7", color: "#166534", fontSize: 12, fontWeight: 800 }}>En stock · {stock}</span>;
}

export default async function AdminDashboard() {
  const { products, totalProducts, stockValue, lowStock, outOfStock, alerts } = await getStats();

  const dateStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div style={{ padding: "36px 40px", maxWidth: 1100 }}>

      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950, letterSpacing: -1 }}>Dashboard</h1>
          <div style={{ fontSize: 14, opacity: 0.5, marginTop: 6, textTransform: "capitalize" }}>{dateStr}</div>
        </div>
        <a href="/admin/produits" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 12, background: "#111", color: "#fff", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
          + Nouveau produit
        </a>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 36 }}>
        <KpiCard label="Produits actifs" value={String(totalProducts)} sub="Dans le catalogue" accent />
        <KpiCard label="Valeur du stock" value={`${stockValue.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`} sub="Prix TTC × unités" />
        <KpiCard label="Stock faible" value={String(lowStock)} sub="5 unités ou moins" />
        <KpiCard label="Ruptures" value={String(outOfStock)} sub="Stock = 0" />
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: -0.5 }}>Alertes stock</h2>
            <a href="/admin/alerts" style={{ fontSize: 13, fontWeight: 700, opacity: 0.5, textDecoration: "none", color: "#111" }}>Voir tout →</a>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#fafaf9" }}>
                  {["Produit", "Catégorie", "Prix TTC", "Statut stock", ""].map((h) => (
                    <th key={h} style={{ padding: "12px 20px", textAlign: h === "" ? "right" : "left", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.45 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alerts.map((p: Product, i: number) => (
                  <tr key={p.id} style={{ borderBottom: i < alerts.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{p.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.45, marginTop: 2 }}>/{p.slug}</div>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 99, background: "rgba(0,0,0,0.05)", color: "#333" }}>
                        {p.category_slug ?? "—"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px", fontWeight: 900 }}>{p.price_ttc?.toFixed(2)} €</td>
                    <td style={{ padding: "14px 20px" }}><StockBadge stock={p.stock ?? 0} /></td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <a href={`/admin/produits/${p.id}`} style={{ fontSize: 13, fontWeight: 700, color: "#111", textDecoration: "none", padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", display: "inline-block" }}>Modifier</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Catalogue */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: -0.5 }}>Catalogue ({totalProducts})</h2>
          <a href="/admin/produits" style={{ fontSize: 13, fontWeight: 700, opacity: 0.5, textDecoration: "none", color: "#111" }}>Gérer →</a>
        </div>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
          {products.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", opacity: 0.4, fontSize: 14 }}>Aucun produit dans la base.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#fafaf9" }}>
                  {["Produit", "Catégorie", "Prix TTC", "Stock", "Valeur stock", ""].map((h) => (
                    <th key={h} style={{ padding: "12px 20px", textAlign: h === "" ? "right" : "left", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.45 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p: Product, i: number) => (
                  <tr key={p.id} style={{ borderBottom: i < products.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", background: (p.stock ?? 0) <= 0 ? "#fffbfb" : "transparent" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{p.name}</div>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: "rgba(0,0,0,0.05)", color: "#555" }}>{p.category_slug ?? "—"}</span>
                    </td>
                    <td style={{ padding: "14px 20px", fontWeight: 900, fontSize: 15 }}>
                      {p.price_ttc?.toFixed(2)} €
                      {p.promo_price && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: "#b45309" }}>Promo: {p.promo_price?.toFixed(2)} €</span>}
                    </td>
                    <td style={{ padding: "14px 20px" }}><StockBadge stock={p.stock ?? 0} /></td>
                    <td style={{ padding: "14px 20px", fontWeight: 700, fontSize: 14, opacity: 0.7 }}>
                      {((p.stock ?? 0) * (p.price_ttc ?? 0)).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <a href={`/admin/produits/${p.id}`} style={{ fontSize: 13, fontWeight: 700, color: "#111", textDecoration: "none", padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", display: "inline-block" }}>Modifier →</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}