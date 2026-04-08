/* placeholder */

"use client";

import Link from "next/link";
import { useState } from "react";

type Product = {
  id: string | number;
  name: string;
  slug?: string;
  price_ttc: number;
  promo_price?: number;
  stock?: number;
};

function slugify(input: any) {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export default function ProductCardPremium({ product }: { product: Product }) {
  const [hover, setHover] = useState(false);

  const slug =
    product.slug ||
    slugify(product.name) ||
    String(product.id);

  const out = Number(product.stock ?? 0) <= 0;
  const promo = product.promo_price && product.promo_price < product.price_ttc;

  return (
    <Link
      href={`/produits/${slug}`}
      style={{ textDecoration: "none" }}
    >
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          borderRadius: 22,
          overflow: "hidden",
          background: "#f5f1ea",
          transition: "all 0.35s cubic-bezier(.22,.61,.36,1)",
          boxShadow: hover
            ? "0 35px 70px rgba(0,0,0,0.35)"
            : "0 12px 30px rgba(0,0,0,0.12)",
          transform: hover ? "translateY(-6px)" : "translateY(0px)",
        }}
      >
        {/* IMAGE PLACEHOLDER PREMIUM */}
        <div
          style={{
            height: 240,
            background:
              "linear-gradient(145deg, #e8e2d9, #f6f1ea)",
            display: "grid",
            placeItems: "center",
            fontWeight: 900,
            letterSpacing: -1,
            color: "#b9b2a7",
            fontSize: 28,
          }}
        >
          M!LK
        </div>

        <div style={{ padding: 22 }}>
          <div
            style={{
              fontWeight: 900,
              fontSize: 18,
              marginBottom: 8,
              color: "#111",
            }}
          >
            {product.name}
          </div>

          <div style={{ fontWeight: 900, marginBottom: 12 }}>
            {promo ? (
              <>
                <span
                  style={{
                    textDecoration: "line-through",
                    opacity: 0.5,
                    marginRight: 8,
                  }}
                >
                  {product.price_ttc} €
                </span>
                <span>{product.promo_price} €</span>
              </>
            ) : (
              <span>{product.price_ttc} €</span>
            )}
          </div>

          <button
            disabled={out}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 14,
              border: "none",
              fontWeight: 900,
              cursor: out ? "not-allowed" : "pointer",
              background: hover ? "#e5b700" : "#000",
              color: hover ? "#000" : "#fff",
              transition: "all 0.25s ease",
            }}
          >
            {out ? "Épuisé" : "Voir le produit"}
          </button>
        </div>
      </div>
    </Link>
  );
}