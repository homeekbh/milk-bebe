"use client";

import { useLocale } from "next-intl";

/**
 * Indicateur de progression du tunnel : Panier › Compte › Livraison › Paiement.
 * Purement visuel (pas de liens → ne contourne pas les gardes de nav). Réutilisé
 * sur les 3 pages du tunnel.
 */
export type CheckoutStepKey = "panier" | "compte" | "livraison" | "paiement";

const STEPS: { key: CheckoutStepKey; fr: string; en: string }[] = [
  { key: "panier",    fr: "Panier",    en: "Cart" },
  { key: "compte",    fr: "Compte",    en: "Account" },
  { key: "livraison", fr: "Livraison", en: "Delivery" },
  { key: "paiement",  fr: "Paiement",  en: "Payment" },
];

export default function CheckoutProgress({ current }: { current: CheckoutStepKey }) {
  const en = useLocale() === "en";
  const currentIdx = STEPS.findIndex(s => s.key === current);

  return (
    <nav
      aria-label={en ? "Checkout progress" : "Progression du tunnel"}
      style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 32 }}
    >
      {STEPS.map((s, i) => {
        const done   = i < currentIdx;
        const active = i === currentIdx;
        return (
          <span key={s.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              aria-current={active ? "step" : undefined}
              style={{
                fontSize: 13,
                fontWeight: active ? 900 : 700,
                color: active ? "#1a1410" : done ? "#c49a4a" : "rgba(26,20,16,0.4)",
              }}
            >
              {en ? s.en : s.fr}
            </span>
            {i < STEPS.length - 1 && <span aria-hidden style={{ color: "rgba(26,20,16,0.25)" }}>›</span>}
          </span>
        );
      })}
    </nav>
  );
}
