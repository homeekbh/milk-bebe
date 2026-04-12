import { supabaseServer } from "@/lib/server/supabase";
import Link from "next/link";

async function getStats() {
  const [{ data: products }, { data: orders }, { data: subscribers }] = await Promise.all([
    supabaseServer.from("products").select("*").order("stock", { ascending: true }),
    supabaseServer.from("orders").select("*").order("created_at", { ascending: false }).limit(10),
    supabaseServer.from("newsletter_subscribers").select("id", { count: "exact" }).eq("active", true),
  ]);

  const prods       = products ?? [];
  const ords        = orders   ?? [];
  const totalProducts = prods.length;
  const stockValue    = prods.reduce((s, p) => s + (p.stock ?? 0) * (p.price_ttc ?? 0), 0);
  const lowStock      = prods.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5).length;
  const outOfStock    = prods.filter(p => (p.stock ?? 0) <= 0).length;
  const alerts        = prods.filter(p => (p.stock ?? 0) <= 5).slice(0, 6);

  const today     = new Date(); today.setHours(0,0,0,0);
  const todayOrds = ords.filter(o => new Date(o.created_at) >= today);
  const caToday   = todayOrds.reduce((s, o) => s + Number(o.amount_total ?? 0), 0);
  const caTotal   = ords.reduce((s, o) => s + Number(o.amount_total ?? 0), 0);
  const subsCount = (subscribers as any)?.length ?? 0;

  return { prods, ords, totalProducts, stockValue, lowStock, outOfStock, alerts, caToday, caTotal, subsCount, todayOrds };
}

export default async function AdminDashboard() {
  const { prods, ords, totalProducts, stockValue, lowStock, outOfStock, alerts, caToday, caTotal, subsCount, todayOrds } = await getStats();

  const dateStr = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const KPI = ({ label, value, sub, color = "#1a1410", bg = "#fff" }: any) => (
    <div style={{ background: bg, borderRadius: 16, padding: "20px 24px", border: "1px solid rgba(26,20,16,0.1)" }}>
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "#c49a4a", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 950, letterSpacing: -1.5, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 14, color: "rgba(26,20,16,0.5)", marginTop: 6, fontWeight: 600 }}>{sub}</div>}
    </div>
  );

  const StatusBadge = ({ stock }: { stock: number }) => {
    if (stock <= 0)  return <span style={{ padding: "5px 12px", borderRadius: 99, background: "#f3f4f6", color: "#6b7280", fontSize: 13, fontWeight: 800 }}>Épuisé</span>;
    if (stock <= 3)  return <span style={{ padding: "5px 12px", borderRadius: 99, background: "#c49a4a", color: "#1a1410", fontSize: 13, fontWeight: 800 }}>Critique · {stock}</span>;
    if (stock <= 5)  return <span style={{ padding: "5px 12px", borderRadius: 99, background: "#fef3c7", color: "#92400e", fontSize: 13, fontWeight: 800 }}>Faible · {stock}</span>;
    return <span style={{ padding: "5px 12px", borderRadius: 99, background: "#dcfce7", color: "#166534", fontSize: 13, fontWeight: 800 }}>OK · {stock}</span>;
  };

  return (
    <div style={{ padding: "36px 40px", maxWidth: 1100 }}>

      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 950, letterSpacing: -1.5, color: "#1a1410" }}>Dashboard</h1>
          <div style={{ fontSize: 16, color: "rgba(26,20,16,0.5)", marginTop: 6, textTransform: "capitalize", fontWeight: 600 }}>{dateStr}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/admin/commandes" style={{ padding: "13px 22px", borderRadius: 12, background: "#fff", color: "#1a1410", fontWeight: 800, fontSize: 15, textDecoration: "none", border: "1px solid rgba(26,20,16,0.15)" }}>
            Voir commandes
          </Link>
          <Link href="/admin/produits/new" style={{ padding: "13px 22px", borderRadius: 12, background: "#1a1410", color: "#c49a4a", fontWeight: 800, fontSize: 15, textDecoration: "none" }}>
            + Nouveau produit
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 36 }}>
        <KPI label="CA aujourd'hui"   value={`${caToday.toFixed(2)} €`}  sub={`${todayOrds.length} commande(s)`} color="#1a1410" />
        <KPI label="CA total"         value={`${caTotal.toFixed(0)} €`}   sub={`${ords.length} commandes`}        color="#1a1410" />
        <KPI label="Produits"         value={String(totalProducts)}        sub="Dans le catalogue"                 color="#1a1410" />
        <KPI label="Valeur du stock"  value={`${stockValue.toFixed(0)} €`} sub="TTC × unités"                     color="#1a1410" />
        <KPI label="Ruptures"         value={String(outOfStock)}           sub="Stock = 0"                         color={outOfStock > 0 ? "#b91c1c" : "#166534"} />
        <KPI label="Stock faible"     value={String(lowStock)}             sub="≤ 5 unités"                        color={lowStock > 0 ? "#c49a4a" : "#166534"}   />
        <KPI label="Abonnés newsletter" value={String(subsCount)}          sub="Emails actifs"                     color="#1a1410" />
      </div>

      {/* Alertes stock */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: -0.5, color: "#1a1410" }}>Alertes stock</h2>
            <Link href="/admin/alerts" style={{ fontSize: 15, fontWeight: 700, color: "#c49a4a", textDecoration: "none" }}>Voir tout →</Link>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.1)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid rgba(26,20,16,0.08)", background: "#fafaf9" }}>
                  {["Produit", "Catégorie", "Prix", "Stock", ""].map(h => (
                    <th key={h} style={{ padding: "14px 20px", textAlign: h === "" ? "right" : "left", fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alerts.map((p: any, i: number) => (
                  <tr key={p.id} style={{ borderBottom: i < alerts.length - 1 ? "1px solid rgba(26,20,16,0.06)" : "none" }}>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1410" }}>{p.name}</div>
                      <div style={{ fontSize: 13, color: "rgba(26,20,16,0.4)", marginTop: 2, fontFamily: "monospace" }}>/{p.slug}</div>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, padding: "5px 12px", borderRadius: 99, background: "rgba(196,154,74,0.15)", color: "#1a1410" }}>{p.category_slug ?? "—"}</span>
                    </td>
                    <td style={{ padding: "16px 20px", fontWeight: 900, fontSize: 17, color: "#1a1410" }}>{p.price_ttc?.toFixed(2)} €</td>
                    <td style={{ padding: "16px 20px" }}><StatusBadge stock={p.stock ?? 0} /></td>
                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      <Link href={`/admin/produits/${p.id}`} style={{ fontSize: 14, fontWeight: 800, color: "#1a1410", textDecoration: "none", padding: "8px 16px", borderRadius: 10, border: "2px solid rgba(26,20,16,0.2)", display: "inline-block" }}>
                        Modifier
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dernières commandes */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: -0.5, color: "#1a1410" }}>
            Dernières commandes
          </h2>
          <Link href="/admin/commandes" style={{ fontSize: 15, fontWeight: 700, color: "#c49a4a", textDecoration: "none" }}>Tout voir →</Link>
        </div>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.1)", overflow: "hidden" }}>
          {ords.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "rgba(26,20,16,0.4)", fontSize: 16 }}>
              Aucune commande — les achats Stripe apparaîtront ici
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid rgba(26,20,16,0.08)", background: "#fafaf9" }}>
                  {["Date", "Client", "Montant", "Statut livraison", ""].map(h => (
                    <th key={h} style={{ padding: "14px 20px", textAlign: h === "" ? "right" : "left", fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ords.slice(0, 5).map((o: any, i: number) => (
                  <tr key={o.id} style={{ borderBottom: i < 4 ? "1px solid rgba(26,20,16,0.06)" : "none" }}>
                    <td style={{ padding: "16px 20px", fontSize: 15, color: "#1a1410", fontWeight: 600 }}>
                      {new Date(o.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1410" }}>{o.customer_name ?? "—"}</div>
                      <div style={{ fontSize: 13, color: "rgba(26,20,16,0.4)" }}>{o.customer_email}</div>
                    </td>
                    <td style={{ padding: "16px 20px", fontWeight: 950, fontSize: 18, color: "#1a1410" }}>
                      {Number(o.amount_total).toFixed(2)} €
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      {o.shipping_status === "shipped"
                        ? <span style={{ padding: "5px 12px", borderRadius: 99, background: "#dcfce7", color: "#166534", fontSize: 13, fontWeight: 800 }}>Expédiée</span>
                        : o.shipping_status === "delivered"
                        ? <span style={{ padding: "5px 12px", borderRadius: 99, background: "#c49a4a", color: "#1a1410", fontSize: 13, fontWeight: 800 }}>Livrée</span>
                        : <span style={{ padding: "5px 12px", borderRadius: 99, background: "#fef3c7", color: "#92400e", fontSize: 13, fontWeight: 800 }}>En préparation</span>
                      }
                    </td>
                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      <Link href={`/admin/commandes`} style={{ fontSize: 14, fontWeight: 800, color: "#1a1410", textDecoration: "none", padding: "8px 16px", borderRadius: 10, border: "2px solid rgba(26,20,16,0.2)", display: "inline-block" }}>
                        Détail
                      </Link>
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