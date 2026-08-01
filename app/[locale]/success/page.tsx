"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useCart } from "@/context/CartContext";
import { Link } from "@/i18n/navigation";
import ProductRecommendations from "@/components/product/ProductRecommendations";
import GoogleCustomerReviews from "@/components/analytics/GoogleCustomerReviews";
import { trackPurchase, metaPurchase, trackRemoveFromWishlist } from "@/lib/analytics";
import { clearCheckoutState } from "@/lib/checkout-storage";

const FALLBACK_CATEGORY = "pyjamas";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Date de livraison estimée : aujourd'hui + N jours ouvrés (samedi/dimanche sautés).
function estimatedDeliveryDate(businessDays: number): string {
  const d = new Date();
  let added = 0;
  while (added < businessDays) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readGuestEmail(): string {
  try {
    const guest = localStorage.getItem("milk_guest_email");
    if (guest) return guest;
    const sbKey = Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
    if (sbKey) {
      const parsed = JSON.parse(localStorage.getItem(sbKey) ?? "{}");
      return parsed.user?.email ?? "";
    }
  } catch {}
  return "";
}

async function fetchOrderBySession(sessionId: string): Promise<any | null> {
  try {
    const r = await fetch(`/api/orders/by-session?session_id=${encodeURIComponent(sessionId)}`);
    const j = await r.json();
    return j.order ?? null;
  } catch {
    return null;
  }
}

// Déduplication d'achat PERSISTANTE. sessionStorage mourait à la fermeture de l'onglet :
// rouvrir le lien de confirmation (email, nouvel onglet) re-trackait l'achat → conversions
// GA4/Google Ads gonflées. On passe en localStorage, avec une liste BORNÉE de session_id
// (FIFO, cap 20) : elle ne grossit jamais, et couvre la réouverture d'anciennes commandes.
const PURCHASE_TRACK_KEY = "milk_purchase_tracked";
const PURCHASE_TRACK_CAP = 20;
function purchaseAlreadyTracked(sessionId: string): boolean {
  if (!sessionId) return false;
  try {
    const a = JSON.parse(localStorage.getItem(PURCHASE_TRACK_KEY) ?? "[]");
    return Array.isArray(a) && a.includes(sessionId);
  } catch { return false; }
}
function markPurchaseTracked(sessionId: string): void {
  if (!sessionId) return;
  try {
    const raw = JSON.parse(localStorage.getItem(PURCHASE_TRACK_KEY) ?? "[]");
    const a = (Array.isArray(raw) ? raw : []).filter((x: any) => x !== sessionId);
    a.push(sessionId);
    while (a.length > PURCHASE_TRACK_CAP) a.shift(); // ne conserve que les 20 derniers
    localStorage.setItem(PURCHASE_TRACK_KEY, JSON.stringify(a));
  } catch {}
}

export default function SuccessPage() {
  const t = useTranslations("product");
  const { items, clearCart } = useCart();
  const [show, setShow] = useState(false);
  const cleared = useRef(false);

  // Catégorie du dernier achat pour l'upsell. On lit dans cet ordre :
  //   1. items[0].category_slug (snapshot panier AVANT clearCart)
  //   2. localStorage.milk_last_category (refresh ou nav directe)
  //   3. FALLBACK_CATEGORY ('pyjamas')
  const [recoCategory, setRecoCategory] = useState<string>(FALLBACK_CATEGORY);
  const [recoProductId, setRecoProductId] = useState<string>("");
  // Google Customer Reviews : { orderId, email } dès qu'ils sont disponibles.
  const [gcr, setGcr] = useState<{ orderId: string; email: string } | null>(null);

  useEffect(() => {
    if (!cleared.current) {
      // ── 1. Récupération catégorie ─────────────────────────────────────────
      const first = items[0];
      let category = first?.category_slug ?? "";

      // Fallback 2 : localStorage (cas refresh /success)
      if (!category) {
        try { category = localStorage.getItem("milk_last_category") ?? ""; } catch {}
      }

      // Fallback 3 : default
      if (!category) category = FALLBACK_CATEGORY;

      // Persiste avant clearCart pour les refresh ultérieurs
      try { localStorage.setItem("milk_last_category", category); } catch {}

      setRecoCategory(category);
      if (first?.id) setRecoProductId(first.id);

      // ── 2. Tracking purchase ──────────────────────────────────────────────
      // Snapshot panier (toujours présent au mount) = fallback. On tente
      // d'enrichir avec les VRAIES valeurs depuis /api/orders/by-session
      // (montant exact incl. port/remise). Retry 1× après 2s si la commande
      // n'existe pas encore (webhook Stripe asynchrone).
      let sessionId = "";
      try { sessionId = new URLSearchParams(window.location.search).get("session_id") ?? ""; } catch {}

      const snapItems = items.map(it => ({
        id:       it.id,
        name:     it.name,
        price:    it.price,
        quantity: it.quantity,
        category: it.category_slug,
        variant:  it.taille ?? it.couleur,
        slug:     it.slug,
      }));
      const snapValue = items.reduce((a, it) => a + (it.price ?? 0) * (it.quantity ?? 1), 0);

      // Dédup PERSISTANTE : un achat déjà tracké (refresh, nouvel onglet, ou
      // réouverture ultérieure du lien de confirmation) n'est jamais re-émis.
      const alreadyTracked = purchaseAlreadyTracked(sessionId);

      // On n'émet AUCUN achat sans session_id : un vrai achat en a toujours un, et
      // sans lui aucune déduplication n'est possible (ni GA4 ni Meta) → 100 % fantôme.
      if (!alreadyTracked && sessionId) {
        markPurchaseTracked(sessionId);

        void (async () => {
          let value: number = snapValue;
          let purchaseItems = snapItems;
          let coupon: string | undefined;
          let txId = sessionId || `order_${Date.now()}`;
          let orderEmail = "";

          if (sessionId) {
            let order = await fetchOrderBySession(sessionId);
            if (!order) { await sleep(2000); order = await fetchOrderBySession(sessionId); }
            if (order) {
              value  = Math.max(0, Number(order.amount_total ?? snapValue) - Number(order.refund_amount ?? 0));
              coupon = order.promo_code ?? undefined;
              txId   = order.id ?? txId;
              orderEmail = order.customer_email ?? "";
              if (Array.isArray(order.items) && order.items.length > 0) {
                purchaseItems = order.items.map((it: any) => ({
                  id:       String(it.id ?? ""),
                  name:     it.name ?? "",
                  price:    Number(it.price ?? 0),
                  quantity: Number(it.quantity ?? 1),
                  category: it.category_slug,
                  variant:  it.taille ?? it.couleur,
                  slug:     it.slug,
                }));
              }
            }
          }

          if (purchaseItems.length > 0 || value > 0) {
            trackPurchase({ id: txId, value, tax: 0, shipping: 0, coupon, items: purchaseItems });
            // eventId = session_id de l'URL (Lot M4) → chaîne IDENTIQUE à l'event_id CAPI
            // du webhook (session.id Stripe) → déduplication pixel ↔ serveur.
            metaPurchase(txId, value, sessionId || undefined);
          }

          // Google Customer Reviews : email de la commande sinon guest/sb.
          const email = orderEmail || readGuestEmail();
          if (txId && email) setGcr({ orderId: txId, email });
        })();
      }

      // ── Durcissement PII : nettoyer l'URL du session_id ───────────────────
      // À ce stade, sessionId a DÉJÀ été lu (variable closure ci-dessus) et le
      // fetch by-session a été déclenché ; le tracking purchase et GCR utilisent
      // cette variable, plus jamais l'URL. On retire donc ?session_id=… de l'URL
      // via history.replaceState (sans recharger) pour fermer le vrai vecteur de
      // fuite du token opaque : capté dans page_location (GA4/Meta), l'historique
      // et le référent. N'affecte ni le tracking ni GCR (aucun ne relit l'URL).
      if (sessionId && typeof window !== "undefined" && window.history?.replaceState) {
        try {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete("session_id");
          window.history.replaceState(null, "", cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
        } catch {}
      }

      // ── Retrait auto des favoris achetés + tracking "purchased" ───────────
      // Le favori a mené à un achat (signal positif). On compare les produits
      // achetés (snapshot panier) au wishlist localStorage, on retire les matches
      // et on notifie le WishlistContext (badge Header) via l'event custom.
      // Fonctionne pour tout visiteur (compte ou invité) revenant sur son navigateur.
      try {
        const purchasedIds = items.map(it => String(it.id)).filter(Boolean);
        if (purchasedIds.length > 0) {
          const wl = JSON.parse(localStorage.getItem("milk_wishlist") ?? "[]");
          if (Array.isArray(wl) && wl.length > 0) {
            const purchasedSet = new Set(purchasedIds);
            const removed: string[] = wl.filter((id: any) => purchasedSet.has(String(id)));
            if (removed.length > 0) {
              const keep = wl.filter((id: any) => !purchasedSet.has(String(id)));
              localStorage.setItem("milk_wishlist", JSON.stringify(keep));
              window.dispatchEvent(new Event("milk-wishlist-changed"));
              removed.forEach(id => trackRemoveFromWishlist({ id: String(id) }, "purchased"));
            }
          }
        }
      } catch {}

      // ── 3. clearCart + purge de l'état du tunnel, une seule fois ──────────
      clearCart();
      // Purge email/tél/adresse/relais/progression après un achat réussi : sans ça, une
      // prochaine commande ré-hydraterait les données de la précédente (bug actif
      // aujourd'hui, qu'aggraverait la migration localStorage). cf. lib/checkout-storage.
      clearCheckoutState();
      cleared.current = true;

      // ✅ Pour les users connectés : marquer le panier abandonné comme converti côté client
      // Pour les guests : le webhook Stripe s'en charge automatiquement
      try {
        const sbKey = Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
        if (sbKey) {
          const parsed = JSON.parse(localStorage.getItem(sbKey) ?? "{}");
          const authToken = parsed.access_token ?? "";
          const userEmail = parsed.user?.email ?? "";
          if (authToken && userEmail) {
            fetch("/api/cart/convert", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
              body: JSON.stringify({ email: userEmail }),
            }).catch(e => process.env.NODE_ENV !== "production" && console.error("Cart convert error:", e));
          }
        }
      } catch {}
    }
    // ✅ Désactiver l'intro pour cette session
    if (typeof window !== "undefined") {
      sessionStorage.setItem("milk_intro_done", "true");
      localStorage.setItem("milk_intro_done",   "true");
    }
    setTimeout(() => setShow(true), 100);
  }, [clearCart, items]);

  return (
    <div style={{ background: "#1a1410", minHeight: "100vh", paddingTop: 100, paddingBottom: 0 }}>
      <div style={{ display: "grid", placeItems: "center", padding: "0 24px 60px" }}>
        <div style={{ maxWidth: 560, width: "100%", textAlign: "center", opacity: show ? 1 : 0, transition: "opacity 0.3s" }}>

          <div style={{ background: "#221c16", borderRadius: 24, border: "1px solid rgba(196,154,74,0.2)", padding: "52px 44px", marginBottom: 20 }}>
            <div style={{ width: 84, height: 84, borderRadius: "50%", background: "rgba(34,197,94,0.1)", border: "2px solid rgba(34,197,94,0.3)", display: "grid", placeItems: "center", margin: "0 auto 28px" }}>
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h1 style={{ margin: "0 0 14px", fontSize: "clamp(28px, 5vw, 38px)", fontWeight: 950, letterSpacing: -1.5, color: "#f2ede6" }}>
              Commande confirmée !
            </h1>

            <p style={{ margin: "0 0 10px", fontSize: 17, color: "rgba(242,237,230,0.55)", lineHeight: 1.75 }}>
              Merci pour ta confiance. Bébé va être chouchouté dans du bambou premium certifié OEKO-TEX.
            </p>
            <p style={{ margin: "0 0 36px", fontSize: 16, color: "rgba(242,237,230,0.4)", lineHeight: 1.75 }}>
              Un email de confirmation a été envoyé. On prépare ton colis avec soin.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 36 }}>
              {[
                { label: "Préparation", value: "1-2 jours ouvrés" },
                { label: "Livraison",   value: "2-4 jours ouvrés" },
              ].map(item => (
                <div key={item.label} style={{ padding: "18px", borderRadius: 14, background: "rgba(242,237,230,0.04)", border: "1px solid rgba(242,237,230,0.06)" }}>
                  <div style={{ fontSize: 13, color: "rgba(242,237,230,0.35)", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</div>
                  <div style={{ fontSize: 16, color: "#f2ede6", fontWeight: 800 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <Link href="/profil" style={{ display: "block", padding: "17px", borderRadius: 14, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 17, textDecoration: "none", marginBottom: 12 }}>
              Voir mes commandes →
            </Link>
            <Link href="/produits" style={{ display: "block", padding: "15px", borderRadius: 14, border: "1px solid rgba(242,237,230,0.1)", color: "rgba(242,237,230,0.5)", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
              Continuer mes achats
            </Link>
          </div>
        </div>
      </div>

      {/* ── Upsell post-achat ──────────────────────────────────────────────
          Titre 'Vous aimerez aussi' en ambre #c49a4a.
          categorySlug = première dispo entre : panier / localStorage / 'pyjamas'.
          ProductRecommendations affiche 4 produits filtrés sur cette catégorie,
          avec fallback interne sur tous les produits si moins de 4 disponibles.
          ──────────────────────────────────────────────────────────────── */}
      <ProductRecommendations
        productId={recoProductId}
        categorySlug={recoCategory}
        title={t("related")}
        eyebrow=""
        viewLabel={t("view_product")}
        outLabel={t("sold_out")}
        titleColor="#c49a4a"
      />

      {/* Google Customer Reviews — opt-in (uniquement si commande + email connus) */}
      {gcr && (
        <GoogleCustomerReviews
          orderId={gcr.orderId}
          customerEmail={gcr.email}
          estimatedDeliveryDate={estimatedDeliveryDate(5)}
        />
      )}
    </div>
  );
}
