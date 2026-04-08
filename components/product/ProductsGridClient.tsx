"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";

function normalize(v: any) {
  return String(v || "").trim().toLowerCase();
}

function inferCategory(product: any) {
  const fromFields =
    normalize(product.category_slug) ||
    normalize(product.category) ||
    normalize(product.type);
  if (fromFields) return fromFields;
  const hay = `${normalize(product.slug)} ${normalize(product.name)}`;
  if (hay.includes("pyjama")) return "pyjamas";
  if (hay.includes("body")) return "bodies";
  if (hay.includes("gigoteuse")) return "gigoteuses";
  if (hay.includes("access")) return "accessoires";
  return "autres";
}

function isPromoActive(product: any) {
  const now = new Date();
  if (!product?.promo_price || !product?.promo_start || !product?.promo_end) return false;
  return new Date(product.promo_start) <= now && new Date(product.promo_end) >= now;
}

const CATEGORIES = [
  { slug: "all", label: "Tout voir" },
  { slug: "bodies", label: "Bodies" },
  { slug: "pyjamas", label: "Pyjamas" },
  { slug: "gigoteuses", label: "Gigoteuses" },
  { slug: "accessoires", label: "Accessoires" },
];

function ProductCard({ product }: { product: any }) {
  const [hover, setHover] = useState(false);
  const promo = isPromoActive(product);
  const out = Number(product?.stock ?? 0) <= 0;
  const lowStock = !out && Number(product?.stock ?? 0) <= 5;
  const img = (product?.image_url && String(product.image_url).trim()) || "";
  const slug = product.slug || normalize(product.name);
  const displayPrice = promo ? product.promo_price : product.price_ttc;

  return (
    <Link
      href={`/produits/${slug}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          borderRadius: 22,
          overflow: "hidden",
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: hover
            ? "0 32px 64px rgba(0,0,0,0.16)"
            : "0 4px 20px rgba(0,0,0,0.06)",
          transform: hover ? "translateY(-6px)" : "translateY(0)",
          transition: "all 0.3s cubic-bezier(.22,.61,.36,1)",
          display: "grid",
        }}
      >
        {/* IMAGE */}
        <div style={{
          position: "relative", height: 280,
          background: "#f0ece4", overflow: "hidden",
        }}>
          {img ? (
            <Image
              src={img}
              alt={product?.name || "Produit M!LK"}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              style={{
                objectFit: "cover",
                transition: "transform 0.5s ease",
                transform: hover ? "scale(1.06)" : "scale(1)",
              }}
            />
          ) : (
            <div style={{
              position: "absolute", inset: 0,
              display: "grid", placeItems: "center",
              fontWeight: 950, fontSize: 36,
              color: "#b9b2a7", letterSpacing: -1.5,
            }}>
              M!LK
            </div>
          )}

          {/* Overlay hover */}
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.12)",
            opacity: hover ? 1 : 0,
            transition: "opacity 0.3s ease",
          }} />

          {/* Badges */}
          <div style={{ position: "absolute", top: 14, left: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {out && (
              <span style={{
                padding: "5px 12px", borderRadius: 99,
                background: "rgba(0,0,0,0.75)", color: "#fff",
                fontSize: 11, fontWeight: 900, letterSpacing: 0.5,
              }}>
                Épuisé
              </span>
            )}
            {promo && (
              <span style={{
                padding: "5px 12px", borderRadius: 99,
                background: "#f5c400", color: "#000",
                fontSize: 11, fontWeight: 900, letterSpacing: 0.5,
              }}>
                Promo
              </span>
            )}
            {lowStock && (
              <span style={{
                padding: "5px 12px", borderRadius: 99,
                background: "rgba(239,68,68,0.9)", color: "#fff",
                fontSize: 11, fontWeight: 900,
              }}>
                Plus que {product.stock} !
              </span>
            )}
          </div>

          {/* CTA hover */}
          <div style={{
            position: "absolute", bottom: 16, left: 16, right: 16,
            opacity: hover ? 1 : 0,
            transform: hover ? "translateY(0)" : "translateY(8px)",
            transition: "all 0.25s ease",
          }}>
            <div style={{
              padding: "13px", borderRadius: 14,
              background: out ? "rgba(0,0,0,0.5)" : "#111",
              color: "#fff", fontWeight: 900,
              fontSize: 14, textAlign: "center",
            }}>
              {out ? "Épuisé" : "Voir le produit →"}
            </div>
          </div>
        </div>

        {/* INFOS */}
        <div style={{ padding: "20px 22px 22px" }}>
          {/* Catégorie */}
          <div style={{
            fontSize: 11, fontWeight: 800, letterSpacing: 1.5,
            textTransform: "uppercase", opacity: 0.4, marginBottom: 8,
          }}>
            {product.category_slug ?? "M!LK"}
          </div>

          {/* Nom */}
          <div style={{
            fontWeight: 950, fontSize: 17,
            letterSpacing: -0.3, marginBottom: 12, lineHeight: 1.2,
          }}>
            {product?.name}
          </div>

          {/* Prix */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontWeight: 950, fontSize: 20, letterSpacing: -0.5 }}>
                {Number(displayPrice).toFixed(2)} €
              </span>
              {promo && (
                <span style={{ textDecoration: "line-through", opacity: 0.4, fontSize: 14, fontWeight: 700 }}>
                  {Number(product?.price_ttc).toFixed(2)} €
                </span>
              )}
            </div>

            {/* Stock indicator */}
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: out ? "#ef4444" : lowStock ? "#f59e0b" : "#22c55e",
              boxShadow: out ? "0 0 0 3px rgba(239,68,68,0.15)" : lowStock ? "0 0 0 3px rgba(245,158,11,0.15)" : "0 0 0 3px rgba(34,197,94,0.15)",
            }} />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ProductsGridClient({ products }: { products: any[] }) {
  const [cat, setCat] = useState<string>("all");
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sort, setSort] = useState<string>("default");

  const filtered = useMemo(() => {
    let list = (products || []).filter((p) => {
      const c = inferCategory(p);
      if (cat !== "all" && c !== cat) return false;
      if (onlyPromo && !isPromoActive(p)) return false;
      if (onlyInStock && !(Number(p?.stock ?? 0) > 0)) return false;
      return true;
    });

    if (sort === "price-asc") list = [...list].sort((a, b) => a.price_ttc - b.price_ttc);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price_ttc - a.price_ttc);
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));

    return list;
  }, [products, cat, onlyPromo, onlyInStock, sort]);

  return (
    <div style={{ display: "grid", gap: 28 }}>

      {/* ── FILTRES ───────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gap: 16 }}>

        {/* Pills catégories */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.slug}
              onClick={() => setCat(c.slug)}
              style={{
                padding: "10px 20px", borderRadius: 99,
                border: "none", cursor: "pointer",
                fontWeight: 800, fontSize: 14,
                background: cat === c.slug ? "#111" : "#fff",
                color: cat === c.slug ? "#fff" : "#111",
                boxShadow: cat === c.slug ? "none" : "0 1px 4px rgba(0,0,0,0.08)",
                transition: "all 0.15s ease",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Filtres secondaires */}
        <div style={{
          display: "flex", gap: 16, alignItems: "center",
          flexWrap: "wrap", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={onlyPromo}
                onChange={(e) => setOnlyPromo(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "#111" }}
              />
              En promotion
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "#111" }}
              />
              En stock uniquement
            </label>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, opacity: 0.5, fontWeight: 700 }}>
              {filtered.length} produit{filtered.length > 1 ? "s" : ""}
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={{
                padding: "8px 12px", borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "#fff", fontSize: 13,
                fontWeight: 700, outline: "none", cursor: "pointer",
              }}
            >
              <option value="default">Trier par défaut</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
              <option value="name">Nom A → Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── GRILLE ────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{
          padding: "80px 0", textAlign: "center",
          background: "#fff", borderRadius: 20,
          border: "1px solid rgba(0,0,0,0.07)",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Aucun produit trouvé</div>
          <div style={{ opacity: 0.5, fontSize: 14 }}>Essaie de modifier tes filtres.</div>
          <button
            onClick={() => { setCat("all"); setOnlyPromo(false); setOnlyInStock(false); }}
            style={{
              marginTop: 20, padding: "12px 24px", borderRadius: 12,
              background: "#111", color: "#fff", fontWeight: 800,
              fontSize: 14, border: "none", cursor: "pointer",
            }}
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 24,
        }}>
          {filtered.map((product: any) => (
            <ProductCard key={product.id || product.slug} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}