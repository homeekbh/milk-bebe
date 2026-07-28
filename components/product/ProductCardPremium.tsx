"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useState } from "react";

type Product = {
  id: string | number;
  name: string;
  slug?: string;
  price_ttc: number;
  promo_price?: number;
  stock?: number;
  image_url?: string | null;
};

function slugify(input: any) {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

/**
 * Card compacte pour la section "suggestions / recommandations".
 * Style intentionnellement minimal :
 *   - Image hauteur max 160px (pas un grand visuel)
 *   - Pas de prix (l'objectif est la découverte, pas la conversion directe)
 *   - Nom 14px, max 2 lignes
 *   - Bouton "Voir le produit" compact 13px
 *   - Card padding 12px
 */
export default function ProductCardPremium({
  product,
  viewLabel = "Voir le produit",
  outLabel  = "Épuisé",
}: {
  product: Product;
  /** Libellés passés par le parent localisé (i18n). Défauts FR = non-régression. */
  viewLabel?: string;
  outLabel?:  string;
}) {
  const [hover, setHover] = useState(false);

  const slug =
    product.slug ||
    slugify(product.name) ||
    String(product.id);

  const out = Number(product.stock ?? 0) <= 0;
  const promo = product.promo_price && product.promo_price < product.price_ttc;
  const img = product.image_url || null;

  return (
    <Link
      href={`/produits/${slug}`}
      style={{ textDecoration: "none" }}
    >
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          borderRadius: 14,
          overflow: "hidden",
          background: "#f5f1ea",
          transition: "all 0.3s cubic-bezier(.22,.61,.36,1)",
          boxShadow: hover
            ? "0 16px 32px rgba(0,0,0,0.25)"
            : "0 6px 16px rgba(0,0,0,0.10)",
          transform: hover ? "translateY(-3px)" : "translateY(0px)",
        }}
      >
        {/* IMAGE : hauteur max 160px, fallback placeholder M!LK si null */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: 160,
            background: "linear-gradient(145deg, #e8e2d9, #f6f1ea)",
            overflow: "hidden",
          }}
        >
          {img ? (
            <Image
              src={img}
              alt={`${product.name} en bambou OEKO-TEX — M!LK`}
              fill
              sizes="(max-width: 700px) 50vw, 280px"
              style={{
                objectFit: "cover",
                transition: "transform 0.4s cubic-bezier(.22,.61,.36,1)",
                transform: hover ? "scale(1.05)" : "scale(1)",
              }}
              loading="lazy"
            />
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
                letterSpacing: -1,
                color: "#b9b2a7",
                fontSize: 22,
              }}
            >
              M!LK
            </div>
          )}
          {promo && (
            <div style={{
              position: "absolute",
              top: 8,
              left: 8,
              padding: "3px 8px",
              borderRadius: 99,
              background: "#dc2626",
              color: "#fff",
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: 1,
              zIndex: 2,
            }}>
              PROMO
            </div>
          )}
        </div>

        {/* CONTENU : padding 12px, pas de prix, nom + bouton uniquement */}
        <div style={{ padding: 12 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 14,
              lineHeight: 1.3,
              marginBottom: 10,
              color: "#1a1410",
              // Clamp 2 lignes pour garder une hauteur stable même
              // avec des noms produit longs
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
              minHeight: 36,
            }}
            translate="no"
          >
            {product.name}
          </div>

          <button
            disabled={out}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 10,
              border: "none",
              fontWeight: 800,
              fontSize: 13,
              cursor: out ? "not-allowed" : "pointer",
              background: hover ? "#c49a4a" : "#1a1410",
              color: hover ? "#1a1410" : "#c49a4a",
              transition: "all 0.2s ease",
            }}
          >
            {out ? outLabel : viewLabel}
          </button>
        </div>
      </div>
    </Link>
  );
}
