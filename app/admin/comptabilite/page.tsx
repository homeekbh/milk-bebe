"use client";

import { useEffect, useState, useMemo } from "react";
import {
  countsInAccounting, getNetAmount,
  productPart, portPart, caProduits, portEncaisse,
} from "@/lib/orders";
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
  // Champs requis par isValidOrder / countsInAccounting / getNetAmount.
  status?:          string | null;
  shipping_status?: string | null;
  refund_amount?:   number | null;
  classification?:  string | null;
  is_internal_test?: boolean | null;
  // Décomposition CA : frais de port stockés séparément depuis le webhook Stripe.
  delivery_price?:  number | null;
  // Seuil OSS UE : pays de livraison + HT figé (sinon recalculé à la volée).
  shipping_country?: string | null;
  montant_ht?:       number | null;
}

interface MonthData {
  key:        string;
  label:      string;
  caProduit:  number;  // Part PRODUITS des ventes comptables (cliente + vente_directe)
  port:       number;  // Port encaissé TTC — TOUTES commandes valides (collabs + cadeaux compris)
  total:      number;  // = caProduit + port (total net encaissé TTC)
  ht:         number;  // base imposable = total − tva
  tva:        number;  // TVA collectée 20 % « en dedans » sur le total encaissé
  ventes:     number;  // nb de ventes clientes (countsInAccounting) — périmètre du panier moyen
  avg:        number;  // panier moyen des ventes clientes (montant net / ventes)
  discount:   number;  // remises sur ventes clientes
}

// M!LK (EKBH SASU) est ASSUJETTIE À LA TVA (taux normal FR 20 %). Prix TTC → TVA « en dedans »
// (HT = TTC / 1,20). La TVA est ventilée sur TOUT le montant encaissé (produits + port). Source
// unique du taux : lib/tva.ts. Périmètres (produits / port) : lib/orders.ts — mêmes fonctions que
// les autres pages, pour que les trois écrans se réconcilient au centime.

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

  // Ventes clientes = périmètre COMPTABLE des produits (cliente + vente_directe, hors test/annulée/
  // remboursée). Sert au COMPTE de ventes + panier moyen. Le PORT, lui, agrège un périmètre PLUS
  // LARGE (toutes commandes valides) via portPart — c'est ce qui rend enfin visibles les frais de
  // port encaissés sur collabs et cadeaux (produit offert mais port réellement payé).
  const ventesClientes = useMemo(() => orders.filter(countsInAccounting), [orders]);

  const months = useMemo((): MonthData[] => {
    const map: Record<string, MonthData> = {};
    for (let m = 1; m <= 12; m++) {
      const key   = `${year}-${String(m).padStart(2, "0")}`;
      const label = new Date(year, m - 1, 1).toLocaleDateString("fr-FR", { month: "long" });
      map[key]    = { key, label, caProduit: 0, port: 0, total: 0, ht: 0, tva: 0, ventes: 0, avg: 0, discount: 0 };
    }

    // On itère sur TOUTES les commandes : productPart/portPart appliquent eux-mêmes les périmètres
    // (0 hors ventes comptables pour le produit ; 0 hors commandes valides pour le port).
    for (const o of orders) {
      const d = new Date(o.created_at);
      if (d.getFullYear() !== year) continue;
      const key = `${year}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = map[key];
      if (!entry) continue;
      entry.caProduit += productPart(o);
      entry.port      += portPart(o);
      if (countsInAccounting(o)) {
        entry.ventes   += 1;
        entry.discount += Number(o.discount ?? 0);
        entry.avg      += getNetAmount(o); // cumul temporaire du montant net des ventes clientes
      }
    }

    return Object.values(map).map(m => {
      const total = round2(m.caProduit + m.port);
      const tva   = tvaFromTTC(total);
      return {
        ...m,
        caProduit: round2(m.caProduit),
        port:      round2(m.port),
        total,
        tva,
        ht:  round2(total - tva),
        // m.avg contient pour l'instant le CUMUL du montant net des ventes clientes → panier moyen.
        avg: m.ventes > 0 ? round2(m.avg / m.ventes) : 0,
      };
    });
  }, [orders, year]);

  // ── Totaux année (source unique lib/orders : les trois pages doivent tomber sur les mêmes) ──
  const yearOrders     = useMemo(() => orders.filter(o => new Date(o.created_at).getFullYear() === year), [orders, year]);
  const totalProduit   = caProduits(yearOrders);      // CA produits (145,18 sur 2026)
  const totalPort      = portEncaisse(yearOrders);    // Port encaissé (39,70 sur 2026)
  const totalEncaisseY = round2(totalProduit + totalPort); // Total net encaissé (184,88)
  const totalTva       = tvaFromTTC(totalEncaisseY);
  const totalHT        = round2(totalEncaisseY - totalTva);
  const ventesYear     = yearOrders.filter(countsInAccounting);
  const ventesAmount   = ventesYear.reduce((s, o) => s + getNetAmount(o), 0);
  const panier         = ventesYear.length > 0 ? round2(ventesAmount / ventesYear.length) : 0;
  const totalDis       = ventesYear.reduce((s, o) => s + Number(o.discount ?? 0), 0);
  const maxTotal       = Math.max(...months.map(m => m.total), 1);

  // ── Seuil OSS (ventes à distance intra-UE) — indicateur de PILOTAGE, PAS un blocage. Périmètre :
  // ventes clientes UE hors France (les produits vendus à distance), année civile en cours. ────────
  const OSS_THRESHOLD = 10000;
  const OSS_WARN      = 7000;
  const euYear = new Date().getFullYear();
  const euHT   = ventesClientes
    .filter(o => new Date(o.created_at).getFullYear() === euYear
              && !!o.shipping_country && String(o.shipping_country).trim().toUpperCase() !== "FR")
    .reduce((s, o) => s + (Number(o.montant_ht) || htFromTTC(Number(o.amount_total ?? 0))), 0);
  const euPct  = Math.min(100, OSS_THRESHOLD > 0 ? (euHT / OSS_THRESHOLD) * 100 : 0);
  const euNear = euHT >= OSS_WARN;

  function exportCSV() {
    // Plus de colonne « Transporteur » : une valeur unique par mois est fausse par construction
    // dès qu'il y a deux transporteurs. Colonnes = décomposition produits / port / total.
    const header = [
      "Mois", "Ventes clientes",
      "CA produits (€)", "Port encaissé (€)", "Total encaissé TTC (€)",
      "dont TVA 20% (€)", "dont HT (€)", "Remises (€)", "Panier moyen TTC (€)",
    ].join(";");
    const rows = months.map(m =>
      [
        m.label, m.ventes,
        m.caProduit.toFixed(2), m.port.toFixed(2), m.total.toFixed(2),
        m.tva.toFixed(2), m.ht.toFixed(2), m.discount.toFixed(2), m.avg.toFixed(2),
      ].join(";")
    );
    const total = [
      "TOTAL", ventesYear.length,
      totalProduit.toFixed(2), totalPort.toFixed(2), totalEncaisseY.toFixed(2),
      totalTva.toFixed(2), totalHT.toFixed(2), totalDis.toFixed(2), panier.toFixed(2),
    ].join(";");
    const csv  = "﻿" + [header, ...rows, total].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `milk-comptabilite-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportXLSX() {
    try {
      const res = await adminFetch(`/api/admin/export/comptabilite-xlsx?year=${year}`);
      if (!res.ok) { alert("Erreur export Excel."); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `milk-comptabilite-${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Erreur réseau export Excel."); }
  }

  const yearsSet = new Set(orders.map(o => new Date(o.created_at).getFullYear()));
  const years    = Array.from(yearsSet).sort((a, b) => b - a);
  if (!years.includes(year)) years.unshift(year);

  const btnDark: React.CSSProperties  = { padding: "11px 18px", borderRadius: 10, background: "#1a1410", color: "#c49a4a", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", whiteSpace: "nowrap" };
  const btnLight: React.CSSProperties = { padding: "11px 18px", borderRadius: 10, background: "#fff", color: "#1a1410", fontWeight: 800, fontSize: 14, border: "1px solid rgba(0,0,0,0.15)", textDecoration: "none", whiteSpace: "nowrap" };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1050 }}>

      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>Comptabilité</h1>
          <div style={{ fontSize: 15, color: "rgba(26,20,16,0.5)", marginTop: 4, fontWeight: 600 }}>CA mensuel · {year} · Assujetti à la TVA (taux normal 20 %)</div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", fontSize: 15, fontWeight: 700, background: "#fff", outline: "none" }}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={exportCSV} style={btnDark}>⬇ CSV</button>
          <button onClick={exportXLSX} style={btnDark}>⬇ Excel</button>
          <a href={`/admin/comptabilite/impression?year=${year}`} target="_blank" rel="noopener noreferrer" style={btnLight}>🖨 PDF</a>
        </div>
      </div>

      {/* KPIs — décomposition explicite : produits + port = total encaissé */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 32 }}>
        {[
          { label: "CA produits TTC",        value: `${totalProduit.toFixed(2)} €`,  color: "#166534" },
          { label: "Port encaissé TTC",      value: `${totalPort.toFixed(2)} €`,     color: "#8b6c2f" },
          { label: "Total encaissé TTC",     value: `${totalEncaisseY.toFixed(2)} €`, color: "#c49a4a" },
          { label: "dont TVA collectée 20 %",value: `${totalTva.toFixed(2)} €`,      color: "#475569" },
          { label: "dont HT (base imposable)", value: `${totalHT.toFixed(2)} €`,     color: "#475569" },
          { label: "Ventes clientes",        value: String(ventesYear.length),       color: "#1a1410" },
          { label: "Panier moyen · clientes", value: ventesYear.length > 0 ? `${panier.toFixed(2)} €` : "—", color: "#1a1410" },
          { label: "Remises totales",        value: `−${totalDis.toFixed(2)} €`,     color: "#b91c1c" },
        ].map(stat => (
          <div key={stat.label} style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)", padding: "18px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: -1, color: stat.color, lineHeight: 1.05 }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: "rgba(26,20,16,0.4)", marginTop: 6, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: "rgba(26,20,16,0.5)", fontWeight: 600, marginBottom: 24, marginTop: -12 }}>
        Total encaissé = CA produits + Port encaissé. Le port inclut les commandes collab et cadeau
        (produit offert, livraison réellement payée) — argent encaissé qui n'apparaissait nulle part avant.
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
          {/* Graphique barres — Total encaissé mensuel */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: "28px 24px", marginBottom: 24 }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: "#1a1410", marginBottom: 24 }}>Total encaissé TTC mensuel {year}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 180, padding: "0 8px" }}>
              {months.map(m => {
                const h = maxTotal > 0 ? Math.max(4, (m.total / maxTotal) * 150) : 4;
                return (
                  <div key={m.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(26,20,16,0.5)", height: 14, display: "flex", alignItems: "center" }}>
                      {m.total > 0 ? `${Math.round(m.total)} €` : ""}
                    </div>
                    <div
                      style={{ width: "100%", height: `${h}px`, background: m.total > 0 ? "#c49a4a" : "rgba(0,0,0,0.06)", borderRadius: "4px 4px 0 0", transition: "height 0.4s ease" }}
                      title={`${m.label} : ${m.total.toFixed(2)} € TTC (produits ${m.caProduit.toFixed(2)} + port ${m.port.toFixed(2)})`}
                    />
                    <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(26,20,16,0.4)", textTransform: "uppercase", marginTop: 2 }}>
                      {m.label.slice(0, 3)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tableau mensuel — produits / port / total / ventilation TVA */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 940 }}>
              <thead>
                <tr style={{ background: "#fafaf9" }}>
                  {["Mois", "Ventes", "CA produits", "Port encaissé", "Total encaissé", "dont TVA 20 %", "dont HT", "Remises", "Panier moyen"].map(h => (
                    <th key={h} style={{ padding: "13px 14px", textAlign: "left", fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", borderBottom: "2px solid rgba(0,0,0,0.06)", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map((m, i) => (
                  <tr key={m.key} style={{ borderBottom: i < months.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", background: m.total > 0 ? "#fff" : "#fafaf9" }}>
                    <td style={{ padding: "14px", fontWeight: 800, fontSize: 14, color: "#1a1410", textTransform: "capitalize" }}>{m.label}</td>
                    <td style={{ padding: "14px", fontSize: 14, color: "rgba(26,20,16,0.6)", fontWeight: 600 }}>{m.ventes > 0 ? m.ventes : "—"}</td>
                    <td style={{ padding: "14px", fontWeight: 800, fontSize: 14, color: m.caProduit > 0 ? "#166534" : "rgba(26,20,16,0.25)" }}>
                      {m.caProduit > 0 ? `${m.caProduit.toFixed(2)} €` : "—"}
                    </td>
                    <td style={{ padding: "14px", fontWeight: 800, fontSize: 14, color: m.port > 0 ? "#8b6c2f" : "rgba(26,20,16,0.25)" }}>
                      {m.port > 0 ? `${m.port.toFixed(2)} €` : "—"}
                    </td>
                    <td style={{ padding: "14px", fontWeight: 900, fontSize: 15, color: m.total > 0 ? "#c49a4a" : "rgba(26,20,16,0.25)" }}>
                      {m.total > 0 ? `${m.total.toFixed(2)} €` : "—"}
                    </td>
                    <td style={{ padding: "14px", fontSize: 13, fontWeight: 700, color: m.tva > 0 ? "#475569" : "rgba(26,20,16,0.25)" }}>
                      {m.tva > 0 ? `${m.tva.toFixed(2)} €` : "—"}
                    </td>
                    <td style={{ padding: "14px", fontSize: 13, fontWeight: 700, color: m.ht > 0 ? "#475569" : "rgba(26,20,16,0.25)" }}>
                      {m.ht > 0 ? `${m.ht.toFixed(2)} €` : "—"}
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
                  <td style={{ padding: "16px 14px", fontWeight: 900, fontSize: 15, color: "#1a1410" }}>{ventesYear.length}</td>
                  <td style={{ padding: "16px 14px", fontWeight: 950, fontSize: 16, color: "#166534" }}>{totalProduit.toFixed(2)} €</td>
                  <td style={{ padding: "16px 14px", fontWeight: 950, fontSize: 16, color: "#8b6c2f" }}>{totalPort.toFixed(2)} €</td>
                  <td style={{ padding: "16px 14px", fontWeight: 950, fontSize: 17, color: "#c49a4a" }}>{totalEncaisseY.toFixed(2)} €</td>
                  <td style={{ padding: "16px 14px", fontWeight: 800, fontSize: 14, color: "#475569" }}>{totalTva.toFixed(2)} €</td>
                  <td style={{ padding: "16px 14px", fontWeight: 800, fontSize: 14, color: "#475569" }}>{totalHT.toFixed(2)} €</td>
                  <td style={{ padding: "16px 14px", fontWeight: 900, fontSize: 15, color: "#b91c1c" }}>
                    {totalDis > 0 ? `−${totalDis.toFixed(2)} €` : "—"}
                  </td>
                  <td style={{ padding: "16px 14px", fontWeight: 900, fontSize: 15, color: "#1a1410" }}>
                    {ventesYear.length > 0 ? `${panier.toFixed(2)} €` : "—"}
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
