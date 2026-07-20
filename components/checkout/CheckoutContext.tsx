"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import type { ServicePoint } from "@/components/checkout/RelaySelector";
import type { ValidatedPromo } from "@/lib/promo-combine";

/**
 * État PARTAGÉ du nouveau tunnel checkout (panier → compte → livraison → paiement).
 * Construit À CÔTÉ du tunnel prod (/panier). Persisté en sessionStorage → un refresh
 * en plein tunnel ne perd rien. Le panier reste la source de vérité des articles
 * (produits milk_cart_v2 via useCart, packs milk_pack_cart) ; ce contexte ne tient
 * que les données du tunnel + un marqueur de progression pour les gardes de nav.
 *
 * Lot 4a = squelette : l'état existe, la nav le respecte ; le contenu réel des
 * pages (formulaires, sélecteur de pays, résumé) arrive aux lots suivants.
 */

// FR : transporteur + type (+ relais quand applicable). International : marqueur
// de zone + prix fixe (un seul mode, pas de transporteur au choix).
export type CheckoutDeliveryChoice = {
  kind:     "fr" | "international";
  carrier?: "mondial_relay" | "colissimo" | null;
  type?:    "point_relais" | "locker" | "home" | null;
  relay?:   Record<string, unknown> | null;
  zone?:    string;
  price?:   number;
};

// Récompense parrainage utilisable (chargée depuis /api/parrainage/me quand le
// client est connecté) — sert au calcul du total à l'étape paiement.
export type CheckoutReward = { id: string; montant: number; days_left: number };

// Adresse saisie à la CRÉATION de compte (étape Compte). Sert au PRÉ-REMPLISSAGE
// de l'adresse internationale à l'étape Livraison, puis en défaut Stripe. Le `pays`
// est celui du profil (où habite le client), pas forcément la destination livrée.
export type CheckoutAccountAddress = {
  first_name: string; last_name: string;
  line1: string; line2: string; postal_code: string; city: string;
  country: string; phone: string;
};

export type CheckoutState = {
  email:           string;
  guestEmail:      string;
  phone:           string;
  country:         string;                          // défaut "FR"
  deliveryChoice:  CheckoutDeliveryChoice | null;   // FR : transporteur/type/relais
  selectedRelay:   ServicePoint | null;             // FR point relais / locker choisi
  // Codes promo cumulés (objets VALIDÉS, entrée de combinePromos) + code parrain
  // validé — mêmes formes que /panier. Saisis via <PromoParrainInput>. Le serveur
  // (create-session) reste seul juge : il re-valide tout à partir des codes.
  promoCodes:      ValidatedPromo[];
  parrainData:     { code: string; montant_recompense: number; seuil_filleul: number } | null;
  selectedRewards:  string[];                        // IDs des récompenses cochées
  availableRewards: CheckoutReward[];                // récompenses dispo (compte connecté)
  accountAddress:  CheckoutAccountAddress | null;    // adresse du compte (pré-remplissage intl)
  shippingAddress: Record<string, unknown> | null;
  completedSteps:  number;                           // progression (gardes de nav)
};

const STORAGE_KEY = "milk_checkout_state";

const DEFAULT_STATE: CheckoutState = {
  email:           "",
  guestEmail:      "",
  phone:           "",
  country:         "FR",
  deliveryChoice:  null,
  selectedRelay:   null,
  promoCodes:      [],
  parrainData:     null,
  selectedRewards:  [],
  availableRewards: [],
  accountAddress:  null,
  shippingAddress: null,
  completedSteps:  0,
};

type CheckoutContextType = {
  state:        CheckoutState;
  update:       (patch: Partial<CheckoutState>) => void;
  reset:        () => void;
  hydrated:     boolean;
  productCount: number;
  packCount:    number;
  isCartEmpty:  boolean;
};

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

function readPackCount(): number {
  try {
    const raw = JSON.parse(localStorage.getItem("milk_pack_cart") ?? "[]");
    return Array.isArray(raw) ? raw.length : 0;
  } catch {
    return 0;
  }
}

// Email déjà connu : compte Supabase connecté, sinon email invité (/panier).
function readSeedEmail(): { email: string; guestEmail: string } {
  try {
    const guestEmail = localStorage.getItem("milk_guest_email") ?? "";
    const sbKey = Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
    let email = "";
    if (sbKey) {
      const parsed = JSON.parse(localStorage.getItem(sbKey) ?? "{}");
      email = parsed?.user?.email ?? "";
    }
    return { email: email || guestEmail, guestEmail };
  } catch {
    return { email: "", guestEmail: "" };
  }
}

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const { items } = useCart();                       // produits (milk_cart_v2, live)
  const [state, setState]       = useState<CheckoutState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [packCount, setPackCount] = useState(0);

  // Hydratation au montage : état sauvegardé (sessionStorage) prioritaire, complété
  // par l'email déjà connu et le compteur de packs.
  useEffect(() => {
    let restored: Partial<CheckoutState> = {};
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) restored = JSON.parse(raw);
    } catch {}
    const seed = readSeedEmail();
    setState({
      ...DEFAULT_STATE,
      ...restored,                                   // l'état sauvegardé prime
      email:      restored.email      || seed.email,
      guestEmail: restored.guestEmail || seed.guestEmail,
    });
    setPackCount(readPackCount());
    setHydrated(true);
  }, []);

  // Persistance (après hydratation, pour ne pas écraser le state sauvegardé au 1er render).
  useEffect(() => {
    if (!hydrated) return;
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state, hydrated]);

  // Rafraîchir le compteur packs (autre onglet / retour panier).
  useEffect(() => {
    const refresh = () => setPackCount(readPackCount());
    window.addEventListener("storage", refresh);
    window.addEventListener("milk-pack-cart-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("milk-pack-cart-changed", refresh);
    };
  }, []);

  const value = useMemo<CheckoutContextType>(() => ({
    state,
    update: (patch) => setState(prev => ({ ...prev, ...patch })),
    reset:  () => setState(DEFAULT_STATE),
    hydrated,
    productCount: items.length,
    packCount,
    isCartEmpty:  items.length === 0 && packCount === 0,
  }), [state, hydrated, items.length, packCount]);

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckout(): CheckoutContextType {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used inside CheckoutProvider");
  return ctx;
}
