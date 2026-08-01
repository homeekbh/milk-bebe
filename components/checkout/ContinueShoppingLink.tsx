"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Bouton secondaire discret « Continuer mes achats » → /produits.
 * Purement ADDITIF : ne remplace aucun bouton existant. Implémentation UNIQUE
 * réutilisée par les trois étapes du tunnel et par le panier.
 */
export default function ContinueShoppingLink() {
  const en = useLocale() === "en";
  return (
    <Link
      href="/produits"
      style={{
        display: "block", width: "100%", boxSizing: "border-box", textAlign: "center",
        padding: "13px 24px", borderRadius: 12,
        border: "1px solid rgba(26,20,16,0.15)", background: "transparent",
        color: "rgba(26,20,16,0.65)", fontWeight: 700, fontSize: 14, textDecoration: "none",
      }}
    >
      {en ? "← Continue shopping" : "← Continuer mes achats"}
    </Link>
  );
}
