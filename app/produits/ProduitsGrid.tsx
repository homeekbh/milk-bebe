"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link  from "next/link";
import { C, Divider, Reveal, MILK_STYLES } from "@/components/shared/MilkDesign";

const PER_PAGE = 16;

type Product = {
  id: string; name: string; slug: string;
  price_ttc: number; promo_price?: number;
  promo_start?: string; promo_end?: string;
  stock: number; category_slug?: string;
  image_url?: string; description?: string;
  featured?: boolean; published?: boolean;
  label?: string; position?: number;
};

function isPromoActive(p: Product) {
  if (!p.promo_price || !p.promo_start || !p.promo_end) return false;
  const now = new Date();
  return new Date(p.promo_start) <= now && new Date(p.promo_end) >= now;
}

function DiagonalBadge({ label, outOfStock }: { label?: string; outOfStock: boolean }) {
  if (outOfStock) return (
    <div style={{ position: "absolute", top: 0, right: 0, width: 100, height: 100, overflow: "hidden", zIndex: 20, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 20, right: -30, background: "#6b7280", color: "#fff", fontSize: 10, fontWeight: 900, letterSpacing: 1, padding: "7px 44px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>Épuisé</div>
    </div>
  );
  const cfg: Record<string,string> = { nouveau:"Nouveau", bestseller:"Best seller", exclusif:"Exclusif", last:"Dernières pièces", bientot:"Bientôt dispo", promo:"Promo", coup_de_coeur:"Coup de cœur" };
  const text = label ? cfg[label] : null;
  if (!text) return null;
  return (
    <div style={{ position: "absolute", top: 0, right: 0, width: 110, height: 110, overflow: "hidden", zIndex: 20, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 22, right: -32, background: C.amber, color: C.dark, fontSize: 10, fontWeight: 900, padding: "8px 46px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{text}</div>
    </div>
  );
}

function ProductCard({ p }: { p: Product }) {
  const promo      = isPromoActive(p);
  const price      = promo ? p.promo_price! : p.price_ttc;
  const outOfStock = (p.stock ?? 0) <= 0;
  const lowStock   = !outOfStock && (p.stock ?? 0) <= 5;
  const badgeLabel = outOfStock ? undefined : (p.label || (promo ? "promo" : undefined));

  return (
    <Link href={`/produits/${p.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <div className="pcard-grid" style={{ position: "relative", borderRadius: 18, overflow: "hidden", background: C.taupe, border: `1.5px solid rgba(26,20,16,0.1)`, transition: "all 0.28s cubic-bezier(0.34,1.56,0.64,1)", cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", transform: "translateY(-2px)" }}>
        <DiagonalBadge label={badgeLabel} outOfStock={outOfStock} />
        <div style={{ position: "relative", aspectRatio: "1/1", background: C.light, overflow: "hidden" }}>
          {p.image_url ? (
            <Image src={p.image_url} alt={p.name} fill sizes="(max-width:640px) 50vw, 25vw"
              style={{ objectFit: "cover", transition: "transform 0.4s ease" }} className="pcard-grid-img" />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontWeight: 950, fontSize: 24, color: "rgba(26,20,16,0.15)" }}>M!LK</div>
          )}
          {lowStock && (
            <div style={{ position: "absolute", bottom: 10, left: 10, zIndex: 5 }}>
              <span style={{ padding: "4px 10px", borderRadius: 99, background: "rgba(0,0,0,0.65)", color: "#f59e0b", fontSize: 10, fontWeight: 800 }}>Plus que {p.stock}</span>
            </div>
          )}
          {outOfStock && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "grid", placeItems: "center", zIndex: 5 }}>
              <span style={{ padding: "10px 20px", borderRadius: 12, background: "rgba(0,0,0,0.7)", color: C.warm, fontSize: 13, fontWeight: 800 }}>Rupture de stock</span>
            </div>
          )}
        </div>
        <div style={{ padding: "12px 14px 16px" }}>
          <div style={{ fontWeight: 900, fontSize: "clamp(13px,1.3vw,15px)", color: C.dark, marginBottom: 4, lineHeight: 1.3 }}>{p.name}</div>
          {p.description && (
            <div style={{ fontSize: 11, color: "rgba(26,20,16,0.5)", marginBottom: 6, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontWeight: 950, fontSize: "clamp(15px,1.6vw,18px)", color: promo ? C.amber : C.dark }}>{Number(price).toFixed(2)} €</span>
              {promo && <span style={{ fontSize: 12, textDecoration: "line-through", color: "rgba(26,20,16,0.3)" }}>{Number(p.price_ttc).toFixed(2)} €</span>}
            </div>
            {!outOfStock && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.stock <= 5 ? "#f59e0b" : "#22c55e" }} />
                <span style={{ fontSize: 10, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>{p.stock <= 5 ? `${p.stock} restants` : "En stock"}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

const CATEGORIES = [
  { slug: "",            label: "Tout"        },
  { slug: "bodies",      label: "Bodies"      },
  { slug: "pyjamas",     label: "Pyjamas"     },
  { slug: "gigoteuses",  label: "Gigoteuses"  },
  { slug: "accessoires", label: "Accessoires" },
];
const SORTS = [
  { value: "position",   label: "Mis en avant"    },
  { value: "recent",     label: "Plus récents"     },
  { value: "price-asc",  label: "Prix croissant"   },
  { value: "price-desc", label: "Prix décroissant" },
  { value: "promo",      label: "Promotions"       },
];

const ESSENTIELS = [
  { titre: "Pensé pour la vraie vie",         desc: "Un body doit accompagner les mouvements, pas les contraindre. Pas de boutons à aligner à 3h du matin." },
  { titre: "Respirant, naturellement",        desc: "Moins de chaleur. Moins d'humidité. Moins d'irritation. Moins de réveils nocturnes." },
  { titre: "Un seul vêtement, toute l'année", desc: "Le bambou thermorégule. Frais en été, chaud en hiver. Pas besoin d'en faire des tonnes." },
  { titre: "Essentiels durables",             desc: "Moins acheter. Mieux choisir. Chaque pièce compte." },
];

export default function ProduitsGrid({ products, title, subtitle, defaultCategory }: {
  products: Product[]; title: string; subtitle?: string; defaultCategory?: string;
}) {
  const [activeCategory, setActiveCategory] = useState(defaultCategory ?? "");
  const [sortValue,      setSortValue]      = useState("position");
  const [search,         setSearch]         = useState("");
  const [page,           setPage]           = useState(1);

  const filtered = useMemo(() => {
    let list = products.filter(p => p.published !== false);
    if (activeCategory) list = list.filter(p => p.category_slug === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      list = list.filter(p => [p.name, p.description, p.category_slug].filter(Boolean).join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q));
    }
    if (sortValue === "price-asc")  list = [...list].sort((a,b) => (a.promo_price ?? a.price_ttc) - (b.promo_price ?? b.price_ttc));
    if (sortValue === "price-desc") list = [...list].sort((a,b) => (b.promo_price ?? b.price_ttc) - (a.promo_price ?? a.price_ttc));
    if (sortValue === "promo")      list = [...list].sort((a,b) => (isPromoActive(b) ? 1 : 0) - (isPromoActive(a) ? 1 : 0));
    if (sortValue === "position")   list = [...list].sort((a,b) => (a.position ?? 99) - (b.position ?? 99));
    return [...list.filter(p => (p.stock??0)>0), ...list.filter(p => (p.stock??0)<=0)];
  }, [products, activeCategory, sortValue, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function changeCat(slug: string)    { setActiveCategory(slug); setPage(1); }
  function changeSort(v: string)      { setSortValue(v);          setPage(1); }
  function changeSearch(v: string)    { setSearch(v);             setPage(1); }

  return (
    <div style={{ background: C.light, minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
      <style>{`
        ${MILK_STYLES}
        .pcard-grid:hover { transform:translateY(-5px)!important; box-shadow:0 20px 40px rgba(0,0,0,0.18)!important; border-color:${C.amber}!important; }
        .pcard-grid:hover .pcard-grid-img { transform:scale(1.05)!important; }
        .pgrid    { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
        .ess-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        @media(max-width:1200px){ .pgrid{grid-template-columns:repeat(3,1fr)!important} .ess-grid{grid-template-columns:repeat(2,1fr)!important} }
        @media(max-width:768px) { .pgrid{grid-template-columns:repeat(2,1fr)!important;gap:10px!important} .ess-grid{grid-template-columns:repeat(2,1fr)!important} }
      `}</style>

      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "0 4vw" }}>

        <Reveal>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 10 }}>Collection M!LK</div>
            <h1 style={{ margin: "0 0 10px", fontSize: "clamp(28px,5vw,52px)", fontWeight: 950, letterSpacing: -2, color: C.dark, lineHeight: 1 }}>{title}</h1>
            {subtitle && <p style={{ margin: 0, fontSize: "clamp(14px,1.5vw,16px)", color: "rgba(26,20,16,0.55)", lineHeight: 1.6 }}>{subtitle}</p>}
          </div>
        </Reveal>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => (
              <button key={cat.slug} onClick={() => changeCat(cat.slug)}
                style={{ padding: "9px 18px", borderRadius: 99, border: "none", cursor: "pointer", background: activeCategory === cat.slug ? C.dark : "rgba(26,20,16,0.1)", color: activeCategory === cat.slug ? C.warm : "rgba(26,20,16,0.65)", fontWeight: 800, fontSize: "clamp(12px,1.2vw,14px)", transition: "all 0.15s", whiteSpace: "nowrap" }}>
                {cat.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="search" value={search} onChange={e => changeSearch(e.target.value)} placeholder="Rechercher..."
              style={{ padding: "9px 14px", borderRadius: 10, border: `1px solid rgba(26,20,16,0.15)`, background: "rgba(26,20,16,0.06)", color: C.dark, fontSize: 13, outline: "none", width: 160 }} />
            <select value={sortValue} onChange={e => changeSort(e.target.value)}
              style={{ padding: "9px 14px", borderRadius: 10, border: `1px solid rgba(26,20,16,0.15)`, background: C.light, color: "rgba(26,20,16,0.7)", fontSize: 13, outline: "none", cursor: "pointer" }}>
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ fontSize: 13, color: "rgba(26,20,16,0.4)", fontWeight: 600, marginBottom: 20 }}>
          <span style={{ color: C.amber, fontWeight: 900 }}>{filtered.length}</span>{" "}produit{filtered.length > 1 ? "s" : ""}
        </div>

        {paginated.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 40px" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.dark, marginBottom: 12 }}>Aucun produit trouvé</div>
            <button onClick={() => { changeCat(""); changeSearch(""); }}
              style={{ padding: "13px 28px", borderRadius: 12, background: C.dark, color: C.warm, fontWeight: 900, fontSize: 14, border: "none", cursor: "pointer" }}>
              Voir tout
            </button>
          </div>
        ) : (
          <div className="pgrid">
            {paginated.map(p => <ProductCard key={p.id} p={p} />)}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 40 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "10px 22px", borderRadius: 12, border: `1.5px solid ${C.taupe}`, background: page === 1 ? "rgba(26,20,16,0.04)" : C.dark, color: page === 1 ? "rgba(26,20,16,0.3)" : C.warm, fontWeight: 800, fontSize: 14, cursor: page === 1 ? "not-allowed" : "pointer" }}>
              ← Précédent
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(26,20,16,0.5)" }}>Page {page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: "10px 22px", borderRadius: 12, border: `1.5px solid ${C.taupe}`, background: page === totalPages ? "rgba(26,20,16,0.04)" : C.dark, color: page === totalPages ? "rgba(26,20,16,0.3)" : C.warm, fontWeight: 800, fontSize: 14, cursor: page === totalPages ? "not-allowed" : "pointer" }}>
              Suivant →
            </button>
          </div>
        )}

        {/* Section essentiels */}
        <div style={{ marginTop: 72 }}>
          <Divider from={C.light} to={C.taupe} />
          <div style={{ background: C.taupe, margin: "0 -4vw", padding: "56px 4vw" }}>
            <Reveal>
              <h2 style={{ margin: "0 0 32px", fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 950, letterSpacing: -1.5, color: C.dark, lineHeight: 1.1 }}>
                Des essentiels bébé. Sans le superflu.
              </h2>
            </Reveal>
            <div className="ess-grid">
              {ESSENTIELS.map((e, i) => (
                <Reveal key={e.titre} delay={i * 0.08}>
                  <div style={{ padding: "24px 20px", borderRadius: 18, background: C.light, border: "1px solid rgba(26,20,16,0.1)", boxShadow: "0 6px 20px rgba(0,0,0,0.08)", transform: "translateY(-2px)" }}>
                    <h3 style={{ margin: "0 0 10px", fontSize: "clamp(14px,1.4vw,16px)", fontWeight: 900, color: C.dark, lineHeight: 1.3 }}>{e.titre}</h3>
                    <p style={{ margin: 0, fontSize: "clamp(12px,1.1vw,14px)", color: "rgba(26,20,16,0.6)", lineHeight: 1.6 }}>{e.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Divider from={C.taupe} to={C.light} />
        </div>

        <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
          {[
            { label: "100% Bambou",      desc: "Certifié OEKO-TEX"  },
            { label: "Livraison offerte", desc: "Dès 60€ d'achat"    },
            { label: "Retour gratuit",    desc: "Sous 15 jours"      },
            { label: "Paiement sécurisé", desc: "Via Stripe"         },
          ].map(r => (
            <div key={r.label} style={{ padding: "18px 20px", borderRadius: 16, background: C.taupe, border: `1px solid rgba(26,20,16,0.1)`, textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}>
              <div style={{ fontWeight: 900, fontSize: 14, color: C.dark, marginBottom: 3 }}>{r.label}</div>
              <div style={{ fontSize: 12, color: "rgba(26,20,16,0.5)" }}>{r.desc}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}