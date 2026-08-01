"use client";

import { useEffect, useState, useMemo } from "react";
import { countsInAccounting, getNetAmount } from "@/lib/orders";
import { tvaFromTTC, htFromTTC } from "@/lib/tva";

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
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    },
  });
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

interface Order {
  id: string;
  created_at: string;
  amount_total: number;
  customer_name: string;
  customer_email: string;
  items: any[];
  promo_code?: string;
  discount?: number;
  // Champs requis par isValidOrder / getNetAmount — sans eux les commandes
  // annulées/remboursées seraient comptées dans le CA mensuel.
  status?:          string | null;
  shipping_status?: string | null;
  refund_amount?:   number | null;
  // Décomposition CA : frais de port stockés séparément depuis le webhook Stripe.
  delivery_price?:  number | null;
  // Seuil OSS UE : pays de livraison + HT figé (sinon recalculé à la volée htFromTTC).
  shipping_country?: string | null;
  montant_ht?:       number | null;
}

interface MonthData {
  key:          string;
  label:        string;
  ca:           number;  // CA TTC total encaissé (produits + livraison), net de remise
  ca_produit:   number;  // CA produits TTC net encaissé (= ca − port), déjà net de remise
  ca_livraison: number;  // Frais de port TTC perçus
  ht:           number;  // CA HT (base imposable) = ca − tva
  tva:          number;  // TVA collectée (20 % « en dedans ») sur le CA total (produits + port)
  orders:       number;
  avg:          number;
  discount:     number;
  net:          number;  // = ca_produit (net encaissé) ; on ne re-soustrait PAS la remise (déjà net)
}

// M!LK (EKBH SASU) est ASSUJETTIE À LA TVA (taux normal FR 20 %). Prix TTC → TVA « en dedans »
// (HT = TTC / 1,20). La TVA est ventilée sur TOUT le CA (produits + port), pas seulement le port.
// Taux + formule = source unique lib/tva.ts.

export default function AdminComptabilite() {
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [year,    setYear]    = useState(new Date().getFullYear());

  useEffect(() => {
    adminFetch("/api/admin/commandes-data")
      .then(r => r.json())
      .then((data: unknown) => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Source unique de vérité : seules les commandes valides au sens M!LK
  // (cf. lib/orders.ts) contribuent au CA. Filtre AVANT toute agrégation
  // pour exclure annulées/remboursées/échecs paiement.
  // ACCOUNTING (cliente + vente_directe) : le CA comptable inclut les ventes physiques encaissées.
  const validOrders = useMemo(() => orders.filter(countsInAccounting), [orders]);

  const months = useMemo((): MonthData[] => {
    const map: Record<string, MonthData> = {};

    for (let m = 1; m <= 12; m++) {
      const key   = `${year}-${String(m).padStart(2, "0")}`;
      const label = new Date(year, m - 1, 1).toLocaleDateString("fr-FR", { month: "long" });
      map[key]    = {
        key, label,
        ca: 0, ca_produit: 0, ca_livraison: 0, ht: 0, tva: 0,
        orders: 0, avg: 0, discount: 0, net: 0,
      };
    }

    for (const o of validOrders) {
      const d = new Date(o.created_at);
      if (d.getFullYear() !== year) continue;
      const key = `${year}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = map[key];
      if (!entry) continue;
      // getNetAmount = amount_total - refund_amount (clamp 0). Pour les
      // remboursements partiels (status='rembours_partiel'), le CA tient
      // déjà compte du montant remboursé.
      const net          = getNetAmount(o);
      const livraisonTTC = Number(o.delivery_price ?? 0);
      // On clamp produit ≥ 0 : si le refund partiel a "mangé" la livraison
      // dans le net, on n'affiche pas un produit négatif.
      const produit      = Math.max(0, net - livraisonTTC);
      entry.ca            += net;
      entry.ca_produit    += produit;
      entry.ca_livraison  += livraisonTTC;
      entry.orders        += 1;
      entry.discount      += Number(o.discount ?? 0);
    }

    return Object.values(map).map(m => {
      // TVA collectée « en dedans » sur le CA TTC total ; HT = différence (ht + tva === ca).
      const tva = tvaFromTTC(m.ca);
      return {
        ...m,
        avg: m.orders > 0 ? m.ca / m.orders : 0,
        // « CA produits net » = produit NET réellement encaissé (amount_total est DÉJÀ net de remise).
        // On ne re-soustrait PAS la remise ici (ce serait un double comptage).
        net: m.ca_produit,
        tva,
        ht: round2(m.ca - tva),
      };
    });
  }, [validOrders, year]);

  const yearOrders     = validOrders.filter(o => new Date(o.created_at).getFullYear() === year);
  const totalCA        = yearOrders.reduce((s, o) => s + getNetAmount(o), 0);              // CA TTC
  const totalLivraison = yearOrders.reduce((s, o) => s + Number(o.delivery_price ?? 0), 0); // Port TTC
  const totalProduit   = Math.max(0, totalCA - totalLivraison);                            // produits TTC net
  const totalDis       = yearOrders.reduce((s, o) => s + Number(o.discount ?? 0), 0);
  const totalTva       = tvaFromTTC(totalCA);                                              // TVA collectée
  const totalHT        = round2(totalCA - totalTva);                                       // base imposable
  const maxCA          = Math.max(...months.map(m => m.ca), 1);

  // ── Seuil OSS (ventes à distance intra-UE) — indicateur de PILOTAGE, PAS un blocage ───────────────
  // Cumul des ventes UE HORS France en HT, sur l'ANNÉE CIVILE EN COURS (indépendant du sélecteur year).
  // Au-delà de 10 000 € HT/an, la TVA du PAYS DU CLIENT s'applique (guichet unique OSS). HT = montant_ht
  // figé si présent, sinon recalculé (htFromTTC). shipping_country ≠ FR = client UE (CH/UK bloqués au tunnel).
  const OSS_THRESHOLD = 10000;
  const OSS_WARN      = 7000;
  const euYear = new Date().getFullYear();
  const euHT   = validOrders
    .filter(o => new Date(o.created_at).getFullYear() === euYear
              && !!o.shipping_country && String(o.shipping_country).trim().toUpperCase() !== "FR")
    .reduce((s, o) => s + (Number(o.montant_ht) || htFromTTC(Number(o.amount_total ?? 0))), 0);
  const euPct  = Math.min(100, OSS_THRESHOLD > 0 ? (euHT / OSS_THRESHOLD) * 100 : 0);
  const euNear = euHT >= OSS_WARN;

  function exportCSV() {
    const header = [
      "Mois", "Commandes", "Transporteur",
      "CA HT (€)", "TVA 20% (€)", "CA TTC (€)",
      "dont Produits net TTC (€)", "dont Port TTC (€)", "Remises (€)", "Panier moyen TTC (€)",
    ].join(";");
    const rows = months.map(m =>
      [
        m.label,
        m.orders,
        m.orders > 0 ? "Colissimo" : "",
        m.ht.toFixed(2),
        m.tva.toFixed(2),
        m.ca.toFixed(2),
        m.ca_produit.toFixed(2),  // produits net TTC
        m.ca_livraison.toFixed(2),
        m.discount.toFixed(2),
        m.avg.toFixed(2),
      ].join(";")
    );
    const total = [
      "TOTAL",
      yearOrders.length,
      yearOrders.length > 0 ? "Colissimo" : "",
      totalHT.toFixed(2),
      totalTva.toFixed(2),
      totalCA.toFixed(2),
      totalProduit.toFixed(2),
      totalLivraison.toFixed(2),
      totalDis.toFixed(2),
      yearOrders.length > 0 ? (totalCA / yearOrders.length).toFixed(2) : "0",
    ].join(";");
    const csv    = "﻿" + [header, ...rows, total].join("\n");
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
          <div style={{ fontSize: 15, color: "rgba(26,20,16,0.5)", marginTop: 4, fontWeight: 600 }}>CA mensuel · {year} · Assujetti à la TVA (taux normal 20 %)</div>
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

      {/* KPIs — vue fiscale : CA HT / TVA collectée / CA TTC */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 32 }}>
        {[
          { label: "CA HT (base imposable)", value: `${totalHT.toFixed(2)} €`,                                                  color: "#166534" },
          { label: "TVA collectée (20 %)",   value: `${totalTva.toFixed(2)} €`,                                                 color: "#475569" },
          { label: "CA TTC encaissé",        value: `${totalCA.toFixed(2)} €`,                                                  color: "#c49a4a" },
          { label: "Commandes",              value: String(yearOrders.length),                                                 color: "#1a1410" },
          { label: "Panier moyen TTC",       value: yearOrders.length > 0 ? `${(totalCA / yearOrders.length).toFixed(2)} €` : "—", color: "#1a1410" },
          { label: "dont Frais Port TTC",    value: `${totalLivraison.toFixed(2)} €`,                                           color: "#1a1410" },
          { label: "Remises totales",        value: `−${totalDis.toFixed(2)} €`,                                                color: "#b91c1c" },
        ].map(stat => (
          <div key={stat.label} style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)", padding: "18px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: -1, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: "rgba(26,20,16,0.4)", marginTop: 6, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Seuil OSS (ventes à distance intra-UE) — indicateur de pilotage, PAS un blocage. */}
      <div style={{ background: euNear ? "#fef3c7" : "#fff", border: `1px solid ${euNear ? "#fde68a" : "rgba(0,0,0,0.07)"}`, borderRadius: 14, padding: "16px 20px", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#1a1410" }}>Seuil OSS · Ventes UE hors France (HT) — {euYear}</div>
          <div style={{ fontWeight: 950, fontSize: 16, color: euNear ? "#92400e" : "#166534" }}>
            {euHT.toFixed(2)} € <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(26,20,16,0.5)" }}>/ {OSS_THRESHOLD.toLocaleString("fr-FR")} € HT</span>
          </div>
        </div>
        <div style={{ height: 8, background: "#ede8df", borderRadius: 99, overflow: "hidden", marginTop: 10 }}>
          <div style={{ height: "100%", width: `${euPct}%`, background: euNear ? "#d97706" : "#16a34a", borderRadius: 99, transition: "width 0.4s ease" }} />
        </div>
        {euNear && (
          <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: "#92400e" }}>
            ⚠️ Approche du seuil OSS : au-delà de 10 000 € HT de ventes UE (hors France) sur l'année civile, la TVA du PAYS DU CLIENT s'applique (guichet unique OSS à activer). Indicateur de pilotage — pas un blocage.
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.4 }}>Chargement...</div>
      ) : (
        <>
          {/* Graphique barres — CA TTC mensuel */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: "28px 24px", marginBottom: 24 }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: "#1a1410", marginBottom: 24 }}>CA TTC mensuel {year}</div>
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
                      title={`${m.label} : ${m.ca.toFixed(2)} € TTC`}
                    />
                    <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(26,20,16,0.4)", textTransform: "uppercase", marginTop: 2 }}>
                      {m.label.slice(0, 3)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tableau mensuel — ventilation HT / TVA / TTC */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ background: "#fafaf9" }}>
                  {["Mois", "Cmd", "CA HT", "TVA (20 %)", "CA TTC", "dont Port TTC", "Remises", "Panier moyen"].map(h => (
                    <th key={h} style={{ padding: "13px 14px", textAlign: "left", fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", borderBottom: "2px solid rgba(0,0,0,0.06)", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map((m, i) => (
                  <tr key={m.key} style={{ borderBottom: i < months.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", background: m.ca > 0 ? "#fff" : "#fafaf9" }}>
                    <td style={{ padding: "14px", fontWeight: 800, fontSize: 14, color: "#1a1410", textTransform: "capitalize" }}>{m.label}</td>
                    <td style={{ padding: "14px", fontSize: 14, color: "rgba(26,20,16,0.6)", fontWeight: 600 }}>{m.orders > 0 ? m.orders : "—"}</td>
                    <td style={{ padding: "14px", fontWeight: 800, fontSize: 14, color: m.ht > 0 ? "#166534" : "rgba(26,20,16,0.25)" }}>
                      {m.ht > 0 ? `${m.ht.toFixed(2)} €` : "—"}
                    </td>
                    <td style={{ padding: "14px", fontSize: 13, fontWeight: 700, color: m.tva > 0 ? "#475569" : "rgba(26,20,16,0.25)" }}>
                      {m.tva > 0 ? `${m.tva.toFixed(2)} €` : "—"}
                    </td>
                    <td style={{ padding: "14px", fontWeight: 900, fontSize: 15, color: m.ca > 0 ? "#c49a4a" : "rgba(26,20,16,0.25)" }}>
                      {m.ca > 0 ? `${m.ca.toFixed(2)} €` : "—"}
                    </td>
                    <td style={{ padding: "14px", fontSize: 14, fontWeight: 700, color: m.ca_livraison > 0 ? "#1a1410" : "rgba(26,20,16,0.25)" }}>
                      {m.ca_livraison > 0 ? `${m.ca_livraison.toFixed(2)} €` : "—"}
                    </td>
                    <td style={{ padding: "14px", fontSize: 14, fontWeight: 600, color: m.discount > 0 ? "#b91c1c" : "rgba(26,20,16,0.25)" }}>
                      {m.discount > 0 ? `−${m.discount.toFixed(2)} €` : "—"}
                    </td>
                    <td style={{ padding: "14px", fontSize: 14, color: "rgba(26,20,16,0.5)", fontWeight: 600 }}>
                      {m.avg > 0 ? `${m.avg.toFixed(2)} €` : "—"}
                    </td>
                  </tr>
                ))}

                {/* Ligne total */}
                <tr style={{ background: "#ede8df", borderTop: "2px solid rgba(0,0,0,0.1)" }}>
                  <td style={{ padding: "16px 14px", fontWeight: 950, fontSize: 15, color: "#1a1410" }}>TOTAL {year}</td>
                  <td style={{ padding: "16px 14px", fontWeight: 900, fontSize: 15, color: "#1a1410" }}>{yearOrders.length}</td>
                  <td style={{ padding: "16px 14px", fontWeight: 950, fontSize: 16, color: "#166534" }}>{totalHT.toFixed(2)} €</td>
                  <td style={{ padding: "16px 14px", fontWeight: 800, fontSize: 14, color: "#475569" }}>{totalTva.toFixed(2)} €</td>
                  <td style={{ padding: "16px 14px", fontWeight: 950, fontSize: 17, color: "#c49a4a" }}>{totalCA.toFixed(2)} €</td>
                  <td style={{ padding: "16px 14px", fontWeight: 900, fontSize: 15, color: "#1a1410" }}>{totalLivraison.toFixed(2)} €</td>
                  <td style={{ padding: "16px 14px", fontWeight: 900, fontSize: 15, color: "#b91c1c" }}>
                    {totalDis > 0 ? `−${totalDis.toFixed(2)} €` : "—"}
                  </td>
                  <td style={{ padding: "16px 14px", fontWeight: 900, fontSize: 15, color: "#1a1410" }}>
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
