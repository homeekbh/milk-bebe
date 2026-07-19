"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useCheckout } from "@/components/checkout/CheckoutContext";
import CheckoutStub from "@/components/checkout/CheckoutStub";

// Étape 3 — Paiement (STUB, Lot 4a). Gardes : panier vide → /panier ;
// Compte non passé → /checkout/compte ; Livraison non passée → /checkout/livraison.
// AUCUNE session Stripe créée ici (bouton payer désactivé) — c'est un lot suivant.
export default function CheckoutPaiementPage() {
  const router = useRouter();
  const { hydrated, isCartEmpty, state } = useCheckout();

  useEffect(() => {
    if (!hydrated) return;
    if (isCartEmpty)             { router.replace("/panier"); return; }
    if (state.completedSteps < 1) { router.replace("/checkout/compte"); return; }
    if (state.completedSteps < 2)  router.replace("/checkout/livraison");
  }, [hydrated, isCartEmpty, state.completedSteps, router]);

  if (!hydrated || isCartEmpty || state.completedSteps < 2) return null;

  return (
    <CheckoutStub
      stepNo={3}
      current="paiement"
      name={{ fr: "Paiement", en: "Payment" }}
      onBack={() => router.push("/checkout/livraison")}
      onNext={() => { /* Lot suivant : appel create-session. Rien ici. */ }}
      nextLabel={{ fr: "Payer (lot suivant)", en: "Pay (next lot)" }}
      nextDisabled
    />
  );
}
