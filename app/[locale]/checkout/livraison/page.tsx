"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useCheckout } from "@/components/checkout/CheckoutContext";
import CheckoutProgress from "@/components/checkout/CheckoutProgress";
import CountrySelector from "@/components/checkout/CountrySelector";
import RelaySelector from "@/components/checkout/RelaySelector";
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

// Téléphone FR (chemin France) : +33 / 0X — inchangé (ancienne validation du tunnel).
function isValidPhoneFR(p: string): boolean {
  const d = String(p ?? "").replace(/[^\d+]/g, "");
  return /^\+33[1-9]\d{8}$/.test(d) || /^0[1-9]\d{8}$/.test(d);
}

/**
 * Étape 2 — Livraison (Lot TUNNEL-V2). Sélecteur de pays pré-positionné sur le pays
 * du compte. FR = parcours transporteur INCHANGÉ (+ téléphone collecté ICI désormais,
 * car retiré de l'étape Compte). International = adresse pré-remplie modifiable si
 * compte, sinon message « saisie à l'étape paiement » ; téléphone via Stripe.
 */
export default function CheckoutLivraisonPage() {
  const router = useRouter();
  const en = useLocale() === "en";
  const { items } = useCart();
  const { user } = useAuth();
  const { hydrated, isCartEmpty, state, update } = useCheckout();

  // ── Gardes de nav ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    if (isCartEmpty) { router.replace("/panier"); return; }
    if (state.completedSteps < 1) router.replace("/checkout/compte");
  }, [hydrated, isCartEmpty, state.completedSteps, router]);

  // ── Pré-positionnement (UNE fois, à l'hydratation) : pays du compte + pré-remplissage
  //    du téléphone FR depuis le compte. Ne s'exécute qu'au montage → n'écrase pas un
  //    choix ultérieur du client. ──────────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    const acc = state.accountAddress;
    const patch: Record<string, unknown> = {};
    if (acc?.country && /^[A-Za-z]{2}$/.test(acc.country) && acc.country.toUpperCase() !== "FR"
        && state.country === "FR" && !state.deliveryChoice) {
      patch.country = acc.country.toUpperCase();
    }
    if (acc?.phone && !state.phone) patch.phone = acc.phone;
    if (Object.keys(patch).length) update(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

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

  // ── Seuil livraison offerte ────────────────────────────────────────────────
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  useEffect(() => {
    fetch("/api/settings/public")
      .then(r => r.ok ? r.json() : null)
      .then(d => { const n = Number(d?.free_shipping_threshold); if (Number.isFinite(n) && n > 0) setThreshold(n); })
      .catch(() => {});
  }, []);

  // État LOCAL du sélecteur de relais FR (éphémère). Le relais CHOISI vit dans le Context.
  const [relayOpen,         setRelayOpen]         = useState(false);
  const [relayPostalSearch, setRelayPostalSearch] = useState("");
  const [relayResetKey,     setRelayResetKey]     = useState(0);

  const country = state.country || "FR";
  const zone    = getZoneForCountry(country);
  const isFrance = zone === "FR";
  // « Compte » = utilisateur connecté OU adresse compte déjà en Context (compte tout
  // juste créé, avant que onAuthStateChange ait propagé user).
  const hasAccount = !!user || !!state.accountAddress;

  const fmt = (n: number) => new Intl.NumberFormat(en ? "en" : "fr", { style: "currency", currency: "EUR" }).format(n);
  const countryLabel = (code: string): string => {
    try { return new Intl.DisplayNames([en ? "en" : "fr"], { type: "region" }).of(code) ?? code; } catch { return code; }
  };

  const frShipping = (carrier: Carrier, type: DeliveryType) =>
    computeCartTotals({ productsSubtotal, packsSubtotal, discount: 0, basePrice: getDeliveryPrice(carrier, type), freeShippingThreshold: threshold, promo: null });

  const subtotalAfterPromo = Math.max(0, productsSubtotal + packsSubtotal);
  const missingForFree = Math.max(0, threshold - subtotalAfterPromo);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const onCountryChange = (c: string) => {
    // Changement de zone → on ré-choisit le mode (+ oubli du relais FR). On garde
    // l'adresse mais on synchronise son pays sur le pays choisi.
    update({
      country: c, deliveryChoice: null, selectedRelay: null,
      ...(state.shippingAddress ? { shippingAddress: { ...state.shippingAddress, country: c } } : {}),
    });
    setRelayOpen(false);
  };

  const selectFrMode = (carrier: Carrier, type: DeliveryType) => {
    const isRelay = type === "point_relais" || type === "locker";
    update({ deliveryChoice: { kind: "fr", carrier, type, relay: null }, selectedRelay: null });
    setRelayResetKey(k => k + 1);
    setRelayOpen(isRelay);
  };

  // FR domicile (inchangé) : adresse simple via CheckoutAddressForm.
  const setAddr = (patch: Partial<CheckoutAddress>) => {
    update({ shippingAddress: { ...(state.shippingAddress ?? {}), ...patch, country } });
  };

  // International : adresse pré-remplie modifiable (prénom/nom séparés). country = choisi.
  const sa = (state.shippingAddress ?? {}) as Record<string, string>;
  const setIntlAddr = (patch: Record<string, string>) => {
    const next: Record<string, string> = { ...sa, ...patch, country };
    next.name = `${next.first_name ?? ""} ${next.last_name ?? ""}`.trim();
    update({ shippingAddress: next });
  };

  // International : fige zone + prix. Si compte, pré-remplit l'adresse depuis le compte
  // (une fois, tant que non renseignée). country = pays choisi.
  const intlPrice = !isFrance && zone ? getInternationalShippingPrice(country) : null;
  useEffect(() => {
    if (!hydrated) return;
    if (isFrance || !zone || intlPrice == null) return;
    const dc = state.deliveryChoice;
    const patch: Record<string, unknown> = {};
    if (!dc || dc.kind !== "international" || dc.zone !== zone) {
      patch.deliveryChoice = { kind: "international", zone, price: intlPrice };
    }
    const cur = (state.shippingAddress ?? {}) as Record<string, string>;
    const acc = state.accountAddress;
    if (hasAccount && acc && !cur.line1) {
      patch.shippingAddress = {
        first_name: acc.first_name, last_name: acc.last_name,
        name: `${acc.first_name} ${acc.last_name}`.trim(),
        line1: acc.line1, line2: acc.line2,
        postal_code: acc.postal_code, city: acc.city, country,
      };
    }
    if (Object.keys(patch).length) update(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, isFrance, zone, intlPrice, country, hasAccount]);

  // ── Complétude de l'étape ──────────────────────────────────────────────────
  const dc = state.deliveryChoice;
  const frModeChosen = dc?.kind === "fr" && !!dc.carrier && !!dc.type;
  const isRelayType  = dc?.kind === "fr" && (dc.type === "point_relais" || dc.type === "locker");
  const frPhoneOk    = isValidPhoneFR(state.phone);
  const canContinue = isFrance
    // FR : mode choisi + (adresse domicile complète OU relais sélectionné) + TÉLÉPHONE.
    ? frModeChosen && frPhoneOk && (dc!.type === "home"
        ? isAddressComplete(state.shippingAddress as CheckoutAddress)
        : !!state.selectedRelay)
    // International : pays livrable suffit (adresse pré-remplie optionnelle — Stripe
    // reconfirme adresse + téléphone à l'étape paiement).
    : !!zone && dc?.kind === "international";

  const onContinue = () => {
    if (!canContinue) return;
    update({ completedSteps: Math.max(state.completedSteps, 2) });
    router.push("/checkout/paiement");
  };

  if (!hydrated || isCartEmpty || state.completedSteps < 1) return null;

  // ── Styles ────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.1)", padding: "20px 22px", marginTop: 20 };
  const optBtn = (active: boolean): React.CSSProperties => ({ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: 12, padding: "14px 16px", borderRadius: 12, border: active ? "2px solid #1a1410" : "1px solid rgba(26,20,16,0.15)", background: active ? "rgba(196,154,74,0.08)" : "#fff", cursor: "pointer", fontWeight: 700, fontSize: 15, color: "#1a1410", textAlign: "left" });
  const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)", marginBottom: 6 };
  const inp: React.CSSProperties = { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(26,20,16,0.15)", fontSize: 15, fontWeight: 600, background: "#fff", boxSizing: "border-box", color: "#1a1410" };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "100px 24px 80px" }}>
      <CheckoutProgress current="livraison" />
      <h1 style={{ fontSize: 28, fontWeight: 950, letterSpacing: -1, color: "#1a1410", marginBottom: 16 }}>
        {en ? "Step 2 — Delivery" : "Étape 2 — Livraison"}
      </h1>

      {/* Pays (pré-positionné sur le pays du compte) */}
      <CountrySelector value={country} onChange={onCountryChange} />

      {/* Branche FRANCE — INCHANGÉE (transporteurs/relais/adresse/seuil) + téléphone */}
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

          {/* Téléphone FR — obligatoire (Sendcloud). Collecté ICI depuis TUNNEL-V2. */}
          <div style={{ marginTop: 18 }}>
            <label htmlFor="fr-phone" style={lbl}>{en ? "Phone number" : "Numéro de téléphone"} <span style={{ color: "#b91c1c" }}>*</span></label>
            <input id="fr-phone" type="tel" inputMode="tel" autoComplete="tel"
              placeholder={en ? "e.g. 06 12 34 56 78" : "Ex : 06 12 34 56 78"}
              value={state.phone} onChange={e => update({ phone: e.target.value })} style={inp} />
            {!frPhoneOk && state.phone.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 12, color: "#b91c1c", fontWeight: 700 }}>
                {en ? "Invalid format (10 digits, e.g. 06 12 34 56 78)." : "Format invalide (10 chiffres, ex : 06 12 34 56 78)."}
              </div>
            )}
            <div style={{ marginTop: 6, fontSize: 11, color: "rgba(26,20,16,0.5)", lineHeight: 1.5 }}>
              {en ? "Used by the carrier to reach you about your delivery." : "Utilisé par le transporteur pour vous joindre au sujet de la livraison."}
            </div>
          </div>

          {/* FR domicile → adresse ; FR point relais / locker → RelaySelector partagé */}
          {dc?.kind === "fr" && dc.type === "home" && (
            <div style={{ marginTop: 18 }}>
              <CheckoutAddressForm value={state.shippingAddress as CheckoutAddress} onChange={setAddr} country={country} />
            </div>
          )}
          {isRelayType && dc?.kind === "fr" && (
            <div style={{ marginTop: 18 }}>
              <RelaySelector
                carrier={dc.carrier ?? null}
                deliveryType={dc.type ?? null}
                value={state.selectedRelay}
                onChange={relay => update({ selectedRelay: relay })}
                open={relayOpen}
                onOpenChange={setRelayOpen}
                postalSearch={relayPostalSearch}
                onPostalSearchChange={setRelayPostalSearch}
                resetKey={relayResetKey}
                blockDomTom
              />
            </div>
          )}
        </div>
      )}

      {/* Branche INTERNATIONAL */}
      {!isFrance && zone && intlPrice != null && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: "#1a1410" }}>{en ? "International delivery" : "Livraison internationale"}</span>
            <span style={{ fontWeight: 950, fontSize: 20, color: "#1a1410" }}>{fmt(intlPrice)}</span>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 700, color: "#c49a4a" }}>
            {en ? `Paid delivery — international (Zone ${zone}).` : `Livraison payante à l'international (Zone ${zone}).`}
          </p>

          {/* Douane — HORS UE uniquement (CH = EUROPE_NON_EU, GB = UK). Rien pour l'UE ni la FR. */}
          {(zone === "EUROPE_NON_EU" || zone === "UK") && (
            <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 12, background: "rgba(180,83,9,0.08)", border: "1px solid rgba(180,83,9,0.3)", fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>
              {en
                ? "⚠️ Customs duties and/or VAT may apply on delivery, payable by you. These charges are set by your country's customs authorities and are not included in the shipping price."
                : "⚠️ Des frais de douane et/ou de TVA peuvent s'appliquer à la réception de votre colis, à votre charge. Ces frais sont fixés par les autorités douanières de votre pays et ne sont pas inclus dans le prix de la livraison."}
            </div>
          )}

          {hasAccount ? (
            /* Compte : adresse pré-remplie MODIFIABLE (défaut Stripe). country = choisi. */
            <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>{en ? "First name" : "Prénom"}</label>
                  <input value={sa.first_name ?? ""} onChange={e => setIntlAddr({ first_name: e.target.value })} style={inp} /></div>
                <div><label style={lbl}>{en ? "Last name" : "Nom"}</label>
                  <input value={sa.last_name ?? ""} onChange={e => setIntlAddr({ last_name: e.target.value })} style={inp} /></div>
              </div>
              <div><label style={lbl}>{en ? "Address" : "Adresse"}</label>
                <input value={sa.line1 ?? ""} onChange={e => setIntlAddr({ line1: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>{en ? "Address line 2 (optional)" : "Complément (optionnel)"}</label>
                <input value={sa.line2 ?? ""} onChange={e => setIntlAddr({ line2: e.target.value })} style={inp} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
                <div><label style={lbl}>{en ? "Postal code" : "Code postal"}</label>
                  <input value={sa.postal_code ?? ""} onChange={e => setIntlAddr({ postal_code: e.target.value })} style={inp} /></div>
                <div><label style={lbl}>{en ? "City" : "Ville"}</label>
                  <input value={sa.city ?? ""} onChange={e => setIntlAddr({ city: e.target.value })} style={inp} /></div>
              </div>
              <div><label style={lbl}>{en ? "Country" : "Pays"}</label>
                <div style={{ ...inp, color: "rgba(26,20,16,0.6)", background: "#f7f5f1" }}>{countryLabel(country)}</div></div>
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(196,154,74,0.08)", border: "1px solid rgba(196,154,74,0.25)", fontSize: 13, color: "rgba(26,20,16,0.75)", lineHeight: 1.6 }}>
                📦 {en ? "You can confirm this address at the secure payment step."
                      : "Vous pourrez confirmer cette adresse à l'étape de paiement sécurisée."}
              </div>
            </div>
          ) : (
            /* Sans compte : pas de form. Message rassurant (adresse + tél à l'étape paiement). */
            <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 12, background: "rgba(196,154,74,0.08)", border: "1px solid rgba(196,154,74,0.25)", fontSize: 13.5, color: "rgba(26,20,16,0.75)", lineHeight: 1.6 }}>
              📦 {en ? "Your delivery address and phone number will be requested at the secure payment step."
                    : "Votre adresse de livraison et votre téléphone vous seront demandés à l'étape de paiement sécurisée."}
            </div>
          )}
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
