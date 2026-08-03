"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { isValidOrder } from "@/lib/orders";

// adminFetch — même pattern que les autres écrans admin (JWT Bearer depuis localStorage).
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

interface Order {
  id: string;
  invoice_number?: string | null;
  created_at: string;
  customer_name?: string | null;
  customer_email?: string | null;
  amount_total?: number | null;
  status?: string | null;
  // Requis par isValidOrder (exclusion du total net des factures remboursées / test).
  shipping_status?: string | null;
  is_internal_test?: boolean | null;
  classification?: string | null;
}

const STATUT_LABEL: Record<string, string> = {
  payee: "Payée", en_preparation: "En préparation", expediee: "Expédiée", livree: "Livrée",
  rembours_partiel: "Remb. partiel", remboursee: "Remboursée", annulee: "Annulée", echec_paiement: "Échec",
};

export default function AdminFactures() {
  const [orders,    setOrders]    = useState<Order[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [year,      setYear]      = useState<number | "all">(new Date().getFullYear());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    adminFetch("/api/admin/commandes-data")
      .then(r => r.json())
      .then((data: unknown) => { setOrders(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Factures = commandes ayant un numéro attribué. Tri par n° (= ordre d'émission séquentiel).
  const factures = useMemo(() =>
    orders
      .filter(o => o.invoice_number)
      .filter(o => year === "all" || new Date(o.created_at).getFullYear() === year)
      .sort((a, b) => String(a.invoice_number).localeCompare(String(b.invoice_number))),
    [orders, year]);

  const years = useMemo(() => {
    const s = new Set(orders.filter(o => o.invoice_number).map(o => new Date(o.created_at).getFullYear()));
    return Array.from(s).sort((a, b) => b - a);
  }, [orders]);

  // TOTAL NET ENCAISSÉ : on EXCLUT les factures non valides (remboursées / annulées / test) via
  // isValidOrder — une facture remboursée reste émise (n° conservé, ligne affichée + annotée) mais
  // ne compte PAS dans l'encaissement. Le journal listait tout et sommait tout → total gonflé.
  const totalNet    = factures.filter(isValidOrder).reduce((s, o) => s + Number(o.amount_total ?? 0), 0);

  // « Sans numéro de facture » : distinguer la RÈGLE MÉTIER de l'ANOMALIE. Une commande à 0 €
  // (cadeau intégralement offert, aucun port encaissé) n'est PAS facturée volontairement — il n'y a
  // rien à facturer. Une commande à montant > 0 sans numéro, elle, est une vraie attribution échouée.
  // Les tests internes sont exclus des deux (n'existent nulle part).
  const sansNumeroReel = orders.filter(o => !o.invoice_number && o.is_internal_test !== true);
  const nonFactureA0   = sansNumeroReel.filter(o => Number(o.amount_total ?? 0) === 0).length;
  const anomaliesFact  = sansNumeroReel.filter(o => Number(o.amount_total ?? 0) > 0).length;

  async function handleExport() {
    setExporting(true);
    try {
      const res = await adminFetch(`/api/admin/export/factures${year !== "all" ? `?year=${year}` : ""}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `milk-journal-factures${year !== "all" ? `-${year}` : ""}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Erreur lors de l'export."); }
    finally  { setExporting(false); }
  }

  async function handleExportXLSX() {
    setExporting(true);
    try {
      const res = await adminFetch(`/api/admin/export/factures-xlsx${year !== "all" ? `?year=${year}` : ""}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `milk-journal-factures${year !== "all" ? `-${year}` : ""}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Erreur lors de l'export Excel."); }
    finally  { setExporting(false); }
  }

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

  const selectStyle: React.CSSProperties = { padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", fontSize: 15, fontWeight: 700, background: "#fff", outline: "none" };
  const thStyle: React.CSSProperties = { padding: "13px 14px", textAlign: "left", fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", borderBottom: "2px solid rgba(0,0,0,0.06)", whiteSpace: "nowrap" };
  const tdStyle: React.CSSProperties = { padding: "14px", fontSize: 14, color: "#1a1410" };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>Factures</h1>
          <div style={{ fontSize: 15, color: "rgba(26,20,16,0.5)", marginTop: 4, fontWeight: 600 }}>
            Journal de ventes · {factures.length} facture{factures.length > 1 ? "s" : ""} · Assujetti à la TVA (20 %)
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <select value={String(year)} onChange={e => setYear(e.target.value === "all" ? "all" : Number(e.target.value))} style={selectStyle}>
            <option value="all">Toutes</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={handleExport} disabled={exporting || factures.length === 0}
            style={{ padding: "11px 18px", borderRadius: 10, background: "#1a1410", color: "#c49a4a", fontWeight: 800, fontSize: 14, border: "none", cursor: exporting ? "wait" : "pointer", opacity: (exporting || factures.length === 0) ? 0.5 : 1 }}>
            {exporting ? "..." : "⬇ CSV"}
          </button>
          <button onClick={handleExportXLSX} disabled={exporting || factures.length === 0}
            style={{ padding: "11px 18px", borderRadius: 10, background: "#1a1410", color: "#c49a4a", fontWeight: 800, fontSize: 14, border: "none", cursor: exporting ? "wait" : "pointer", opacity: (exporting || factures.length === 0) ? 0.5 : 1 }}>
            ⬇ Excel
          </button>
          {/* Journal imprimable / PDF — s'ouvre dans un nouvel onglet, filtre période CONSERVÉ (?year=…). */}
          <Link href={`/admin/factures/journal?year=${year}`} target="_blank"
            style={{ padding: "11px 18px", borderRadius: 10, background: "#fff", color: "#1a1410", fontWeight: 800, fontSize: 14, border: "1px solid rgba(0,0,0,0.15)", textDecoration: "none", ...(factures.length === 0 ? { opacity: 0.5, pointerEvents: "none" as const } : {}) }}>
            🖨 PDF
          </Link>
        </div>
      </div>

      {/* RÈGLE MÉTIER (neutre, pas une alerte) : commande à 0 € non facturée volontairement. */}
      {nonFactureA0 > 0 && (
        <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.1)", color: "rgba(26,20,16,0.6)", borderRadius: 10, padding: "12px 16px", fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
          {nonFactureA0} commande{nonFactureA0 > 1 ? "s" : ""} à 0 € non facturée{nonFactureA0 > 1 ? "s" : ""} — cadeau intégralement offert, aucun montant à facturer (règle métier, pas une anomalie).
        </div>
      )}
      {/* VRAIE anomalie : montant > 0 sans numéro attribué. */}
      {anomaliesFact > 0 && (
        <div style={{ background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e", borderRadius: 10, padding: "12px 16px", fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
          ⚠️ {anomaliesFact} commande{anomaliesFact > 1 ? "s" : ""} payée{anomaliesFact > 1 ? "s" : ""} (montant &gt; 0) sans numéro de facture — attribution échouée. À vérifier.
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.4 }}>Chargement...</div>
      ) : factures.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(26,20,16,0.4)" }}>Aucune facture pour cette période.</div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr style={{ background: "#fafaf9" }}>
                {["N° facture", "Date", "Client", "Montant net", "Statut", ""].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {factures.map((o, i) => {
                // Facture émise mais NON encaissée (remboursée / annulée / test) : ligne conservée
                // pour la continuité de numérotation, mais grisée, annotée, et EXCLUE du total net.
                const exclue = !isValidOrder(o);
                return (
                <tr key={o.id} style={{ borderBottom: i < factures.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", background: exclue ? "#faf7f2" : "transparent", opacity: exclue ? 0.7 : 1 }}>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontWeight: 800 }}>{o.invoice_number}</td>
                  <td style={{ ...tdStyle, color: "rgba(26,20,16,0.6)" }}>{fmtDate(o.created_at)}</td>
                  <td style={tdStyle}>
                    {o.customer_name || o.customer_email || "—"}
                    {exclue && (
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#b91c1c", marginTop: 2 }}>
                        {o.is_internal_test === true ? "test — " : ""}{String(o.status) === "remboursee" ? "remboursée" : "annulée"}, exclue du total
                      </div>
                    )}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 900, color: exclue ? "rgba(26,20,16,0.35)" : "#c49a4a", textDecoration: exclue ? "line-through" : "none" }}>{Number(o.amount_total ?? 0).toFixed(2)} €</td>
                  <td style={{ ...tdStyle, color: "rgba(26,20,16,0.6)" }}>{STATUT_LABEL[String(o.status)] ?? o.status ?? "—"}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <Link href={`/admin/factures/${o.id}`} target="_blank"
                      style={{ padding: "8px 16px", borderRadius: 8, background: "#ede8df", color: "#1a1410", fontWeight: 800, fontSize: 13, textDecoration: "none", whiteSpace: "nowrap" }}>
                      🖨 Imprimer
                    </Link>
                  </td>
                </tr>
                );
              })}
              <tr style={{ background: "#ede8df", borderTop: "2px solid rgba(0,0,0,0.1)" }}>
                <td style={{ padding: "16px 14px", fontWeight: 950, fontSize: 14 }} colSpan={3}>TOTAL NET ENCAISSÉ{year !== "all" ? ` ${year}` : ""}</td>
                <td style={{ padding: "16px 14px", fontWeight: 950, fontSize: 16, color: "#c49a4a" }}>{totalNet.toFixed(2)} €</td>
                <td colSpan={2} style={{ padding: "16px 14px", fontSize: 12, color: "rgba(26,20,16,0.5)", fontWeight: 600 }}>hors factures remboursées / test</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
