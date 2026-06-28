"use client";

import { useEffect, useState } from "react";
import ProductCardPremium from "./ProductCardPremium";

type Product = {
  id:           string;
  name:         string;
  slug:         string;
  price_ttc:    number;
  promo_price?: number | null;
  promo_start?: string | null;
  promo_end?:   string | null;
  stock?:       number;
  image_url?:   string | null;
  category_slug?: string;
};

const C = {
  bg:    "#1a1410",
  amber: "#c49a4a",
  warm:  "#f2ede6",
};

/**
 * ProductRecommendations — affiche 4 produits de la même catégorie sous la
 * fiche produit, en excluant le produit courant.
 *
 * Props :
 *   - productId    : id du produit affiché (sera exclu de la liste)
 *   - categorySlug : slug de la catégorie depuis laquelle recommander
 *
 * Fallback : si moins de 4 produits dans la catégorie, complète avec d'autres
 * produits aléatoires (toujours en excluant productId).
 */
export default function ProductRecommendations({
  productId,
  categorySlug,
  title    = "Dans la même collection",
  eyebrow  = "Tu aimeras aussi",
  viewLabel = "Voir le produit",
  outLabel  = "Épuisé",
  titleColor,
  theme    = "dark",
}: {
  productId:    string;
  categorySlug: string;
  title?:       string;
  eyebrow?:     string;
  /** Libellés des cards (i18n) passés par le parent localisé. Défauts FR. */
  viewLabel?:   string;
  outLabel?:    string;
  /** Override la couleur du <h2>. Par défaut : crème site (C.warm). */
  titleColor?:  string;
  /** "dark" (default) : fond sombre #1a1410, texte crème — usage standalone
   *  (page /success, carrousel hero). "light" : fond crème transparent,
   *  texte sombre — usage intégré dans une fiche produit pour ne pas créer
   *  d'îlot sombre isolé. */
  theme?:       "dark" | "light";
}) {
  const [items,   setItems]   = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 1) Produits de la même catégorie
        const res = await fetch(`/api/produits?category=${encodeURIComponent(categorySlug)}`);
        let pool: Product[] = (await res.json().catch(() => [])) ?? [];
        if (!Array.isArray(pool)) pool = [];
        const filtered = pool.filter(p => p.id !== productId && (p.stock ?? 0) > 0);

        // 2) Complément si moins de 4 → tous produits
        if (filtered.length < 4) {
          const resAll = await fetch("/api/produits");
          const all: Product[] = (await resAll.json().catch(() => [])) ?? [];
          if (Array.isArray(all)) {
            const seen = new Set(filtered.map(p => p.id).concat(productId));
            for (const p of all) {
              if (filtered.length >= 4) break;
              if (!seen.has(p.id) && (p.stock ?? 0) > 0) {
                filtered.push(p);
                seen.add(p.id);
              }
            }
          }
        }

        if (!cancelled) setItems(filtered.slice(0, 4));
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [productId, categorySlug]);

  if (!loading && items.length === 0) return null;

  const isLight = theme === "light";
  // En mode light : pas de fond sombre, padding réduit (le composant est
  // déjà dans une cellule pl-left qui a son propre padding 4vw).
  const sectionBg     = isLight ? "transparent" : C.bg;
  const sectionColor  = isLight ? "#1a1410"     : C.warm;
  const sectionPad    = isLight ? "8px 0 24px"  : "56px 5vw 72px";
  const eyebrowColor  = C.amber;
  const defaultH2Col  = isLight ? "#1a1410"     : C.warm;

  return (
    <section
      aria-label="Recommandations produits"
      style={{
        background: sectionBg,
        color:      sectionColor,
        padding:    sectionPad,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          {eyebrow && (
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: eyebrowColor, marginBottom: 10 }}>
              {eyebrow}
            </div>
          )}
          <h2 style={{
            margin:        0,
            fontSize:      "clamp(22px,3vw,32px)",
            fontWeight:    950,
            letterSpacing: -0.8,
            lineHeight:    1.15,
            color:         titleColor ?? defaultH2Col,
          }}>
            {title}
          </h2>
        </div>

        <div style={{
          display:             "grid",
          // Strict 2 colonnes, gap 12px (gap-3)
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap:                 12,
        }}>
          {loading
            ? Array.from({ length: 4 }, (_, i) => (
                <div key={i} style={{
                  height:       240,
                  borderRadius: 14,
                  background:   "rgba(242,237,230,0.06)",
                  animation:    "milk-rec-pulse 1.4s ease-in-out infinite",
                }} />
              ))
            : items.map(p => (
                <ProductCardPremium
                  key={p.id}
                  viewLabel={viewLabel}
                  outLabel={outLabel}
                  product={{
                    id:          p.id,
                    name:        p.name,
                    slug:        p.slug,
                    price_ttc:   p.price_ttc,
                    promo_price: p.promo_price ?? undefined,
                    stock:       p.stock,
                    image_url:   p.image_url ?? null,
                  }}
                />
              ))
          }
        </div>
        <style>{`@keyframes milk-rec-pulse {0%,100%{opacity:0.4}50%{opacity:0.8}}`}</style>
      </div>
    </section>
  );
}
