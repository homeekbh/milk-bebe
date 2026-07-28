"use client";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";

/**
 * Pastille produit — SOURCE UNIQUE de vérité (catalogue, homepage, fiche produit).
 *
 * Props :
 *   - label   : type de badge (nouveau | bestseller | exclusif | last | bientot | coup_de_coeur)
 *   - isPromo : si vrai, affiche la pastille PROMO (prioritaire sur label)
 *   - size    : "card" (11px, grilles) | "detail" (15px, fiche produit)
 *
 * Libellés = clés i18n badge_* du namespace "catalog" (aucun texte en dur).
 * Rupture de stock : c'est à l'APPELANT de ne pas rendre le badge (l'overlay sombre existant
 * s'en charge) — le composant ne connaît pas le stock. Rend `null` si aucun label ni promo.
 *
 * Animation « respiration » = classe .milk-badge (cf. BADGE_KEYFRAMES, injecté par la page hôte).
 * Couleurs validées au Lot B : standard = fond ambre / texte brun ; promo = fond noir / texte ambre.
 */
export default function ProductBadge({
  label,
  isPromo,
  size = "card",
}: {
  label?: string;
  isPromo?: boolean;
  size?: "card" | "detail";
}) {
  const t = useTranslations("catalog");

  // Tailles imposées (Lot D). marginBottom sur "card" = petit espace avant le titre ; en "detail"
  // l'espacement vient du gap du conteneur hôte (fragment header). alignSelf:flex-start empêche
  // l'étirement quand la pastille est un enfant direct d'un conteneur flex-column.
  const dims: CSSProperties =
    size === "detail"
      ? { fontSize: 15, padding: "6px 14px" }
      : { fontSize: 11, padding: "4px 10px", marginBottom: 6 };

  const base: CSSProperties = {
    display: "inline-block",
    alignSelf: "flex-start",
    borderRadius: 999,
    fontWeight: 800,
    letterSpacing: 0.5,
    whiteSpace: "nowrap",
    ...dims,
  };

  // PROMO prioritaire (cohérent avec l'ancien ProductPill du catalogue).
  if (isPromo) {
    return (
      <span translate="no" className="milk-badge" style={{ ...base, background: "#1A1410", color: "#F5B841" }}>
        {t("badge_promo")}
      </span>
    );
  }

  const cfg: Record<string, string> = {
    nouveau: t("badge_nouveau"),
    bestseller: t("badge_bestseller"),
    exclusif: t("badge_exclusif"),
    last: t("badge_last"),
    bientot: t("badge_bientot"),
    coup_de_coeur: t("badge_coup"),
  };
  const text = label ? cfg[label] : null;
  if (!text) return null;

  return (
    <span translate="no" className="milk-badge" style={{ ...base, background: "#F5B841", color: "#412402" }}>
      {text}
    </span>
  );
}
