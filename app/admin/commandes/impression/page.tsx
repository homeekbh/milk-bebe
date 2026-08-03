"use client";

import { useEffect, useState } from "react";
import { EMETTEUR } from "../../factures/emetteur";
import { countsInAccounting, isValidOrder, caProduits, portEncaisse, classificationLabel } from "@/lib/orders";
import { tvaFromTTC } from "@/lib/tva";

// Vue IMPRIMABLE des commandes (PDF via le navigateur — AUCUNE dépendance PDF serveur). Même patron
// que le journal des factures : en-tête émetteur EKBH SASU, période, date d'édition, pagination @page,
// palette sobre M!LK. Réconciliation explicite : CA produits + Port encaissé = Total net encaissé.

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

const STATUT_LABEL: Record<string, string> = {
  en_preparation: "En préparation", label_created: "Étiquette créée", expediee: "Expédiée",
  livree: "Livrée", retour: "Retour", annulee: "Annulée", remboursee: "Remboursée",
  rembours_partiel: "Remb. partiel", payee: "Payée",
};
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const euro = (n: number) => `${(Number(n ?? 0)).toFixed(2)} €`;
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

interface Order {
  id: string; invoice_number?: string | null; created_at: string;
  customer_name?: string | null; amount_total?: number | null; delivery_price?: number | null;
  status?: string | null; shipping_status?: string | null;
  is_internal_test?: boolean | null; classification?: string | null;
}

export default function CommandesPrint() {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState("");
  const [year, setYear]       = useState<number | "all">("all");
  const [editedAt, setEditedAt] = useState("");

  useEffect(() => {
    try {
      const y = new URLSearchParams(window.location.search).get("year");
      setYear(y && y !== "all" && Number.isFinite(Number(y)) ? Number(y) : "all");
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

  const rows    = orders.filter(o => year === "all" || new Date(o.created_at).getFullYear() === year)
                        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const periode = year === "all" ? "Toutes les commandes" : `Année ${year}`;

  const ventes    = rows.filter(countsInAccounting);
  const caProd    = caProduits(rows);
  const port      = portEncaisse(rows);
  const totalEnc  = round2(caProd + port);
  const tva       = tvaFromTTC(totalEnc);
  const ht        = round2(totalEnc - tva);

  if (loading) return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Chargement…</div>;
  if (err)     return <div style={{ padding: 40, fontFamily: "sans-serif", color: "#b91c1c" }}>{err}</div>;

  const box: React.CSSProperties = { maxWidth: 860, margin: "0 auto", padding: 40, background: "#fff", color: "#1a1410", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", lineHeight: 1.5 };
  const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: "2px solid #1a1410", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "7px 10px", borderBottom: "1px solid rgba(0,0,0,0.1)", fontSize: 12, verticalAlign: "top" };
  const sumRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", fontSize: 12.5 };

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
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 0.5 }}>REGISTRE DES COMMANDES</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.7)", marginTop: 6 }}>Période : {periode}</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.7)" }}>Édité le {editedAt}</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.7)", marginTop: 4 }}>{rows.length} commande{rows.length > 1 ? "s" : ""}</div>
          </div>
        </div>

        <div style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(26,20,16,0.6)", marginBottom: 14 }}>
          Montants en euros TTC. Collab / cadeau = produit offert, seul le port est encaissé. Test interne exclu des totaux.
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(26,20,16,0.4)" }}>Aucune commande pour cette période.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>N° facture</th>
                <th style={th}>Date</th>
                <th style={th}>Client</th>
                <th style={th}>Classification</th>
                <th style={{ ...th, textAlign: "right" }}>Montant TTC</th>
                <th style={{ ...th, textAlign: "right" }}>dont port</th>
                <th style={th}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(o => {
                const exclu = !isValidOrder(o);
                return (
                  <tr key={o.id} style={exclu ? { color: "rgba(26,20,16,0.5)" } : undefined}>
                    <td style={{ ...td, fontFamily: "monospace", whiteSpace: "nowrap" }}>{o.invoice_number || "—"}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtDate(o.created_at)}</td>
                    <td style={td}>
                      {o.customer_name || "—"}
                      {exclu && <span style={{ color: "#b91c1c", fontWeight: 700 }}> — {o.is_internal_test === true ? "test — " : ""}{String(o.status) === "remboursee" ? "remboursée" : "annulée"}, hors total</span>}
                    </td>
                    <td style={td}>{classificationLabel(o)}</td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap", textDecoration: exclu ? "line-through" : "none" }}>{euro(Number(o.amount_total ?? 0))}</td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>{euro(Number(o.delivery_price ?? 0))}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{STATUT_LABEL[String(o.shipping_status)] ?? o.shipping_status ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Réconciliation : CA produits + Port encaissé = Total net encaissé */}
        {rows.length > 0 && (
          <div style={{ marginTop: 18, marginLeft: "auto", width: 320, display: "grid", gap: 6 }}>
            <div style={sumRow}><span>Ventes clientes</span><span>{ventes.length}</span></div>
            <div style={sumRow}><span>CA produits</span><span>{euro(caProd)}</span></div>
            <div style={sumRow}><span>Port encaissé (toutes commandes)</span><span>{euro(port)}</span></div>
            <div style={{ ...sumRow, fontWeight: 900, borderTop: "2px solid #1a1410", paddingTop: 6, marginTop: 2 }}><span>Total net encaissé TTC</span><span>{euro(totalEnc)}</span></div>
            <div style={{ ...sumRow, color: "rgba(26,20,16,0.7)" }}><span>dont HT</span><span>{euro(ht)}</span></div>
            <div style={{ ...sumRow, color: "rgba(26,20,16,0.7)" }}><span>dont TVA (20 %)</span><span>{euro(tva)}</span></div>
          </div>
        )}

        <div style={{ marginTop: 26, paddingTop: 14, borderTop: "1px solid rgba(0,0,0,0.12)", fontSize: 11.5, color: "rgba(26,20,16,0.6)" }}>
          Montants en euros TTC (TVA 20 % incluse). N° TVA intracommunautaire : {EMETTEUR.tva}. {EMETTEUR.legal} — SIREN {EMETTEUR.siren} — {EMETTEUR.address}
        </div>
      </div>
    </div>
  );
}
