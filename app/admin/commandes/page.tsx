"use client";

import { useEffect, useState } from "react";
// Helper inline — lit le token Supabase depuis localStorage
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

type Order = {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  amount_total: number;
  items: any[];
  shipping_status: string;
  shipping_address: any;
  tracking_number?: string;
  notes?: string;
  promo_code?: string;
  discount?: number;
  stripe_session_id?: string;
};

const STATUTS: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: "En préparation", bg: "#fef3c7", color: "#92400e" },
  shipped:   { label: "Expédiée",       bg: "#dcfce7", color: "#166534" },
  delivered: { label: "Livrée",         bg: "#c49a4a", color: "#1a1410" },
  returned:  { label: "Retour",         bg: "#fee2e2", color: "#b91c1c" },
};

const TRANSPORTEURS = [
  "La Poste — Colissimo",
  "La Poste — Lettre Suivie",
  "Chronopost",
  "DHL",
  "DPD",
  "GLS",
  "Mondial Relay",
  "Autre",
];

const ADRESSE_EXPEDITEUR = {
  nom:     "M!LK — Essentiels Bébé",
  ligne1:  "À compléter après SIRET",
  cp:      "—",
  ville:   "—",
  pays:    "France",
  email:   "bonjour@milkbebe.fr",
  tel:     "07 45 27 21 34",
};

// ── Fenêtre impression étiquette ─────────────────────────────────────────────
function printLabel(order: Order, type: "expedition" | "retour") {
  const addr = order.shipping_address;
  const addrHTML = addr
    ? `${addr.name ?? order.customer_name}<br>${addr.line1}${addr.line2 ? "<br>" + addr.line2 : ""}<br>${addr.postal_code} ${addr.city}<br>${addr.country ?? "FR"}`
    : `${order.customer_name}<br><em style="color:#999">Adresse non renseignée</em>`;

  const isRetour = type === "retour";
  const title    = isRetour ? "Étiquette de retour" : "Étiquette d'expédition";

  const win = window.open("", "_blank", "width=700,height=500");
  if (!win) return;

  win.document.write(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title} — M!LK</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; padding: 20px; }
    .label {
      width: 100%;
      max-width: 620px;
      margin: 0 auto;
      border: 3px solid #1a1410;
      border-radius: 12px;
      overflow: hidden;
    }
    .label-header {
      background: ${isRetour ? "#fee2e2" : "#1a1410"};
      color: ${isRetour ? "#b91c1c" : "#c49a4a"};
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .label-header .brand { font-size: 28px; font-weight: 900; letter-spacing: -1px; }
    .label-header .type  { font-size: 14px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
    .label-body { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
    .label-section {
      padding: 20px 24px;
      border-right: 1px dashed #ccc;
    }
    .label-section:last-child { border-right: none; }
    .section-title { font-size: 9px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #999; margin-bottom: 10px; }
    .section-content { font-size: 15px; line-height: 1.8; color: #1a1410; font-weight: 600; }
    .label-footer {
      border-top: 2px solid #1a1410;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f5f0e8;
    }
    .order-ref { font-size: 13px; font-weight: 800; color: #1a1410; font-family: monospace; letter-spacing: 1px; }
    .tracking  { font-size: 13px; color: #666; }
    .barcode   { font-size: 28px; letter-spacing: 8px; font-family: monospace; color: #1a1410; }
    .notice    { font-size: 11px; color: #999; margin-top: 4px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      .label { border-radius: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:20px" class="no-print">
    <button onclick="window.print()" style="padding:12px 32px;background:#1a1410;color:#c49a4a;border:none;border-radius:10px;font-size:16px;font-weight:900;cursor:pointer;margin-right:10px">
      🖨️ Imprimer
    </button>
    <button onclick="window.close()" style="padding:12px 24px;background:#f5f0e8;color:#1a1410;border:2px solid #1a1410;border-radius:10px;font-size:15px;font-weight:800;cursor:pointer">
      Fermer
    </button>
    <p style="margin-top:12px;font-size:12px;color:#999">Format recommandé : 15×10 cm ou A6</p>
  </div>

  <div class="label">
    <div class="label-header">
      <span class="brand">M!LK</span>
      <span class="type">${isRetour ? "⟵ Retour client" : "→ Expédition"}</span>
    </div>

    <div class="label-body">
      <div class="label-section">
        <div class="section-title">${isRetour ? "Destinataire (retour vers)" : "Expéditeur"}</div>
        <div class="section-content">
          ${isRetour
            ? `${ADRESSE_EXPEDITEUR.nom}<br>${ADRESSE_EXPEDITEUR.ligne1}<br>${ADRESSE_EXPEDITEUR.cp} ${ADRESSE_EXPEDITEUR.ville}<br>${ADRESSE_EXPEDITEUR.pays}`
            : `${ADRESSE_EXPEDITEUR.nom}<br>${ADRESSE_EXPEDITEUR.ligne1}<br>${ADRESSE_EXPEDITEUR.cp} ${ADRESSE_EXPEDITEUR.ville}<br>${ADRESSE_EXPEDITEUR.pays}`
          }
        </div>
        <div class="notice" style="margin-top:8px">${ADRESSE_EXPEDITEUR.email}<br>${ADRESSE_EXPEDITEUR.tel}</div>
      </div>
      <div class="label-section">
        <div class="section-title">${isRetour ? "Expéditeur (client)" : "Destinataire"}</div>
        <div class="section-content">${addrHTML}</div>
        <div class="notice" style="margin-top:8px">${order.customer_email}</div>
      </div>
    </div>

    <div class="label-footer">
      <div>
        <div class="order-ref">Commande #${order.id.slice(0, 8).toUpperCase()}</div>
        ${order.tracking_number ? `<div class="tracking">Suivi : ${order.tracking_number}</div>` : ""}
      </div>
      <div style="text-align:right">
        ${order.tracking_number
          ? `<div class="barcode">||| ${order.tracking_number} |||</div>`
          : `<div style="font-size:12px;color:#999">Ajouter le numéro de suivi</div>`
        }
      </div>
    </div>
  </div>
</body>
</html>
  `);
  win.document.close();
}

export default function AdminCommandes() {
  const [orders,     setOrders]     = useState<Order[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState<string | null>(null);
  const [search,     setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);

  // Données du formulaire d'expédition
  const [tracking,     setTracking]     = useState("");
  const [transporteur, setTransporteur] = useState("");
  const [notes,        setNotes]        = useState("");

  async function load() {
    setLoading(true);
    const res  = await adminFetch("/api/admin/commandes-data");
    const data = await res.json();
    setOrders(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Quand on ouvre une commande, pré-remplir les champs
  useEffect(() => {
    if (!selected) return;
    const order = orders.find(o => o.id === selected);
    if (order) {
      setTracking(order.tracking_number ?? "");
      setNotes(order.notes ?? "");
      setTransporteur("");
    }
  }, [selected, orders]);

  async function handleShip(order: Order) {
    if (!tracking.trim() || !transporteur) return;
    setSaving(true);
    await adminFetch("/api/admin/commandes-data", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        id:              order.id,
        shipping_status: "shipped",
        tracking_number: tracking.trim(),
        notes:           `Transporteur: ${transporteur}${notes ? " — " + notes : ""}`,
      }),
    });
    // Envoyer email expédition au client
    await adminFetch("/api/emails/shipped", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        email:    order.customer_email,
        prenom:   order.customer_name?.split(" ")[0] ?? "",
        tracking: tracking.trim(),
        items:    order.items,
      }),
    }).catch(() => {});
    await load();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function updateStatus(id: string, shipping_status: string) {
    await adminFetch("/api/admin/commandes-data", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, shipping_status }),
    });
    await load();
  }

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q || (o.customer_name ?? "").toLowerCase().includes(q) || (o.customer_email ?? "").toLowerCase().includes(q) || o.id.includes(q);
    const matchStatus = !statusFilter || o.shipping_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalCA    = orders.reduce((s, o) => s + Number(o.amount_total ?? 0), 0);
  const pending    = orders.filter(o => o.shipping_status === "pending").length;
  const shipped    = orders.filter(o => o.shipping_status === "shipped").length;
  const selectedOrder = orders.find(o => o.id === selected);

  const canShip = tracking.trim().length > 0 && transporteur.length > 0;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100 }}>

      {/* En-tête */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>Commandes</h1>
        <div style={{ fontSize: 15, color: "rgba(26,20,16,0.5)", marginTop: 4, fontWeight: 600 }}>
          {orders.length} commande{orders.length > 1 ? "s" : ""} · CA total : {totalCA.toFixed(2)} €
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total",          value: orders.length,                                                            color: "#1a1410" },
          { label: "En préparation", value: pending,                                                                   color: "#92400e" },
          { label: "Expédiées",      value: shipped,                                                                   color: "#166534" },
          { label: "CA Total",       value: `${totalCA.toFixed(0)} €`,                                                color: "#c49a4a" },
          { label: "Panier moyen",   value: orders.length > 0 ? `${(totalCA / orders.length).toFixed(2)} €` : "—",   color: "#1a1410" },
        ].map(stat => (
          <div key={stat.label} style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)", padding: "16px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: -1, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: "rgba(26,20,16,0.4)", marginTop: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres + Export */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text" placeholder="🔍 Nom, email, #commande..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", fontSize: 14, fontWeight: 600, background: "#fff", outline: "none" }}
        />
        <select
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", fontSize: 14, fontWeight: 600, background: "#fff", outline: "none" }}
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUTS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <a href="/api/admin/export/commandes" download
          style={{ padding: "11px 18px", borderRadius: 10, background: "#1a1410", color: "#c49a4a", fontWeight: 800, fontSize: 14, textDecoration: "none", whiteSpace: "nowrap" }}>
          ⬇ CSV
        </a>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.4, fontSize: 16 }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: 60, textAlign: "center", color: "rgba(26,20,16,0.4)", fontSize: 16 }}>
          Aucune commande
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map(order => {
            const status    = STATUTS[order.shipping_status ?? "pending"] ?? STATUTS.pending;
            const isOpen    = selected === order.id;
            const addr      = order.shipping_address;

            return (
              <div key={order.id} style={{ background: "#fff", borderRadius: 16, border: `1px solid ${isOpen ? "rgba(196,154,74,0.4)" : "rgba(0,0,0,0.07)"}`, overflow: "hidden", boxShadow: isOpen ? "0 4px 20px rgba(0,0,0,0.08)" : "none" }}>

                {/* ── Ligne principale cliquable ── */}
                <div
                  onClick={() => setSelected(isOpen ? null : order.id)}
                  style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 16, alignItems: "center", padding: "18px 24px", cursor: "pointer", background: isOpen ? "#fffbf0" : "#fff", transition: "background 0.15s" }}
                >
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16, color: "#1a1410" }}>{order.customer_name || "—"}</div>
                    <div style={{ fontSize: 13, color: "rgba(26,20,16,0.45)", marginTop: 2 }}>{order.customer_email}</div>
                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(26,20,16,0.25)", marginTop: 2 }}>#{order.id.slice(0, 8).toUpperCase()}</div>
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(26,20,16,0.4)", whiteSpace: "nowrap" }}>
                    {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  <div style={{ fontWeight: 950, fontSize: 18, color: "#1a1410", whiteSpace: "nowrap" }}>
                    {Number(order.amount_total).toFixed(2)} €
                  </div>
                  <span style={{ padding: "5px 14px", borderRadius: 99, background: status.bg, color: status.color, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
                    {status.label}
                  </span>
                  <span style={{ fontSize: 20, color: "rgba(26,20,16,0.3)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                </div>

                {/* ── Panneau détail ── */}
                {isOpen && selectedOrder && (
                  <div style={{ padding: "0 24px 28px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 20 }}>

                      {/* Colonne gauche — infos + articles */}
                      <div style={{ display: "grid", gap: 16 }}>

                        {/* Articles */}
                        <div style={{ background: "#f5f0e8", borderRadius: 12, padding: "16px 18px" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", marginBottom: 12 }}>Articles</div>
                          {(Array.isArray(order.items) ? order.items : []).map((item: any, i: number) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(26,20,16,0.06)" }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                                <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)" }}>× {item.quantity}</div>
                              </div>
                              <div style={{ fontWeight: 900, color: "#c49a4a" }}>{(Number(item.price) * Number(item.quantity)).toFixed(2)} €</div>
                            </div>
                          ))}
                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, fontWeight: 950, fontSize: 18, color: "#1a1410" }}>
                            {Number(order.amount_total).toFixed(2)} €
                          </div>
                        </div>

                        {/* Adresse livraison */}
                        {addr && (
                          <div style={{ background: "#f5f0e8", borderRadius: 12, padding: "16px 18px" }}>
                            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", marginBottom: 10 }}>Adresse de livraison</div>
                            <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.8, color: "#1a1410" }}>
                              {addr.name ?? order.customer_name}<br />
                              {addr.line1}{addr.line2 ? <><br />{addr.line2}</> : ""}<br />
                              {addr.postal_code} {addr.city}<br />
                              {addr.country ?? "FR"}
                            </div>
                          </div>
                        )}

                        {/* Boutons étiquettes */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <button
                            onClick={() => printLabel(order, "expedition")}
                            style={{ padding: "12px 16px", borderRadius: 12, background: "#1a1410", color: "#f2ede6", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                          >
                            🖨️ Étiquette expédition
                          </button>
                          <button
                            onClick={() => printLabel(order, "retour")}
                            style={{ padding: "12px 16px", borderRadius: 12, background: "#f5f0e8", color: "#1a1410", fontWeight: 800, fontSize: 13, border: "2px solid rgba(26,20,16,0.15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                          >
                            ↩️ Étiquette retour
                          </button>
                        </div>
                      </div>

                      {/* Colonne droite — expédition */}
                      <div style={{ display: "grid", gap: 14, alignContent: "start" }}>

                        <div style={{ fontSize: 13, fontWeight: 900, color: "#1a1410", textTransform: "uppercase", letterSpacing: 1 }}>
                          Gestion expédition
                        </div>

                        {/* Transporteur */}
                        <div style={{ display: "grid", gap: 6 }}>
                          <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.45)" }}>
                            Transporteur *
                          </label>
                          <select
                            value={transporteur}
                            onChange={e => setTransporteur(e.target.value)}
                            style={{ padding: "11px 14px", borderRadius: 10, border: `2px solid ${transporteur ? "#1a1410" : "rgba(0,0,0,0.12)"}`, fontSize: 14, fontWeight: 600, background: "#fff", outline: "none" }}
                          >
                            <option value="">Choisir un transporteur...</option>
                            {TRANSPORTEURS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>

                        {/* Numéro de suivi */}
                        <div style={{ display: "grid", gap: 6 }}>
                          <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.45)" }}>
                            Numéro de suivi *
                          </label>
                          <input
                            type="text"
                            value={tracking}
                            onChange={e => setTracking(e.target.value)}
                            placeholder="Ex : 2C00012345678"
                            style={{ padding: "11px 14px", borderRadius: 10, border: `2px solid ${tracking.trim() ? "#1a1410" : "rgba(0,0,0,0.12)"}`, fontSize: 14, fontWeight: 700, fontFamily: "monospace", letterSpacing: 1, outline: "none", background: "#fff" }}
                          />
                        </div>

                        {/* Notes internes */}
                        <div style={{ display: "grid", gap: 6 }}>
                          <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.45)" }}>
                            Notes internes
                          </label>
                          <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Note interne sur la commande..."
                            rows={2}
                            style={{ padding: "11px 14px", borderRadius: 10, border: "2px solid rgba(0,0,0,0.08)", fontSize: 14, fontWeight: 600, outline: "none", background: "#fff", resize: "vertical", fontFamily: "inherit" }}
                          />
                        </div>

                        {/* ✅ Bouton expédier — bloqué si champs manquants */}
                        {!canShip && (
                          <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fef3c7", border: "1px solid #fde68a", fontSize: 13, fontWeight: 700, color: "#92400e" }}>
                            ⚠️ Remplis le transporteur et le numéro de suivi pour expédier
                          </div>
                        )}

                        <button
                          onClick={() => handleShip(order)}
                          disabled={!canShip || saving || order.shipping_status === "shipped"}
                          style={{
                            padding: "15px",
                            borderRadius: 12,
                            border: "none",
                            fontWeight: 900,
                            fontSize: 15,
                            cursor: (!canShip || saving || order.shipping_status === "shipped") ? "not-allowed" : "pointer",
                            background: order.shipping_status === "shipped"
                              ? "#dcfce7"
                              : canShip
                                ? "#1a1410"
                                : "#e5e7eb",
                            color: order.shipping_status === "shipped"
                              ? "#166534"
                              : canShip
                                ? "#c49a4a"
                                : "#9ca3af",
                            transition: "all 0.2s",
                          }}
                        >
                          {order.shipping_status === "shipped"
                            ? "✅ Déjà expédiée"
                            : saving
                              ? "Enregistrement..."
                              : "🚚 Marquer comme expédiée"}
                        </button>

                        {saved && (
                          <div style={{ padding: "10px 14px", borderRadius: 10, background: "#dcfce7", fontSize: 13, fontWeight: 700, color: "#166534", textAlign: "center" }}>
                            ✅ Statut mis à jour — Email envoyé au client !
                          </div>
                        )}

                        {/* Changer statut manuellement */}
                        <div style={{ display: "grid", gap: 6 }}>
                          <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.45)" }}>
                            Changer le statut
                          </label>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {Object.entries(STATUTS).map(([key, val]) => (
                              <button
                                key={key}
                                onClick={() => updateStatus(order.id, key)}
                                style={{ padding: "9px 12px", borderRadius: 10, border: order.shipping_status === key ? "2px solid #1a1410" : "1px solid rgba(0,0,0,0.1)", background: order.shipping_status === key ? val.bg : "#fafafa", color: order.shipping_status === key ? val.color : "rgba(26,20,16,0.6)", fontWeight: 800, fontSize: 12, cursor: "pointer" }}
                              >
                                {val.label}
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}