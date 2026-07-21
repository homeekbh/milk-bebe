"use client";

import { useCart }  from "@/context/CartContext";
import { useAuth }  from "@/context/AuthContext";
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import { trackBeginCheckout, metaInitiateCheckout } from "@/lib/analytics";
import { computeCartTotals } from "@/lib/cart-totals";
import { combinePromos, type ValidatedPromo } from "@/lib/promo-combine";
import { computeParrainage, type ParrainageSettings } from "@/lib/parrainage";
import {
  DELIVERY_DELAY,
  getDeliveryPrice,
  isDeliveryCombinationAllowed,
  type Carrier,
  type DeliveryType,
} from "@/lib/delivery-config";

// Ligne pack au panier (lue depuis localStorage milk_pack_cart, groupée par
// pack_id + size en quantité).
type PackLine = {
  pack_id: string; slug: string; title: string; size: string | null;
  price: number; image_url: string | null; items: string[]; quantity: number;
};

// Seuil par défaut si /api/settings/public échoue (chargement réseau)
const DEFAULT_FREE_SHIPPING_THRESHOLD = 60;

// Distance max (km) d'un point relais affiché dans le sélecteur.
const MAX_RELAY_DISTANCE_KM = 10;

type ServicePoint = {
  id: string;
  name: string;
  street: string;
  city: string;
  postal_code: string;
  distance: number | null;
  opening_hours: string | null;
};

type HomeAddress = {
  name:        string;
  line1:       string;
  postal_code: string;
  city:        string;
  country:     string;
};

// Mappe la réponse de /api/promo/validate → ValidatedPromo (entrée de combinePromos).
// Le `discount` renvoyé par l'API est ignoré : il est RECALCULÉ par combinePromos
// dans le contexte du cumul (ordre fixe→%, plafond) — seule source de vérité côté UI.
function toValidatedPromo(d: any): ValidatedPromo {
  return {
    code:                     String(d.code ?? "").toUpperCase().trim(),
    type:                     String(d.type ?? ""),
    value:                    Number(d.value) || 0,
    free_shipping:            !!d.free_shipping,
    cumulable_avec_livraison: d.cumulable_avec_livraison !== false,
    cumulable:                d.cumulable === true,
    cumulable_codes:          Array.isArray(d.cumulable_codes)
                                ? d.cumulable_codes.map((c: any) => String(c).toUpperCase().trim()).filter(Boolean)
                                : [],
  };
}

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart } = useCart();
  const { user, session } = useAuth();
  const router    = useRouter();
  const locale    = useLocale();

  const [loading,       setLoading]       = useState(false);
  const [promoCode,     setPromoCode]     = useState("");             // champ de saisie
  const [promoCodes,    setPromoCodes]    = useState<ValidatedPromo[]>([]); // codes appliqués (cumul)
  const [promoError,    setPromoError]    = useState("");
  const [promoLoading,  setPromoLoading]  = useState(false);

  // ── Parrainage ──
  const [parrainCode,    setParrainCode]    = useState("");
  const [parrainData,    setParrainData]    = useState<{ code: string; montant_recompense: number; seuil_filleul: number } | null>(null);
  const [parrainError,   setParrainError]   = useState("");
  const [parrainLoading, setParrainLoading] = useState(false);
  // Données du compte connecté (récompenses utilisables + réglages complets).
  const [meRewards,      setMeRewards]      = useState<{ id: string; montant: number; days_left: number }[]>([]);
  const [meSettings,     setMeSettings]     = useState<ParrainageSettings | null>(null);
  const [meActif,        setMeActif]        = useState(true);
  const [selectedRewardIds, setSelectedRewardIds] = useState<string[]>([]);
  const [guestEmail,    setGuestEmail]    = useState("");
  const [guestError,    setGuestError]    = useState("");
  const [checkoutError, setCheckoutError] = useState("");

  // ── Livraison : 2 carriers × jusqu'à 3 options ──────────────────────────
  // Carrier + deliveryType bougent toujours ensemble. On les expose en deux
  // states pour faciliter le rendu mais ils sont contraints par DELIVERY_PRICES.
  const [carrier,         setCarrier]         = useState<Carrier | null>(null);
  const [deliveryType,    setDeliveryType]    = useState<DeliveryType | null>(null);
  const [postalSearch,    setPostalSearch]    = useState("");
  const [searching,       setSearching]       = useState(false);
  const [searchResults,   setSearchResults]   = useState<ServicePoint[]>([]);
  const [searchError,     setSearchError]     = useState("");
  const [searchEmpty,     setSearchEmpty]     = useState(false);
  const [selectedRelay,   setSelectedRelay]   = useState<ServicePoint | null>(null);
  const [fallbackManual,  setFallbackManual]  = useState(false);
  const [homeAddress,     setHomeAddress]     = useState<HomeAddress>({ name: "", line1: "", postal_code: "", city: "", country: "FR" });
  // Téléphone obligatoire (exigé par Sendcloud pour tous les transporteurs).
  // Format français : 10 chiffres minimum (06/07/+33...).
  const [customerPhone,   setCustomerPhone]   = useState("");
  const [phoneError,      setPhoneError]      = useState("");
  // Parcours en 2 étapes : 1 = compte + téléphone, 2 = choix de livraison + paiement.
  // Toutes les données (email, téléphone, promo, livraison) restent en state → aucun
  // reset au changement d'étape. deliveryRef : cible du scroll fluide vers l'étape 2.
  const [step, setStep] = useState<1 | 2>(1);
  const deliveryRef = useRef<HTMLDivElement>(null);
  // Modale isolée pour la sélection du point relais / locker.
  // Évite que le widget de recherche perturbe le layout principal
  // (et corrige le crash "Application error" observé en inline).
  const [relayModalOpen,  setRelayModalOpen]  = useState(false);

  // Seuil livraison offerte — lu depuis /api/settings/public au mount (cache
  // CDN 60s). Default DEFAULT_FREE_SHIPPING_THRESHOLD si l'API échoue.
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(DEFAULT_FREE_SHIPPING_THRESHOLD);
  useEffect(() => {
    fetch("/api/settings/public")
      .then(r => r.json())
      .then(d => {
        const n = Number(d?.free_shipping_threshold);
        if (Number.isFinite(n) && n > 0) setFreeShippingThreshold(n);
      })
      .catch(() => {});
  }, []);

  // ── Packs : lus depuis localStorage milk_pack_cart (store séparé, pas de
  //    migration) et groupés par pack_id + size en quantité. Affichés dans la
  //    MÊME liste que les produits, inclus dans le total/promo/livraison. ──────
  const [packs, setPacks] = useState<PackLine[]>([]);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("milk_pack_cart") ?? "[]");
      if (!Array.isArray(raw)) return;
      const map = new Map<string, PackLine>();
      for (const p of raw) {
        const key = `${p.pack_id}__${p.size ?? ""}`;
        const ex  = map.get(key);
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

  function removePack(pack_id: string, size: string | null) {
    try {
      const raw  = JSON.parse(localStorage.getItem("milk_pack_cart") ?? "[]");
      const next = (Array.isArray(raw) ? raw : []).filter((p: any) => !(p.pack_id === pack_id && (p.size ?? null) === (size ?? null)));
      localStorage.setItem("milk_pack_cart", JSON.stringify(next));
    } catch {}
    setPacks(prev => prev.filter(p => !(p.pack_id === pack_id && p.size === size)));
    try { window.dispatchEvent(new Event("milk-pack-cart-changed")); } catch {}
  }

  // « Vider le panier » : clearCart() ne touche que milk_cart_v2 (produits). Les
  // packs vivent dans un store séparé milk_pack_cart → on les vide aussi + on reset
  // le state local, puis on prévient le Header (badge) via un event custom (un write
  // localStorage same-tab ne déclenche pas l'event natif "storage"). UI resync immédiate.
  function handleClearCart() {
    clearCart();                                          // produits (milk_cart_v2)
    try { localStorage.removeItem("milk_pack_cart"); } catch {}
    setPacks([]);                                         // packs (state local)
    try { window.dispatchEvent(new Event("milk-pack-cart-changed")); } catch {}
  }

  // Charger depuis localStorage au mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("milk_delivery_choice");
      if (!raw) return;
      const d = JSON.parse(raw);
      // Valider que la combinaison carrier/deliveryType existe dans la matrice
      const c = d.carrier as Carrier | undefined;
      const t = d.deliveryType as DeliveryType | undefined;
      if (c && t && isDeliveryCombinationAllowed(c, t)) {
        setCarrier(c);
        setDeliveryType(t);
      }
      if (d.selectedRelay) {
        // Sanitization défensive : un selectedRelay legacy depuis Sendcloud
        // peut contenir un opening_hours OBJET (clés "1", "2", "B"...) qui
        // provoque React error #31 au rendu. On force string|null partout.
        const sr = d.selectedRelay;
        setSelectedRelay({
          id:            String(sr.id ?? ""),
          name:          String(sr.name ?? ""),
          street:        String(sr.street ?? ""),
          city:          String(sr.city ?? ""),
          postal_code:   String(sr.postal_code ?? ""),
          distance:      typeof sr.distance === "number" ? sr.distance : null,
          opening_hours: typeof sr.opening_hours === "string" ? sr.opening_hours : null,
        });
      }
      if (d.homeAddress)    setHomeAddress(d.homeAddress);
      if (d.postalSearch)   setPostalSearch(d.postalSearch);
      if (d.customerPhone)  setCustomerPhone(String(d.customerPhone));
    } catch {}
  }, []);

  // Sauvegarder dans localStorage à chaque changement
  useEffect(() => {
    try {
      localStorage.setItem("milk_delivery_choice", JSON.stringify({
        carrier, deliveryType, selectedRelay, homeAddress, postalSearch, customerPhone,
      }));
    } catch {}
  }, [carrier, deliveryType, selectedRelay, homeAddress, postalSearch, customerPhone]);

  // Validation téléphone : 10 chiffres min, accepte 06/07/01-05/+33...
  function isValidPhone(p: string): boolean {
    const digits = String(p ?? "").replace(/[^\d+]/g, "");
    // +33 suivi de 9 chiffres OU 10 chiffres exactement
    return /^\+33[1-9]\d{8}$/.test(digits) || /^0[1-9]\d{8}$/.test(digits);
  }

  async function searchServicePoints() {
    const cp = postalSearch.trim();
    if (!/^\d{4,5}$/.test(cp)) {
      setSearchError("Code postal invalide (4 ou 5 chiffres)");
      return;
    }
    if (!carrier) {
      setSearchError("Sélectionnez d'abord un transporteur");
      return;
    }
    setSearching(true);
    setSearchError("");
    setSearchEmpty(false);
    setSearchResults([]);
    setFallbackManual(false);
    try {
      const res = await fetch(`/api/servicepoints?postal_code=${encodeURIComponent(cp)}&carrier=${encodeURIComponent(carrier)}`);
      const data = await res.json();
      if (!res.ok || data.error === true) {
        setSearchError(data.message ?? "Impossible de charger les points relais. Réessayez.");
        setFallbackManual(true);
      } else {
        // Filtre côté client : distance max 10 km. Si Sendcloud ne fournit pas
        // de distance, on conserve le point (mieux vaut afficher que rien).
        const all: ServicePoint[] = data.results ?? [];
        const filtered = all.filter(sp => sp.distance == null || sp.distance <= MAX_RELAY_DISTANCE_KM);
        setSearchResults(filtered);
        setSearchEmpty(filtered.length === 0);
        if (filtered.length === 0 && all.length === 0 && data.fallback_manual) {
          setFallbackManual(true);
        }
      }
    } catch (e: any) {
      setSearchError("Erreur réseau : " + (e?.message ?? "inconnue"));
      setFallbackManual(true);
    } finally {
      setSearching(false);
    }
  }

  function selectServicePoint(sp: ServicePoint) {
    setSelectedRelay(sp);
    setSearchError("");
    setRelayModalOpen(false);
  }

  function openRelayModal() {
    setSearchError("");
    setSearchEmpty(false);
    setFallbackManual(false);
    setRelayModalOpen(true);
  }

  function closeRelayModal() {
    setRelayModalOpen(false);
  }

  // Sélectionne une option (carrier + type) parmi la matrice DELIVERY_PRICES.
  // Reset systématique du relais sélectionné quand on change (un PR Mondial
  // Relay n'est pas valide pour Colissimo, et inversement).
  // Pour point_relais et locker → ouvre directement la modale de sélection.
  function switchDelivery(c: Carrier, t: DeliveryType) {
    setCarrier(c);
    setDeliveryType(t);
    setCheckoutError("");
    setSelectedRelay(null);
    setSearchResults([]);
    setSearchEmpty(false);
    setFallbackManual(false);
    setSearchError("");
    if (t === "point_relais" || t === "locker") {
      setRelayModalOpen(true);
    } else {
      setRelayModalOpen(false);
    }
  }

  const productsSubtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
  const packsSubtotal    = packs.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.quantity) || 0), 0);
  const subtotal         = productsSubtotal + packsSubtotal;

  // ── Cumul de codes promo (étape 21) ──────────────────────────────────────
  // Combinaison PURE dérivée dans le render (ordre fixe→%, compat mutuelle,
  // plafond 60 %). Même fonction que create-session (l'affiché = le facturé).
  // → recalcul live automatique au changement de sous-total, sans I/O.
  const combo   = promoCodes.length > 0 ? combinePromos(promoCodes, subtotal) : null;
  const comboOk = combo && combo.valid ? combo : null;
  const discount = comboOk ? comboOk.totalDiscount : 0;

  // ✅ Re-validation async des codes appliqués au changement de sous-total :
  //   - min_order / expiration / épuisement (validate côté serveur) → retire les
  //     codes devenus inapplicables ;
  //   - garde-fou plafond 60 % (mirroir conservateur de create-session) → retire
  //     le DERNIER code jusqu'à repasser sous le plafond.
  // Jamais de clamp silencieux : tout retrait est signalé via promoError.
  const recheckPromos = useCallback(async (currentSubtotal: number, codes: ValidatedPromo[]) => {
    if (codes.length === 0) return;
    const checked = await Promise.all(codes.map(async pc => {
      try {
        const res = await fetch("/api/promo/validate", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ code: pc.code, order_total: currentSubtotal }),
        });
        if (res.status === 429) return pc;                         // rate-limit → garder
        if (!res.ok)            return { drop: pc.code } as const;  // min_order… → retirer
        return toValidatedPromo(await res.json());
      } catch {
        return pc;                                                 // erreur réseau → garder
      }
    }));
    const dropped: string[] = [];
    let survivors: ValidatedPromo[] = [];
    for (const c of checked) {
      if ((c as any).drop) dropped.push((c as { drop: string }).drop);
      else survivors.push(c as ValidatedPromo);
    }
    // Garde-fou plafond : retirer le dernier code tant que le cumul ne passe pas.
    while (survivors.length >= 2 && !combinePromos(survivors, currentSubtotal).valid) {
      dropped.push(survivors[survivors.length - 1].code);
      survivors = survivors.slice(0, -1);
    }
    setPromoCodes(prev => {
      const same = prev.length === survivors.length
        && prev.every((p, i) => p.code === survivors[i].code && p.value === survivors[i].value && p.type === survivors[i].type);
      return same ? prev : survivors;
    });
    if (dropped.length) {
      const uniq = [...new Set(dropped)];
      setPromoError(`Code${uniq.length > 1 ? "s" : ""} retiré${uniq.length > 1 ? "s" : ""} : ${uniq.join(", ")} — non applicable(s) à ce montant.`);
    }
  }, []);

  useEffect(() => {
    if (promoCodes.length > 0) recheckPromos(subtotal, promoCodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]); // ✅ Se déclenche à chaque changement de sous-total
  // Prix livraison depuis la matrice. 0 si carrier/type pas encore choisis.
  const basePrice = (carrier && deliveryType) ? getDeliveryPrice(carrier, deliveryType) : 0;

  // ⚠️ Calcul UNIFIÉ (produits + packs) via computeCartTotals() — même fonction
  // pure que /api/checkout/create-session (l'affiché = le facturé). Le seuil
  // livraison est évalué sur le TOTAL APRÈS PROMO (décision actée).
  const totals = computeCartTotals({
    productsSubtotal,
    packsSubtotal,
    discount,
    basePrice,
    freeShippingThreshold,
    // Cumul : le combo agrège free_shipping (au moins un code l'offre) et
    // cumulable_avec_livraison (tous les codes autorisent le seuil auto).
    promo: comboOk ? {
      free_shipping:            comboOk.free_shipping,
      cumulable_avec_livraison: comboOk.cumulable_avec_livraison,
    } : null,
  });
  const totalAfterPromo = totals.totalAfterPromo;
  const shippingFree    = totals.shippingFree;
  const shipping        = totals.shipping;
  const total           = totals.total;

  // Éligibilité « livraison offerte » INDÉPENDANTE du transporteur choisi. Les options
  // de livraison s'affichent AVANT qu'un transporteur soit sélectionné (basePrice = 0 →
  // computeShipping renvoie shippingFree=false). On reproduit ici la même décision de
  // seuil/promo, sans basePrice, pour barrer le prix + afficher « Gratuit » sur CHAQUE
  // option dès que la livraison est offerte. Miroir exact de computeShipping :
  //   - un code offre la livraison → offert ;
  //   - un code %/€ non cumulable → seuil désactivé (jamais offert par le seuil) ;
  //   - sinon total après promo ≥ seuil → offert.
  const freeShippingEligible =
    !!comboOk?.free_shipping ||
    ((!comboOk || comboOk.cumulable_avec_livraison !== false) && totalAfterPromo >= freeShippingThreshold);

  // ── Parrainage : calcul d'AFFICHAGE (create-session re-valide, seul juge) ──
  const parrainageSettingsForCalc: ParrainageSettings = {
    actif:                        meSettings?.actif ?? meActif,
    montant_recompense:           parrainData?.montant_recompense ?? meSettings?.montant_recompense ?? 5,
    seuil_filleul:                parrainData?.seuil_filleul ?? meSettings?.seuil_filleul ?? 60,
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
    promoDiscount:         discount,
    freeShippingThreshold,
    hasValidParrainCode:   !!parrainData,
    rewardsAvailableCount: meRewards.length,
    rewardsSelectedCount:  selectedRewardIds.length,
    cartCategorySlugs:     cartCatSlugs,
  });
  const parrainDiscount = parrainageCalc.parrainDiscount;
  const rewardDiscount  = parrainageCalc.rewardDiscount;
  const grandTotal      = Math.max(0, total - parrainDiscount - rewardDiscount);

  // Barre "il te reste X€" : calculée sur le TOTAL APRÈS PROMO (même base que le
  // port réel). Si un code repasse sous 60€, le port réapparaît avec la barre.
  // Promo non cumulable → seuil désactivé → barre masquée (pas de fausse promesse).
  const promoBlocksThreshold = !!comboOk && comboOk.cumulable_avec_livraison === false && !comboOk.free_shipping;
  // « Plus que X€ » = montant de PRODUITS à AJOUTER (prix AVANT promo) pour franchir
  // le seuil APRÈS remise — et non le simple écart post-promo. Car ce qu'on ajoute est
  // lui aussi remisé. Cumul (ordre fixe→%) : seuls les codes % font grossir la base ;
  // les € fixes ne scalent pas avec l'ajout. On divise donc l'écart par le facteur
  // pourcentage COMPOSÉ ∏(1 − pᵢ) des codes % du combo (=1 si aucun % → écart brut).
  // Ex. un seul −30% → gap / 0,70 ; deux codes −20% + −10% → gap / (0,80 × 0,90).
  const percentFactor = (comboOk?.entries ?? [])
    .filter(e => e.type === "percent")
    .reduce((f, e) => f * (1 - Math.min(Math.max((Number(e.value) || 0) / 100, 0), 0.99)), 1);
  const gap = Math.max(0, freeShippingThreshold - totalAfterPromo);
  let remaining: number;
  if (promoBlocksThreshold) {
    remaining = 0;
  } else {
    remaining = Math.round((gap / percentFactor) * 100) / 100;
  }
  const pct = promoBlocksThreshold ? 0 : Math.min(100, (totalAfterPromo / freeShippingThreshold) * 100);

  // Livraison complétée ?
  const homeComplete    = !!(homeAddress.name.trim() && homeAddress.line1.trim() && /^\d{4,5}$/.test(homeAddress.postal_code) && homeAddress.city.trim());
  const phoneOk         = isValidPhone(customerPhone);
  const deliveryReady   =
    !carrier || !deliveryType                                    ? false        :
    !phoneOk                                                      ? false        :  // téléphone obligatoire dans tous les cas
    deliveryType === "home"                                      ? homeComplete :
    (deliveryType === "point_relais" || deliveryType === "locker") ? !!selectedRelay :
    false;

  // Email requis pour payer : connecté (user.email connu) OU invité avec email valide.
  const emailReady   = !!user || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim());
  const cartNonEmpty = (items.length + packs.length) > 0; // items OU packs (pack seul compte)
  // Étape 1 (compte + téléphone) prête → active le bouton « Passer au paiement » qui
  // révèle l'étape 2 (livraison). NE crée PAS de session Stripe.
  const step1Ready    = emailReady && phoneOk && cartNonEmpty;
  // Paiement final (étape 2) : étape 1 OK + livraison complète (deliveryReady inclut phoneOk).
  const finalPayReady = step1Ready && deliveryReady;

  // Passage à l'étape 2 → scroll fluide vers le bloc livraison qui vient d'apparaître.
  useEffect(() => {
    if (step === 2) deliveryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  // Sauvegarde panier abandonné — connecté (user.email) OU invité (guestEmail valide).
  // Sans email exploitable, la quasi-totalité des visiteurs (achat invité) n'était
  // jamais enregistrée dans abandoned_carts, donc jamais relancée.
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const guest = guestEmail.trim();
    const email = user?.email ?? (guest && emailRegex.test(guest) ? guest : "");
    if (!email || items.length === 0) return;
    const timeout = setTimeout(() => {
      fetch("/api/cart/save", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, prenom: email.split("@")[0] ?? "", items, total: subtotal }),
      }).catch(e => process.env.NODE_ENV !== "production" && console.error("Cart save error:", e));
    }, 3000);
    return () => clearTimeout(timeout);
  }, [items, user, subtotal, guestEmail]);

  async function applyPromo() {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    if (promoCodes.some(p => p.code === code)) {
      setPromoError("Ce code est déjà appliqué.");
      return;
    }
    setPromoLoading(true); setPromoError("");
    try {
      const res  = await fetch("/api/promo/validate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code, order_total: subtotal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Code invalide");
      // Tester le CUMUL avant d'ajouter : compat mutuelle + plafond 60 %.
      // Si le nouveau code casse la combinaison, on affiche le refus (jamais d'ajout partiel).
      const next = [...promoCodes, toValidatedPromo(data)];
      const test = combinePromos(next, subtotal);
      if (!test.valid) throw new Error(test.error);
      setPromoCodes(next);
      setPromoCode("");
    } catch (e: any) {
      setPromoError(e.message);
    } finally {
      setPromoLoading(false);
    }
  }

  function removePromo(code: string) {
    setPromoCodes(prev => prev.filter(p => p.code !== code));
    setPromoError("");
  }
  // Champ de saisie visible si aucun code OU si TOUS les codes appliqués acceptent
  // le cumul (permet d'en ajouter un 2e). Un code exclusif masque le champ.
  const canAddPromo = promoCodes.length === 0 || promoCodes.every(p => p.cumulable);

  // ── Parrainage : récompenses + réglages du compte connecté ────────────────
  useEffect(() => {
    const token = session?.access_token;
    if (!token) { setMeRewards([]); setMeSettings(null); return; }
    fetch("/api/parrainage/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then((d: any) => {
        if (!d || d.error) return;
        setMeActif(d.actif !== false);
        if (d.settings) setMeSettings(d.settings as ParrainageSettings);
        setMeRewards(Array.isArray(d.rewards_usable) ? d.rewards_usable : []);
      })
      .catch(() => {});
  }, [session?.access_token]);

  async function applyParrain() {
    if (!parrainCode.trim()) return;
    setParrainLoading(true); setParrainError(""); setParrainData(null);
    try {
      const token = session?.access_token;
      const res = await fetch("/api/parrainage/validate", {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body:    JSON.stringify({ code: parrainCode.trim(), email: user?.email ?? (guestEmail.trim() || null) }),
      });
      const data = await res.json();
      if (!data.valid) throw new Error(data.error ?? "Code parrain invalide");
      setParrainData({ code: data.code, montant_recompense: data.montant_recompense, seuil_filleul: data.seuil_filleul });
    } catch (e: any) {
      setParrainError(e.message);
    } finally {
      setParrainLoading(false);
    }
  }

  function removeParrain() { setParrainData(null); setParrainCode(""); setParrainError(""); }
  function toggleReward(id: string) {
    setSelectedRewardIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  async function handleCheckout() {
    if ((items.length === 0 && packs.length === 0) || loading) return;
    setGuestError("");
    setCheckoutError("");

    // Guest checkout : valider email si non connecté
    if (!user) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!guestEmail.trim() || !emailRegex.test(guestEmail.trim())) {
        setGuestError("Saisis un email valide pour continuer.");
        setCheckoutError("Saisis un email valide pour continuer.");
        return;
      }
    }

    // Vérifier téléphone
    if (!isValidPhone(customerPhone)) {
      setPhoneError("Numéro de téléphone obligatoire (10 chiffres).");
      setCheckoutError("Veuillez saisir un numéro de téléphone valide.");
      return;
    }
    // Vérifier que la livraison est complète
    if (!deliveryReady) {
      setCheckoutError("Veuillez compléter votre choix de livraison.");
      return;
    }

    // Tracking begin_checkout (GA4) + InitiateCheckout (Meta) — non bloquant.
    const cartValue = items.reduce((a, it) => a + (it.price ?? 0) * (it.quantity ?? 1), 0);
    const numItems  = items.reduce((a, it) => a + (it.quantity ?? 1), 0);
    trackBeginCheckout(
      items.map(it => ({
        id:       it.id,
        name:     it.name,
        price:    it.price,
        quantity: it.quantity,
        category: it.category_slug,
        variant:  it.taille ?? it.couleur,
        slug:     it.slug,
      })),
      cartValue,
      promoCodes.length > 0 ? promoCodes.map(p => p.code).join("+") : undefined,
    );
    metaInitiateCheckout(cartValue, numItems);
    // ✅ Sauvegarder l'email guest pour la success page (conversion panier abandonné)
    if (!user && guestEmail.trim()) {
      try { localStorage.setItem("milk_guest_email", guestEmail.trim().toLowerCase()); } catch {}
    }
    setLoading(true);
    try {
      const isRelayType = deliveryType === "point_relais" || deliveryType === "locker";
      const res  = await fetch("/api/checkout/create-session", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          // Token pour identifier le compte (récompenses méca 2 — serveur only).
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body:    JSON.stringify({
          items,
          // Packs : envoyés en sélection (pack_id + taille choisie + qty). Le
          // serveur recalcule le forfait + les tailles par pièce depuis la base.
          packs: packs.map(p => ({ pack_id: p.pack_id, size: p.size, quantity: p.quantity })),
          // ⚠️ promo_code / parrain_code / reward_ids : TOUT est RE-VALIDÉ et
          // RE-CALCULÉ côté serveur (validatePromoCode + validateParrainCode +
          // computeParrainage). Le client ne peut forger aucune remise.
          // Cumul : liste de TOUS les codes appliqués. create-session re-valide et
          // recombine (dégradation gracieuse). `promo_code` (1er) laissé pour compat.
          promo_codes:    promoCodes.map(p => p.code),
          promo_code:     promoCodes[0]?.code ?? null,
          parrain_code:   parrainData?.code  ?? null,
          reward_ids:     selectedRewardIds,
          customer_email: user?.email ?? guestEmail.trim(),
          customer_phone: customerPhone.trim(),
          carrier,
          delivery_type:  deliveryType,
          relay:          isRelayType && selectedRelay ? {
            id:          selectedRelay.id,
            name:        selectedRelay.name,
            street:      selectedRelay.street,
            city:        selectedRelay.city,
            postal_code: selectedRelay.postal_code,
            type:        deliveryType,
          } : null,
          home_address:   deliveryType === "home" ? homeAddress : null,
          locale,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setCheckoutError(data.error ?? "Erreur lors du paiement. Réessaie.");
    } catch (e: any) {
      setCheckoutError(e?.message ?? "Erreur réseau. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: "#ede8df", minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
      <style>{`
        .cart-layout { display: grid; grid-template-columns: 1fr 360px; gap: 24px; align-items: start; }
        .cart-sticky  { position: sticky; top: 100px; }
        .cart-outer   { padding: 0 32px; }
        @media (max-width: 900px) {
          .cart-layout { grid-template-columns: 1fr !important; }
          .cart-sticky  { position: static !important; }
          .cart-outer   { padding: 0 16px !important; }
        }
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto" }} className="cart-outer">
        <h1 style={{ margin: "0 0 32px", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 950, letterSpacing: -1.5, color: "#1a1410" }}>
          Mon panier
        </h1>

        {items.length === 0 && packs.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 20, padding: 60, textAlign: "center", border: "1px solid rgba(26,20,16,0.07)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: "#1a1410" }}>Votre panier est vide</div>
            <p style={{ opacity: 0.5, marginBottom: 28 }}>Découvrez nos essentiels en bambou pour nourrisson.</p>
            <Link href="/produits" style={{ padding: "14px 28px", borderRadius: 12, background: "#1a1410", color: "#f2ede6", fontWeight: 900, fontSize: 15, textDecoration: "none" }}>
              Voir les produits →
            </Link>
          </div>
        ) : (
          <div className="cart-layout">

            {/* ── Articles ── */}
            <div style={{ display: "grid", gap: 12 }}>

              {/* Barre livraison gratuite — 3 états :
                  - promo code-driven      : "Livraison offerte avec ton code promo"
                  - seuil atteint sur BRUT : "Livraison offerte"
                  - sinon                  : barre de progression vers le seuil */}
              <div style={{ background: "#fff", borderRadius: 16, padding: "18px 22px", border: "1px solid rgba(26,20,16,0.07)" }}>
                {comboOk?.free_shipping ? (
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#16a34a" }}>
                    ✓ Livraison offerte avec ton code promo !
                  </div>
                ) : shippingFree ? (
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#16a34a" }}>✓ Livraison offerte !</div>
                ) : remaining > 0 ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: "#1a1410" }}>
                      Plus que <strong>{remaining.toFixed(2)} €</strong> pour la livraison offerte
                    </div>
                    <div style={{ height: 6, background: "#ede8df", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "#c49a4a", borderRadius: 99, transition: "width 0.4s ease" }} />
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(26,20,16,0.55)" }}>
                    Livraison : <strong style={{ color: "#1a1410" }}>{shipping.toFixed(2)} €</strong>
                  </div>
                )}
              </div>

              {/* Liste articles */}
              {items.map(item => (
                <div key={item.id} style={{ background: "#fff", borderRadius: 16, padding: "18px 22px", border: "1px solid rgba(26,20,16,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1410", marginBottom: 4 }}>{item.name}</div>
                    <div style={{ fontSize: 14, color: "rgba(26,20,16,0.5)" }}>{Number(item.price).toFixed(2)} € / unité</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", background: "#ede8df", borderRadius: 10, padding: 4, flexShrink: 0 }}>
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.taille, item.couleur)} style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: "none", cursor: "pointer", fontSize: 18, display: "grid", placeItems: "center", color: "#1a1410" }}>−</button>
                    <span style={{ width: 34, textAlign: "center", fontWeight: 900, fontSize: 15, color: "#1a1410" }}>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.taille, item.couleur)} style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: "none", cursor: "pointer", fontSize: 18, display: "grid", placeItems: "center", color: "#1a1410" }}>+</button>
                  </div>
                  <div style={{ fontWeight: 950, fontSize: 18, color: "#1a1410", minWidth: 70, textAlign: "right", flexShrink: 0 }}>
                    {(item.price * item.quantity).toFixed(2)} €
                  </div>
                  <button onClick={() => removeFromCart(item.id, item.taille, item.couleur)} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>
                    ✕
                  </button>
                </div>
              ))}

              {/* Coffrets (packs) — même liste, facturés au FORFAIT */}
              {packs.map(p => (
                <div key={`${p.pack_id}__${p.size ?? ""}`} style={{ background: "#fff", borderRadius: 16, padding: "18px 22px", border: "1px solid rgba(196,154,74,0.35)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1410", marginBottom: 4 }}>🎁 {p.title}</div>
                    <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)" }}>
                      Coffret · {p.items.length} pièces{p.size ? ` · taille ${p.size}` : ""} · {Number(p.price).toFixed(2)} € / pack
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", background: "#ede8df", borderRadius: 10, padding: "8px 14px", flexShrink: 0, fontWeight: 900, fontSize: 15, color: "#1a1410" }}>
                    × {p.quantity}
                  </div>
                  <div style={{ fontWeight: 950, fontSize: 18, color: "#1a1410", minWidth: 70, textAlign: "right", flexShrink: 0 }}>
                    {(p.price * p.quantity).toFixed(2)} €
                  </div>
                  <button onClick={() => removePack(p.pack_id, p.size)} aria-label="Retirer le coffret" style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>
                    ✕
                  </button>
                </div>
              ))}

              {/* Code promo */}
              <div style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", border: "1px solid rgba(26,20,16,0.07)" }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "#1a1410" }}>Code promo</div>

                {/* Codes appliqués — un par un, avec SA remise (combo.entries) + suppression individuelle */}
                {promoCodes.length > 0 && (
                  <div style={{ display: "grid", gap: 8, marginBottom: canAddPromo ? 12 : 0 }}>
                    {promoCodes.map(pc => {
                      const e     = comboOk?.entries.find(x => x.code === pc.code);
                      const label = e && e.discount > 0 ? `− ${e.discount.toFixed(2)} €`
                                  : pc.free_shipping    ? "Livraison offerte"
                                  : e                   ? "Appliqué"
                                  :                       "…";
                      return (
                        <div key={pc.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 12, background: "#dcfce7", border: "1px solid #86efac" }}>
                          <div>
                            <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 15 }}>{pc.code}</span>
                            <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 700, color: "#16a34a" }}>{label}</span>
                          </div>
                          <button onClick={() => removePromo(pc.code)}
                            style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c", background: "none", border: "none", cursor: "pointer" }}>
                            Supprimer
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Saisie — visible si aucun code OU si tous les codes appliqués sont cumulables */}
                {canAddPromo && (
                  <div style={{ display: "flex", gap: 10 }}>
                    <input type="text" value={promoCode}
                      onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(""); }}
                      onKeyDown={e => e.key === "Enter" && applyPromo()}
                      placeholder={promoCodes.length > 0 ? "Ajouter un autre code" : "Ex : BIENVENUE10"}
                      style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(26,20,16,0.15)", fontSize: 14, fontWeight: 700, fontFamily: "monospace", letterSpacing: 1, outline: "none", background: "#ede8df" }}
                    />
                    <button onClick={applyPromo} disabled={promoLoading || !promoCode.trim()}
                      style={{ padding: "11px 20px", borderRadius: 10, background: "#1a1410", color: "#f2ede6", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", opacity: promoLoading || !promoCode.trim() ? 0.5 : 1 }}>
                      {promoLoading ? "..." : "Appliquer"}
                    </button>
                  </div>
                )}
                {canAddPromo && promoCodes.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "rgba(26,20,16,0.5)", fontWeight: 600 }}>
                    Tu peux cumuler un autre code compatible.
                  </div>
                )}
                {promoError && (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#b91c1c", fontWeight: 700 }}>❌ {promoError}</div>
                )}
              </div>

              {/* Code parrain — masqué si le programme est désactivé */}
              {(meActif || !user) && (
              <div style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", border: "1px solid rgba(26,20,16,0.07)" }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4, color: "#1a1410" }}>Code parrain 🎁</div>
                <div style={{ fontSize: 12.5, color: "rgba(26,20,16,0.5)", marginBottom: 12, lineHeight: 1.5 }}>
                  Un ami t'a donné son code&nbsp;? Saisis-le pour −{parrainageSettingsForCalc.montant_recompense.toFixed(0)}€ dès {parrainageSettingsForCalc.seuil_filleul.toFixed(0)}€ d'achat.
                </div>
                {parrainData ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 12, background: parrainageCalc.parrainApplicable ? "#dcfce7" : "#fef3c7", border: `1px solid ${parrainageCalc.parrainApplicable ? "#86efac" : "#fde68a"}` }}>
                      <div>
                        <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 15 }}>{parrainData.code}</span>
                        <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 700, color: parrainageCalc.parrainApplicable ? "#16a34a" : "#92400e" }}>
                          {parrainageCalc.parrainApplicable ? `− ${parrainDiscount.toFixed(2)} €` : `il manque ${parrainageCalc.parrainShortfall.toFixed(2)} €`}
                        </span>
                      </div>
                      <button onClick={removeParrain} style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c", background: "none", border: "none", cursor: "pointer" }}>Supprimer</button>
                    </div>
                    {!parrainageCalc.parrainApplicable && (
                      <div style={{ marginTop: 8, fontSize: 12.5, color: "#92400e", fontWeight: 600 }}>
                        Code parrain valable à partir de {parrainageSettingsForCalc.seuil_filleul.toFixed(0)}€ (après code promo).
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: "flex", gap: 10 }}>
                    <input type="text" value={parrainCode}
                      onChange={e => { setParrainCode(e.target.value.toUpperCase()); setParrainError(""); }}
                      onKeyDown={e => e.key === "Enter" && applyParrain()}
                      placeholder="Ex : K7PMR4TX"
                      style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(26,20,16,0.15)", fontSize: 14, fontWeight: 700, fontFamily: "monospace", letterSpacing: 1, outline: "none", background: "#ede8df" }}
                    />
                    <button onClick={applyParrain} disabled={parrainLoading || !parrainCode.trim()}
                      style={{ padding: "11px 20px", borderRadius: 10, background: "#1a1410", color: "#f2ede6", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", opacity: parrainLoading || !parrainCode.trim() ? 0.5 : 1 }}>
                      {parrainLoading ? "..." : "Appliquer"}
                    </button>
                  </div>
                )}
                {parrainError && (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#b91c1c", fontWeight: 700 }}>❌ {parrainError}</div>
                )}
              </div>
              )}

              {/* Mes récompenses parrainage (compte connecté) — barème PROGRESSIF */}
              {user && meActif && meRewards.length > 0 && (
                <div style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", border: "1px solid rgba(26,20,16,0.07)" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4, color: "#1a1410" }}>Mes récompenses parrainage 🎉</div>
                  <div style={{ fontSize: 12.5, color: "rgba(26,20,16,0.5)", marginBottom: 12, lineHeight: 1.5 }}>
                    {parrainageCalc.rewardsUnlocked > 0
                      ? `Coche jusqu'à ${parrainageCalc.rewardsUnlocked} récompense${parrainageCalc.rewardsUnlocked > 1 ? "s" : ""} sur cette commande — débloquées par paliers.`
                      : `Ajoute ${parrainageCalc.rewardsShortfall.toFixed(2)} € pour débloquer ta 1ʳᵉ récompense.`}
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {meRewards.map((r, i) => {
                      const tier         = parrainageSettingsForCalc.seuils_parrain[i]; // seuil de la position i
                      const tierUnlocked = i < parrainageCalc.rewardsUnlocked;          // débloquée (barème + plafond max)
                      const checked      = selectedRewardIds.includes(r.id);
                      const capReached   = !checked && selectedRewardIds.length >= parrainageCalc.rewardsUnlocked;
                      const disabled     = !tierUnlocked || capReached;
                      const manque       = tier != null ? Math.max(0, tier - parrainageCalc.totalApresParrain) : 0;
                      const ord          = i === 0 ? "1ʳᵉ" : `${i + 1}ᵉ`;
                      return (
                        <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: disabled ? "rgba(26,20,16,0.04)" : "#ede8df", opacity: disabled ? 0.55 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
                          <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleReward(r.id)} />
                          <span style={{ fontWeight: 800, fontSize: 14, color: "#1a1410" }}>− {r.montant.toFixed(2)} €</span>
                          {!tierUnlocked && tier != null ? (
                            <span style={{ marginLeft: "auto", fontSize: 12, color: "#b45309", fontWeight: 700, textAlign: "right" }}>
                              ajoute {manque.toFixed(2)} € pour débloquer la {ord} remise
                            </span>
                          ) : !tierUnlocked && tier == null ? (
                            <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>
                              max {parrainageSettingsForCalc.max_recompenses_par_commande} / commande
                            </span>
                          ) : (
                            <span style={{ marginLeft: "auto", fontSize: 12, color: r.days_left <= 7 ? "#b45309" : "rgba(26,20,16,0.45)", fontWeight: 600 }}>
                              expire dans {r.days_left} j
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11.5, color: "rgba(26,20,16,0.4)", lineHeight: 1.5 }}>
                    Les remises finales sont confirmées au paiement.
                  </div>
                </div>
              )}
            </div>

            {/* ── Récapitulatif ── */}
            <div className="cart-sticky">
              <div style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", border: "1px solid rgba(26,20,16,0.07)" }}>
                <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 20, color: "#1a1410" }}>Récapitulatif</div>

                <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "rgba(26,20,16,0.7)" }}>
                    <span>Sous-total</span>
                    <span style={{ fontWeight: 700 }}>{subtotal.toFixed(2)} €</span>
                  </div>
                  {comboOk?.entries.map(e => (
                    <div key={e.code} style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "#16a34a" }}>
                      <span style={{ fontWeight: 700 }}>Code {e.code}</span>
                      <span style={{ fontWeight: 800 }}>{e.discount > 0 ? `− ${e.discount.toFixed(2)} €` : "Livraison offerte"}</span>
                    </div>
                  ))}
                  {parrainData && parrainageCalc.parrainApplicable && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "#16a34a" }}>
                      <span style={{ fontWeight: 700 }}>Code parrain {parrainData.code}</span>
                      <span style={{ fontWeight: 800 }}>− {parrainDiscount.toFixed(2)} €</span>
                    </div>
                  )}
                  {rewardDiscount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "#16a34a" }}>
                      <span style={{ fontWeight: 700 }}>Récompenses ({parrainageCalc.rewardsUsable})</span>
                      <span style={{ fontWeight: 800 }}>− {rewardDiscount.toFixed(2)} €</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "rgba(26,20,16,0.7)" }}>
                    <span>Livraison</span>
                    {!carrier || !deliveryType ? (
                      <span style={{ fontWeight: 700, color: "rgba(26,20,16,0.4)", fontStyle: "italic" }}>
                        À calculer
                      </span>
                    ) : shippingFree ? (
                      <span style={{ fontWeight: 700, color: "#16a34a" }}>
                        Offerte
                      </span>
                    ) : (
                      <span style={{ fontWeight: 700 }}>
                        {shipping.toFixed(2)} €
                      </span>
                    )}
                  </div>
                  <div style={{ height: 1, background: "rgba(26,20,16,0.08)", margin: "4px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 950, color: "#1a1410" }}>
                    <span>Total</span>
                    <span>{grandTotal.toFixed(2)} €</span>
                  </div>
                </div>

                {/* ══ ÉTAPE 2 : choix de livraison + confirmation (révélée au clic étape 1) ══ */}
                {step === 2 && (
                <div ref={deliveryRef}>
                {/* ── MODE DE LIVRAISON ── 2 transporteurs × 5 options ───── */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 12, color: "#1a1410" }}>Mode de livraison</div>

                  {/* Section Mondial Relay — 3 options, badge "Le moins cher" sur Point Relais */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>
                        📦 Mondial Relay
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,20,16,0.4)" }}>{DELIVERY_DELAY.mondial_relay}</div>
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {([
                        { type: "point_relais" as const, icon: "📍", label: "Point Relais",     sub: "Retrait chez un commerçant", price: getDeliveryPrice("mondial_relay", "point_relais"), badge: "Le moins cher" },
                        { type: "home"         as const, icon: "🏠", label: "Domicile",         sub: "Livraison à domicile",       price: getDeliveryPrice("mondial_relay", "home"),   badge: null },
                      ]).map(opt => {
                        const active = carrier === "mondial_relay" && deliveryType === opt.type;
                        return (
                          <button
                            key={`mr-${opt.type}`}
                            onClick={() => switchDelivery("mondial_relay", opt.type)}
                            style={{
                              display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center",
                              padding: "11px 14px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                              border: `2px solid ${active ? "#1a1410" : "rgba(26,20,16,0.1)"}`,
                              background: active ? "#1a1410" : "#fff", color: active ? "#f2ede6" : "#1a1410",
                              fontFamily: "inherit", position: "relative",
                            }}>
                            <span style={{ fontSize: 20 }}>{opt.icon}</span>
                            <span>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 14, fontWeight: 800 }}>{opt.label}</span>
                                {opt.badge && (
                                  <span style={{ padding: "1px 7px", borderRadius: 99, background: active ? "rgba(196,154,74,0.2)" : "#dcfce7", color: active ? "#c49a4a" : "#166534", fontSize: 10, fontWeight: 800, letterSpacing: 0.5 }}>
                                    {opt.badge}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{opt.sub}</div>
                            </span>
                            {/* Seuil livraison offerte atteint → prix barré + « Gratuit »
                                pour CHAQUE option (même condition que le total « Offerte »). */}
                            <span style={{ display: "grid", justifyItems: "end", gap: 1 }}>
                              {freeShippingEligible ? (
                                <>
                                  <span style={{ fontSize: 12, fontWeight: 700, textDecoration: "line-through", color: active ? "rgba(242,237,230,0.55)" : "rgba(26,20,16,0.4)" }}>{opt.price.toFixed(2)} €</span>
                                  <span style={{ fontWeight: 900, fontSize: 15, color: active ? "#c49a4a" : "#16a34a" }}>Gratuit</span>
                                </>
                              ) : (
                                <span style={{ fontWeight: 900, fontSize: 15, color: active ? "#c49a4a" : "#1a1410" }}>{opt.price.toFixed(2)} €</span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section Colissimo — 2 options, badge "Le plus rapide" sur les 2 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>
                        🚀 Colissimo / La Poste
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,20,16,0.4)" }}>{DELIVERY_DELAY.colissimo}</div>
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {([
                        { type: "point_relais" as const, icon: "📍", label: "Point Relais",     sub: "Bureau de Poste ou commerçant", price: getDeliveryPrice("colissimo", "point_relais"), badge: "Le plus rapide" },
                        { type: "home"         as const, icon: "🏠", label: "Domicile",         sub: "Livraison à domicile",          price: getDeliveryPrice("colissimo", "home"),         badge: "Le plus rapide" },
                      ]).map(opt => {
                        const active = carrier === "colissimo" && deliveryType === opt.type;
                        return (
                          <button
                            key={`col-${opt.type}`}
                            onClick={() => switchDelivery("colissimo", opt.type)}
                            style={{
                              display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center",
                              padding: "11px 14px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                              border: `2px solid ${active ? "#1a1410" : "rgba(26,20,16,0.1)"}`,
                              background: active ? "#1a1410" : "#fff", color: active ? "#f2ede6" : "#1a1410",
                              fontFamily: "inherit",
                            }}>
                            <span style={{ fontSize: 20 }}>{opt.icon}</span>
                            <span>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 14, fontWeight: 800 }}>{opt.label}</span>
                                {opt.badge && (
                                  <span style={{ padding: "1px 7px", borderRadius: 99, background: active ? "rgba(196,154,74,0.2)" : "#dbeafe", color: active ? "#c49a4a" : "#1e40af", fontSize: 10, fontWeight: 800, letterSpacing: 0.5 }}>
                                    {opt.badge}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{opt.sub}</div>
                            </span>
                            {/* Seuil livraison offerte atteint → prix barré + « Gratuit »
                                pour CHAQUE option (même condition que le total « Offerte »). */}
                            <span style={{ display: "grid", justifyItems: "end", gap: 1 }}>
                              {freeShippingEligible ? (
                                <>
                                  <span style={{ fontSize: 12, fontWeight: 700, textDecoration: "line-through", color: active ? "rgba(242,237,230,0.55)" : "rgba(26,20,16,0.4)" }}>{opt.price.toFixed(2)} €</span>
                                  <span style={{ fontWeight: 900, fontSize: 15, color: active ? "#c49a4a" : "#16a34a" }}>Gratuit</span>
                                </>
                              ) : (
                                <span style={{ fontWeight: 900, fontSize: 15, color: active ? "#c49a4a" : "#1a1410" }}>{opt.price.toFixed(2)} €</span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Récap relais sélectionné — affiché quand carrier+type sont
                      en PR/Locker. Le widget de recherche lui-même est isolé
                      dans une modale (cf. plus bas dans le JSX). */}
                  {(deliveryType === "point_relais" || deliveryType === "locker") && selectedRelay && (
                    <div style={{ background: "#dcfce7", borderRadius: 12, padding: 14, marginBottom: 10, border: "1px solid #86efac" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#166534", marginBottom: 4, letterSpacing: 0.5, textTransform: "uppercase" }}>
                            📍 {deliveryType === "locker" ? "Locker" : "Point Relais"} sélectionné
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 900, color: "#166534", marginBottom: 4, wordBreak: "break-word" }}>{selectedRelay.name}</div>
                          <div style={{ fontSize: 12, color: "#1a1410", wordBreak: "break-word" }}>{selectedRelay.street}, {selectedRelay.postal_code} {selectedRelay.city}</div>
                          {typeof selectedRelay.opening_hours === "string" && selectedRelay.opening_hours && (
                            <div style={{ fontSize: 11, color: "rgba(26,20,16,0.55)", marginTop: 4, fontStyle: "italic" }}>🕐 {selectedRelay.opening_hours}</div>
                          )}
                        </div>
                        <button
                          onClick={openRelayModal}
                          style={{ background: "transparent", border: "1px solid #166534", fontSize: 12, fontWeight: 800, color: "#166534", padding: "10px 14px", minHeight: 44, borderRadius: 8, cursor: "pointer", flexShrink: 0 }}>
                          Changer
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PR/Locker sélectionné dans le type mais aucun relais choisi
                      encore → bouton pour rouvrir la modale (cas où l'utilisateur
                      a fermé la modale sans choisir). */}
                  {(deliveryType === "point_relais" || deliveryType === "locker") && !selectedRelay && (
                    <button
                      onClick={openRelayModal}
                      style={{ width: "100%", padding: "14px 16px", borderRadius: 12, background: "#fef3c7", color: "#92400e", fontWeight: 800, fontSize: 13, border: "2px dashed #fde68a", cursor: "pointer", marginBottom: 10 }}>
                      📍 Choisir votre {deliveryType === "locker" ? "locker" : "point relais"} →
                    </button>
                  )}

                  {/* Adresse domicile */}
                  {deliveryType === "home" && (
                    <div style={{ background: "#ede8df", borderRadius: 12, padding: 14, display: "grid", gap: 8, marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4, color: "#1a1410" }}>🏠 Adresse de livraison</div>
                      <input type="text" autoComplete="name" placeholder="Prénom Nom"
                        value={homeAddress.name} onChange={e => setHomeAddress(a => ({ ...a, name: e.target.value }))}
                        style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(26,20,16,0.15)", fontSize: 14, outline: "none", background: "#fff" }} />
                      <input type="text" autoComplete="street-address" placeholder="Adresse complète"
                        value={homeAddress.line1} onChange={e => setHomeAddress(a => ({ ...a, line1: e.target.value }))}
                        style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(26,20,16,0.15)", fontSize: 14, outline: "none", background: "#fff" }} />
                      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 8 }}>
                        <input type="text" inputMode="numeric" autoComplete="postal-code" maxLength={5} placeholder="CP"
                          value={homeAddress.postal_code} onChange={e => setHomeAddress(a => ({ ...a, postal_code: e.target.value.replace(/\D/g, "") }))}
                          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(26,20,16,0.15)", fontSize: 14, fontFamily: "monospace", outline: "none", background: "#fff" }} />
                        <input type="text" autoComplete="address-level2" placeholder="Ville"
                          value={homeAddress.city} onChange={e => setHomeAddress(a => ({ ...a, city: e.target.value }))}
                          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(26,20,16,0.15)", fontSize: 14, outline: "none", background: "#fff" }} />
                      </div>
                    </div>
                  )}
                </div>{/* fin « Mode de livraison » */}

                {checkoutError && (
                  <div role="alert" style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                    ⚠ {checkoutError}
                  </div>
                )}
                {!deliveryReady && deliveryType && (
                  <div style={{ padding: "10px 12px", borderRadius: 10, background: "#fef3c7", border: "1px solid #fde68a", fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 10 }}>
                    Veuillez compléter votre choix de livraison
                  </div>
                )}
                <button onClick={handleCheckout} disabled={loading || !finalPayReady}
                  style={{ width: "100%", padding: "16px", borderRadius: 14, background: (loading || !finalPayReady) ? "#d1cdc8" : "#1a1410", color: "#f2ede6", fontWeight: 900, fontSize: 16, border: "none", cursor: (loading || !finalPayReady) ? "not-allowed" : "pointer", marginBottom: 10 }}>
                  {loading ? "Redirection..." : "Confirmer et payer →"}
                </button>
                <button onClick={() => { setCheckoutError(""); setStep(1); }}
                  style={{ width: "100%", padding: "11px", borderRadius: 12, background: "none", border: "1px solid rgba(26,20,16,0.12)", color: "rgba(26,20,16,0.5)", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 12 }}>
                  ← Modifier mes informations
                </button>
                </div>
                )}{/* fin étape 2 */}

                {/* ══ ÉTAPE 1 : compte + téléphone ══ */}
                {step === 1 && (
                <>
                  {/* Choix compte / invité — « Créer un compte » mis en avant (recommandé),
                      paiement invité toujours possible. Au-dessus du bouton de l'étape 1. */}
                  {!user && (
                    <div style={{ background: "#1a1410", borderRadius: 16, padding: "20px 22px", border: "1px solid rgba(196,154,74,0.3)", marginBottom: 10 }}>
                      {/* Option recommandée : créer un compte (amber + pulse doux) */}
                      <Link href="/inscription?redirect=/panier"
                        style={{ display: "block", padding: "14px 18px", borderRadius: 12, background: "#c49a4a", color: "#1a1410", fontWeight: 900, fontSize: 15, textDecoration: "none", textAlign: "center", animation: "milk-cart-glow 1.8s ease-in-out infinite" }}>
                        Créer un compte →
                      </Link>
                      <div style={{ fontSize: 12, color: "rgba(242,237,230,0.6)", marginTop: 8, textAlign: "center", lineHeight: 1.5 }}>
                        ✨ Recommandé — suivi de commande, historique et avantages membres.
                      </div>

                      {/* Séparateur */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 14px" }}>
                        <div style={{ flex: 1, height: 1, background: "rgba(242,237,230,0.12)" }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(242,237,230,0.4)" }}>ou</span>
                        <div style={{ flex: 1, height: 1, background: "rgba(242,237,230,0.12)" }} />
                      </div>

                      {/* Option neutre : payer sans compte */}
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#f2ede6", marginBottom: 4 }}>
                        Payer sans créer de compte
                      </div>
                      <div style={{ fontSize: 13, color: "rgba(242,237,230,0.55)", marginBottom: 12, lineHeight: 1.6 }}>
                        Entre ton email pour recevoir la confirmation et suivre ta livraison.
                      </div>
                      <input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={guestEmail}
                        onChange={e => { setGuestEmail(e.target.value); setGuestError(""); }}
                        placeholder="ton@email.fr"
                        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: guestError ? "1.5px solid #ef4444" : "1px solid rgba(242,237,230,0.15)", fontSize: 14, fontWeight: 600, background: "rgba(255,255,255,0.06)", color: "#f2ede6", outline: "none", boxSizing: "border-box", marginBottom: 8 }}
                      />
                      {guestError && (
                        <div style={{ fontSize: 13, color: "#f87171", fontWeight: 700, marginBottom: 8 }}>⚠ {guestError}</div>
                      )}
                      <Link href="/connexion?redirect=/panier"
                        style={{ display: "inline-block", marginTop: 2, color: "rgba(242,237,230,0.5)", fontWeight: 700, fontSize: 13, textDecoration: "underline" }}>
                        J'ai déjà un compte
                      </Link>
                    </div>
                  )}

                  {/* Téléphone — obligatoire (Sendcloud exige phone_number). En étape 1,
                      affiché sans condition transporteur (collecté avant la livraison). */}
                  <div style={{ background: "#ede8df", borderRadius: 12, padding: 14, display: "grid", gap: 6, marginBottom: 10 }}>
                    <label style={{ fontSize: 13, fontWeight: 800, color: "#1a1410" }}>
                      📞 Numéro de téléphone <span style={{ color: "#b91c1c" }}>*</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="Ex : 06 12 34 56 78"
                      value={customerPhone}
                      onChange={e => { setCustomerPhone(e.target.value); setPhoneError(""); }}
                      onBlur={() => {
                        if (customerPhone && !isValidPhone(customerPhone)) {
                          setPhoneError("Format invalide (10 chiffres, ex : 06 12 34 56 78 ou +33 6 12 34 56 78)");
                        }
                      }}
                      style={{ padding: "10px 12px", borderRadius: 8, border: phoneError ? "1.5px solid #b91c1c" : "1px solid rgba(26,20,16,0.15)", fontSize: 14, outline: "none", background: "#fff" }}
                    />
                    {phoneError && (
                      <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700 }}>⚠ {phoneError}</div>
                    )}
                    <div style={{ fontSize: 11, color: "rgba(26,20,16,0.55)", lineHeight: 1.5 }}>
                      Utilisé par le transporteur pour vous prévenir en cas de problème de livraison.
                    </div>
                  </div>

                  {checkoutError && (
                    <div role="alert" style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                      ⚠ {checkoutError}
                    </div>
                  )}
                  {!emailReady && cartNonEmpty && (
                    <div style={{ padding: "10px 12px", borderRadius: 10, background: "#fef3c7", border: "1px solid #fde68a", fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 10 }}>
                      Saisis ton email ci-dessus pour continuer.
                    </div>
                  )}
                  {emailReady && !phoneOk && cartNonEmpty && (
                    <div style={{ padding: "10px 12px", borderRadius: 10, background: "#fef3c7", border: "1px solid #fde68a", fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 10 }}>
                      Saisis un numéro de téléphone valide pour continuer.
                    </div>
                  )}
                  <button onClick={() => { setCheckoutError(""); setStep(2); }} disabled={!step1Ready}
                    style={{ width: "100%", padding: "16px", borderRadius: 14, background: !step1Ready ? "#d1cdc8" : "#1a1410", color: "#f2ede6", fontWeight: 900, fontSize: 16, border: "none", cursor: !step1Ready ? "not-allowed" : "pointer", marginBottom: 12 }}>
                    Passer au paiement →
                  </button>
                </>
                )}{/* fin étape 1 */}

                <button onClick={handleClearCart}
                  style={{ width: "100%", padding: "12px", borderRadius: 12, background: "none", border: "1px solid rgba(26,20,16,0.12)", color: "rgba(26,20,16,0.5)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  Vider le panier
                </button>

                <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                  {["Paiement sécurisé Stripe", "100% Bambou OEKO-TEX", "Retours sous 14 jours"].map(r => (
                    <div key={r} style={{ fontSize: 12, fontWeight: 600, color: "rgba(26,20,16,0.45)", textAlign: "center" }}>{r}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ MODALE — SÉLECTION POINT RELAIS / LOCKER ══════════════════════ */}
      {relayModalOpen && carrier && (deliveryType === "point_relais" || deliveryType === "locker") && (
        <div
          onClick={closeRelayModal}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 18, maxWidth: 560, width: "100%", maxHeight: "90vh", overflow: "auto", padding: 24, boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}
          >
            {/* Header modale */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 950, color: "#1a1410", letterSpacing: -0.5 }}>
                  Choisir votre {deliveryType === "locker" ? "locker" : "point relais"}
                </h2>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(26,20,16,0.5)", marginTop: 4 }}>
                  {carrier === "mondial_relay" ? "📦 Mondial Relay" : "🚀 Colissimo / La Poste"}
                </div>
              </div>
              <button
                onClick={closeRelayModal}
                aria-label="Fermer"
                style={{ background: "none", border: "none", fontSize: 26, lineHeight: 1, cursor: "pointer", color: "rgba(26,20,16,0.4)", padding: 0, width: 32, height: 32 }}>
                ×
              </button>
            </div>

            {/* Recherche par code postal */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="Code postal"
                value={postalSearch}
                onChange={e => setPostalSearch(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && searchServicePoints()}
                style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1.5px solid rgba(26,20,16,0.15)", fontSize: 15, fontFamily: "monospace", letterSpacing: 1, outline: "none", background: "#faf8f4" }}
              />
              <button
                onClick={searchServicePoints}
                disabled={searching}
                style={{ padding: "11px 22px", borderRadius: 10, background: "#1a1410", color: "#c49a4a", border: "none", fontWeight: 800, fontSize: 14, cursor: searching ? "wait" : "pointer", opacity: searching ? 0.6 : 1, whiteSpace: "nowrap" }}>
                {searching ? "..." : "🔍 Rechercher"}
              </button>
            </div>

            {searchError && (
              <div style={{ padding: "10px 12px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
                ⚠ {searchError}
              </div>
            )}

            {searching && (
              <div style={{ padding: "24px 14px", fontSize: 13, color: "rgba(26,20,16,0.5)", textAlign: "center" }}>
                ⏳ Recherche {deliveryType === "locker" ? "des lockers" : "des Points Relais"} {carrier === "mondial_relay" ? "Mondial Relay" : "Colissimo"} à proximité...
              </div>
            )}

            {/* Liste des résultats */}
            {!searching && searchResults.length > 0 && (
              <div style={{ display: "grid", gap: 8, maxHeight: 380, overflowY: "auto", marginBottom: 10 }}>
                {searchResults.map(sp => (
                  <button
                    key={sp.id ?? `${sp.postal_code}-${sp.name}`}
                    onClick={() => selectServicePoint(sp)}
                    style={{ textAlign: "left", background: "#faf8f4", border: "1.5px solid rgba(26,20,16,0.08)", borderRadius: 10, padding: "12px 14px", cursor: "pointer", fontFamily: "inherit", display: "grid", gap: 4, transition: "all 0.15s" }}
                    onMouseOver={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#1a1410"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "#faf8f4"; e.currentTarget.style.borderColor = "rgba(26,20,16,0.08)"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: "#1a1410", lineHeight: 1.3 }}>{sp.name ?? "(sans nom)"}</div>
                      {sp.distance != null && (
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#c49a4a", whiteSpace: "nowrap", flexShrink: 0 }}>
                          {Number(sp.distance).toFixed(1)} km
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(26,20,16,0.65)", lineHeight: 1.5 }}>
                      {sp.street ?? ""}{sp.street ? ", " : ""}{sp.postal_code ?? ""} {sp.city ?? ""}
                    </div>
                    {typeof sp.opening_hours === "string" && sp.opening_hours && (
                      <div style={{ fontSize: 11, color: "rgba(26,20,16,0.45)", marginTop: 2, fontStyle: "italic" }}>
                        🕐 {sp.opening_hours}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Aucun résultat */}
            {!searching && searchEmpty && searchResults.length === 0 && (
              <div style={{ padding: "14px 16px", borderRadius: 8, background: "#fef3c7", color: "#92400e", fontSize: 13, fontWeight: 700, textAlign: "center", marginBottom: 10 }}>
                Aucun {deliveryType === "locker" ? "locker" : "Point Relais"} {carrier === "mondial_relay" ? "Mondial Relay" : "Colissimo"} trouvé à moins de {MAX_RELAY_DISTANCE_KM} km.
              </div>
            )}

            {/* Aucun point relais exploitable → on oriente vers la livraison à domicile.
                La saisie manuelle a été retirée (R4) : un point saisi à la main ne correspond à
                aucun point Sendcloud → étiquette impossible → commande payée mais non expédiable. */}
            {fallbackManual && (
              <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "#faf8f4", border: "1px solid rgba(26,20,16,0.1)", fontSize: 12.5, color: "#1a1410", lineHeight: 1.5 }}>
                Aucun point relais exploitable ici. Essayez un autre code postal, ou choisissez la
                {" "}<strong>livraison à domicile</strong> pour être livré directement chez vous.
              </div>
            )}

            {/* Bouton Annuler */}
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={closeRelayModal}
                style={{ padding: "10px 22px", borderRadius: 10, background: "transparent", color: "rgba(26,20,16,0.6)", fontWeight: 700, fontSize: 13, border: "1px solid rgba(26,20,16,0.15)", cursor: "pointer" }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}