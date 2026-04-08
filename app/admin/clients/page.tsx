import { supabaseServer } from "@/lib/server/supabase";

async function getClients() {
  try {
    const { data } = await supabaseServer
      .from("orders")
      .select("customer_email, customer_name, created_at, amount_total")
      .order("created_at", { ascending: false });

    if (!data) return null;

    // Dédupliquer par email
    const map = new Map<string, any>();
    for (const o of data) {
      if (!o.customer_email) continue;
      if (!map.has(o.customer_email)) {
        map.set(o.customer_email, { email: o.customer_email, name: o.customer_name, orders: 0, total: 0, lastOrder: o.created_at });
      }
      const c = map.get(o.customer_email);
      c.orders += 1;
      c.total += Number(o.amount_total ?? 0);
    }
    return Array.from(map.values());
  } catch {
    return null;
  }
}

export default async function AdminClients() {
  const clients = await getClients();

  return (
    <div style={{ padding: "36px 40px", maxWidth: 1100 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950, letterSpacing: -1 }}>Clients</h1>
        <div style={{ fontSize: 14, opacity: 0.5, marginTop: 6 }}>
          {clients === null ? "Dépend de la table orders" : `${clients.length} client(s) unique(s)`}
        </div>
      </div>

      {clients === null || clients.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Aucun client</div>
          <div style={{ opacity: 0.5, fontSize: 14 }}>Les clients apparaîtront ici après les premières commandes Stripe.</div>
          <div style={{ fontSize: 13, opacity: 0.4, marginTop: 8 }}>Assure-toi que la table "orders" est créée et que le webhook Stripe enregistre les commandes.</div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#fafaf9" }}>
                {["Client", "Commandes", "Total dépensé", "Dernière commande"].map((h) => (
                  <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.45 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((c: any, i: number) => (
                <tr key={c.email} style={{ borderBottom: i < clients.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{c.name ?? "—"}</div>
                    <div style={{ fontSize: 13, opacity: 0.5 }}>{c.email}</div>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ fontWeight: 900, fontSize: 16 }}>{c.orders}</span>
                    <span style={{ fontSize: 13, opacity: 0.5, marginLeft: 4 }}>commande(s)</span>
                  </td>
                  <td style={{ padding: "14px 20px", fontWeight: 900, fontSize: 16 }}>{c.total.toFixed(2)} €</td>
                  <td style={{ padding: "14px 20px", fontSize: 14, opacity: 0.6 }}>
                    {new Date(c.lastOrder).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}