"use client";
async function logActivity(type: string, message: string, opts?: { entity_name?: string; entity_id?: string }) {
  try {
    let token = "";
    try { for (let i=0;i<localStorage.length;i++){const k=localStorage.key(i)??"";if(k.startsWith("sb-")&&k.endsWith("-auth-token")){const p=JSON.parse(localStorage.getItem(k)??"{}");token=p.access_token??"";if(token)break;}} } catch {}
    await fetch("/api/admin/activity", { method: "POST", headers: { "Content-Type": "application/json", ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify({ type, message, entity_name: opts?.entity_name, entity_id: opts?.entity_id }) });
  } catch {}
}



// ── Logger d'activité ──────────────────────────────────────────────────────────

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
  // 'locker' n'est plus proposé au client mais peut exister sur des
  // commandes historiques antérieures à la migration 002_remove_locker.sql.
  delivery_type?: "point_relais" | "home" | "locker" | null;
  delivery_price?: number | null;
  relay_id?: string | null;
  relay_name?: string | null;
  relay_address?: string | null;
  relay_city?: string | null;
  relay_postal_code?: string | null;
  relay_type?: string | null;
  label_url?: string | null;
  sendcloud_parcel_id?: string | null;
};

const STATUTS: Record<string, { label: string; bg: string; color: string }> = {
  en_preparation: { label: "En préparation", bg: "#fef3c7", color: "#92400e" },
  expediee:       { label: "Expédiée",       bg: "#dcfce7", color: "#166534" },
  livree:         { label: "Livrée",         bg: "#c49a4a", color: "#1a1410" },
  retour:         { label: "Retour",         bg: "#fee2e2", color: "#b91c1c" },
  annulee:        { label: "Annulée",        bg: "#fee2e2", color: "#7f1d1d" },
};

/**
 * Nettoie les notes — masque les anciennes données techniques (JSON brut)
 * qui ressemblent à {"label":"...","carrier":"...","sendcloud_id":...}
 */
function cleanNotes(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.startsWith("{") || s.startsWith("[")) return "";
  return s;
}

// Transporteurs M!LK — Colissimo (2 options pour colis bébé bambou < 1kg).
// Les codes ci-dessous sont des identifiants UI uniquement ; le backend
// /api/admin/sendcloud/create-label utilise /fetch-shipping-options qui matche
// par nom de transporteur dynamiquement (cf. wantedKey="colissimo").
type SendcloudProduct = {
  code:         string;
  name:         string;
  carrier_name: string;
  carrier_code: string;
  contract_id:  number | null;
  weight_min?:  number | null;
  weight_max?:  number | null;
  delivery_type: "point_relais" | "home";
};

const COLISSIMO_OPTIONS: SendcloudProduct[] = [
  {
    code: "colissimo:home", name: "Colissimo Domicile",
    carrier_name: "Colissimo", carrier_code: "colissimo",
    contract_id: null, weight_min: 0, weight_max: 1,
    delivery_type: "home",
  },
  {
    code: "colissimo:service_point", name: "Colissimo Point Relais",
    carrier_name: "Colissimo", carrier_code: "colissimo",
    contract_id: null, weight_min: 0, weight_max: 1,
    delivery_type: "point_relais",
  },
];

/**
 * Normalise le delivery_type pour l'affichage admin : les anciennes commandes
 * en 'locker' sont traitées comme 'point_relais' (purge définitive de l'option,
 * cf. migration 002_remove_locker.sql qui réécrit la donnée en base).
 */
function normalizeDeliveryType(t: string | null | undefined): "point_relais" | "home" | null {
  if (t === "home")         return "home";
  if (t === "point_relais") return "point_relais";
  if (t === "locker")       return "point_relais"; // legacy → point_relais
  return null;
}

const ADRESSE_EXPEDITEUR = {
  nom:     "M!LK — Essentiels Bébé (EKBH)",
  ligne1:  "6 Impasse des Cabrolles",
  cp:      "06500",
  ville:   "Menton",
  pays:    "France",
  email:   "contact@milkbebe.fr",
  tel:     "07 45 27 21 34",
};

// Lien de suivi selon le transporteur
function getTrackingUrl(transporteur: string, tracking: string): string | null {
  if (!tracking) return null;
  const t = transporteur.toLowerCase();
  if (t.includes("colissimo") || t.includes("poste")) return `https://www.laposte.fr/outils/suivre-vos-envois?code=${tracking}`;
  if (t.includes("chronopost")) return `https://www.chronopost.fr/fr/chrono_suivi_display?listeNumerosLT=${tracking}`;
  if (t.includes("dhl")) return `https://www.dhl.com/fr-fr/home/tracking.html?tracking-id=${tracking}`;
  if (t.includes("dpd")) return `https://trace.dpd.fr/fr/trace/${tracking}`;
  if (t.includes("gls")) return `https://gls-group.com/FR/fr/suivi-colis?match=${tracking}`;
  // Colissimo / La Poste est le default — retourne le tracker Laposte si carrier inconnu
  return `https://www.laposte.fr/outils/suivre-vos-envois?code=${tracking}`;
}

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
      background: #ede8df;
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
    <button onclick="window.close()" style="padding:12px 24px;background:#ede8df;color:#1a1410;border:2px solid #1a1410;border-radius:10px;font-size:15px;font-weight:800;cursor:pointer">
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
  const [search,         setSearch]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState("");
  // Filtre transporteur — mode livraison choisi par le client.
  // "all" = tout, "home" = Colissimo Domicile, "point_relais" = Colissimo Point Relais
  const [carrierFilter,  setCarrierFilter]  = useState<"all" | "home" | "point_relais">("all");
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);

  // Données du formulaire d'expédition
  const [tracking,       setTracking]       = useState("");
  const [transporteur,   setTransporteur]   = useState("");
  const [notes,          setNotes]          = useState("");
  const [labelUrl,       setLabelUrl]       = useState<string | null>(null);
  const [generatingLabel, setGeneratingLabel] = useState(false);
  const [labelError,     setLabelError]     = useState("");
  // parcel_id retourné dans la réponse d'erreur (cas 409 "colis déjà créé")
  // — déclenche le bouton "Vérifier l'étiquette" en mode récupération.
  const [errorParcelId,  setErrorParcelId]  = useState<string | null>(null);

  // Liste fixe (plus de fetch dynamique — 3 options M!LK)
  const colissimoProducts = COLISSIMO_OPTIONS;

  // Modale confirmation expédition
  const [shipModal, setShipModal] = useState<{ orderId: string; previewHtml: string; customMessage: string; sending: boolean } | null>(null);

  // Modale annulation expédition
  const [cancelModal, setCancelModal] = useState<{ orderId: string; cancelling: boolean } | null>(null);

  // Modale informer client de l'annulation
  const [cancelEmailModal, setCancelEmailModal] = useState<{ orderId: string; previewHtml: string; customMessage: string; sending: boolean } | null>(null);

  // Modale envoi instructions de retour au client
  const [returnEmailModal, setReturnEmailModal] = useState<{ orderId: string; previewHtml: string; customMessage: string; sending: boolean } | null>(null);

  // Modale "Annuler + Rembourser Stripe" (action IRRÉVERSIBLE)
  const [refundModal, setRefundModal] = useState<{ orderId: string; amount: number; reason: string; customMessage: string; sending: boolean; mode: "full" | "partial" } | null>(null);

  async function load() {
    setLoading(true);
    const res  = await adminFetch("/api/admin/commandes-data");
    const data = await res.json();
    if (!res.ok || !Array.isArray(data)) {
      console.error("[admin/commandes] API error:", data);
      setOrders([]);
    } else {
      setOrders(data);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Quand on ouvre une commande, pré-remplir les champs + auto-sélectionner le transporteur
  useEffect(() => {
    if (!selected) return;
    const order = orders.find(o => o.id === selected);
    if (order) {
      setTracking(order.tracking_number ?? "");
      setNotes(cleanNotes(order.notes));
      // Auto-sélection selon delivery_type
      const matched = COLISSIMO_OPTIONS.find(o => o.delivery_type === order.delivery_type);
      setTransporteur(matched ? JSON.stringify(matched) : "");
    }
  }, [selected, orders]);

  // Télécharge le PDF d'étiquette via le proxy authentifié et l'ouvre dans un nouvel onglet.
  // Gère le cas "pending" si Sendcloud n'a pas encore généré le PDF.
  async function openLabelPdf(orderId: string) {
    try {
      const res = await adminFetch(`/api/admin/sendcloud/label-pdf?order_id=${encodeURIComponent(orderId)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.pending) {
          alert(`⏳ Étiquette pas encore prête côté Sendcloud (parcel #${err.parcel_id ?? "?"}).\n\nLa génération peut prendre plusieurs minutes.\nRéessayer dans 30 secondes avec le bouton "Vérifier l'étiquette".`);
        } else {
          alert(`Impossible d'ouvrir l'étiquette : ${err.error ?? `HTTP ${res.status}`}`);
        }
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      // Libère le blob après 1 minute (le temps que le navigateur l'ouvre)
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      // Refresh la commande — la route label-pdf a persisté label_url en base,
      // donc on a maintenant l'URL côté UI et le bouton "Vérifier" disparait.
      await load();
    } catch (e: any) {
      alert(`Erreur réseau : ${e?.message ?? "inconnue"}`);
    }
  }

  // Générer l'étiquette Sendcloud automatiquement
  async function generateLabel(order: Order) {
    if (!transporteur) { setLabelError("Choisis un transporteur d'abord"); return; }
    const t = (() => { try { return JSON.parse(transporteur); } catch { return null; } })();
    if (!t) { setLabelError("Transporteur invalide"); return; }
    setGeneratingLabel(true);
    setLabelError("");
    setLabelUrl(null);
    setErrorParcelId(null);
    try {
      const res = await adminFetch("/api/admin/sendcloud/create-label", {
        method: "POST",
        body: JSON.stringify({
          order_id:     order.id,
          transporteur: t.carrier_name ?? "colissimo",
          customer: {
            name:     order.customer_name,
            email:    order.customer_email,
            address:  order.shipping_address?.line1 ?? "",
            city:     order.shipping_address?.city ?? "",
            zip:      order.shipping_address?.postal_code ?? "",
            country:  order.shipping_address?.country ?? "FR",
          },
          items: order.items,
        }),
      });
      const data = await res.json();
      if (data.tracking_number) {
        setTracking(data.tracking_number);
        if (data.label_url) setLabelUrl(data.label_url);
        await load();
      } else {
        setLabelError(data.error ?? "Erreur génération étiquette");
        // Cas 409 — un colis Sendcloud existe déjà : exposer le parcel_id pour
        // déclencher le bouton "Vérifier l'étiquette" malgré l'erreur. Reload
        // l'order pour récupérer sendcloud_parcel_id depuis la base.
        if (data.parcel_id) {
          setErrorParcelId(String(data.parcel_id));
          await load();
        }
      }
    } catch (e: any) {
      setLabelError("Erreur réseau : " + e.message);
    } finally {
      setGeneratingLabel(false);
    }
  }

  // Construit le payload des infos livraison à passer aux emails.
  // Normalise les legacy 'locker' → 'point_relais' pour les emails sortants.
  function getDeliveryPayload(order: Order) {
    const dt = normalizeDeliveryType(order.delivery_type);
    const relay = dt === "point_relais" && order.relay_id ? {
      id:          order.relay_id,
      name:        order.relay_name,
      street:      order.relay_address,
      city:        order.relay_city,
      postal_code: order.relay_postal_code,
      type:        order.relay_type,
    } : null;
    const home_address = dt === "home" ? order.shipping_address : null;
    return { delivery_type: dt, relay, home_address };
  }

  // Construit l'aperçu HTML de l'email d'expédition via la route /api/emails/shipped?preview=1
  async function buildShipPreview(order: Order, customMessage: string): Promise<string> {
    const carrier = (() => { try { return JSON.parse(transporteur).carrier_name; } catch { return transporteur; } })();
    const deliveryPayload = getDeliveryPayload(order);
    try {
      const res = await adminFetch("/api/emails/shipped", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          email:          order.customer_email,
          prenom:         order.customer_name?.split(" ")[0] ?? "",
          tracking:       tracking.trim() || order.tracking_number || "",
          transporteur:   carrier,
          items:          order.items,
          custom_message: customMessage,
          preview:        true,
          ...deliveryPayload,
        }),
      });
      if (!res.ok) return `<p style="padding:20px;color:#b91c1c">Erreur génération aperçu (${res.status})</p>`;
      return await res.text();
    } catch (e: any) {
      return `<p style="padding:20px;color:#b91c1c">Erreur réseau: ${e?.message ?? "inconnue"}</p>`;
    }
  }

  // Ouvre la modale d'expédition (au lieu d'envoyer auto)
  async function openShipModal(order: Order) {
    if (!tracking.trim() || !transporteur) return;
    const previewHtml = await buildShipPreview(order, "");
    setShipModal({ orderId: order.id, previewHtml, customMessage: "", sending: false });
  }

  // Rafraîchit la preview quand le custom_message change
  async function refreshShipPreview(customMessage: string) {
    if (!shipModal) return;
    const order = orders.find(o => o.id === shipModal.orderId);
    if (!order) return;
    const previewHtml = await buildShipPreview(order, customMessage);
    setShipModal(s => s ? { ...s, customMessage, previewHtml } : null);
  }

  // Marque la commande expédiée, et envoie OU non l'email selon le bouton cliqué
  async function confirmShip(sendEmail: boolean) {
    if (!shipModal) return;
    const order = orders.find(o => o.id === shipModal.orderId);
    if (!order) return;
    setShipModal({ ...shipModal, sending: true });

    const carrier = (() => { try { return JSON.parse(transporteur).carrier_name; } catch { return transporteur; } })();
    // 1. Update Supabase
    await adminFetch("/api/admin/commandes-data", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        id:              order.id,
        shipping_status: "expediee",
        tracking_number: tracking.trim(),
        notes:           `Transporteur: ${carrier}${notes ? " — " + notes : ""}`,
      }),
    });

    // 2. Envoie email seulement si demandé
    if (sendEmail) {
      try {
        const emailRes = await adminFetch("/api/emails/shipped", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            email:          order.customer_email,
            prenom:         order.customer_name?.split(" ")[0] ?? "",
            tracking:       tracking.trim(),
            transporteur:   carrier,
            items:          order.items,
            custom_message: shipModal.customMessage,
            ...getDeliveryPayload(order),
          }),
        });
        if (!emailRes.ok) {
          const errorBody = await emailRes.text().catch(() => "");
          console.error("Email shipped failed:", emailRes.status, errorBody);
          alert("⚠ Commande marquée expédiée, mais l'email client n'a pas pu être envoyé.");
        }
      } catch (e) {
        console.error("Email shipped network error:", e);
        alert("⚠ Commande marquée expédiée, mais l'email client n'a pas pu être envoyé (réseau).");
      }
    }

    await load();
    await logActivity("order_shipped", `Commande expédiée via ${carrier}${sendEmail ? " (email envoyé)" : " (sans email)"}`, { entity_id: order.id });
    setShipModal(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  // === ANNULATION ===
  async function confirmCancel() {
    if (!cancelModal) return;
    setCancelModal({ ...cancelModal, cancelling: true });
    const res = await adminFetch("/api/admin/sendcloud/cancel", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ order_id: cancelModal.orderId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(`Erreur annulation: ${data.error ?? `HTTP ${res.status}`}`);
      setCancelModal(null);
      return;
    }
    await load();
    await logActivity("order_cancelled", "Expédition annulée — aucun email envoyé", { entity_id: cancelModal.orderId });
    setCancelModal(null);
    alert("Expédition annulée — aucun email envoyé au client");
  }

  async function buildCancelPreview(order: Order, customMessage: string): Promise<string> {
    try {
      const res = await adminFetch("/api/emails/cancellation", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          email:          order.customer_email,
          prenom:         order.customer_name?.split(" ")[0] ?? "",
          order_number:   order.id,
          custom_message: customMessage,
          preview:        true,
        }),
      });
      if (!res.ok) return `<p style="padding:20px;color:#b91c1c">Erreur génération aperçu (${res.status})</p>`;
      return await res.text();
    } catch (e: any) {
      return `<p style="padding:20px;color:#b91c1c">Erreur réseau: ${e?.message ?? "inconnue"}</p>`;
    }
  }

  async function openCancelEmailModal(order: Order) {
    const previewHtml = await buildCancelPreview(order, "");
    setCancelEmailModal({ orderId: order.id, previewHtml, customMessage: "", sending: false });
  }

  async function refreshCancelEmailPreview(customMessage: string) {
    if (!cancelEmailModal) return;
    const order = orders.find(o => o.id === cancelEmailModal.orderId);
    if (!order) return;
    const previewHtml = await buildCancelPreview(order, customMessage);
    setCancelEmailModal(s => s ? { ...s, customMessage, previewHtml } : null);
  }

  // === ANNULER + REMBOURSER STRIPE ===
  async function confirmRefund() {
    if (!refundModal) return;
    setRefundModal({ ...refundModal, sending: true });

    const body: any = {
      action:         refundModal.mode === "full" ? "cancel_refund" : "refund_partial",
      reason:         refundModal.reason,
      custom_message: refundModal.customMessage,
    };
    if (refundModal.mode === "partial") body.amount = refundModal.amount;

    const res = await adminFetch(`/api/admin/commandes/${refundModal.orderId}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(`Erreur: ${data.error ?? `HTTP ${res.status}`}${data.details ? "\n" + data.details : ""}`);
      setRefundModal({ ...refundModal, sending: false });
      return;
    }

    const successMsg = refundModal.mode === "full"
      ? `✅ Commande annulée + ${data.refund_amount?.toFixed(2)} € remboursés (Stripe ${data.refund_id}). Stock réintégré: ${data.stock_restored} produit(s).${data.email_sent ? " Email client envoyé." : " ⚠ Email client échoué."}`
      : `✅ Remboursement partiel ${refundModal.amount.toFixed(2)} € effectué (Stripe ${data.refund_id}).`;
    alert(successMsg);
    await load();
    setRefundModal(null);
  }

  async function sendCancellationEmail() {
    if (!cancelEmailModal) return;
    const order = orders.find(o => o.id === cancelEmailModal.orderId);
    if (!order) return;
    setCancelEmailModal({ ...cancelEmailModal, sending: true });
    const res = await adminFetch("/api/emails/cancellation", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        email:          order.customer_email,
        prenom:         order.customer_name?.split(" ")[0] ?? "",
        order_number:   order.id,
        custom_message: cancelEmailModal.customMessage,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Erreur envoi email: ${err.error ?? `HTTP ${res.status}`}`);
      setCancelEmailModal({ ...cancelEmailModal, sending: false });
      return;
    }
    // Marque l'envoi de l'email d'annulation dans notes
    const marker = `[CANCEL_EMAIL_SENT:${new Date().toISOString()}]`;
    const newNotes = (order.notes ?? "").includes("CANCEL_EMAIL_SENT") ? order.notes : `${order.notes ?? ""} ${marker}`.trim();
    await adminFetch("/api/admin/commandes-data", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: order.id, notes: newNotes }),
    });
    await load();
    await logActivity("order_cancel_email_sent", "Email d'annulation envoyé au client", { entity_id: order.id });
    setCancelEmailModal(null);
    alert("Email d'annulation envoyé au client");
  }

  // ── Envoi instructions de retour au client ─────────────────────────────
  async function buildReturnPreview(order: Order, customMessage: string): Promise<string> {
    try {
      const res = await adminFetch("/api/emails/retour", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          email:          order.customer_email,
          prenom:         order.customer_name?.split(" ")[0] ?? "",
          order_number:   order.id,
          custom_message: customMessage,
          preview:        true,
        }),
      });
      if (!res.ok) return `<p style="padding:20px;color:#b91c1c">Erreur génération aperçu (${res.status})</p>`;
      return await res.text();
    } catch (e: any) {
      return `<p style="padding:20px;color:#b91c1c">Erreur réseau: ${e?.message ?? "inconnue"}</p>`;
    }
  }

  async function openReturnEmailModal(order: Order) {
    const previewHtml = await buildReturnPreview(order, "");
    setReturnEmailModal({ orderId: order.id, previewHtml, customMessage: "", sending: false });
  }

  async function refreshReturnEmailPreview(customMessage: string) {
    if (!returnEmailModal) return;
    const order = orders.find(o => o.id === returnEmailModal.orderId);
    if (!order) return;
    const previewHtml = await buildReturnPreview(order, customMessage);
    setReturnEmailModal(s => s ? { ...s, customMessage, previewHtml } : null);
  }

  async function sendReturnInstructions() {
    if (!returnEmailModal) return;
    const order = orders.find(o => o.id === returnEmailModal.orderId);
    if (!order) return;
    setReturnEmailModal({ ...returnEmailModal, sending: true });
    const res = await adminFetch("/api/emails/retour", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        email:          order.customer_email,
        prenom:         order.customer_name?.split(" ")[0] ?? "",
        order_number:   order.id,
        custom_message: returnEmailModal.customMessage,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Erreur envoi email: ${err.error ?? `HTTP ${res.status}`}`);
      setReturnEmailModal({ ...returnEmailModal, sending: false });
      return;
    }
    await logActivity("commande_retour_email_sent", `Instructions de retour envoyées à ${order.customer_email}`, {
      entity_id: order.id,
    });
    setReturnEmailModal(null);
    alert("Instructions de retour envoyées au client");
  }

  // L'ancien handleShip envoyait l'email auto. Maintenant openShipModal ouvre une modale
  // avec preview + champ message + 2 boutons (envoyer / sans email).

  async function updateStatus(id: string, shipping_status: string) {
    await adminFetch("/api/admin/commandes-data", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, shipping_status }),
    });
    await load();
  }

  // Helper : commande expédiée depuis >24h sans numéro de suivi.
  // Sert de signal d'alerte côté admin pour relancer Sendcloud ou contacter
  // le client.
  function isShippedTooLongAgo(o: Order): boolean {
    if (o.shipping_status !== "expediee") return false;
    if (o.tracking_number && o.tracking_number.length > 0) return false;
    const ageMs = Date.now() - new Date(o.created_at).getTime();
    return ageMs > 24 * 3600 * 1000;
  }

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch  = !q || (o.customer_name ?? "").toLowerCase().includes(q) || (o.customer_email ?? "").toLowerCase().includes(q) || o.id.includes(q);
    const matchStatus  = !statusFilter || o.shipping_status === statusFilter;
    const matchCarrier = carrierFilter === "all" || normalizeDeliveryType(o.delivery_type) === carrierFilter;
    return matchSearch && matchStatus && matchCarrier;
  });

  const isCancelled = (o: Order) => o.shipping_status === "annulee" || (o as any).status === "annulee" || (o as any).status === "remboursee";
  const validOrders = orders.filter(o => !isCancelled(o));
  const totalCA     = validOrders.reduce((s, o) => s + Number(o.amount_total ?? 0), 0);  // exclut annulées
  const pending     = orders.filter(o => o.shipping_status === "en_preparation" && !isCancelled(o)).length;
  const shipped     = orders.filter(o => o.shipping_status === "expediee").length;
  const delivered   = orders.filter(o => o.shipping_status === "livree").length;
  const cancelled   = orders.filter(o => isCancelled(o)).length;
  const refunded    = orders.filter(o => (o as any).status === "remboursee").length;
  const selectedOrder = orders.find(o => o.id === selected);

  const selectedCarrier = (() => { try { return JSON.parse(transporteur).carrier_name; } catch { return transporteur; } })();
  const canShip = tracking.trim().length > 0 && transporteur.length > 0;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100 }}>

      {/* En-tête */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>Commandes</h1>
        <div style={{ fontSize: 15, color: "rgba(26,20,16,0.5)", marginTop: 4, fontWeight: 600 }}>
          {orders.length} commande{orders.length > 1 ? "s" : ""} · CA valide : {totalCA.toFixed(2)} €
        </div>
      </div>

      {/* KPIs — compteurs séparés par statut */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total",          value: orders.length,                                                              color: "#1a1410" },
          { label: "En préparation", value: pending,                                                                     color: "#92400e" },
          { label: "Expédiées",      value: shipped,                                                                     color: "#1e40af" },
          { label: "Livrées",        value: delivered,                                                                   color: "#166534" },
          { label: "Annulées",       value: cancelled,                                                                   color: cancelled > 0 ? "#7f1d1d" : "#166534" },
          { label: "Remboursées",    value: refunded,                                                                    color: refunded  > 0 ? "#7f1d1d" : "#166534" },
          { label: "CA valide",      value: `${totalCA.toFixed(0)} €`,                                                  color: "#c49a4a" },
          { label: "Panier moyen",   value: validOrders.length > 0 ? `${(totalCA / validOrders.length).toFixed(2)} €` : "—", color: "#1a1410" },
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
        <select
          value={carrierFilter} onChange={e => setCarrierFilter(e.target.value as "all" | "home" | "point_relais")}
          style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", fontSize: 14, fontWeight: 600, background: "#fff", outline: "none" }}
        >
          <option value="all">Tous transporteurs</option>
          <option value="home">📦 Colissimo Domicile</option>
          <option value="point_relais">📦 Colissimo Point Relais</option>
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
            const status    = STATUTS[order.shipping_status ?? "en_preparation"] ?? STATUTS.en_preparation;
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

                {/* Alerte : expédiée depuis plus de 24h sans n° de suivi */}
                {isShippedTooLongAgo(order) && (
                  <div style={{ padding: "10px 24px", background: "#fef3c7", borderTop: "1px solid #fde68a", color: "#92400e", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                    ⚠ Expédiée depuis plus de 24h sans numéro de suivi — relancer Sendcloud ou contacter le client.
                  </div>
                )}

                {/* ── Panneau détail ── */}
                {isOpen && selectedOrder && (
                  <div style={{ padding: "0 24px 28px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 20 }}>

                      {/* Colonne gauche — infos + articles */}
                      <div style={{ display: "grid", gap: 16 }}>

                        {/* Articles */}
                        <div style={{ background: "#ede8df", borderRadius: 12, padding: "16px 18px" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", marginBottom: 12 }}>Articles</div>
                          {(Array.isArray(order.items) ? order.items : []).map((item: any, i: number) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(26,20,16,0.06)" }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>
                                  {item.name.split(" — ")[0]}
                                  {item.name.split(" — ").slice(1).map((part: string, pi: number) => (
                                    <span key={pi} style={{ marginLeft: 6, padding: "1px 7px", borderRadius: 99, background: pi === 0 ? "rgba(196,154,74,0.12)" : "rgba(26,20,16,0.07)", fontSize: 12, fontWeight: 800, color: pi === 0 ? "#92400e" : "#1a1410" }}>{part}</span>
                                  ))}
                                </div>
                                <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", marginTop: 3 }}>
                                  × {item.quantity}
                                  {item.taille && <span style={{ marginLeft: 8, fontWeight: 700, color: "#1a1410" }}>Taille : {item.taille}</span>}
                                </div>
                              </div>
                              <div style={{ fontWeight: 900, color: "#c49a4a" }}>{(Number(item.price) * Number(item.quantity)).toFixed(2)} €</div>
                            </div>
                          ))}
                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, fontWeight: 950, fontSize: 18, color: "#1a1410" }}>
                            {Number(order.amount_total).toFixed(2)} €
                          </div>
                        </div>

                        {/* Mode de livraison Colissimo */}
                        <div style={{ background: "#ede8df", borderRadius: 12, padding: "16px 18px" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", marginBottom: 10 }}>
                            Mode de livraison
                          </div>
                          {normalizeDeliveryType(order.delivery_type) === "point_relais" ? (
                            order.relay_id ? (
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 900, color: "#1a1410", marginBottom: 4 }}>
                                  📦 Colissimo Point Relais
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1410", marginBottom: 4 }}>{order.relay_name ?? "—"}</div>
                                <div style={{ fontSize: 13, color: "rgba(26,20,16,0.7)", lineHeight: 1.6 }}>
                                  {order.relay_address ?? ""}<br />
                                  {order.relay_postal_code ?? ""} {order.relay_city ?? ""}
                                </div>
                                <div style={{ fontSize: 11, color: "rgba(26,20,16,0.4)", marginTop: 6, fontFamily: "monospace" }}>ID Sendcloud : {order.relay_id}</div>
                              </div>
                            ) : (
                              <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef3c7", color: "#92400e", fontSize: 13, fontWeight: 700 }}>
                                ⚠ Point relais non renseigné — saisie manuelle requise avant génération étiquette
                              </div>
                            )
                          ) : order.delivery_type === "home" ? (
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 900, color: "#1a1410", marginBottom: 6 }}>🏠 Livraison à domicile</div>
                              {addr ? (
                                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.7, color: "#1a1410" }}>
                                  {addr.name ?? order.customer_name}<br />
                                  {addr.line1}{addr.line2 ? <><br />{addr.line2}</> : ""}<br />
                                  {addr.postal_code} {addr.city}<br />
                                  {addr.country ?? "FR"}
                                </div>
                              ) : (
                                <div style={{ fontSize: 13, color: "#92400e", fontWeight: 700 }}>⚠ Adresse domicile manquante</div>
                              )}
                            </div>
                          ) : addr ? (
                            <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.8, color: "#1a1410" }}>
                              {addr.name ?? order.customer_name}<br />
                              {addr.line1}{addr.line2 ? <><br />{addr.line2}</> : ""}<br />
                              {addr.postal_code} {addr.city}<br />
                              {addr.country ?? "FR"}
                            </div>
                          ) : (
                            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)" }}>Aucune info de livraison</div>
                          )}
                          {order.delivery_price !== null && order.delivery_price !== undefined && (
                            <div style={{ fontSize: 12, color: "rgba(26,20,16,0.5)", marginTop: 8 }}>
                              Frais : {Number(order.delivery_price).toFixed(2)} €
                            </div>
                          )}
                        </div>

                        {/* Boutons étiquettes */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          {(order as any).label_url ? (
                            <button
                              onClick={() => openLabelPdf(order.id)}
                              style={{ padding: "12px 16px", borderRadius: 12, background: "#16a34a", color: "#fff", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                              title="Télécharge le vrai PDF Colissimo via Sendcloud (proxy authentifié)"
                            >
                              🖨️ Étiquette PDF Colissimo
                            </button>
                          ) : (
                            <button
                              disabled
                              style={{ padding: "12px 16px", borderRadius: 12, background: "#e5e7eb", color: "#9ca3af", fontWeight: 800, fontSize: 13, border: "none", cursor: "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                              title="Génère d'abord l'étiquette Sendcloud (colonne droite)"
                            >
                              📦 Étiquette à générer
                            </button>
                          )}
                          <button
                            onClick={() => printLabel(order, "retour")}
                            style={{ padding: "12px 16px", borderRadius: 12, background: "#ede8df", color: "#1a1410", fontWeight: 800, fontSize: 13, border: "2px solid rgba(26,20,16,0.15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                          >
                            ↩️ Étiquette retour (interne)
                          </button>
                          <button
                            onClick={() => openReturnEmailModal(order)}
                            style={{ gridColumn: "1 / -1", padding: "12px 16px", borderRadius: 12, background: "#e0f2fe", color: "#075985", fontWeight: 800, fontSize: 13, border: "2px solid #bae6fd", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                          >
                            ✉️ Envoyer instructions retour au client
                          </button>
                        </div>
                      </div>

                      {/* Colonne droite — expédition */}
                      <div style={{ display: "grid", gap: 14, alignContent: "start" }}>

                        <div style={{ fontSize: 13, fontWeight: 900, color: "#1a1410", textTransform: "uppercase", letterSpacing: 1 }}>
                          Gestion expédition
                        </div>

                        {/* Mode de livraison — info READ-ONLY (auto depuis order.delivery_type) */}
                        {order.delivery_type ? (
                          (() => {
                            const dt      = normalizeDeliveryType(order.delivery_type);
                            const matched = COLISSIMO_OPTIONS.find(o => o.delivery_type === dt);
                            const icon    = dt === "home" ? "🏠" : "📦";
                            const label   =
                              dt === "home" ? "Colissimo Domicile" :
                                              "Colissimo Point Relais";
                            return (
                              <div style={{ background: "#1a1410", borderRadius: 12, padding: "16px 18px", color: "#f2ede6" }}>
                                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(196,154,74,0.8)", marginBottom: 8 }}>
                                  Mode de livraison
                                </div>
                                <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 10 }}>
                                  {icon} {label}
                                </div>
                                {dt === "point_relais" && order.relay_id ? (
                                  <>
                                    <div style={{ fontSize: 14, fontWeight: 800 }}>{order.relay_name ?? "—"}</div>
                                    <div style={{ fontSize: 13, color: "rgba(242,237,230,0.65)", lineHeight: 1.6, marginTop: 4 }}>
                                      {order.relay_address ?? ""}{order.relay_address ? ", " : ""}{order.relay_postal_code ?? ""} {order.relay_city ?? ""}
                                    </div>
                                    <div style={{ fontSize: 11, color: "rgba(242,237,230,0.4)", marginTop: 8, fontFamily: "monospace" }}>
                                      ID Sendcloud : {order.relay_id}
                                    </div>
                                  </>
                                ) : dt === "home" && addr ? (
                                  <div style={{ fontSize: 13, color: "rgba(242,237,230,0.7)", lineHeight: 1.6 }}>
                                    {addr.line1}<br />
                                    {addr.postal_code} {addr.city}
                                  </div>
                                ) : null}
                                <div style={{ fontSize: 11, color: "rgba(242,237,230,0.5)", marginTop: 10, padding: "8px 10px", background: "rgba(196,154,74,0.1)", borderRadius: 6 }}>
                                  ↪ Transporteur sélectionné automatiquement : <strong style={{ color: "#c49a4a" }}>{matched?.name ?? "—"}</strong> (ID {matched?.code ?? "—"})
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          /* Fallback : delivery_type absent (ancienne commande) → select manuel */
                          <div style={{ display: "grid", gap: 6 }}>
                            <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "#92400e" }}>
                              ⚠️ Mode de livraison non renseigné — sélection manuelle requise
                            </label>
                            <div style={{ display: "grid", gap: 8 }}>
                              {colissimoProducts.map(t => {
                                const key = t.code;
                                const isSelected = (() => { try { return JSON.parse(transporteur).code === key; } catch { return false; } })();
                                return (
                                  <button
                                    key={key}
                                    onClick={() => setTransporteur(JSON.stringify(t))}
                                    style={{
                                      padding: "12px 16px", borderRadius: 10,
                                      border: `2px solid ${isSelected ? "#1a1410" : "rgba(0,0,0,0.12)"}`,
                                      fontSize: 13, fontWeight: 700,
                                      background: isSelected ? "#1a1410" : "#fff",
                                      color: isSelected ? "#f2ede6" : "#1a1410",
                                      cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                                      display: "flex", justifyContent: "space-between", alignItems: "center",
                                    }}>
                                    <span>📦 {t.name}</span>
                                    <span style={{ fontSize: 10, opacity: 0.5, fontFamily: "monospace" }}>{key}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

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

                        {/* Lien de suivi si déjà expédiée */}
                        {order.shipping_status === "expediee" && order.tracking_number && (
                          <div style={{ padding: "12px 14px", borderRadius: 10, background: "#dcfce7", border: "1px solid #bbf7d0" }}>
                            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "#166534", marginBottom: 6 }}>Numéro de suivi</div>
                            <div style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 15, color: "#1a1410", marginBottom: 6 }}>{order.tracking_number}</div>
                            {(() => {
                              const notes = order.notes ?? "";
                              const transporteurMatch = notes.match(/^Transporteur: ([^—]+)/);
                              const transporteurName = transporteurMatch ? transporteurMatch[1].trim() : "";
                              const url = getTrackingUrl(transporteurName, order.tracking_number);
                              return url ? (
                                <a href={url} target="_blank" rel="noopener noreferrer"
                                  style={{ fontSize: 13, fontWeight: 800, color: "#166534", textDecoration: "underline" }}>
                                  Suivre le colis →
                                </a>
                              ) : null;
                            })()}
                          </div>
                        )}

                        {/* ✅ Bouton Sendcloud — génération étiquette automatique */}
                        {order.shipping_status !== "expediee" && (
                          <div style={{ display: "grid", gap: 8 }}>
                            <button
                              onClick={() => generateLabel(order)}
                              disabled={!transporteur || generatingLabel}
                              style={{
                                padding: "12px 16px",
                                borderRadius: 12,
                                border: "none",
                                fontWeight: 900,
                                fontSize: 14,
                                cursor: (!transporteur || generatingLabel) ? "not-allowed" : "pointer",
                                background: (!transporteur || generatingLabel) ? "#e5e7eb" : "#1d4ed8",
                                color: (!transporteur || generatingLabel) ? "#9ca3af" : "#fff",
                                transition: "all 0.2s",
                              }}
                            >
                              {generatingLabel ? "⏳ Génération..." : "📦 Générer l'étiquette Sendcloud"}
                            </button>
                            {labelError && (
                              <div style={{ padding: "8px 12px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", fontSize: 12, fontWeight: 700 }}>
                                ✕ {labelError}
                              </div>
                            )}
                            {/* Bouton de récupération quand l'erreur expose un
                                parcel_id existant (cas 409 "colis déjà créé").
                                On peut directement aller chercher l'étiquette
                                via label-pdf au lieu d'en recréer un nouveau. */}
                            {errorParcelId && (
                              <button
                                onClick={() => openLabelPdf(order.id)}
                                style={{ padding: "10px 16px", borderRadius: 10, background: "#1d4ed8", color: "#fff", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer", textAlign: "center", display: "block", width: "100%" }}>
                                🔄 Vérifier l'étiquette du colis #{errorParcelId}
                              </button>
                            )}
                            {labelUrl && (
                              <button
                                onClick={() => openLabelPdf(order.id)}
                                style={{ padding: "10px 16px", borderRadius: 10, background: "#dcfce7", color: "#166534", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer", textAlign: "center", display: "block", width: "100%" }}>
                                🖨️ Imprimer l'étiquette PDF →
                              </button>
                            )}
                            {/* Bouton "Vérifier l'étiquette" : parcel créé côté Sendcloud
                                mais PDF pas encore généré (génération async). */}
                            {!labelUrl && (order as any).sendcloud_parcel_id && (
                              <div style={{ display: "grid", gap: 8 }}>
                                <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fef3c7", border: "1px solid #fde68a", fontSize: 12, fontWeight: 700, color: "#92400e", textAlign: "center" }}>
                                  ⏳ Colis créé (Sendcloud #{(order as any).sendcloud_parcel_id}) — étiquette en cours de génération
                                </div>
                                <button
                                  onClick={() => openLabelPdf(order.id)}
                                  style={{ padding: "10px 16px", borderRadius: 10, background: "#1d4ed8", color: "#fff", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer", textAlign: "center", display: "block", width: "100%" }}>
                                  🔄 Vérifier l'étiquette
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ✅ Bouton expédier — bloqué si champs manquants */}
                        {!canShip && (
                          <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fef3c7", border: "1px solid #fde68a", fontSize: 13, fontWeight: 700, color: "#92400e" }}>
                            ⚠️ Remplis le transporteur et le numéro de suivi pour expédier
                          </div>
                        )}

                        <button
                          onClick={() => openShipModal(order)}
                          disabled={!canShip || order.shipping_status === "expediee"}
                          style={{
                            padding: "15px",
                            borderRadius: 12,
                            border: "none",
                            fontWeight: 900,
                            fontSize: 15,
                            cursor: (!canShip || order.shipping_status === "expediee") ? "not-allowed" : "pointer",
                            background: order.shipping_status === "expediee"
                              ? "#dcfce7"
                              : canShip
                                ? "#1a1410"
                                : "#e5e7eb",
                            color: order.shipping_status === "expediee"
                              ? "#166534"
                              : canShip
                                ? "#c49a4a"
                                : "#9ca3af",
                            transition: "all 0.2s",
                          }}
                        >
                          {order.shipping_status === "expediee"
                            ? "✅ Déjà expédiée"
                            : "🚚 Marquer comme expédiée…"}
                        </button>

                        {saved && (
                          <div style={{ padding: "10px 14px", borderRadius: 10, background: "#dcfce7", fontSize: 13, fontWeight: 700, color: "#166534", textAlign: "center" }}>
                            ✅ Statut mis à jour
                          </div>
                        )}

                        {/* === ANNULATION === Visible si tracking présent ET pas annulée déjà */}
                        {order.tracking_number && order.shipping_status !== "annulee" && (
                          <button
                            onClick={() => setCancelModal({ orderId: order.id, cancelling: false })}
                            style={{ padding: "12px 16px", borderRadius: 12, background: "#fef2f2", color: "#b91c1c", fontWeight: 800, fontSize: 13, border: "1px solid #fecaca", cursor: "pointer" }}
                          >
                            ↺ Annuler l'expédition (Sendcloud uniquement)
                          </button>
                        )}

                        {/* === ANNULER + REMBOURSER STRIPE === Visible si pas déjà annulée/remboursée */}
                        {(order as any).status !== "remboursee" && order.shipping_status !== "annulee" && (
                          <>
                            <button
                              onClick={() => setRefundModal({ orderId: order.id, amount: Number(order.amount_total ?? 0), reason: "", customMessage: "", sending: false, mode: "full" })}
                              style={{ padding: "12px 16px", borderRadius: 12, background: "#dc2626", color: "#fff", fontWeight: 900, fontSize: 13, border: "none", cursor: "pointer" }}
                            >
                              🔴 Annuler + Rembourser Stripe
                            </button>
                            <button
                              onClick={() => setRefundModal({ orderId: order.id, amount: 0, reason: "", customMessage: "", sending: false, mode: "partial" })}
                              style={{ padding: "12px 16px", borderRadius: 12, background: "#fff", color: "#b91c1c", fontWeight: 800, fontSize: 13, border: "1px solid #fecaca", cursor: "pointer" }}
                            >
                              💸 Remboursement partiel
                            </button>
                          </>
                        )}

                        {/* "Informer le client" — visible UNIQUEMENT si shipping_status = "annulee" */}
                        {order.shipping_status === "annulee" && (
                          (() => {
                            const sent = order.notes?.match(/\[CANCEL_EMAIL_SENT:([^\]]+)\]/);
                            if (sent) {
                              const date = new Date(sent[1]).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
                              return (
                                <button disabled style={{ padding: "12px 16px", borderRadius: 12, background: "#e5e7eb", color: "#6b7280", fontWeight: 800, fontSize: 13, border: "none", cursor: "not-allowed" }}>
                                  ✉️ Email envoyé le {date}
                                </button>
                              );
                            }
                            return (
                              <button
                                onClick={() => openCancelEmailModal(order)}
                                style={{ padding: "12px 16px", borderRadius: 12, background: "#fff7ed", color: "#9a3412", fontWeight: 800, fontSize: 13, border: "1px solid #fed7aa", cursor: "pointer" }}
                              >
                                ✉️ Informer le client de l'annulation
                              </button>
                            );
                          })()
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

      {/* ══ MODALE 1 — CONFIRMATION EXPÉDITION ══ */}
      {shipModal && (
        <div
          onClick={() => !shipModal.sending && setShipModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 18, maxWidth: 900, width: "100%", maxHeight: "90vh", overflow: "auto", padding: 32 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 950, color: "#1a1410" }}>Confirmer l'expédition</h2>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(26,20,16,0.5)" }}>Aperçu de l'email + option message personnalisé</p>
              </div>
              <button onClick={() => !shipModal.sending && setShipModal(null)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "rgba(26,20,16,0.4)" }}>×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              {/* Colonne preview email */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", marginBottom: 8 }}>Aperçu de l'email</div>
                <iframe
                  srcDoc={shipModal.previewHtml}
                  style={{ width: "100%", height: 480, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, background: "#fff" }}
                  title="Aperçu email expédition"
                />
              </div>

              {/* Colonne champ message + boutons */}
              <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.45)", display: "block", marginBottom: 6 }}>
                    Message personnalisé (optionnel)
                  </label>
                  <textarea
                    value={shipModal.customMessage}
                    onChange={e => refreshShipPreview(e.target.value)}
                    placeholder="Ex: Votre colis a été déposé ce matin, bonne réception !"
                    rows={5}
                    style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "2px solid rgba(0,0,0,0.08)", fontSize: 14, fontWeight: 600, outline: "none", background: "#fff", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                  <div style={{ fontSize: 11, color: "rgba(26,20,16,0.45)", marginTop: 4 }}>Le message s'ajoute dans l'email avant la signature.</div>
                </div>

                <button
                  onClick={() => confirmShip(true)}
                  disabled={shipModal.sending}
                  style={{ padding: "14px 18px", borderRadius: 12, background: shipModal.sending ? "#e5e7eb" : "#c49a4a", color: shipModal.sending ? "#9ca3af" : "#1a1410", fontWeight: 900, fontSize: 14, border: "none", cursor: shipModal.sending ? "not-allowed" : "pointer" }}
                >
                  {shipModal.sending ? "⏳ Envoi..." : "✉️ Envoyer la confirmation au client"}
                </button>

                <button
                  onClick={() => confirmShip(false)}
                  disabled={shipModal.sending}
                  style={{ padding: "14px 18px", borderRadius: 12, background: "transparent", color: "#1a1410", fontWeight: 800, fontSize: 13, border: "2px solid rgba(26,20,16,0.15)", cursor: shipModal.sending ? "not-allowed" : "pointer" }}
                >
                  Marquer expédiée sans email
                </button>

                <button
                  onClick={() => setShipModal(null)}
                  disabled={shipModal.sending}
                  style={{ padding: "10px 18px", borderRadius: 10, background: "transparent", color: "rgba(26,20,16,0.5)", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", textAlign: "center" }}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODALE 2 — CONFIRMATION ANNULATION ══ */}
      {cancelModal && (
        <div
          onClick={() => !cancelModal.cancelling && setCancelModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 18, maxWidth: 500, width: "100%", padding: 32 }}
          >
            <h2 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 950, color: "#1a1410" }}>Annuler cette expédition ?</h2>
            <div style={{ padding: "14px 16px", borderRadius: 10, background: "#fef3c7", border: "1px solid #fde68a", fontSize: 13, color: "#92400e", marginBottom: 20, lineHeight: 1.6 }}>
              ⚠️ Cette action va :
              <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
                <li>Annuler le colis côté Sendcloud</li>
                <li>Effacer le numéro de suivi, l'étiquette et l'ID parcel</li>
                <li>Repasser la commande en « En préparation »</li>
                <li><strong>Aucun email envoyé au client</strong></li>
              </ul>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button
                onClick={() => setCancelModal(null)}
                disabled={cancelModal.cancelling}
                style={{ padding: "12px 18px", borderRadius: 12, background: "transparent", color: "#1a1410", fontWeight: 800, fontSize: 13, border: "2px solid rgba(26,20,16,0.15)", cursor: "pointer" }}
              >
                Annuler
              </button>
              <button
                onClick={() => confirmCancel()}
                disabled={cancelModal.cancelling}
                style={{ padding: "12px 18px", borderRadius: 12, background: cancelModal.cancelling ? "#e5e7eb" : "#dc2626", color: cancelModal.cancelling ? "#9ca3af" : "#fff", fontWeight: 900, fontSize: 13, border: "none", cursor: cancelModal.cancelling ? "not-allowed" : "pointer" }}
              >
                {cancelModal.cancelling ? "⏳ Annulation..." : "Confirmer l'annulation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODALE — ANNULER + REMBOURSER STRIPE (FULL/PARTIAL) ══ */}
      {refundModal && (
        <div
          onClick={() => !refundModal.sending && setRefundModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, maxWidth: 540, width: "100%", padding: 32 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 950, color: "#dc2626" }}>
              {refundModal.mode === "full" ? "🔴 Annuler + Rembourser" : "💸 Remboursement partiel"}
            </h2>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "#fee2e2", border: "1px solid #fca5a5", fontSize: 13, color: "#991b1b", marginBottom: 18, lineHeight: 1.6 }}>
              ⚠️ <strong>Action IRRÉVERSIBLE</strong> — un vrai remboursement Stripe sera créé sur le compte du client.
              {refundModal.mode === "full" && <><br />Le stock sera réintégré et un email d'annulation envoyé.</>}
            </div>

            {refundModal.mode === "partial" && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)", marginBottom: 6 }}>
                  Montant à rembourser (€) *
                </label>
                <input
                  type="number" step="0.01" min="0.50"
                  value={refundModal.amount || ""}
                  onChange={e => setRefundModal(m => m ? { ...m, amount: parseFloat(e.target.value) || 0 } : null)}
                  placeholder="ex: 10.00"
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "2px solid rgba(0,0,0,0.1)", fontSize: 15, fontWeight: 700, fontFamily: "monospace", outline: "none", background: "#fff", boxSizing: "border-box" }} />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)", marginBottom: 6 }}>
                Raison (interne, optionnel)
              </label>
              <input
                type="text"
                value={refundModal.reason}
                onChange={e => setRefundModal(m => m ? { ...m, reason: e.target.value } : null)}
                placeholder="ex: Produit indisponible, client mécontent..."
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box" }} />
            </div>

            {refundModal.mode === "full" && (
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)", marginBottom: 6 }}>
                  Message au client (optionnel)
                </label>
                <textarea
                  rows={3}
                  value={refundModal.customMessage}
                  onChange={e => setRefundModal(m => m ? { ...m, customMessage: e.target.value } : null)}
                  placeholder="Mot personnel ajouté à l'email d'annulation..."
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", fontSize: 14, outline: "none", background: "#fff", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                onClick={() => setRefundModal(null)}
                disabled={refundModal.sending}
                style={{ padding: "13px", borderRadius: 12, background: "transparent", color: "#1a1410", fontWeight: 800, fontSize: 14, border: "2px solid rgba(26,20,16,0.15)", cursor: "pointer" }}>
                Annuler
              </button>
              <button
                onClick={confirmRefund}
                disabled={refundModal.sending || (refundModal.mode === "partial" && refundModal.amount <= 0)}
                style={{ padding: "13px", borderRadius: 12, background: refundModal.sending ? "#e5e7eb" : "#dc2626", color: refundModal.sending ? "#9ca3af" : "#fff", fontWeight: 900, fontSize: 14, border: "none", cursor: refundModal.sending ? "not-allowed" : "pointer" }}>
                {refundModal.sending ? "⏳ Remboursement..." : refundModal.mode === "full" ? "Confirmer l'annulation" : "Confirmer le remboursement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODALE 3 — INFORMER CLIENT DE L'ANNULATION ══ */}
      {cancelEmailModal && (
        <div
          onClick={() => !cancelEmailModal.sending && setCancelEmailModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 18, maxWidth: 900, width: "100%", maxHeight: "90vh", overflow: "auto", padding: 32 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 950, color: "#1a1410" }}>Email d'annulation au client</h2>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(26,20,16,0.5)" }}>Aperçu + message personnalisé</p>
              </div>
              <button onClick={() => !cancelEmailModal.sending && setCancelEmailModal(null)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "rgba(26,20,16,0.4)" }}>×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", marginBottom: 8 }}>Aperçu de l'email</div>
                <iframe
                  srcDoc={cancelEmailModal.previewHtml}
                  style={{ width: "100%", height: 480, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, background: "#fff" }}
                  title="Aperçu email annulation"
                />
              </div>

              <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.45)", display: "block", marginBottom: 6 }}>
                    Message personnalisé (optionnel)
                  </label>
                  <textarea
                    value={cancelEmailModal.customMessage}
                    onChange={e => refreshCancelEmailPreview(e.target.value)}
                    placeholder="Ex: Désolés pour la gêne occasionnée, n'hésitez pas à nous contacter."
                    rows={5}
                    style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "2px solid rgba(0,0,0,0.08)", fontSize: 14, fontWeight: 600, outline: "none", background: "#fff", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                </div>

                <button
                  onClick={() => sendCancellationEmail()}
                  disabled={cancelEmailModal.sending}
                  style={{ padding: "14px 18px", borderRadius: 12, background: cancelEmailModal.sending ? "#e5e7eb" : "#c49a4a", color: cancelEmailModal.sending ? "#9ca3af" : "#1a1410", fontWeight: 900, fontSize: 14, border: "none", cursor: cancelEmailModal.sending ? "not-allowed" : "pointer" }}
                >
                  {cancelEmailModal.sending ? "⏳ Envoi..." : "✉️ Envoyer l'email au client"}
                </button>

                <button
                  onClick={() => setCancelEmailModal(null)}
                  disabled={cancelEmailModal.sending}
                  style={{ padding: "10px 18px", borderRadius: 10, background: "transparent", color: "rgba(26,20,16,0.5)", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODALE 4 — INSTRUCTIONS DE RETOUR AU CLIENT ══ */}
      {returnEmailModal && (
        <div
          onClick={() => !returnEmailModal.sending && setReturnEmailModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 18, maxWidth: 900, width: "100%", maxHeight: "90vh", overflow: "auto", padding: 32 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 950, color: "#1a1410" }}>Instructions de retour au client</h2>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(26,20,16,0.5)" }}>Aperçu + message personnalisé · Adresse de retour, étapes Colissimo, délai 14j, frais client</p>
              </div>
              <button onClick={() => !returnEmailModal.sending && setReturnEmailModal(null)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "rgba(26,20,16,0.4)" }}>×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", marginBottom: 8 }}>Aperçu de l'email</div>
                <iframe
                  srcDoc={returnEmailModal.previewHtml}
                  style={{ width: "100%", height: 480, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, background: "#fff" }}
                  title="Aperçu email retour"
                />
              </div>

              <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.45)", display: "block", marginBottom: 6 }}>
                    Message personnalisé (optionnel)
                  </label>
                  <textarea
                    value={returnEmailModal.customMessage}
                    onChange={e => refreshReturnEmailPreview(e.target.value)}
                    placeholder="Ex: N'hésitez pas à nous écrire si le produit ne convenait pas, on adore comprendre."
                    rows={5}
                    style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "2px solid rgba(0,0,0,0.08)", fontSize: 14, fontWeight: 600, outline: "none", background: "#fff", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                </div>

                <button
                  onClick={() => sendReturnInstructions()}
                  disabled={returnEmailModal.sending}
                  style={{ padding: "14px 18px", borderRadius: 12, background: returnEmailModal.sending ? "#e5e7eb" : "#0284c7", color: returnEmailModal.sending ? "#9ca3af" : "#fff", fontWeight: 900, fontSize: 14, border: "none", cursor: returnEmailModal.sending ? "not-allowed" : "pointer" }}
                >
                  {returnEmailModal.sending ? "⏳ Envoi..." : "✉️ Envoyer les instructions"}
                </button>

                <button
                  onClick={() => setReturnEmailModal(null)}
                  disabled={returnEmailModal.sending}
                  style={{ padding: "10px 18px", borderRadius: 10, background: "transparent", color: "rgba(26,20,16,0.5)", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}