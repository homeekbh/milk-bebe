"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

type Product = {
  id: string;
  name: string;
  slug: string;
  price_ttc: number;
  promo_price?: number;
  promo_start?: string;
  promo_end?: string;
  stock: number;
  category_slug?: string;
  image_url?: string;
  description?: string;
  featured?: boolean;
};

function isPromoActive(p: Product) {
  if (!p.promo_price || !p.promo_start || !p.promo_end) return false;
  const now = new Date();
  return new Date(p.promo_start) <= now && new Date(p.promo_end) >= now;
}

const CATEGORIES = [
  { slug: "",            label: "Tout"         },
  { slug: "bodies",      label: "Bodies"       },
  { slug: "pyjamas",     label: "Pyjamas"      },
  { slug: "gigoteuses",  label: "Gigoteuses"   },
  { slug: "accessoires", label: "Accessoires"  },
];

const SORTS = [
  { value: "recent",     label: "Plus récents"    },
  { value: "price-asc",  label: "Prix croissant"  },
  { value: "price-desc", label: "Prix décroissant" },
  { value: "promo",      label: "Promotions"      },
];

function ProductCard({ p }: { p: Product }) {
  const promo = isPromoActive(p);
  const price = promo ? p.promo_price! : p.price_ttc;
  const outOfStock = (p.stock ?? 0) <= 0;

  return (
    <Link href={`/produits/${p.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <div className="product-card" style={{ borderRadius: 20, overflow: "hidden", background: "#221c16", border: "1px solid rgba(242,237,230,0.08)", transition: "all 0.25s cubic-bezier(.22,.61,.36,1)", cursor: "pointer" }}>

        {/* Image */}
        <div style={{ position: "relative", aspectRatio: "3/4", background: "#2d2419", overflow: "hidden" }}>
          {p.image_url ? (
            <Image
              src={p.image_url} alt={p.name} fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              style={{ objectFit: "cover", transition: "transform 0.5s ease" }}
              className="product-card-img"
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontWeight: 950, fontSize: 32, color: "rgba(242,237,230,0.08)" }}>
              M!LK
            </div>
          )}

          {/* Badges */}
          <div style={{ position: "absolute", top: 12, left: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {promo && (
              <span style={{ padding: "4px 10px", borderRadius: 99, background: "#c49a4a", color: "#fff", fontSize: 10, fontWeight: 900, letterSpacing: 0.5 }}>
                PROMO
              </span>
            )}
            {outOfStock && (
              <span style={{ padding: "4px 10px", borderRadius: 99, background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 10, fontWeight: 800 }}>
                Épuisé
              </span>
            )}
            {p.featured && !promo && (
              <span style={{ padding: "4px 10px", borderRadius: 99, background: "rgba(242,237,230,0.12)", color: "#f2ede6", fontSize: 10, fontWeight: 800, backdropFilter: "blur(4px)" }}>
                ⭐ Coup de cœur
              </span>
            )}
          </div>

          {/* Catégorie */}
          {p.category_slug && (
            <div style={{ position: "absolute", top: 12, right: 12 }}>
              <span style={{ padding: "4px 10px", borderRadius: 99, background: "rgba(0,0,0,0.5)", color: "rgba(242,237,230,0.7)", fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", backdropFilter: "blur(4px)" }}>
                {p.category_slug}
              </span>
            </div>
          )}

          {/* Overlay épuisé */}
          {outOfStock && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "grid", placeItems: "center" }}>
              <span style={{ padding: "10px 20px", borderRadius: 12, background: "rgba(0,0,0,0.7)", color: "#f2ede6", fontSize: 13, fontWeight: 800 }}>
                Rupture de stock
              </span>
            </div>
          )}
        </div>

        {/* Infos */}
        <div style={{ padding: "16px 18px 20px" }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: "#f2ede6", marginBottom: 6, letterSpacing: -0.3, lineHeight: 1.3 }}>
            {p.name}
          </div>

          {p.description && (
            <div style={{ fontSize: 12, color: "rgba(242,237,230,0.4)", marginBottom: 10, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {p.description}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontWeight: 950, fontSize: 20, color: promo ? "#c49a4a" : "#f2ede6" }}>
                {Number(price).toFixed(2)} €
              </span>
              {promo && (
                <span style={{ fontSize: 13, textDecoration: "line-through", color: "rgba(242,237,230,0.3)" }}>
                  {Number(p.price_ttc).toFixed(2)} €
                </span>
              )}
            </div>

            {/* Indicateur stock */}
            {!outOfStock && (
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.stock <= 5 ? "#f59e0b" : "#22c55e", boxShadow: `0 0 6px ${p.stock <= 5 ? "rgba(245,158,11,0.5)" : "rgba(34,197,94,0.5)"}` }} />
                <span style={{ fontSize: 11, color: "rgba(242,237,230,0.35)", fontWeight: 600 }}>
                  {p.stock <= 5 ? `Plus que ${p.stock}` : "En stock"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ProduitsGrid({
  products,
  title,
  subtitle,
  defaultCategory,
}: {
  products: Product[];
  title: string;
  subtitle?: string;
  defaultCategory?: string;
}) {
  const [activeCategory, setActiveCategory] = useState(defaultCategory ?? "");
  const [sort,           setSort]           = useState("recent");
  const [search,         setSearch]         = useState("");

  const filtered = useMemo(() => {
    let list = [...products];

    // Filtre catégorie
    if (activeCategory) list = list.filter(p => p.category_slug === activeCategory);

    // Filtre recherche
    if (search.trim()) {
      const q = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      list = list.filter(p =>
        [p.name, p.description, p.category_slug].filter(Boolean).join(" ")
          .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .includes(q)
      );
    }

    // Tri
    if (sort === "price-asc")  list.sort((a, b) => (a.promo_price ?? a.price_ttc) - (b.promo_price ?? b.price_ttc));
    if (sort === "price-desc") list.sort((a, b) => (b.promo_price ?? b.price_ttc) - (a.promo_price ?? a.price_ttc));
    if (sort === "promo")      list.sort((a, b) => (isPromoActive(b) ? 1 : 0) - (isPromoActive(a) ? 1 : 0));

    return list;
  }, [products, activeCategory, sort, search]);

  const inStock    = filtered.filter(p => (p.stock ?? 0) > 0);
  const outOfStock = filtered.filter(p => (p.stock ?? 0) <= 0);
  const sorted     = [...inStock, ...outOfStock];

  return (
    <div style={{ background: "#1a1410", minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
      <style>{`
        .product-card:hover {
          border-color: rgba(196,154,74,0.4) !important;
          transform: translateY(-6px);
          box-shadow: 0 32px 60px rgba(0,0,0,0.5);
        }
        .product-card:hover .product-card-img {
          transform: scale(1.06);
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>

        {/* ── En-tête ── */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 12 }}>
            Collection M!LK
          </div>
          <h1 style={{ margin: "0 0 12px", fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 950, letterSpacing: -2, color: "#f2ede6", lineHeight: 1 }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ margin: 0, fontSize: 16, color: "rgba(242,237,230,0.45)", lineHeight: 1.6 }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* ── Filtres ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 36 }}>

          {/* Catégories */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                style={{
                  padding: "9px 18px", borderRadius: 99, border: "none", cursor: "pointer",
                  background: activeCategory === cat.slug ? "#f2ede6" : "rgba(242,237,230,0.08)",
                  color:      activeCategory === cat.slug ? "#1a1410" : "rgba(242,237,230,0.6)",
                  fontWeight: 800, fontSize: 13, transition: "all 0.15s",
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Tri + Recherche */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="search" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(242,237,230,0.1)", background: "rgba(242,237,230,0.06)", color: "#f2ede6", fontSize: 13, outline: "none", width: 160 }}
            />
            <select
              value={sort} onChange={e => setSort(e.target.value)}
              style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(242,237,230,0.1)", background: "#221c16", color: "rgba(242,237,230,0.7)", fontSize: 13, outline: "none", cursor: "pointer" }}
            >
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* ── Compteur ── */}
        <div style={{ fontSize: 13, color: "rgba(242,237,230,0.35)", fontWeight: 600, marginBottom: 24 }}>
          <span style={{ color: "#c49a4a", fontWeight: 900 }}>{sorted.length}</span> produit{sorted.length > 1 ? "s" : ""}
          {activeCategory && ` dans "${CATEGORIES.find(c => c.slug === activeCategory)?.label}"`}
        </div>

        {/* ── Grille ── */}
        {sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 40px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#f2ede6", marginBottom: 10 }}>Aucun produit trouvé</div>
            <div style={{ fontSize: 14, color: "rgba(242,237,230,0.4)", marginBottom: 28 }}>
              Essaie une autre catégorie ou efface la recherche.
            </div>
            <button
              onClick={() => { setActiveCategory(""); setSearch(""); }}
              style={{ padding: "13px 28px", borderRadius: 12, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 14, border: "none", cursor: "pointer" }}
            >
              Voir tout
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {sorted.map(p => <ProductCard key={p.id} p={p} />)}
          </div>
        )}

        {/* ── Reassurance ── */}
        <div style={{ marginTop: 80, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
          {[
            { icon: "🌿", label: "100% Bambou", desc: "Certifié OEKO-TEX" },
            { icon: "🚚", label: "Livraison offerte", desc: "Dès 60€ d'achat" },
            { icon: "↩️", label: "Retour gratuit", desc: "Sous 30 jours" },
            { icon: "🔒", label: "Paiement sécurisé", desc: "Via Stripe" },
          ].map(r => (
            <div key={r.label} style={{ padding: "20px 24px", borderRadius: 16, background: "#221c16", border: "1px solid rgba(242,237,230,0.06)", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{r.icon}</div>
              <div style={{ fontWeight: 900, fontSize: 14, color: "#f2ede6", marginBottom: 4 }}>{r.label}</div>
              <div style={{ fontSize: 12, color: "rgba(242,237,230,0.4)" }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}