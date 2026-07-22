"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { EMETTEUR } from "../emetteur";

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

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const euro = (n: number) => `${Number(n ?? 0).toFixed(2)} €`;

export default function FacturePrint() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [order,   setOrder]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState("");

  useEffect(() => {
    if (!id) return;
    adminFetch(`/api/admin/factures/${id}`)
      .then(async r => { if (!r.ok) throw new Error("Facture introuvable ou accès refusé."); return r.json(); })
      .then(setOrder)
      .catch(e => setErr(e?.message ?? "Erreur"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Chargement…</div>;
  if (err || !order) return <div style={{ padding: 40, fontFamily: "sans-serif", color: "#b91c1c" }}>{err || "Introuvable"}</div>;

  const addr     = order.shipping_address ?? null;
  const items    = Array.isArray(order.items) ? order.items : [];
  const discount = Number(order.discount ?? 0);
  const shipping = Number(order.delivery_price ?? 0);
  const total    = Number(order.amount_total ?? 0);
  const subtotal = items.reduce((s: number, it: any) => s + Number(it.price ?? 0) * Number(it.quantity ?? 1), 0);

  const box: React.CSSProperties = { maxWidth: 720, margin: "0 auto", padding: 40, background: "#fff", color: "#1a1410", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", lineHeight: 1.5 };
  const th: React.CSSProperties = { textAlign: "left", padding: "8px 0", borderBottom: "2px solid #1a1410", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 };
  const td: React.CSSProperties = { padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.08)", fontSize: 14 };

  return (
    <div style={{ background: "#f5f2ec", minHeight: "100vh", paddingBottom: 60 }}>
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff !important; } }`}</style>

      <div className="no-print" style={{ maxWidth: 720, margin: "0 auto", padding: "20px 40px 0", display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <button onClick={() => window.print()}
          style={{ padding: "11px 22px", borderRadius: 10, background: "#1a1410", color: "#c49a4a", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer" }}>
          🖨 Imprimer
        </button>
      </div>

      <div style={box}>
        {/* En-tête : émetteur + n° facture */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 950, letterSpacing: -1 }}>{EMETTEUR.brand}</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.7)", marginTop: 6 }}>
              {EMETTEUR.legal}<br />
              {EMETTEUR.address}<br />
              SIREN : {EMETTEUR.siren}<br />
              N° TVA : {EMETTEUR.tva}<br />
              {EMETTEUR.email}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 1 }}>FACTURE</div>
            <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 800, marginTop: 6 }}>{order.invoice_number ?? "—"}</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.7)", marginTop: 4 }}>Date : {fmtDate(order.created_at)}</div>
          </div>
        </div>

        {/* Client */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "rgba(26,20,16,0.4)", marginBottom: 6 }}>Facturé à</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{order.customer_name || "—"}</div>
          {addr && (
            <div style={{ fontSize: 14, color: "rgba(26,20,16,0.75)", marginTop: 2 }}>
              {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}<br />
              {addr.postal_code} {addr.city}<br />
              {addr.country ?? "FR"}
            </div>
          )}
          <div style={{ fontSize: 13, color: "rgba(26,20,16,0.55)", marginTop: 4 }}>{order.customer_email}</div>
        </div>

        {/* Lignes */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
          <thead>
            <tr>
              <th style={th}>Article</th>
              <th style={{ ...th, textAlign: "center", width: 60 }}>Qté</th>
              <th style={{ ...th, textAlign: "right", width: 110 }}>Montant</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any, i: number) => (
              <tr key={i}>
                <td style={td}>{it.name}{it.taille ? ` — ${it.taille}` : ""}</td>
                <td style={{ ...td, textAlign: "center" }}>{it.quantity ?? 1}</td>
                <td style={{ ...td, textAlign: "right" }}>{euro(Number(it.price ?? 0) * Number(it.quantity ?? 1))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totaux */}
        <div style={{ marginLeft: "auto", width: 280, display: "grid", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
            <span>Sous-total</span><span>{euro(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#16a34a" }}>
              <span>Remise{order.promo_code ? ` (${order.promo_code})` : ""}</span><span>− {euro(discount)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
            <span>Frais de port</span><span>{shipping > 0 ? euro(shipping) : "Offerts"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 950, borderTop: "2px solid #1a1410", paddingTop: 8, marginTop: 4 }}>
            <span>TOTAL</span><span>{euro(total)}</span>
          </div>
        </div>

        {/* Mention légale OBLIGATOIRE (franchise) — AUCUNE ligne de TVA sur cette facture. */}
        <div style={{ marginTop: 36, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.1)", fontSize: 12, color: "rgba(26,20,16,0.6)" }}>
          <strong>TVA non applicable, art. 293 B du CGI.</strong><br />
          Prix nets en euros. {EMETTEUR.legal} — SIREN {EMETTEUR.siren} — {EMETTEUR.address}
          {order.status === "remboursee" && order.refunded_at && (
            <><br /><span style={{ color: "#b91c1c" }}>Commande remboursée le {fmtDate(order.refunded_at)}.</span></>
          )}
          {order.status === "rembours_partiel" && Number(order.refund_amount ?? 0) > 0 && (
            <><br /><span style={{ color: "#b45309" }}>Remboursement partiel de {euro(Number(order.refund_amount))} effectué.</span></>
          )}
        </div>
      </div>
    </div>
  );
}
