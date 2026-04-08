import { supabaseServer } from "@/lib/server/supabase";

async function getOrders() {
  try {
    const { data, error } = await supabaseServer
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return null; // table n'existe pas encore
    return data ?? [];
  } catch {
    return null;
  }
}

export default async function AdminCommandes() {
  const orders = await getOrders();

  return (
    <div style={{ padding: "36px 40px", maxWidth: 1100 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950, letterSpacing: -1 }}>Commandes</h1>
        <div style={{ fontSize: 14, opacity: 0.5, marginTop: 6 }}>
          {orders === null ? "Table non configurée" : `${orders.length} commande(s)`}
        </div>
      </div>

      {orders === null ? (
        <div style={{ padding: "28px 32px", borderRadius: 16, background: "#fffbeb", border: "1px solid #fde68a" }}>
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 10 }}>⚠️ Table "orders" à créer</div>
          <div style={{ fontSize: 14, opacity: 0.75, lineHeight: 1.7, marginBottom: 16 }}>
            Exécute ce SQL dans ton dashboard Supabase (SQL Editor), puis mets à jour le webhook Stripe pour enregistrer les commandes.
          </div>
          <pre style={{ padding: "16px 20px", background: "#111", color: "#e5e5e5", borderRadius: 12, fontSize: 13, lineHeight: 1.7, overflowX: "auto" }}>
{`CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_session_id TEXT UNIQUE NOT NULL,
  items JSONB NOT NULL,
  amount_total NUMERIC(10,2),
  customer_email TEXT,
  customer_name TEXT,
  status TEXT DEFAULT 'paid',
  created_at TIMESTAMPTZ DEFAULT now()
);`}
          </pre>
        </div>
      ) : orders.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Aucune commande</div>
          <div style={{ opacity: 0.5, fontSize: 14 }}>Les commandes Stripe apparaîtront ici après le premier achat.</div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#fafaf9" }}>
                {["Date", "Client", "Montant", "Statut", "Session Stripe"].map((h) => (
                  <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.45 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any, i: number) => (
                <tr key={o.id} style={{ borderBottom: i < orders.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                  <td style={{ padding: "14px 20px", fontSize: 14 }}>
                    {new Date(o.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ fontWeight: 700 }}>{o.customer_name ?? "—"}</div>
                    <div style={{ fontSize: 12, opacity: 0.5 }}>{o.customer_email}</div>
                  </td>
                  <td style={{ padding: "14px 20px", fontWeight: 900, fontSize: 16 }}>
                    {Number(o.amount_total).toFixed(2)} €
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ padding: "4px 10px", borderRadius: 99, background: "#dcfce7", color: "#166534", fontSize: 12, fontWeight: 800 }}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 12, opacity: 0.4, fontFamily: "monospace" }}>
                    {o.stripe_session_id?.slice(0, 24)}...
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