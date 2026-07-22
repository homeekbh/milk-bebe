"use client";

import { useEffect, useState } from "react";
import { EMETTEUR } from "../emetteur";
import { ventilateTTC } from "@/lib/tva";

// Journal des ventes IMPRIMABLE (PDF via le navigateur — AUCUNE dépendance PDF serveur). Même principe
// que la facture unitaire /admin/factures/[id]. Données : /api/admin/commandes-data — MÊME source que la
// liste /admin/factures — filtrées sur invoice_number + période (aucune duplication de la logique de
// récupération des factures). Assujetti à la TVA 20 % : montants TTC + ventilation HT/TVA en pied.
// NB route : segment statique "journal" prioritaire sur le dynamique [id] → pas de collision.

// adminFetch — même pattern que /admin/factures (JWT Bearer depuis localStorage).
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

// Libellés de statut — mêmes valeurs que la liste /admin/factures (affichage).
const STATUT_LABEL: Record<string, string> = {
  payee: "Payée", en_preparation: "En préparation", expediee: "Expédiée", livree: "Livrée",
  rembours_partiel: "Remb. partiel", remboursee: "Remboursée", annulee: "Annulée", echec_paiement: "Échec",
};

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const euro = (n: number) => `${Number(n ?? 0).toFixed(2)} €`;

interface Order {
  id: string; invoice_number?: string | null; created_at: string;
  customer_name?: string | null; customer_email?: string | null;
  amount_total?: number | null; status?: string | null;
}

export default function JournalPrint() {
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState("");
  const [year,    setYear]    = useState<number | "all">("all");
  const [editedAt, setEditedAt] = useState("");

  // Année lue depuis l'URL (?year=2026 | all) côté client → pas de useSearchParams (pas de Suspense).
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

  // Factures = commandes avec numéro, filtrées par période, triées par n° (= ordre d'émission).
  const factures = orders
    .filter(o => o.invoice_number)
    .filter(o => year === "all" || new Date(o.created_at).getFullYear() === year)
    .sort((a, b) => String(a.invoice_number).localeCompare(String(b.invoice_number)));
  const totalNet = factures.reduce((s, o) => s + Number(o.amount_total ?? 0), 0);
  const periode  = year === "all" ? "Toutes les factures émises" : `Année ${year}`;

  const vatTotal = ventilateTTC(totalNet); // ventilation TVA 20 % « en dedans » du total encaissé (TTC)

  if (loading) return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Chargement…</div>;
  if (err)     return <div style={{ padding: 40, fontFamily: "sans-serif", color: "#b91c1c" }}>{err}</div>;

  const box: React.CSSProperties = { maxWidth: 820, margin: "0 auto", padding: 40, background: "#fff", color: "#1a1410", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", lineHeight: 1.5 };
  const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: "2px solid #1a1410", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "7px 10px", borderBottom: "1px solid rgba(0,0,0,0.1)", fontSize: 12.5, verticalAlign: "top" };

  return (
    <div style={{ background: "#f5f2ec", minHeight: "100vh", paddingBottom: 60 }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          @page { size: A4 portrait; margin: 14mm; }
          thead { display: table-header-group; }   /* en-têtes de colonnes répétés sur chaque page */
          tr { page-break-inside: avoid; }          /* ne pas couper une ligne entre 2 pages */
          .jrnl-box { max-width: none !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      <div className="no-print" style={{ maxWidth: 820, margin: "0 auto", padding: "20px 40px 0", display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <button onClick={() => window.print()}
          style={{ padding: "11px 22px", borderRadius: 10, background: "#1a1410", color: "#c49a4a", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer" }}>
          🖨 Imprimer / PDF
        </button>
      </div>

      <div style={box} className="jrnl-box">
        {/* En-tête : émetteur (gauche) + titre / période / date d'édition (droite) */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: -1 }}>{EMETTEUR.brand}</div>
            <div style={{ fontSize: 12.5, color: "rgba(26,20,16,0.7)", marginTop: 6 }}>
              {EMETTEUR.legal}<br />
              {EMETTEUR.address}<br />
              SIREN : {EMETTEUR.siren}<br />
              N° TVA : {EMETTEUR.tva}<br />
              {EMETTEUR.email}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 0.5 }}>JOURNAL DES VENTES</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.7)", marginTop: 6 }}>Période : {periode}</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.7)" }}>Édité le {editedAt}</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.7)", marginTop: 4 }}>{factures.length} facture{factures.length > 1 ? "s" : ""}</div>
          </div>
        </div>

        <div style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(26,20,16,0.6)", marginBottom: 14 }}>
          Montants en euros TTC — TVA 20 % incluse (ventilation HT/TVA en pied).
        </div>

        {factures.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(26,20,16,0.4)" }}>Aucune facture pour cette période.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>N° facture</th>
                <th style={th}>Date</th>
                <th style={th}>Client</th>
                <th style={th}>Email</th>
                <th style={{ ...th, textAlign: "right" }}>Montant TTC</th>
                <th style={th}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {factures.map(o => (
                <tr key={o.id}>
                  <td style={{ ...td, fontFamily: "monospace", fontWeight: 700, whiteSpace: "nowrap" }}>{o.invoice_number}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtDate(o.created_at)}</td>
                  <td style={td}>{o.customer_name || "—"}</td>
                  <td style={{ ...td, color: "rgba(26,20,16,0.7)", wordBreak: "break-all" }}>{o.customer_email || "—"}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>{euro(Number(o.amount_total ?? 0))}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{STATUT_LABEL[String(o.status)] ?? o.status ?? "—"}</td>
                </tr>
              ))}
              {/* Total général — dernière ligne (apparaît une seule fois, en fin de journal). */}
              <tr>
                <td colSpan={4} style={{ padding: "12px 10px", fontWeight: 950, fontSize: 13, borderTop: "2px solid #1a1410" }}>
                  TOTAL{year === "all" ? "" : ` ${year}`} — {factures.length} facture{factures.length > 1 ? "s" : ""}
                </td>
                <td style={{ padding: "12px 10px", fontWeight: 950, fontSize: 14, textAlign: "right", borderTop: "2px solid #1a1410", whiteSpace: "nowrap" }}>{euro(totalNet)}</td>
                <td style={{ borderTop: "2px solid #1a1410" }} />
              </tr>
            </tbody>
          </table>
        )}

        {/* Récapitulatif TVA (assujetti 20 %) — ventilation « en dedans » du total encaissé TTC. */}
        {factures.length > 0 && (
          <div style={{ marginTop: 18, marginLeft: "auto", width: 300, display: "grid", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}><span>Total HT</span><span>{euro(vatTotal.ht)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}><span>TVA ({vatTotal.ratePct} %)</span><span>{euro(vatTotal.tva)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 900, borderTop: "2px solid #1a1410", paddingTop: 6, marginTop: 2 }}><span>Total TTC</span><span>{euro(vatTotal.ttc)}</span></div>
          </div>
        )}

        {/* Pied — mention légale (assujetti à la TVA 20 %). */}
        <div style={{ marginTop: 26, paddingTop: 14, borderTop: "1px solid rgba(0,0,0,0.12)", fontSize: 11.5, color: "rgba(26,20,16,0.6)" }}>
          Montants en euros TTC (TVA 20 % incluse). N° TVA intracommunautaire : {EMETTEUR.tva}. {EMETTEUR.legal} — SIREN {EMETTEUR.siren} — {EMETTEUR.address}
        </div>
      </div>
    </div>
  );
}
