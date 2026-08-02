"use client";

import { useEffect, useState } from "react";
import { takeCheckoutNotice, type CheckoutNotice } from "@/lib/checkout-storage";

// Messages d'éjection (lot 2b sujet 3), FR/EN. Le STYLE d'affichage reste
// <CheckoutMissingHints> (aucun second composant de message) : ce hook ne fait que
// lire le motif et renvoyer le texte localisé, prêt à passer en `items`.
const MESSAGES: Record<CheckoutNotice, { fr: string; en: string }> = {
  cart_empty: { fr: "Ton panier est vide. Ajoute un article pour commander.", en: "Your cart is empty. Add an item to place an order." },
  step:       { fr: "Commence par cette étape pour continuer.",                en: "Start with this step to continue." },
  expired:    { fr: "Ta session a expiré. Reprends ta commande ici.",          en: "Your session expired. Pick up your order here." },
};

/**
 * Lit le motif d'éjection UNE seule fois, et SEULEMENT quand la page est stable
 * (`ready` = ses gardes de nav sont passées). Ce garde-fou évite qu'une page à la fois
 * SOURCE et DESTINATION d'éjection (Livraison) consomme un motif destiné à la page
 * suivante avant de rediriger. Renvoie 0 ou 1 message, prêt pour
 * <CheckoutMissingHints items={...} />.
 */
export function useCheckoutNoticeItems(en: boolean, ready: boolean): string[] {
  const [notice, setNotice] = useState<CheckoutNotice | null>(null);
  useEffect(() => {
    if (!ready) return;
    setNotice(takeCheckoutNotice());
  }, [ready]);
  return notice ? [en ? MESSAGES[notice].en : MESSAGES[notice].fr] : [];
}
