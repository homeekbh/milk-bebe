import { supabaseServer } from "@/lib/server/supabase";
import Link from "next/link";

export default async function AdminClients() {
  const { data: orders } = await supabaseServer
    .from("orders")
    .select("customer_email, customer_name, created_at, amount_total, items, shipping_address, shipping_status")
    .order("created_at", { ascending: false });

  // Construire profils clients
  const map = new Map<string, any>();
  for (const o of orders ?? []) {
    if (!o.customer_email) continue;
    if (!map.has(o.customer_email)) {
      map.set(o.customer_email, {
        email:   o.customer_email,
        name:    o.customer_name ?? "—",
        orders:  0,
        total:   0,
        lastOrder: o.created_at,
        lastAddress: o.shipping_address,
        lastStatus:  o.shipping_status,
        allItems: [],
      });
    }
    const c = map.get(o.customer_email);
    c.orders += 1;
    c.total  += Number(o.amount_total ?? 0);
    if (Array.isArray(o.items)) c.allItems.push(...o.items);
  }
  const clients = Array.from(map.values()).sort((a, b) => b.total - a.total);
  const totalCA = clients.reduce((s, c) => s + c.total, 0);

  return (
    <div style={{ padding: "36px 40px", maxWidth: 1100 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 36, fontWeight: 950, letterSpacing: -1.5, color: "#1a1410" }}>Clients</h1>
        <div style={{ fontSize: 16, color: "rgba(26,20,16,0.5)", marginTop: 6, fontWeight: 600 }}>
          {clients.length} client(s) · CA total : {totalCA.toFixed(2)} €
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Clients uniques",     value: clients.length,                                                                       color: "#1a1410" },
          { label: "CA total",            value: `${totalCA.toFixed(0)} €`,                                                            color: "#1a1410" },
          { label: "Panier moyen",        value: `${clients.length > 0 ? (totalCA / (orders?.length ?? 1)).toFixed(2) : "0.00"} €`,    color: "#c49a4a" },
          { label: "Clients récurrents",  value: clients.filter(c => c.orders > 1).length,                                            color: "#166534" },
        ].map(stat => (
          <div key={stat.label} style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", border: "1px solid rgba(26,20,16,0.1)" }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "#c49a4a", marginBottom: 8 }}>{stat.label}</div>
            <div style={{ fontSize: 36, fontWeight: 950, letterSpacing: -1.5, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {clients.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.1)", padding: 60, textAlign: "center", color: "rgba(26,20,16,0.4)", fontSize: 16 }}>
          Aucun client — les achats apparaîtront ici après les premières commandes Stripe.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {clients.map(c => (
            <div key={c.email} style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.1)", padding: "24px 28px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "start" }}>

                {/* Infos client */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1410" }}>{c.name}</div>
                    {c.orders > 1 && (
                      <span style={{ padding: "3px 10px", borderRadius: 99, background: "rgba(196,154,74,0.15)", color: "#c49a4a", fontSize: 12, fontWeight: 800 }}>Client récurrent</span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, color: "rgba(26,20,16,0.5)", marginBottom: 12 }}>{c.email}</div>

                  {/* Adresse */}
                  {c.lastAddress && (
                    <div style={{ fontSize: 13, color: "rgba(26,20,16,0.6)", lineHeight: 1.7, padding: "10px 14px", borderRadius: 10, background: "#f5f0e8", marginBottom: 12 }}>
                      📍 {c.lastAddress.line1}{c.lastAddress.line2 ? `, ${c.lastAddress.line2}` : ""} · {c.lastAddress.postal_code} {c.lastAddress.city}
                    </div>
                  )}

                  {/* Articles commandés */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[...new Set(c.allItems.map((i: any) => i.name))].slice(0, 5).map((name: any) => (
                      <span key={name} style={{ padding: "3px 10px", borderRadius: 99, background: "rgba(26,20,16,0.06)", color: "rgba(26,20,16,0.6)", fontSize: 12, fontWeight: 700 }}>{name}</span>
                    ))}
                    {c.allItems.length > 5 && <span style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", padding: "3px 6px" }}>+{c.allItems.length - 5}</span>}
                  </div>
                </div>

                {/* Stats droite */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 28, fontWeight: 950, color: "#1a1410", letterSpacing: -1 }}>{c.total.toFixed(2)} €</div>
                  <div style={{ fontSize: 14, color: "rgba(26,20,16,0.4)", marginTop: 4 }}>{c.orders} commande{c.orders > 1 ? "s" : ""}</div>
                  <div style={{ fontSize: 13, color: "rgba(26,20,16,0.35)", marginTop: 4 }}>
                    {new Date(c.lastOrder).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}