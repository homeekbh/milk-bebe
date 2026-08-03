"use client";

import { useEffect, useState } from "react";
import { EMETTEUR } from "../../factures/emetteur";
import { productPart, portPart, caProduits, portEncaisse, countsInAccounting } from "@/lib/orders";
import { tvaFromTTC } from "@/lib/tva";

// Vue IMPRIMABLE de la comptabilité (PDF navigateur — aucune dépendance PDF serveur). En-tête émetteur
// EKBH SASU, période (année), date d'édition, pagination @page, palette sobre. Décomposition
// produits / port / total, ventilation TVA en pied. Mêmes fonctions de périmètre que la page écran.

function adminFetch(url: string, options: RequestInit = {}) {
  let token = "";
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? "";
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const parsed = JSON.parse(localStorage.getItem(key) ?? "{}");
        token = parsed.access_token ?? "";
        if (token) break;
      }
    }
  } catch {}
  return fetch(url, { ...options, headers: { ...(options.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
}

const euro = (n: number) => `${(Number(n ?? 0)).toFixed(2)} €`;
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

interface Order {
  id: string; created_at: string; amount_total?: number | null; delivery_price?: number | null;
  discount?: number | null; status?: string | null; shipping_status?: string | null;
  is_internal_test?: boolean | null; classification?: string | null; refund_amount?: number | null;
}

export default function ComptabilitePrint() {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState("");
  const [year, setYear]       = useState<number>(new Date().getFullYear());
  const [editedAt, setEditedAt] = useState("");

  useEffect(() => {
    try {
      const y = new URLSearchParams(window.location.search).get("year");
      if (y && Number.isFinite(Number(y))) setYear(Number(y));
    } catch {}
    setEditedAt(new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }));
  }, []);

  useEffect(() => {
    adminFetch("/api/admin/commandes-data")
      .then(async r => { if (!r.ok) throw new Error("Accès refusé ou données indisponibles."); return r.json(); })
      .then((data: unknown) => setOrders(Array.isArray(data) ? (data as Order[]) : []))
      .catch(e => setErr(e?.message ?? "Erreur"))
      .finally(() => setLoading(false));
  }, []);

  const yearOrders = orders.filter(o => new Date(o.created_at).getFullYear() === year);
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const inMonth = yearOrders.filter(o => new Date(o.created_at).getMonth() + 1 === m);
    const prod  = round2(inMonth.reduce((s, o) => s + productPart(o), 0));
    const port  = round2(inMonth.reduce((s, o) => s + portPart(o), 0));
    const total = round2(prod + port);
    const tva   = tvaFromTTC(total);
    const ventes = inMonth.filter(countsInAccounting).length;
    return {
      label: new Date(year, i, 1).toLocaleDateString("fr-FR", { month: "long" }),
      ventes, prod, port, total, tva, ht: round2(total - tva),
    };
  });

  const totalProd = caProduits(yearOrders);
  const totalPort = portEncaisse(yearOrders);
  const totalEnc  = round2(totalProd + totalPort);
  const totalTva  = tvaFromTTC(totalEnc);
  const totalHT   = round2(totalEnc - totalTva);
  const ventesY   = yearOrders.filter(countsInAccounting).length;

  if (loading) return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Chargement…</div>;
  if (err)     return <div style={{ padding: 40, fontFamily: "sans-serif", color: "#b91c1c" }}>{err}</div>;

  const box: React.CSSProperties = { maxWidth: 860, margin: "0 auto", padding: 40, background: "#fff", color: "#1a1410", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", lineHeight: 1.5 };
  const th: React.CSSProperties = { textAlign: "right", padding: "8px 10px", borderBottom: "2px solid #1a1410", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap" };
  const thL: React.CSSProperties = { ...th, textAlign: "left" };
  const td: React.CSSProperties = { padding: "7px 10px", borderBottom: "1px solid rgba(0,0,0,0.1)", fontSize: 12, textAlign: "right", whiteSpace: "nowrap" };
  const tdL: React.CSSProperties = { ...td, textAlign: "left", textTransform: "capitalize", fontWeight: 700 };

  return (
    <div style={{ background: "#f5f2ec", minHeight: "100vh", paddingBottom: 60 }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          @page { size: A4 portrait; margin: 14mm; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
          .doc-box { max-width: none !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      <div className="no-print" style={{ maxWidth: 860, margin: "0 auto", padding: "20px 40px 0", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => window.print()}
          style={{ padding: "11px 22px", borderRadius: 10, background: "#1a1410", color: "#c49a4a", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer" }}>
          Imprimer / PDF
        </button>
      </div>

      <div style={box} className="doc-box">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: -1 }}>{EMETTEUR.brand}</div>
            <div style={{ fontSize: 12.5, color: "rgba(26,20,16,0.7)", marginTop: 6 }}>
              {EMETTEUR.legal}<br />{EMETTEUR.address}<br />SIREN : {EMETTEUR.siren}<br />N° TVA : {EMETTEUR.tva}<br />{EMETTEUR.email}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 0.5 }}>RÉCAPITULATIF COMPTABLE</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.7)", marginTop: 6 }}>Période : Année {year}</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.7)" }}>Édité le {editedAt}</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.7)", marginTop: 4 }}>Assujetti à la TVA (20 %)</div>
          </div>
        </div>

        <div style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(26,20,16,0.6)", marginBottom: 14 }}>
          Total encaissé = CA produits + Port encaissé. Le port inclut collabs et cadeaux (produit offert,
          livraison réellement payée). Montants en euros TTC, TVA 20 % « en dedans ».
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thL}>Mois</th>
              <th style={th}>Ventes</th>
              <th style={th}>CA produits</th>
              <th style={th}>Port encaissé</th>
              <th style={th}>Total encaissé</th>
              <th style={th}>dont TVA</th>
              <th style={th}>dont HT</th>
            </tr>
          </thead>
          <tbody>
            {months.map(m => (
              <tr key={m.label}>
                <td style={tdL}>{m.label}</td>
                <td style={td}>{m.ventes > 0 ? m.ventes : "—"}</td>
                <td style={td}>{m.prod > 0 ? euro(m.prod) : "—"}</td>
                <td style={td}>{m.port > 0 ? euro(m.port) : "—"}</td>
                <td style={{ ...td, fontWeight: 800 }}>{m.total > 0 ? euro(m.total) : "—"}</td>
                <td style={td}>{m.tva > 0 ? euro(m.tva) : "—"}</td>
                <td style={td}>{m.ht > 0 ? euro(m.ht) : "—"}</td>
              </tr>
            ))}
            <tr>
              <td style={{ ...tdL, borderTop: "2px solid #1a1410", fontWeight: 950 }}>TOTAL {year}</td>
              <td style={{ ...td, borderTop: "2px solid #1a1410", fontWeight: 900 }}>{ventesY}</td>
              <td style={{ ...td, borderTop: "2px solid #1a1410", fontWeight: 900 }}>{euro(totalProd)}</td>
              <td style={{ ...td, borderTop: "2px solid #1a1410", fontWeight: 900 }}>{euro(totalPort)}</td>
              <td style={{ ...td, borderTop: "2px solid #1a1410", fontWeight: 950 }}>{euro(totalEnc)}</td>
              <td style={{ ...td, borderTop: "2px solid #1a1410", fontWeight: 900 }}>{euro(totalTva)}</td>
              <td style={{ ...td, borderTop: "2px solid #1a1410", fontWeight: 900 }}>{euro(totalHT)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 26, paddingTop: 14, borderTop: "1px solid rgba(0,0,0,0.12)", fontSize: 11.5, color: "rgba(26,20,16,0.6)" }}>
          Montants en euros TTC (TVA 20 % incluse). N° TVA intracommunautaire : {EMETTEUR.tva}. {EMETTEUR.legal} — SIREN {EMETTEUR.siren} — {EMETTEUR.address}
        </div>
      </div>
    </div>
  );
}
