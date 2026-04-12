"use client";

import { useEffect, useState } from "react";

const SHIPPING_STATUSES = [
  { value: "pending",    label: "En préparation", color: "#fef3c7", text: "#92400e"  },
  { value: "shipped",    label: "Expédiée",        color: "#dcfce7", text: "#166534"  },
  { value: "delivered",  label: "Livrée",           color: "#c49a4a", text: "#1a1410"  },
  { value: "returned",   label: "Retour",           color: "#fee2e2", text: "#b91c1c"  },
];

function StatusBadge({ status }: { status: string }) {
  const s = SHIPPING_STATUSES.find(x => x.value === status) ?? SHIPPING_STATUSES[0];
  return (
    <span style={{ padding: "5px 14px", borderRadius: 99, background: s.color, color: s.text, fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

export default function AdminCommandes() {
  const [orders,     setOrders]     = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState<any | null>(null);
  const [updating,   setUpdating]   = useState(false);
  const [tracking,   setTracking]   = useState("");
  const [emailSent,  setEmailSent]  = useState(false);
  const [filterStatus, setFilter]   = useState("");
  const [search,     setSearch]     = useState("");

  async function load() {
    setLoading(true);
    const res  = await fetch("/api/admin/commandes-data");
    const data = await res.json();
    setOrders(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(orderId: string, status: string, trackingNum?: string) {
    setUpdating(true);
    const res = await fetch("/api/admin/commandes-data", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: orderId, shipping_status: status, tracking_number: trackingNum ?? null }),
    });
    const data = await res.json();
    if (data.ok) {
      // Email automatique si expédiée
      if (status === "shipped" && selected) {
        await fetch("/api/emails/shipped", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            email:   selected.customer_email,
            prenom:  (selected.customer_name ?? "").split(" ")[0],
            tracking: trackingNum ?? "",
            items:   selected.items,
          }),
        });
        setEmailSent(true);
      }
      await load();
      if (selected?.id === orderId) {
        setSelected((prev: any) => ({ ...prev, shipping_status: status, tracking_number: trackingNum ?? null }));
      }
    }
    setUpdating(false);
  }

  const filtered = orders.filter(o => {
    const matchStatus = !filterStatus || o.shipping_status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || (o.customer_name ?? "").toLowerCase().includes(q) || (o.customer_email ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const caTotal = filtered.reduce((s, o) => s + Number(o.amount_total ?? 0), 0);

  const IS = { // inputStyle
    padding: "12px 16px", borderRadius: 10, border: "2px solid rgba(26,20,16,0.15)",
    fontSize: 15, fontWeight: 600, background: "#fff", outline: "none", width: "100%", boxSizing: "border-box" as const,
  };

  return (
    <div style={{ padding: "36px 40px", maxWidth: 1200 }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 950, letterSpacing: -1.5, color: "#1a1410" }}>Commandes</h1>
          <div style={{ fontSize: 16, color: "rgba(26,20,16,0.5)", marginTop: 6, fontWeight: 600 }}>
            {filtered.length} commande(s) · CA : {caTotal.toFixed(2)} €
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <input type="text" placeholder="Rechercher client ou email..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...IS, flex: 1, minWidth: 220 }} />
        <select value={filterStatus} onChange={e => setFilter(e.target.value)}
          style={{ ...IS, width: "auto" }}>
          <option value="">Tous les statuts</option>
          {SHIPPING_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 400px" : "1fr", gap: 20, alignItems: "start" }}>

        {/* Liste commandes */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.1)", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: "center", opacity: 0.4, fontSize: 16 }}>Chargement...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "rgba(26,20,16,0.4)", fontSize: 16 }}>
              {orders.length === 0 ? "Aucune commande pour l'instant." : "Aucun résultat pour cette recherche."}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid rgba(26,20,16,0.08)", background: "#fafaf9" }}>
                  {["Date", "Client", "Articles", "Montant", "Statut", ""].map(h => (
                    <th key={h} style={{ padding: "14px 20px", textAlign: h === "" ? "right" : "left", fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o: any, i: number) => (
                  <tr key={o.id}
                    onClick={() => { setSelected(o); setTracking(o.tracking_number ?? ""); setEmailSent(false); }}
                    style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(26,20,16,0.06)" : "none", cursor: "pointer", background: selected?.id === o.id ? "#fffbf0" : "transparent", transition: "background 0.15s" }}>
                    <td style={{ padding: "16px 20px", fontSize: 15, fontWeight: 600, color: "#1a1410" }}>
                      {new Date(o.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1410" }}>{o.customer_name ?? "—"}</div>
                      <div style={{ fontSize: 13, color: "rgba(26,20,16,0.45)" }}>{o.customer_email}</div>
                    </td>
                    <td style={{ padding: "16px 20px", fontSize: 14, color: "rgba(26,20,16,0.6)", fontWeight: 600 }}>
                      {Array.isArray(o.items) ? `${o.items.length} article(s)` : "—"}
                    </td>
                    <td style={{ padding: "16px 20px", fontWeight: 950, fontSize: 18, color: "#1a1410" }}>
                      {Number(o.amount_total).toFixed(2)} €
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <StatusBadge status={o.shipping_status ?? "pending"} />
                    </td>
                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      <span style={{ fontSize: 20, color: "#c49a4a" }}>›</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Panneau détail commande */}
        {selected && (
          <div style={{ background: "#fff", borderRadius: 16, border: "2px solid #c49a4a", padding: 28, display: "grid", gap: 20, position: "sticky", top: 20 }}>

            {/* En-tête */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "#c49a4a", marginBottom: 4 }}>Commande</div>
                <div style={{ fontSize: 22, fontWeight: 950, color: "#1a1410" }}>{selected.customer_name ?? "—"}</div>
                <div style={{ fontSize: 14, color: "rgba(26,20,16,0.5)", marginTop: 2 }}>{selected.customer_email}</div>
              </div>
              <button onClick={() => setSelected(null)}
                style={{ padding: "8px 14px", borderRadius: 10, border: "2px solid rgba(26,20,16,0.15)", background: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 800, color: "#1a1410" }}>
                ✕
              </button>
            </div>

            {/* Montant */}
            <div style={{ padding: "16px 20px", borderRadius: 12, background: "#1a1410", color: "#f2ede6" }}>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.6, marginBottom: 4 }}>MONTANT TOTAL</div>
              <div style={{ fontSize: 32, fontWeight: 950, letterSpacing: -1, color: "#c49a4a" }}>
                {Number(selected.amount_total).toFixed(2)} €
              </div>
              <div style={{ fontSize: 13, opacity: 0.5, marginTop: 4 }}>
                {new Date(selected.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            {/* Articles commandés */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", marginBottom: 10 }}>Articles</div>
              <div style={{ display: "grid", gap: 8 }}>
                {(Array.isArray(selected.items) ? selected.items : []).map((item: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "#f5f0e8" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1410" }}>{item.name}</div>
                      <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)" }}>× {item.quantity}</div>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: 16, color: "#1a1410" }}>
                      {(Number(item.price) * Number(item.quantity)).toFixed(2)} €
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Adresse livraison */}
            {selected.shipping_address && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", marginBottom: 10 }}>Adresse de livraison</div>
                <div style={{ padding: "14px 16px", borderRadius: 12, background: "#f5f0e8", fontSize: 15, color: "#1a1410", lineHeight: 1.7, fontWeight: 600 }}>
                  {selected.shipping_address.line1}<br />
                  {selected.shipping_address.line2 && <>{selected.shipping_address.line2}<br /></>}
                  {selected.shipping_address.postal_code} {selected.shipping_address.city}<br />
                  {selected.shipping_address.country}
                </div>
              </div>
            )}

            {/* Statut livraison */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", marginBottom: 10 }}>Statut livraison</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {SHIPPING_STATUSES.map(s => (
                  <button key={s.value}
                    onClick={() => updateStatus(selected.id, s.value, tracking || undefined)}
                    disabled={updating}
                    style={{
                      padding: "12px 16px", borderRadius: 10, border: "2px solid",
                      borderColor: selected.shipping_status === s.value ? s.text : "rgba(26,20,16,0.12)",
                      background:  selected.shipping_status === s.value ? s.color : "#fff",
                      color:       selected.shipping_status === s.value ? s.text : "rgba(26,20,16,0.5)",
                      fontWeight: 800, fontSize: 14, cursor: "pointer", transition: "all 0.15s",
                      opacity: updating ? 0.5 : 1,
                    }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Numéro de suivi */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", marginBottom: 10 }}>
                Numéro de suivi
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="text" value={tracking} onChange={e => setTracking(e.target.value)}
                  placeholder="Ex : 1Z999AA10123456784"
                  style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: "2px solid rgba(26,20,16,0.15)", fontSize: 15, fontWeight: 600, outline: "none" }}
                />
                <button
                  onClick={() => updateStatus(selected.id, "shipped", tracking)}
                  disabled={!tracking || updating}
                  style={{ padding: "12px 18px", borderRadius: 10, background: tracking ? "#1a1410" : "#f3f4f6", color: tracking ? "#c49a4a" : "#9ca3af", fontWeight: 800, fontSize: 14, border: "none", cursor: tracking ? "pointer" : "not-allowed" }}>
                  Expédier →
                </button>
              </div>
              {/* Statut email */}
              {emailSent && (
                <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: 10, background: "#dcfce7", color: "#166534", fontSize: 14, fontWeight: 800 }}>
                  ✅ Email d'expédition envoyé à {selected.customer_email}
                </div>
              )}
              {selected.email_sent_at && (
                <div style={{ marginTop: 6, fontSize: 13, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>
                  Dernier email envoyé : {new Date(selected.email_sent_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>

            {/* Notes internes */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", marginBottom: 10 }}>Notes internes</div>
              <textarea
                defaultValue={selected.notes ?? ""}
                onBlur={async e => {
                  await fetch("/api/admin/commandes-data", {
                    method: "PUT", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: selected.id, notes: e.target.value }),
                  });
                }}
                placeholder="Notes privées sur cette commande..."
                rows={3}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "2px solid rgba(26,20,16,0.12)", fontSize: 15, fontWeight: 600, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>

          </div>
        )}
      </div>
    </div>
  );
}