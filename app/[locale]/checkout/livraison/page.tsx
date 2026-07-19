"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useCheckout } from "@/components/checkout/CheckoutContext";
import CheckoutStub from "@/components/checkout/CheckoutStub";

// Étape 2 — Livraison (STUB, Lot 4a). Gardes : panier vide → /panier ;
// étape Compte non passée → /checkout/compte.
export default function CheckoutLivraisonPage() {
  const router = useRouter();
  const { hydrated, isCartEmpty, state, update } = useCheckout();

  useEffect(() => {
    if (!hydrated) return;
    if (isCartEmpty) { router.replace("/panier"); return; }
    if (state.completedSteps < 1) router.replace("/checkout/compte");
  }, [hydrated, isCartEmpty, state.completedSteps, router]);

  if (!hydrated || isCartEmpty || state.completedSteps < 1) return null;

  return (
    <CheckoutStub
      stepNo={2}
      current="livraison"
      name={{ fr: "Livraison", en: "Delivery" }}
      onBack={() => router.push("/checkout/compte")}
      onNext={() => {
        update({ completedSteps: Math.max(state.completedSteps, 2) });
        router.push("/checkout/paiement");
      }}
    />
  );
}
