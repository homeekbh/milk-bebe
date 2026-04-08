import { supabaseServer } from "@/lib/server/supabase";
import Link from "next/link";

async function getAlerts() {
  const { data } = await supabaseServer
    .from("products")
    .select("*")
    .lte("stock", 10)
    .order("stock", { ascending: true });
  return data ?? [];
}

export default async function AdminAlerts() {
  const alerts = await getAlerts();
  const ruptures = alerts.filter((p: any) => (p.stock ?? 0) <= 0);
  const faible = alerts.filter((p: any) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5);
  const attention = alerts.filter((p: any) => (p.stock ?? 0) > 5);

  function Section({ title, color, items }: { title: string; color: string; items: any[] }) {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>{title} ({items.length})</h2>
        </div>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#fafaf9" }}>
                {["Produit", "Catégorie", "Prix TTC", "Stock restant", "Valeur stock", ""].map((h) => (
                  <th key={h} style={{ padding: "11px 18px", textAlign: h === "" ? "right" : "left", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.45 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((p: any, i: number) => (
                <tr key={p.id} style={{ borderBottom: i < items.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                  <td style={{ padding: "13px 18px" }}>
                    <div style={{ fontWeight: 800 }}>{p.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.4 }}>/{p.slug}</div>
                  </td>
                  <td style={{ padding: "13px 18px" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: "rgba(0,0,0,0.05)" }}>{p.category_slug ?? "—"}</span>
                  </td>
                  <td style={{ padding: "13px 18px", fontWeight: 900 }}>{Number(p.price_ttc).toFixed(2)} €</td>
                  <td style={{ padding: "13px 18px" }}>
                    <span style={{ fontWeight: 900, fontSize: 18, color }}>{p.stock ?? 0}</span>
                  </td>
                  <td style={{ padding: "13px 18px", opacity: 0.6, fontWeight: 700 }}>
                    {((p.stock ?? 0) * (p.price_ttc ?? 0)).toFixed(2)} €
                  </td>
                  <td style={{ padding: "13px 18px", textAlign: "right" }}>
                    <Link href={`/admin/produits/${p.id}`} style={{ fontSize: 13, fontWeight: 700, color: "#111", textDecoration: "none", padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)" }}>
                      Modifier →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "36px 40px", maxWidth: 1100 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950, letterSpacing: -1 }}>Alertes stock</h1>
        <div style={{ fontSize: 14, opacity: 0.5, marginTop: 6 }}>{alerts.length} produit(s) nécessitent attention</div>
      </div>

      {alerts.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Tous les stocks sont OK</div>
          <div style={{ opacity: 0.5, fontSize: 14, marginTop: 6 }}>Aucun produit en dessous de 10 unités.</div>
        </div>
      ) : (
        <>
          <Section title="Ruptures de stock" color="#ef4444" items={ruptures} />
          <Section title="Stock faible (≤ 5)" color="#f59e0b" items={faible} />
          <Section title="À surveiller (6-10)" color="#3b82f6" items={attention} />
        </>
      )}
    </div>
  );
}