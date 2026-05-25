"use client";

import Link from "next/link";
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

export default function ProductCardPremium({ product }: { product: Product }) {
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
        {/* IMAGE : vraie photo produit si présente, sinon placeholder M!LK */}
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "3/4",
            background: "linear-gradient(145deg, #e8e2d9, #f6f1ea)",
            overflow: "hidden",
          }}
        >
          {img ? (
            <Image
              src={img}
              alt={`${product.name} en bambou OEKO-TEX — M!LK`}
              fill
              sizes="(max-width: 700px) 50vw, 25vw"
              style={{
                objectFit: "cover",
                transition: "transform 0.5s cubic-bezier(.22,.61,.36,1)",
                transform: hover ? "scale(1.04)" : "scale(1)",
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
                fontSize: 28,
              }}
            >
              M!LK
            </div>
          )}
          {promo && (
            <div style={{
              position: "absolute",
              top: 10,
              left: 10,
              padding: "4px 10px",
              borderRadius: 99,
              background: "#dc2626",
              color: "#fff",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: 1,
              zIndex: 2,
            }}>
              PROMO
            </div>
          )}
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
              background: hover ? "#c49a4a" : "#1a1410",
              color: hover ? "#1a1410" : "#c49a4a",
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
