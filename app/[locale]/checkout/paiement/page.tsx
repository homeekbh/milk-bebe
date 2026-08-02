"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useCheckout } from "@/components/checkout/CheckoutContext";
import CheckoutProgress from "@/components/checkout/CheckoutProgress";
import ContinueShoppingLink from "@/components/checkout/ContinueShoppingLink";
import CheckoutMissingHints from "@/components/checkout/CheckoutMissingHints";
import { setCheckoutNotice } from "@/lib/checkout-storage";
import { useScrollTopWhenReady } from "@/components/checkout/useScrollTopWhenReady";
import { isAddressComplete, type CheckoutAddress } from "@/components/checkout/CheckoutAddressForm";
import { computeCartTotals, computeInternationalCartTotals } from "@/lib/cart-totals";
import { computeParrainage, type ParrainageSettings } from "@/lib/parrainage";
import { combinePromos } from "@/lib/promo-combine";
import PromoParrainInput from "@/components/checkout/PromoParrainInput";
// (analytics begin_checkout/InitiateCheckout déplacés à l'entrée du tunnel — cf. /panier goToCheckout)
import {
  getDeliveryPrice,
  deliveryLabel,
  getZoneForCountry,
  getInternationalShippingPrice,
} from "@/lib/delivery-config";

const DEFAULT_THRESHOLD = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Téléphone obligatoire (Sendcloud) — même validation que /panier & /checkout/compte.
function isValidPhone(p: string): boolean {
  const d = String(p ?? "").replace(/[^\d+]/g, "");
  return /^\+33[1-9]\d{8}$/.test(d) || /^0[1-9]\d{8}$/.test(d);
}

// Ligne pack groupée (lue depuis localStorage milk_pack_cart), comme /panier.
type PackLine = {
  pack_id: string; slug: string; title: string; size: string | null;
  price: number; image_url: string | null; items: unknown[]; quantity: number;
};

/**
 * Étape 3 — Paiement (Lot 4d). Assemble l'appel create-session depuis le
 * CheckoutContext puis redirige vers Stripe Checkout.
 *
 * ⚠️ Le SERVEUR (create-session) reste la SOURCE DE VÉRITÉ : il recalcule prix,
 * zone, port, promo, crédit parrainage et rejette un pays non desservi. Le calcul
 * ci-dessous n'est qu'un MIROIR D'AFFICHAGE (mêmes fonctions pures que le serveur :
 * computeCartTotals / computeInternationalCartTotals / computeParrainage) pour que
 * l'affiché == le facturé. Aucune décision finale n'est prise ici.
 */
export default function CheckoutPaiementPage() {
  const router = useRouter();
  const en = useLocale() === "en";
  const { items } = useCart();
  const { user, session } = useAuth();
  const { hydrated, isCartEmpty, state, update } = useCheckout();

  const [packs, setPacks]         = useState<PackLine[]>([]);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [meSettings, setMeSettings] = useState<ParrainageSettings | null>(null);
  const [meActif, setMeActif]     = useState(true);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const fmt = (n: number) => new Intl.NumberFormat(en ? "en" : "fr", { style: "currency", currency: "EUR" }).format(n);

  // ── Packs : lus depuis milk_pack_cart, groupés par pack_id + taille (comme /panier). ──
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("milk_pack_cart") ?? "[]");
      if (!Array.isArray(raw)) return;
      const map = new Map<string, PackLine>();
      for (const p of raw) {
        const key = `${p.pack_id}__${p.size ?? ""}`;
        const ex = map.get(key);
        if (ex) ex.quantity += 1;
        else map.set(key, {
          pack_id: p.pack_id, slug: p.slug, title: p.title, size: p.size ?? null,
          price: Number(p.price) || 0, image_url: p.image_url ?? null,
          items: Array.isArray(p.items) ? p.items : [], quantity: 1,
        });
      }
      setPacks([...map.values()]);
    } catch {}
  }, []);

  // ── Seuil livraison offerte (mêmes données que /panier & /checkout/livraison). ──
  useEffect(() => {
    fetch("/api/settings/public")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { const n = Number(d?.free_shipping_threshold); if (Number.isFinite(n) && n > 0) setThreshold(n); })
      .catch(() => {});
  }, []);

  // ── Parrainage : réglages + récompenses utilisables (compte connecté). ──
  useEffect(() => {
    const token = session?.access_token;
    if (!token) return;
    fetch("/api/parrainage/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d || d.error) return;
        setMeActif(d.actif !== false);
        if (d.settings) setMeSettings(d.settings);
        update({ availableRewards: Array.isArray(d.rewards_usable) ? d.rewards_usable : [] });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  // ── Miroir de calcul (affichage) ──────────────────────────────────────────
  const productsSubtotal = useMemo(
    () => items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0),
    [items],
  );
  const packsSubtotal = packs.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.quantity) || 0), 0);
  const subtotal = productsSubtotal + packsSubtotal;

  // Codes promo cumulés (saisis via <PromoParrainInput>) → remise MIROIR calculée
  // par la MÊME fonction pure que /panier & create-session (combinePromos). Le
  // serveur re-valide tout : l'affiché reste == le facturé.
  const combo   = state.promoCodes.length > 0 ? combinePromos(state.promoCodes, subtotal) : null;
  const comboOk = combo && combo.valid ? combo : null;
  const promoDiscount = comboOk ? comboOk.totalDiscount : 0;

  const country  = state.country || "FR";
  const zone     = getZoneForCountry(country);
  const isFrance = zone === "FR";
  const dc       = state.deliveryChoice;

  // Livraison (miroir). FR : matrice + seuil (computeCartTotals). International :
  // prix de zone fixe, jamais offert (computeInternationalCartTotals).
  let shipping = 0, shippingFree = false, shippingLabelText = "";
  if (isFrance && dc?.kind === "fr" && dc.carrier && dc.type) {
    const totals = computeCartTotals({
      productsSubtotal, packsSubtotal, discount: promoDiscount,
      basePrice: getDeliveryPrice(dc.carrier, dc.type), freeShippingThreshold: threshold,
      // Le cumul agrège free_shipping (≥ 1 code l'offre) + cumulable_avec_livraison.
      promo: comboOk ? { free_shipping: comboOk.free_shipping, cumulable_avec_livraison: comboOk.cumulable_avec_livraison } : null,
    });
    shipping = totals.shipping;
    shippingFree = totals.shippingFree;
    shippingLabelText = deliveryLabel(dc.carrier, dc.type);
  } else if (!isFrance && zone) {
    const totals = computeInternationalCartTotals({
      productsSubtotal, packsSubtotal, discount: promoDiscount,
      zonePrice: getInternationalShippingPrice(country) ?? 0,
    });
    shipping = totals.shipping;
    shippingLabelText = en ? `International delivery (Zone ${zone})` : `Livraison internationale (Zone ${zone})`;
  }

  // Parrainage (méca 2) — même calcul d'affichage que /panier.
  const parrainageSettingsForCalc: ParrainageSettings = {
    actif:                        meSettings?.actif ?? meActif,
    montant_recompense:           state.parrainData?.montant_recompense ?? meSettings?.montant_recompense ?? 5,
    seuil_filleul:                state.parrainData?.seuil_filleul ?? meSettings?.seuil_filleul ?? 60,
    seuils_parrain:               meSettings?.seuils_parrain ?? [60, 80, 90, 100],
    max_recompenses_par_commande: meSettings?.max_recompenses_par_commande ?? 4,
    duree_validite_jours:         meSettings?.duree_validite_jours ?? 30,
    categories_restriction:       meSettings?.categories_restriction ?? null,
  };
  const cartCatSlugs: string[] = [
    ...items.map(i => i.category_slug).filter((s): s is string => !!s),
    ...packs.map(() => "pack"),
  ];
  const parrainageCalc = computeParrainage({
    settings:              parrainageSettingsForCalc,
    subtotal,
    promoDiscount,
    freeShippingThreshold: threshold,
    hasValidParrainCode:   !!state.parrainData,
    rewardsAvailableCount: state.availableRewards.length,
    rewardsSelectedCount:  state.selectedRewards.length,
    cartCategorySlugs:     cartCatSlugs,
  });
  const parrainDiscount = parrainageCalc.parrainDiscount;
  const rewardDiscount  = parrainageCalc.rewardDiscount;

  // TOTAL — formule IDENTIQUE à create-session (finalTotal) : remises retirées du
  // sous-total (clampé à 0), puis port ajouté. L'affiché == le facturé.
  const totalDiscount = promoDiscount + parrainDiscount + rewardDiscount;
  const grandTotal    = Math.max(0, subtotal - totalDiscount) + shipping;

  // ── Prérequis (gardes) ──────────────────────────────────────────────────────
  const emailForOrder = (state.email || state.guestEmail || "").trim();
  const hasEmail = EMAIL_RE.test(emailForOrder);
  // Téléphone requis dans le tunnel UNIQUEMENT pour la France (collecté à l'étape
  // Livraison). À l'international, Stripe le collecte (phone_number_collection).
  const hasPhone = !isFrance || isValidPhone(state.phone);
  const deliveryComplete = isFrance
    ? (dc?.kind === "fr" && !!dc.carrier && !!dc.type && (dc.type === "home"
        ? isAddressComplete(state.shippingAddress as CheckoutAddress)
        : !!state.selectedRelay))
    // International : adresse collectée par Stripe (pas de saisie tunnel) → pays
    // livrable + mode international suffisent. Le body n'envoie PAS home_address (ligne
    // ci-dessous), donc le webhook reprend l'adresse Stripe pour orders.shipping_address.
    : (!!zone && dc?.kind === "international");

  // Garde : panier vide / étape précédente incomplète → rediriger vers l'étape concernée.
  useEffect(() => {
    if (!hydrated) return;
    if (isCartEmpty)              { router.replace("/panier"); return; }
    if (state.completedSteps < 1) { setCheckoutNotice("step"); router.replace("/checkout/compte"); return; }
    if (state.completedSteps < 2) { setCheckoutNotice("step"); router.replace("/checkout/livraison"); return; }
    if (!hasEmail)                { setCheckoutNotice("step"); router.replace("/checkout/compte"); return; }
    // Téléphone FR manquant OU livraison incomplète → étape Livraison (le tél FR y est).
    if (!hasPhone || !deliveryComplete) { setCheckoutNotice("step"); router.replace("/checkout/livraison"); }
  }, [hydrated, isCartEmpty, state.completedSteps, hasEmail, hasPhone, deliveryComplete, router]);

  // Scroll en haut dès que le contenu s'affiche (négation exacte du return null ci-dessous).
  useScrollTopWhenReady(hydrated && !isCartEmpty && state.completedSteps >= 2);

  if (!hydrated || isCartEmpty || state.completedSteps < 2) return null;

  const canPay = hasEmail && hasPhone && deliveryComplete && !loading;

  // ── AFFICHAGE (2a-1) — conditions non satisfaites listées sous « Payer ». Dérivé en
  //    LECTURE de hasEmail/hasPhone/deliveryComplete. `!loading` EXCLU (pas une action client).
  //    canPay et les gardes de navigation restent inchangés. ──
  const missingHints: string[] = [];
  if (!canPay && !loading) {
    if (!hasEmail)         missingHints.push(en ? "Enter your email address" : "Renseigne ton adresse email");
    if (!hasPhone)         missingHints.push(en ? "Add your phone number" : "Ajoute ton numéro de téléphone");
    if (!deliveryComplete) missingHints.push(en ? "Complete your delivery details" : "Complète tes informations de livraison");
  }

  // Libellé du bouton selon le cas (TEXTE uniquement — logique paiement inchangée).
  // FR : adresse déjà dans le tunnel → « Payer ». International : adresse saisie sur
  // Stripe APRÈS le clic → on l'explicite (compte = pré-remplie à vérifier ; invité =
  // à saisir). Compte vs invité : présence de state.email (compte) vs guestEmail.
  const isAccount = !!state.email.trim();
  const payVerb = isFrance
    ? (en ? "Pay" : "Payer")
    : isAccount
      ? (en ? "Confirm address and pay" : "Vérifier l'adresse et payer")
      : (en ? "Enter address and pay" : "Saisir l'adresse et payer");

  const toggleReward = (id: string) => {
    const cur = state.selectedRewards;
    update({ selectedRewards: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] });
  };

  // ── Paiement : construire le body create-session depuis le Context → Stripe. ──
  async function onPay() {
    setError("");
    if (!canPay) return;

    // NB : begin_checkout (GA4) + InitiateCheckout (Meta) sont émis à l'ENTRÉE du
    // tunnel (clic « Valider » du panier → goToCheckout), pas ici — pour mesurer le
    // funnel complet (abandons Compte/Livraison inclus) et donner le signal Meta plus
    // tôt. Ne PAS les ré-émettre à l'étape paiement (sinon double comptage).
    if (!user && emailForOrder) { try { localStorage.setItem("milk_guest_email", emailForOrder.toLowerCase()); } catch {} }

    const isRelayType = isFrance && dc?.kind === "fr" && (dc.type === "point_relais" || dc.type === "locker");
    // Le body n'est qu'une PROPOSITION : create-session recalcule/re-valide tout
    // (prix, zone, port, promo, crédit parrainage) et rejette un pays exclu.
    const body = {
      items,
      packs: packs.map(p => ({ pack_id: p.pack_id, size: p.size, quantity: p.quantity })),
      promo_codes:    state.promoCodes.map(p => p.code),
      promo_code:     state.promoCodes[0]?.code ?? null,
      parrain_code:   state.parrainData?.code ?? null,
      reward_ids:     state.selectedRewards,
      customer_email: emailForOrder,
      customer_phone: state.phone.trim(),
      // FR : transporteur/type/relais. International : create-session ignore ces
      // champs (il branche sur `country` → zone) et fait collecter l'adresse par Stripe.
      carrier:        isFrance && dc?.kind === "fr" ? dc.carrier ?? null : null,
      delivery_type:  isFrance && dc?.kind === "fr" ? dc.type ?? null : null,
      relay: isRelayType && state.selectedRelay ? {
        id:          state.selectedRelay.id,
        name:        state.selectedRelay.name,
        street:      state.selectedRelay.street,
        city:        state.selectedRelay.city,
        postal_code: state.selectedRelay.postal_code,
        type:        dc!.type,
      } : null,
      home_address:   isFrance && dc?.kind === "fr" && dc.type === "home" ? state.shippingAddress : null,
      // International : adresse du compte (pré-remplie/éditée à la Livraison) → défaut
      // Stripe UNIQUEMENT (create-session crée un Customer pré-rempli). N'écrase PAS
      // le mécanisme webhook : home_address reste null à l'international.
      shipping_prefill: !isFrance ? (state.shippingAddress ?? null) : null,
      country:        state.country,
      locale:         en ? "en" : "fr",
    };

    setLoading(true);
    try {
      const res = await fetch("/api/checkout/create-session", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          // Token → identifie le compte (récompenses méca 2, serveur uniquement).
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data?.url) { window.location.href = data.url; return; }
      setError(data?.error ?? (en ? "Payment error. Please try again." : "Erreur lors du paiement. Réessaie."));
    } catch {
      setError(en ? "Network error. Please try again." : "Erreur réseau. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  const card: React.CSSProperties = { background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.08)", padding: "20px 22px" };
  const rowBetween: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 };

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "100px 24px 90px" }}>
      <CheckoutProgress current="paiement" />
      <h1 style={{ fontSize: 28, fontWeight: 950, letterSpacing: -1, color: "#1a1410", marginBottom: 20 }}>
        {en ? "Step 3 — Payment" : "Étape 3 — Paiement"}
      </h1>

      {/* ── Codes promo + parrain (saisie tunnel) — au-dessus du récap pour que
             l'effet sur le TOTAL soit visible immédiatement. ── */}
      <div style={{ marginBottom: 16 }}>
        <PromoParrainInput
          subtotal={subtotal}
          parrain={{
            active:     meSettings?.actif ?? meActif,
            applicable: parrainageCalc.parrainApplicable,
            shortfall:  parrainageCalc.parrainShortfall,
            discount:   parrainDiscount,
            montant:    parrainageSettingsForCalc.montant_recompense,
            seuil:      parrainageSettingsForCalc.seuil_filleul,
          }}
        />
      </div>

      {/* ── Récapitulatif (lecture seule) ── */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 14, color: "#1a1410" }}>
          {en ? "Order summary" : "Récapitulatif"}
        </div>

        <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
          {items.map(it => (
            <div key={`${it.id}-${it.taille ?? ""}-${it.couleur ?? ""}`} style={rowBetween}>
              <span style={{ fontSize: 14, color: "rgba(26,20,16,0.8)" }}>
                {/* it.name contient déjà taille + couleur (bakées à l'ajout, join " — ")
                    comme sur /panier, /success et l'email. On n'ajoute donc PAS de
                    suffixe taille/couleur ici, sinon la taille s'affiche deux fois. */}
                {it.name}
                <span style={{ color: "rgba(26,20,16,0.45)" }}> × {it.quantity}</span>
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>{fmt((Number(it.price) || 0) * (Number(it.quantity) || 0))}</span>
            </div>
          ))}
          {packs.map(p => (
            <div key={`${p.pack_id}-${p.size ?? ""}`} style={rowBetween}>
              <span style={{ fontSize: 14, color: "rgba(26,20,16,0.8)" }}>
                🎁 {p.title}{p.size ? ` · ${p.size}` : ""}
                <span style={{ color: "rgba(26,20,16,0.45)" }}> × {p.quantity}</span>
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>{fmt(p.price * p.quantity)}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gap: 8, borderTop: "1px solid rgba(26,20,16,0.08)", paddingTop: 14 }}>
          <div style={{ ...rowBetween, fontSize: 14, color: "rgba(26,20,16,0.7)" }}>
            <span>{en ? "Subtotal" : "Sous-total"}</span><span style={{ fontWeight: 700 }}>{fmt(subtotal)}</span>
          </div>
          {comboOk?.entries.map(e => (
            <div key={e.code} style={{ ...rowBetween, fontSize: 14, color: "#16a34a" }}>
              <span style={{ fontWeight: 700 }}>Code {e.code}</span>
              <span style={{ fontWeight: 800 }}>{e.discount > 0 ? `− ${fmt(e.discount)}` : (en ? "Free shipping" : "Livraison offerte")}</span>
            </div>
          ))}
          {parrainDiscount > 0 && (
            <div style={{ ...rowBetween, fontSize: 14, color: "#16a34a" }}>
              <span style={{ fontWeight: 700 }}>{en ? "Referral code" : "Code parrain"}</span>
              <span style={{ fontWeight: 800 }}>− {fmt(parrainDiscount)}</span>
            </div>
          )}
          {rewardDiscount > 0 && (
            <div style={{ ...rowBetween, fontSize: 14, color: "#16a34a" }}>
              <span style={{ fontWeight: 700 }}>🎁 {en ? "Referral rewards" : "Récompenses parrainage"}</span>
              <span style={{ fontWeight: 800 }}>− {fmt(rewardDiscount)}</span>
            </div>
          )}
          <div style={{ ...rowBetween, fontSize: 14, color: "rgba(26,20,16,0.7)" }}>
            <span>{en ? "Delivery" : "Livraison"}{shippingLabelText ? ` · ${shippingLabelText}` : ""}</span>
            <span style={{ fontWeight: 700, color: shippingFree ? "#16a34a" : undefined }}>
              {shippingFree ? (en ? "Free" : "Gratuit") : fmt(shipping)}
            </span>
          </div>
          <div style={{ ...rowBetween, fontSize: 18, fontWeight: 950, color: "#1a1410", borderTop: "1px solid rgba(26,20,16,0.08)", paddingTop: 12, marginTop: 4 }}>
            <span>{en ? "Total" : "Total"}</span><span>{fmt(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* ── Récompenses parrainage (compte connecté) — barème progressif comme /panier ── */}
      {user && (meSettings?.actif ?? meActif) && state.availableRewards.length > 0 && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4, color: "#1a1410" }}>
            {en ? "My referral rewards 🎉" : "Mes récompenses parrainage 🎉"}
          </div>
          <div style={{ fontSize: 12.5, color: "rgba(26,20,16,0.5)", marginBottom: 12, lineHeight: 1.5 }}>
            {parrainageCalc.rewardsUnlocked > 0
              ? (en
                  ? `Apply up to ${parrainageCalc.rewardsUnlocked} reward${parrainageCalc.rewardsUnlocked > 1 ? "s" : ""} on this order.`
                  : `Coche jusqu'à ${parrainageCalc.rewardsUnlocked} récompense${parrainageCalc.rewardsUnlocked > 1 ? "s" : ""} sur cette commande.`)
              : (en
                  ? `Add ${fmt(parrainageCalc.rewardsShortfall)} to unlock your 1st reward.`
                  : `Ajoute ${fmt(parrainageCalc.rewardsShortfall)} pour débloquer ta 1ʳᵉ récompense.`)}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {state.availableRewards.map((r, i) => {
              const tier         = parrainageSettingsForCalc.seuils_parrain[i];
              const tierUnlocked = i < parrainageCalc.rewardsUnlocked;
              const checked      = state.selectedRewards.includes(r.id);
              const capReached   = !checked && state.selectedRewards.length >= parrainageCalc.rewardsUnlocked;
              const disabled     = !tierUnlocked || capReached;
              const manque       = tier != null ? Math.max(0, tier - parrainageCalc.totalApresParrain) : 0;
              const ord          = i === 0 ? (en ? "1st" : "1ʳᵉ") : `${i + 1}${en ? "th" : "ᵉ"}`;
              return (
                <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: disabled ? "rgba(26,20,16,0.04)" : "#ede8df", opacity: disabled ? 0.55 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
                  <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleReward(r.id)} />
                  <span style={{ fontWeight: 800, fontSize: 14, color: "#1a1410" }}>− {fmt(r.montant)}</span>
                  {!tierUnlocked && tier != null ? (
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "#b45309", fontWeight: 700, textAlign: "right" }}>
                      {en ? `add ${fmt(manque)} to unlock the ${ord} reward` : `ajoute ${fmt(manque)} pour débloquer la ${ord} remise`}
                    </span>
                  ) : !tierUnlocked && tier == null ? (
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>
                      max {parrainageSettingsForCalc.max_recompenses_par_commande} / {en ? "order" : "commande"}
                    </span>
                  ) : (
                    <span style={{ marginLeft: "auto", fontSize: 12, color: r.days_left <= 7 ? "#b45309" : "rgba(26,20,16,0.45)", fontWeight: 600 }}>
                      {en ? `expires in ${r.days_left}d` : `expire dans ${r.days_left} j`}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          <div style={{ marginTop: 10, fontSize: 11.5, color: "rgba(26,20,16,0.4)", lineHeight: 1.5 }}>
            {en ? "Final discounts are confirmed at payment." : "Les remises finales sont confirmées au paiement."}
          </div>
        </div>
      )}

      {/* ── Client (rappel) ── */}
      <div style={{ ...card, marginBottom: 16, fontSize: 13.5, color: "rgba(26,20,16,0.7)", lineHeight: 1.7 }}>
        <div><strong>{en ? "Email" : "Email"} :</strong> {emailForOrder}</div>
        <div><strong>{en ? "Phone" : "Téléphone"} :</strong> {state.phone}</div>
        <div>
          <strong>{en ? "Delivery" : "Livraison"} :</strong>{" "}
          {shippingLabelText}
          {isFrance && dc?.kind === "fr" && (dc.type === "point_relais" || dc.type === "locker") && state.selectedRelay
            ? ` — ${state.selectedRelay.name}, ${state.selectedRelay.postal_code} ${state.selectedRelay.city}`
            : ""}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#b91c1c", fontSize: 13.5, fontWeight: 700 }}>
          ❌ {error}
        </div>
      )}

      {/* Rappel douane — HORS UE uniquement (CH = EUROPE_NON_EU, GB = UK). */}
      {(zone === "EUROPE_NON_EU" || zone === "UK") && (
        <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(180,83,9,0.08)", border: "1px solid rgba(180,83,9,0.3)", fontSize: 12.5, color: "#92400e", textAlign: "center", lineHeight: 1.6 }}>
          {en
            ? "⚠️ Customs duties/VAT may apply on delivery, payable by you (not included in the shipping price)."
            : "⚠️ Des frais de douane/TVA peuvent s'appliquer à la livraison, à votre charge (non inclus dans le prix de livraison)."}
        </div>
      )}

      <button onClick={onPay} disabled={!canPay}
        style={{ width: "100%", padding: "16px", borderRadius: 12, border: "none", background: canPay ? "#1a1410" : "#d1cdc8", color: "#f2ede6", fontWeight: 950, fontSize: 16, cursor: canPay ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        {loading && <span style={{ width: 16, height: 16, border: "2px solid rgba(242,237,230,0.4)", borderTopColor: "#f2ede6", borderRadius: "50%", display: "inline-block", animation: "milk-spin 0.7s linear infinite" }} />}
        {loading ? (en ? "Redirecting…" : "Redirection…") : `${payVerb} · ${fmt(grandTotal)}`}
      </button>
      <style>{`@keyframes milk-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Conditions manquantes (affichage) — visibles quand « Payer » est désactivé (hors chargement). */}
      <CheckoutMissingHints items={missingHints} />

      {/* Ligne rassurante — INTERNATIONAL uniquement (adresse saisie/confirmée sur Stripe). */}
      {!isFrance && (
        <div style={{ marginTop: 12, fontSize: 12.5, color: "rgba(26,20,16,0.55)", textAlign: "center", lineHeight: 1.6 }}>
          {en
            ? "Your delivery address will be entered on the secure payment page. No charge before confirmation."
            : "Votre adresse de livraison sera renseignée sur la page de paiement sécurisée. Aucun débit avant confirmation."}
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 12, color: "rgba(26,20,16,0.45)", textAlign: "center", lineHeight: 1.6 }}>
        {en
          ? "Final price, delivery and discounts are confirmed securely at payment."
          : "Prix, livraison et remises définitifs confirmés de façon sécurisée au paiement."}
      </div>

      <div style={{ marginTop: 24 }}>
        <button onClick={() => router.push("/checkout/livraison")}
          style={{ padding: "13px 24px", borderRadius: 12, border: "1px solid rgba(26,20,16,0.2)", background: "#fff", color: "#1a1410", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
          {en ? "Back to delivery" : "Retour à la livraison"}
        </button>
      </div>

      {/* Continuer mes achats (secondaire) → catalogue. */}
      <div style={{ marginTop: 12 }}>
        <ContinueShoppingLink />
      </div>
    </div>
  );
}
