"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCart } from "@/context/CartContext";
import { useCheckout } from "@/components/checkout/CheckoutContext";
import CheckoutProgress from "@/components/checkout/CheckoutProgress";
import CountrySelector from "@/components/checkout/CountrySelector";
import CheckoutAddressForm, { isAddressComplete, type CheckoutAddress } from "@/components/checkout/CheckoutAddressForm";
import {
  DELIVERY_PRICES,
  getDeliveryPrice,
  deliveryLabel,
  getZoneForCountry,
  getInternationalShippingPrice,
  type Carrier,
  type DeliveryType,
} from "@/lib/delivery-config";
import { computeCartTotals } from "@/lib/cart-totals";

const DEFAULT_THRESHOLD = 60;

// Combinaisons FR dérivées de la matrice (jamais réinventées).
const FR_COMBOS: { carrier: Carrier; type: DeliveryType }[] =
  (Object.keys(DELIVERY_PRICES) as Carrier[]).flatMap(carrier =>
    (Object.keys(DELIVERY_PRICES[carrier]) as DeliveryType[]).map(type => ({ carrier, type }))
  );

/**
 * Étape 2 — Livraison (Lot 4c). Sélecteur de pays + choix livraison + prix.
 * FR : modes habituels (matrice DELIVERY_PRICES) + seuil 60€ (computeCartTotals).
 * International : Colissimo International, prix de zone fixe, toujours payant.
 * Aucune session Stripe ici (Lot paiement).
 */
export default function CheckoutLivraisonPage() {
  const router = useRouter();
  const en = useLocale() === "en";
  const { items } = useCart();
  const { hydrated, isCartEmpty, state, update } = useCheckout();

  // ── Gardes de nav (4a) ────────────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    if (isCartEmpty) { router.replace("/panier"); return; }
    if (state.completedSteps < 1) router.replace("/checkout/compte");
  }, [hydrated, isCartEmpty, state.completedSteps, router]);

  // ── Sous-total (produits + packs) pour le seuil ───────────────────────────
  const productsSubtotal = useMemo(
    () => items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0),
    [items],
  );
  const [packsSubtotal, setPacksSubtotal] = useState(0);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("milk_pack_cart") ?? "[]");
      const arr = Array.isArray(raw) ? raw : [];
      setPacksSubtotal(arr.reduce((s, p) => s + (Number(p?.price) || 0) * (Number(p?.quantity) || 1), 0));
    } catch { setPacksSubtotal(0); }
  }, []);

  // ── Seuil livraison offerte (mêmes données que /panier) ───────────────────
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  useEffect(() => {
    fetch("/api/settings/public")
      .then(r => r.ok ? r.json() : null)
      .then(d => { const n = Number(d?.free_shipping_threshold); if (Number.isFinite(n) && n > 0) setThreshold(n); })
      .catch(() => {});
  }, []);

  const country = state.country || "FR";
  const zone    = getZoneForCountry(country);
  const isFrance = zone === "FR";

  const fmt = (n: number) => new Intl.NumberFormat(en ? "en" : "fr", { style: "currency", currency: "EUR" }).format(n);

  // Note : la remise promo/parrainage n'est pas encore collectée DANS le tunnel
  // (état vide), donc discount=0 ici. L'affichage du seuil se met à jour quand un
  // lot ultérieur branchera la collecte promo/parrain sur cette étape.
  const frShipping = (carrier: Carrier, type: DeliveryType) =>
    computeCartTotals({
      productsSubtotal,
      packsSubtotal,
      discount: 0,
      basePrice: getDeliveryPrice(carrier, type),
      freeShippingThreshold: threshold,
      promo: null,
    });

  const subtotalAfterPromo = Math.max(0, productsSubtotal + packsSubtotal);
  const missingForFree = Math.max(0, threshold - subtotalAfterPromo);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const onCountryChange = (c: string) => {
    // Changement de zone → on ré-choisit le mode (le choix précédent n'a plus de sens).
    update({ country: c, deliveryChoice: null });
  };

  const selectFrMode = (carrier: Carrier, type: DeliveryType) => {
    update({ deliveryChoice: { kind: "fr", carrier, type, relay: null } });
  };

  const setAddr = (patch: Partial<CheckoutAddress>) => {
    update({ shippingAddress: { ...(state.shippingAddress ?? {}), ...patch, country } });
  };

  // International : dès qu'on est hors FR, on fige le marqueur de zone + prix.
  const intlPrice = !isFrance && zone ? getInternationalShippingPrice(country) : null;
  useEffect(() => {
    if (!hydrated) return;
    if (!isFrance && zone && intlPrice != null) {
      const dc = state.deliveryChoice;
      if (!dc || dc.kind !== "international" || dc.zone !== zone) {
        update({ deliveryChoice: { kind: "international", zone, price: intlPrice } });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, isFrance, zone, intlPrice]);

  // ── Complétude de l'étape (données RÉELLES, pas un simple clic) ────────────
  const dc = state.deliveryChoice;
  const frModeChosen = dc?.kind === "fr" && !!dc.carrier && !!dc.type;
  const isRelayType  = dc?.kind === "fr" && (dc.type === "point_relais" || dc.type === "locker");
  const canContinue = isFrance
    ? frModeChosen && (dc!.type === "home"
        ? isAddressComplete(state.shippingAddress as CheckoutAddress)
        : /* relais : sélecteur STUBBÉ → non complétable pour l'instant */ false)
    : dc?.kind === "international" && isAddressComplete(state.shippingAddress as CheckoutAddress);

  const onContinue = () => {
    if (!canContinue) return;
    update({ completedSteps: Math.max(state.completedSteps, 2) });
    router.push("/checkout/paiement");
  };

  if (!hydrated || isCartEmpty || state.completedSteps < 1) return null;

  // ── Styles ────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.1)", padding: "20px 22px", marginTop: 20 };
  const optBtn = (active: boolean): React.CSSProperties => ({ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: 12, padding: "14px 16px", borderRadius: 12, border: active ? "2px solid #1a1410" : "1px solid rgba(26,20,16,0.15)", background: active ? "rgba(196,154,74,0.08)" : "#fff", cursor: "pointer", fontWeight: 700, fontSize: 15, color: "#1a1410", textAlign: "left" });

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "100px 24px 80px" }}>
      <CheckoutProgress current="livraison" />
      <h1 style={{ fontSize: 28, fontWeight: 950, letterSpacing: -1, color: "#1a1410", marginBottom: 16 }}>
        {en ? "Step 2 — Delivery" : "Étape 2 — Livraison"}
      </h1>

      {/* Pays */}
      <CountrySelector value={country} onChange={onCountryChange} />

      {/* Branche FRANCE */}
      {isFrance && (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)", marginBottom: 12 }}>
            {en ? "Delivery method" : "Mode de livraison"}
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {FR_COMBOS.map(({ carrier, type }) => {
              const active = dc?.kind === "fr" && dc.carrier === carrier && dc.type === type;
              const t = frShipping(carrier, type);
              return (
                <button key={`${carrier}:${type}`} onClick={() => selectFrMode(carrier, type)} style={optBtn(active)}>
                  <span>{deliveryLabel(carrier, type)}</span>
                  <span style={{ fontWeight: 900, color: t.shippingFree ? "#16a34a" : "#1a1410" }}>
                    {t.shippingFree ? (en ? "Free" : "Offert") : fmt(getDeliveryPrice(carrier, type))}
                  </span>
                </button>
              );
            })}
          </div>

          {missingForFree > 0 ? (
            <p style={{ marginTop: 12, fontSize: 13, color: "#c49a4a", fontWeight: 700 }}>
              {en ? `${fmt(missingForFree)} away from free delivery.` : `Plus que ${fmt(missingForFree)} pour la livraison offerte.`}
            </p>
          ) : (
            <p style={{ marginTop: 12, fontSize: 13, color: "#16a34a", fontWeight: 700 }}>
              {en ? "Free delivery threshold reached 🎉" : "Seuil de livraison offerte atteint 🎉"}
            </p>
          )}

          {/* FR domicile → adresse ; FR relais → stub */}
          {dc?.kind === "fr" && dc.type === "home" && (
            <div style={{ marginTop: 18 }}>
              <CheckoutAddressForm value={state.shippingAddress as CheckoutAddress} onChange={setAddr} country={country} />
            </div>
          )}
          {isRelayType && (
            <div style={{ marginTop: 18, padding: "14px 16px", borderRadius: 12, background: "#f7f5f1", border: "1px dashed rgba(26,20,16,0.25)", fontSize: 14, color: "rgba(26,20,16,0.6)" }}>
              {en
                ? "Pickup point selection — coming in a next lot (relay picker not yet wired here)."
                : "Sélection du point relais — à venir dans un prochain lot (sélecteur relais pas encore branché ici)."}
            </div>
          )}
        </div>
      )}

      {/* Branche INTERNATIONAL */}
      {!isFrance && zone && intlPrice != null && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: "#1a1410" }}>Colissimo International</span>
            <span style={{ fontWeight: 950, fontSize: 20, color: "#1a1410" }}>{fmt(intlPrice)}</span>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 700, color: "#c49a4a" }}>
            {en ? `Paid delivery — international (Zone ${zone}).` : `Livraison payante à l'international (Zone ${zone}).`}
          </p>
          <div style={{ marginTop: 18 }}>
            <CheckoutAddressForm value={state.shippingAddress as CheckoutAddress} onChange={setAddr} country={country} />
          </div>
        </div>
      )}

      {/* Nav */}
      <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
        <button onClick={() => router.push("/checkout/compte")}
          style={{ padding: "13px 24px", borderRadius: 12, border: "1px solid rgba(26,20,16,0.2)", background: "#fff", color: "#1a1410", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
          {en ? "Back" : "Retour"}
        </button>
        <button onClick={onContinue} disabled={!canContinue}
          style={{ padding: "13px 24px", borderRadius: 12, border: "none", background: canContinue ? "#1a1410" : "#d1cdc8", color: "#f2ede6", fontWeight: 900, fontSize: 15, cursor: canContinue ? "pointer" : "not-allowed" }}>
          {en ? "Continue" : "Continuer"}
        </button>
      </div>
    </div>
  );
}
