"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useCheckout } from "@/components/checkout/CheckoutContext";
import CheckoutStub from "@/components/checkout/CheckoutStub";

// Étape 1 — Compte (STUB, Lot 4a). Garde : panier vide → /panier.
export default function CheckoutComptePage() {
  const router = useRouter();
  const { hydrated, isCartEmpty, state, update } = useCheckout();

  useEffect(() => {
    if (hydrated && isCartEmpty) router.replace("/panier");
  }, [hydrated, isCartEmpty, router]);

  if (!hydrated || isCartEmpty) return null;

  return (
    <CheckoutStub
      stepNo={1}
      current="compte"
      name={{ fr: "Compte", en: "Account" }}
      onBack={() => router.push("/panier")}
      onNext={() => {
        update({ completedSteps: Math.max(state.completedSteps, 1) });
        router.push("/checkout/livraison");
      }}
    />
  );
}
