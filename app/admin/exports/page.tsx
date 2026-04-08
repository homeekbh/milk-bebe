"use client";

import { useState } from "react";

const C = {
  bg:    "#0d0b09",
  card:  "#1c1814",
  warm:  "#f2ede6",
  muted: "rgba(242,237,230,0.45)",
  faint: "rgba(242,237,230,0.08)",
  amber: "#c49a4a",
};

function ExportCard({
  title,
  desc,
  icon,
  onExport,
  loading,
  fields,
}: {
  title: string;
  desc: string;
  icon: string;
  onExport: () => void;
  loading: boolean;
  fields?: React.ReactNode;
}) {
  return (
    <div style={{ background: C.card, borderRadius: 20, padding: 28, border: `1px solid ${C.faint}`, display: "grid", gap: 18 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ fontSize: 32 }}>{icon}</div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, color: C.warm, marginBottom: 6 }}>{title}</div>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{desc}</div>
        </div>
      </div>

      {fields}

      <button
        onClick={onExport}
        disabled={loading}
        style={{
          padding: "14px 24px", borderRadius: 12,
          background: loading ? C.faint : C.amber,
          color: loading ? C.muted : "#000",
          fontWeight: 900, fontSize: 15,
          border: "none", cursor: loading ? "not-allowed" : "pointer",
          transition: "all 0.15s", width: "fit-content",
        }}
      >
        {loading ? "⏳ Génération..." : "⬇ Télécharger le CSV"}
      </button>
    </div>
  );
}

export default function AdminExports() {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [fromCmd, setFromCmd] = useState(firstOfMonth);
  const [toCmd,   setToCmd]   = useState(today);
  const [loadingCmd, setLoadingCmd]     = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingStock, setLoadingStock]   = useState(false);

  const inputStyle: React.CSSProperties = {
    padding: "10px 14px", borderRadius: 10,
    border: `1px solid ${C.faint}`,
    background: "rgba(242,237,230,0.05)",
    color: C.warm, fontSize: 14, fontWeight: 600,
    outline: "none", width: "100%", boxSizing: "border-box",
  };

  async function exportCommandes() {
    setLoadingCmd(true);
    try {
      const params = new URLSearchParams();
      if (fromCmd) params.set("from", fromCmd);
      if (toCmd)   params.set("to",   toCmd);
      const res = await fetch(`/api/admin/export/commandes?${params}`);
      if (!res.ok) throw new Error("Erreur export");
      const blob = await res.blob();
      download(blob, `milk-commandes-${fromCmd}-${toCmd}.csv`);
    } finally {
      setLoadingCmd(false);
    }
  }

  async function exportClients() {
    setLoadingClients(true);
    try {
      const res = await fetch("/api/admin/export/clients");
      if (!res.ok) throw new Error("Erreur export");
      const blob = await res.blob();
      download(blob, `milk-clients-${today}.csv`);
    } finally {
      setLoadingClients(false);
    }
  }

  async function exportStock() {
    setLoadingStock(true);
    try {
      const res = await fetch("/api/admin/products");
      const products = await res.json();

      const rows = [
        ["Nom", "Slug", "Catégorie", "Prix TTC (€)", "Stock", "Valeur stock (€)"]
          .map(h => `"${h}"`).join(";"),
        ...(products as any[]).map(p =>
          [
            p.name ?? "",
            p.slug ?? "",
            p.category_slug ?? "",
            Number(p.price_ttc ?? 0).toFixed(2),
            p.stock ?? 0,
            (Number(p.price_ttc ?? 0) * Number(p.stock ?? 0)).toFixed(2),
          ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")
        ),
      ];

      const csv  = "\uFEFF" + rows.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      download(blob, `milk-stock-${today}.csv`);
    } finally {
      setLoadingStock(false);
    }
  }

  function download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: "36px 40px", background: C.bg, minHeight: "100vh" }}>

      <div style={{ marginBottom: 36 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950, letterSpacing: -1, color: C.warm }}>Exports</h1>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>
          Télécharge tes données en CSV — compatible Excel, Google Sheets, outils comptables et emailing.
        </div>
      </div>

      <div style={{ display: "grid", gap: 20, maxWidth: 800 }}>

        {/* ── Export comptable ── */}
        <ExportCard
          title="Export comptable — Commandes"
          desc="Toutes les commandes avec montant HT, TVA 20%, TTC, articles, client et statut. Idéal pour ton comptable."
          icon="📊"
          onExport={exportCommandes}
          loading={loadingCmd}
          fields={
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: C.muted }}>
                  Du
                </label>
                <input
                  type="date" value={fromCmd}
                  onChange={e => setFromCmd(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: C.muted }}>
                  Au
                </label>
                <input
                  type="date" value={toCmd}
                  onChange={e => setToCmd(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          }
        />

        {/* ── Export clients ── */}
        <ExportCard
          title="Export base clients — Emailing & SMS"
          desc="Tous les clients avec nom, email, nombre de commandes et total dépensé. Prêt pour Mailchimp, Brevo, Klaviyo ou SMS."
          icon="👥"
          onExport={exportClients}
          loading={loadingClients}
        />

        {/* ── Export stock ── */}
        <ExportCard
          title="Export catalogue & stock"
          desc="Tous les produits avec prix, stock restant et valeur totale du stock. Utile pour l'inventaire."
          icon="📦"
          onExport={exportStock}
          loading={loadingStock}
        />

      </div>

      {/* Note */}
      <div style={{ marginTop: 32, padding: "16px 20px", borderRadius: 14, background: "rgba(196,154,74,0.08)", border: `1px solid rgba(196,154,74,0.15)`, maxWidth: 800 }}>
        <div style={{ fontSize: 13, color: C.amber, fontWeight: 700, lineHeight: 1.7 }}>
          💡 <strong>Astuce :</strong> Pour ouvrir le CSV dans Excel, utilise <strong>Données → Depuis un fichier texte/CSV</strong> et choisis le séparateur <strong>point-virgule</strong>. Le fichier est encodé en UTF-8 avec BOM pour éviter les problèmes d'accents.
        </div>
      </div>

    </div>
  );
}