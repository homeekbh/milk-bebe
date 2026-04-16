"use client";

import { useEffect, useState, useMemo } from "react";

interface Order {
  id: string;
  created_at: string;
  amount_total: number;
  customer_name: string;
  customer_email: string;
  items: any[];
  promo_code?: string;
  discount?: number;
  shipping_status: string;
}

interface MonthData {
  key:      string;
  label:    string;
  ca:       number;
  orders:   number;
  avg:      number;
  discount: number;
  net:      number;
}

export default function AdminComptabilite() {
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [year,    setYear]    = useState(new Date().getFullYear());

  useEffect(() => {
    fetch("/api/admin/commandes-data")
      .then(r => r.json())
      .then((data: unknown) => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const months = useMemo((): MonthData[] => {
    const map: Record<string, MonthData> = {};

    for (let m = 1; m <= 12; m++) {
      const key   = `${year}-${String(m).padStart(2, "0")}`;
      const label = new Date(year, m - 1, 1).toLocaleDateString("fr-FR", { month: "long" });
      map[key]    = { key, label, ca: 0, orders: 0, avg: 0, discount: 0, net: 0 };
    }

    for (const o of orders) {
      const d = new Date(o.created_at);
      if (d.getFullYear() !== year) continue;
      const key = `${year}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = map[key];
      if (!entry) continue;
      entry.ca       += Number(o.amount_total ?? 0);
      entry.orders   += 1;
      entry.discount += Number(o.discount ?? 0);
    }

    return Object.values(map).map(m => ({
      ...m,
      avg: m.orders > 0 ? m.ca / m.orders : 0,
      net: m.ca - m.discount,
    }));
  }, [orders, year]);

  const yearOrders = orders.filter(o => new Date(o.created_at).getFullYear() === year);
  const totalCA    = yearOrders.reduce((s, o) => s + Number(o.amount_total ?? 0), 0);
  const totalDis   = yearOrders.reduce((s, o) => s + Number(o.discount    ?? 0), 0);
  const maxCA      = Math.max(...months.map(m => m.ca), 1);

  function exportCSV() {
    const header = ["Mois", "Commandes", "CA TTC (€)", "Remises (€)", "CA Net (€)", "Panier moyen (€)"].join(";");
    const rows   = months.map(m =>
      [m.label, m.orders, m.ca.toFixed(2), m.discount.toFixed(2), m.net.toFixed(2), m.avg.toFixed(2)].join(";")
    );
    const total  = [
      "TOTAL",
      yearOrders.length,
      totalCA.toFixed(2),
      totalDis.toFixed(2),
      (totalCA - totalDis).toFixed(2),
      yearOrders.length > 0 ? (totalCA / yearOrders.length).toFixed(2) : "0",
    ].join(";");
    const csv    = "\uFEFF" + [header, ...rows, total].join("\n");
    const blob   = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement("a");
    a.href       = url;
    a.download   = `milk-comptabilite-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const yearsSet = new Set(orders.map(o => new Date(o.created_at).getFullYear()));
  const years    = Array.from(yearsSet).sort((a, b) => b - a);
  if (!years.includes(year)) years.unshift(year);

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1000 }}>

      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>Comptabilité</h1>
          <div style={{ fontSize: 15, color: "rgba(26,20,16,0.5)", marginTop: 4, fontWeight: 600 }}>CA mensuel · {year}</div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", fontSize: 15, fontWeight: 700, background: "#fff", outline: "none" }}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={exportCSV}
            style={{ padding: "11px 22px", borderRadius: 10, background: "#1a1410", color: "#c49a4a", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer" }}
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 32 }}>
        {[
          { label: "CA Total",        value: `${totalCA.toFixed(2)} €`,                                                        color: "#c49a4a" },
          { label: "Commandes",       value: String(yearOrders.length),                                                        color: "#1a1410" },
          { label: "Panier moyen",    value: yearOrders.length > 0 ? `${(totalCA / yearOrders.length).toFixed(2)} €` : "—",   color: "#1a1410" },
          { label: "Remises totales", value: `−${totalDis.toFixed(2)} €`,                                                      color: "#b91c1c" },
          { label: "CA Net",          value: `${(totalCA - totalDis).toFixed(2)} €`,                                           color: "#166534" },
        ].map(stat => (
          <div key={stat.label} style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)", padding: "18px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: -1, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: "rgba(26,20,16,0.4)", marginTop: 6, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.4 }}>Chargement...</div>
      ) : (
        <>
          {/* Graphique barres */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: "28px 24px", marginBottom: 24 }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: "#1a1410", marginBottom: 24 }}>CA mensuel {year}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 180, padding: "0 8px" }}>
              {months.map(m => {
                const h = maxCA > 0 ? Math.max(4, (m.ca / maxCA) * 150) : 4;
                return (
                  <div key={m.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(26,20,16,0.5)", height: 14, display: "flex", alignItems: "center" }}>
                      {m.ca > 0 ? `${Math.round(m.ca)} €` : ""}
                    </div>
                    <div
                      style={{ width: "100%", height: `${h}px`, background: m.ca > 0 ? "#c49a4a" : "rgba(0,0,0,0.06)", borderRadius: "4px 4px 0 0", transition: "height 0.4s ease" }}
                      title={`${m.label} : ${m.ca.toFixed(2)} €`}
                    />
                    <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(26,20,16,0.4)", textTransform: "uppercase", marginTop: 2 }}>
                      {m.label.slice(0, 3)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tableau mensuel */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafaf9" }}>
                  {["Mois", "Commandes", "CA TTC", "Remises", "CA Net", "Panier moyen"].map(h => (
                    <th key={h} style={{ padding: "13px 18px", textAlign: "left", fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", borderBottom: "2px solid rgba(0,0,0,0.06)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map((m, i) => (
                  <tr key={m.key} style={{ borderBottom: i < months.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", background: m.ca > 0 ? "#fff" : "#fafaf9" }}>
                    <td style={{ padding: "14px 18px", fontWeight: 800, fontSize: 15, color: "#1a1410", textTransform: "capitalize" }}>{m.label}</td>
                    <td style={{ padding: "14px 18px", fontSize: 14, color: "rgba(26,20,16,0.6)", fontWeight: 600 }}>{m.orders > 0 ? m.orders : "—"}</td>
                    <td style={{ padding: "14px 18px", fontWeight: 900, fontSize: 16, color: m.ca > 0 ? "#c49a4a" : "rgba(26,20,16,0.25)" }}>
                      {m.ca > 0 ? `${m.ca.toFixed(2)} €` : "—"}
                    </td>
                    <td style={{ padding: "14px 18px", fontSize: 14, fontWeight: 600, color: m.discount > 0 ? "#b91c1c" : "rgba(26,20,16,0.25)" }}>
                      {m.discount > 0 ? `−${m.discount.toFixed(2)} €` : "—"}
                    </td>
                    <td style={{ padding: "14px 18px", fontWeight: 800, fontSize: 14, color: m.net > 0 ? "#166534" : "rgba(26,20,16,0.25)" }}>
                      {m.net > 0 ? `${m.net.toFixed(2)} €` : "—"}
                    </td>
                    <td style={{ padding: "14px 18px", fontSize: 14, color: "rgba(26,20,16,0.5)", fontWeight: 600 }}>
                      {m.avg > 0 ? `${m.avg.toFixed(2)} €` : "—"}
                    </td>
                  </tr>
                ))}

                {/* Ligne total */}
                <tr style={{ background: "#f5f0e8", borderTop: "2px solid rgba(0,0,0,0.1)" }}>
                  <td style={{ padding: "16px 18px", fontWeight: 950, fontSize: 15, color: "#1a1410" }}>TOTAL {year}</td>
                  <td style={{ padding: "16px 18px", fontWeight: 900, fontSize: 15, color: "#1a1410" }}>{yearOrders.length}</td>
                  <td style={{ padding: "16px 18px", fontWeight: 950, fontSize: 18, color: "#c49a4a" }}>{totalCA.toFixed(2)} €</td>
                  <td style={{ padding: "16px 18px", fontWeight: 900, fontSize: 15, color: "#b91c1c" }}>
                    {totalDis > 0 ? `−${totalDis.toFixed(2)} €` : "—"}
                  </td>
                  <td style={{ padding: "16px 18px", fontWeight: 950, fontSize: 16, color: "#166534" }}>
                    {(totalCA - totalDis).toFixed(2)} €
                  </td>
                  <td style={{ padding: "16px 18px", fontWeight: 900, fontSize: 15, color: "#1a1410" }}>
                    {yearOrders.length > 0 ? `${(totalCA / yearOrders.length).toFixed(2)} €` : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}