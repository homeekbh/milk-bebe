"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { C, Divider, Reveal, MILK_STYLES } from "@/components/shared/MilkDesign";
import { useWishlist } from "@/context/WishlistContext";
import ReviewsBlock from "@/components/product/ReviewsBlock";
import PackCard, { type Pack } from "@/components/packs/PackCard";

const PROMO_STYLES = `
  @keyframes milk-promo-shake {
    0%,100% { transform: translateY(-2px) rotate(0deg); }
    15%     { transform: translateY(-2px) rotate(-0.5deg) scale(1.01); }
    35%     { transform: translateY(-2px) rotate(0.5deg) scale(1.015); }
    55%     { transform: translateY(-2px) rotate(-0.35deg) scale(1.01); }
    75%     { transform: translateY(-2px) rotate(0.25deg); }
  }
  .pcard-promo { animation: milk-promo-shake 2.2s ease-in-out infinite; }
  .pcard-promo:hover { animation: none !important; transform: translateY(-6px) scale(1.02) !important; }
`;

const PER_PAGE = 16;

type Product = {
  id: string; name: string; slug: string;
  price_ttc: number; promo_price?: number;
  promo_start?: string; promo_end?: string;
  stock: number; category_slug?: string;
  image_url?: string; description?: string; description_en?: string | null;
  featured?: boolean; published?: boolean;
  label?: string; position?: number;
};

function isPromoActive(p: Product) {
  if (!p.promo_price) return false;
  if (!p.promo_start && !p.promo_end) return true;
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const startStr = p.promo_start ? String(p.promo_start).slice(0, 10) : null;
  const endStr   = p.promo_end   ? String(p.promo_end).slice(0, 10)   : null;
  if (startStr && todayStr < startStr) return false;
  if (endStr   && todayStr > endStr)   return false;
  return true;
}
function DiagonalBadge({ label, outOfStock, isPromo }: { label?: string; outOfStock: boolean; isPromo?: boolean }) {
  const t = useTranslations("catalog");
  if (outOfStock) return (
    <div style={{ position: "absolute", top: 0, right: 0, width: 100, height: 100, overflow: "hidden", zIndex: 20, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 20, right: -30, background: "#6b7280", color: "#fff", fontSize: 10, fontWeight: 900, letterSpacing: 1, padding: "7px 44px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{t("badge_sold_out")}</div>
    </div>
  );
  if (isPromo) return (
    <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, overflow: "hidden", zIndex: 20, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 24, right: -34, background: "#dc2626", color: "#fff", fontSize: 11, fontWeight: 900, letterSpacing: 1.5, padding: "9px 50px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(220,38,38,0.5)", textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>{t("badge_promo")}</div>
    </div>
  );
  const cfg: Record<string,string> = { nouveau:t("badge_nouveau"), bestseller:t("badge_bestseller"), exclusif:t("badge_exclusif"), last:t("badge_last"), bientot:t("badge_bientot"), coup_de_coeur:t("badge_coup") };
  const text = label ? cfg[label] : null;
  if (!text) return null;
  return (
    <div style={{ position: "absolute", top: 0, right: 0, width: 110, height: 110, overflow: "hidden", zIndex: 20, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 22, right: -32, background: C.amber, color: C.dark, fontSize: 10, fontWeight: 900, padding: "8px 46px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{text}</div>
    </div>
  );
}

function ProductCard({ p }: { p: Product }) {
  const t          = useTranslations("catalog");
  const locale     = useLocale();
  // Card description : EN si dispo (non vide) en locale 'en', sinon FR (jamais vide).
  const cardDesc   = (locale === "en" && p.description_en && p.description_en.trim())
    ? p.description_en
    : p.description;
  const promo      = isPromoActive(p);
  const price      = promo ? p.promo_price! : p.price_ttc;
  const outOfStock = (p.stock ?? 0) <= 0;
  const lowStock   = !outOfStock && (p.stock ?? 0) <= 5;
  const badgeLabel = outOfStock ? undefined : (p.label || (promo ? "promo" : undefined));
  const { toggle, isInList } = useWishlist();
  const inWish = isInList(p.id);

  return (
    <Link href={`/produits/${p.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <div className={`pcard-grid${promo ? " pcard-promo" : ""}`}
        style={{ position: "relative", borderRadius: 18, overflow: "hidden", background: C.taupe,
          border: promo ? "2px solid rgba(220,38,38,0.35)" : `1.5px solid rgba(26,20,16,0.1)`,
          transition: "all 0.28s cubic-bezier(0.34,1.56,0.64,1)", cursor: "pointer",
          boxShadow: promo ? "0 4px 20px rgba(220,38,38,0.15)" : "0 4px 16px rgba(0,0,0,0.1)",
          transform: "translateY(-2px)" }}>
        <DiagonalBadge label={promo ? undefined : badgeLabel} outOfStock={outOfStock} isPromo={promo} />
        <div style={{ position: "relative", aspectRatio: "3/4", background: C.light, overflow: "hidden" }}>
          {p.image_url ? (
            <Image src={p.image_url} alt={p.name} fill sizes="(max-width:640px) 50vw, 25vw"
              style={{ objectFit: "cover", transition: "transform 0.4s ease" }} className="pcard-grid-img" />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontWeight: 950, fontSize: 24, color: "rgba(26,20,16,0.15)" }}>M!LK</div>
          )}
          {lowStock && (
            <div style={{ position: "absolute", bottom: 10, left: 10, zIndex: 5 }}>
              <span style={{ padding: "4px 10px", borderRadius: 99, background: "rgba(0,0,0,0.65)", color: "#f59e0b", fontSize: 10, fontWeight: 800 }}>{t("only_left", { n: p.stock })}</span>
            </div>
          )}
          {outOfStock && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "grid", placeItems: "center", zIndex: 5 }}>
              <span style={{ padding: "10px 20px", borderRadius: 12, background: "rgba(0,0,0,0.7)", color: C.warm, fontSize: 13, fontWeight: 800 }}>{t("sold_out")}</span>
            </div>
          )}
        </div>
        <div style={{ padding: "12px 14px 16px" }}>
          <div style={{ fontWeight: 900, fontSize: "clamp(13px,1.3vw,15px)", color: C.dark, marginBottom: 4, lineHeight: 1.3 }}>{p.name}</div>
          {cardDesc && (
            <div style={{ fontSize: 11, color: "rgba(26,20,16,0.5)", marginBottom: 6, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{cardDesc}</div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontWeight: 950, fontSize: "clamp(15px,1.6vw,18px)", color: promo ? C.amber : C.dark }}>{Number(price).toFixed(2)} €</span>
              {promo && <span style={{ fontSize: 12, textDecoration: "line-through", color: "rgba(26,20,16,0.3)" }}>{Number(p.price_ttc).toFixed(2)} €</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {!outOfStock && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.stock <= 5 ? "#f59e0b" : "#22c55e" }} />
                  <span style={{ fontSize: 10, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>{p.stock <= 5 ? t("stock_left", { n: p.stock }) : t("in_stock")}</span>
                </div>
              )}
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); toggle(p.id); }}
                aria-label={inWish ? t("wishlist_remove") : t("wishlist_add")}
                style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: inWish ? "rgba(220,38,38,0.08)" : "rgba(26,20,16,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                {inWish ? "❤️" : "🤍"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Ordre d'affichage préférentiel pour les catégories connues
const CAT_ORDER: Record<string, number> = {
  bodies: 1, pyjamas: 2, gigoteuses: 3, accessoires: 4, langes: 5,
};
function buildCategoriesFromProducts(products: Product[]): { slug: string; label: string }[] {
  const seen = new Set<string>();
  const cats: { slug: string; label: string }[] = [{ slug: "", label: "Tout" }];
  products
    .filter(p => p.published !== false && p.category_slug)
    .map(p => p.category_slug!)
    .sort((a, b) => (CAT_ORDER[a] ?? 99) - (CAT_ORDER[b] ?? 99))
    .forEach(slug => {
      if (!seen.has(slug)) {
        seen.add(slug);
        const label = slug.charAt(0).toUpperCase() + slug.slice(1);
        cats.push({ slug, label });
      }
    });
  return cats;
}
const SORTS = [
  { value: "position",   key: "sort_featured"   },
  { value: "recent",     key: "sort_recent"     },
  { value: "price-asc",  key: "sort_price_asc"  },
  { value: "price-desc", key: "sort_price_desc" },
  { value: "promo",      key: "sort_promo"      },
];

export default function ProduitsGrid({ products, title, subtitle, defaultCategory }: {
  products: Product[]; title: string; subtitle?: string; defaultCategory?: string;
}) {
  const t = useTranslations("catalog");
  const locale = useLocale();
  const essentiels = t.raw("ess") as { titre: string; desc: string }[];
  // Libellé de filtre catégorie : "" → Tout ; slug connu → traduit ; sinon capitalisé.
  const catLabel = (slug: string) => {
    if (!slug) return t("filter_all");
    const known = ["bodies", "pyjamas", "gigoteuses", "accessoires", "langes"];
    return known.includes(slug) ? t(`cat_${slug}`) : slug.charAt(0).toUpperCase() + slug.slice(1);
  };
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState(defaultCategory ?? "");
  const [sortValue,      setSortValue]      = useState("position");
  const [search,         setSearch]         = useState("");
  const [page,           setPage]           = useState(1);
  const [freeShipThreshold, setFreeShipThreshold] = useState<number>(60);

  // Onglet "Nos packs"
  const [showPacks,   setShowPacks]   = useState(false);
  const [packs,       setPacks]       = useState<Pack[]>([]);
  const [packsLoaded, setPacksLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings/public").then(r=>r.json()).then((s:any)=>{
      const n = Number(s?.free_shipping_threshold);
      if (Number.isFinite(n) && n > 0) setFreeShipThreshold(n);
    }).catch(()=>{});
  }, []);

  useEffect(() => {
    if (showPacks && !packsLoaded) {
      fetch("/api/packs").then(r => r.json())
        .then((d: any) => { setPacks(Array.isArray(d.packs) ? d.packs : []); setPacksLoaded(true); })
        .catch(() => setPacksLoaded(true));
    }
  }, [showPacks, packsLoaded]);

  const filtered = useMemo(() => {
    let list = products.filter(p => p.published !== false);
    if (activeCategory) list = list.filter(p => p.category_slug === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      list = list.filter(p => [p.name, p.description, p.description_en, p.category_slug].filter(Boolean).join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q));
    }
    if (sortValue === "price-asc")  list = [...list].sort((a,b) => (a.promo_price ?? a.price_ttc) - (b.promo_price ?? b.price_ttc));
    if (sortValue === "price-desc") list = [...list].sort((a,b) => (b.promo_price ?? b.price_ttc) - (a.promo_price ?? a.price_ttc));
    if (sortValue === "promo")      list = [...list].sort((a,b) => (isPromoActive(b) ? 1 : 0) - (isPromoActive(a) ? 1 : 0));
    if (sortValue === "position")   list = [...list].sort((a,b) => (a.position ?? 99) - (b.position ?? 99));
    return [...list.filter(p => (p.stock??0)>0), ...list.filter(p => (p.stock??0)<=0)];
  }, [products, activeCategory, sortValue, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function changeCat(slug: string) {
    // Si on est sur une page /categorie/[slug], naviguer vers la nouvelle catégorie
    if (defaultCategory && slug && slug !== defaultCategory) {
      router.push(slug === "" ? "/produits" : `/categorie/${slug}`);
      return;
    }
    setShowPacks(false);
    setActiveCategory(slug);
    setPage(1);
  }
  function changeSort(v: string)      { setSortValue(v);          setPage(1); }
  function changeSearch(v: string)    { setSearch(v);             setPage(1); }

  return (
    // Fond global taupe clair — pleine largeur
    <div style={{ background: C.light, minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        ${MILK_STYLES}
        ${PROMO_STYLES}
        .pcard-grid:hover { transform:translateY(-5px)!important; box-shadow:0 20px 40px rgba(0,0,0,0.18)!important; border-color:${C.amber}!important; }
        .pcard-grid:hover .pcard-grid-img { transform:scale(1.05)!important; }
        .pgrid    { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
        .ess-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        @media(max-width:1200px){ .pgrid{grid-template-columns:repeat(3,1fr)!important} .ess-grid{grid-template-columns:repeat(2,1fr)!important} }
        @media(max-width:900px) { .pgrid{grid-template-columns:repeat(2,1fr)!important;gap:10px!important} .ess-grid{grid-template-columns:repeat(2,1fr)!important} }
      `}</style>

      {/* Zone contenu avec padding */}
      <div style={{ paddingTop: 100, paddingBottom: 0, padding: "100px 4vw 0" }}>

        <Reveal>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 10 }}>{t("eyebrow")}</div>
            <h1 style={{ margin: "0 0 10px", fontSize: "clamp(28px,5vw,52px)", fontWeight: 950, letterSpacing: -2, color: C.dark, lineHeight: 1 }}>{title}</h1>
            {subtitle && <p style={{ margin: 0, fontSize: "clamp(14px,1.5vw,16px)", color: "rgba(26,20,16,0.55)", lineHeight: 1.6 }}>{subtitle}</p>}
          </div>
        </Reveal>

        {/* Filtres */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {buildCategoriesFromProducts(products).map(cat => {
              const active = !showPacks && activeCategory === cat.slug;
              return (
                <button key={cat.slug} onClick={() => changeCat(cat.slug)}
                  style={{ padding: "9px 18px", borderRadius: 99, border: "none", cursor: "pointer", background: active ? C.dark : "rgba(26,20,16,0.1)", color: active ? C.warm : "rgba(26,20,16,0.65)", fontWeight: 800, fontSize: "clamp(12px,1.2vw,14px)", transition: "all 0.15s", whiteSpace: "nowrap" }}>
                  {catLabel(cat.slug)}
                </button>
              );
            })}
            <button onClick={() => setShowPacks(true)}
              style={{ padding: "9px 18px", borderRadius: 99, border: "none", cursor: "pointer", background: showPacks ? C.amber : "rgba(196,154,74,0.18)", color: showPacks ? C.dark : "#9a7327", fontWeight: 800, fontSize: "clamp(12px,1.2vw,14px)", transition: "all 0.15s", whiteSpace: "nowrap" }}>
              🎁 {t("filter_packs")}
            </button>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="search" value={search} onChange={e => changeSearch(e.target.value)} placeholder={t("search_placeholder")}
              style={{ padding: "9px 14px", borderRadius: 10, border: `1px solid rgba(26,20,16,0.15)`, background: "rgba(26,20,16,0.06)", color: C.dark, fontSize: 13, outline: "none", width: 160 }} />
            <select value={sortValue} onChange={e => changeSort(e.target.value)}
              style={{ padding: "9px 14px", borderRadius: 10, border: `1px solid rgba(26,20,16,0.15)`, background: C.light, color: "rgba(26,20,16,0.7)", fontSize: 13, outline: "none", cursor: "pointer" }}>
              {SORTS.map(s => <option key={s.value} value={s.value}>{t(s.key)}</option>)}
            </select>
          </div>
        </div>

        {showPacks ? (
          packs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px", background: C.taupe, borderRadius: 20, border: "1px solid rgba(26,20,16,0.1)" }}>
              <div style={{ fontSize: 20, fontWeight: 950, color: C.dark, marginBottom: 8 }}>{packsLoaded ? t("packs_soon") : t("packs_loading")}</div>
              {packsLoaded && <div style={{ fontSize: 14, color: "rgba(26,20,16,0.5)" }}>{t("packs_soon_desc")}</div>}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 20 }}>
              {packs.map(pk => <PackCard key={pk.id} pack={pk} locale={locale} />)}
            </div>
          )
        ) : (
        <>
        <div style={{ fontSize: 13, color: "rgba(26,20,16,0.4)", fontWeight: 600, marginBottom: 20 }}>
          <span style={{ color: C.amber, fontWeight: 900 }}>{filtered.length}</span>{" "}{t("products_count", { count: filtered.length })}
        </div>

        {/* Grille */}
        {paginated.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 40px" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.dark, marginBottom: 12 }}>{t("empty_title")}</div>
            <button onClick={() => { changeCat(""); changeSearch(""); }}
              style={{ padding: "13px 28px", borderRadius: 12, background: C.dark, color: C.warm, fontWeight: 900, fontSize: 14, border: "none", cursor: "pointer" }}>
              {t("empty_cta")}
            </button>
          </div>
        ) : (
          <div className="pgrid">
            {paginated.map(p => <ProductCard key={p.id} p={p} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 40 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "10px 22px", borderRadius: 12, border: `1.5px solid ${C.taupe}`, background: page === 1 ? "rgba(26,20,16,0.04)" : C.dark, color: page === 1 ? "rgba(26,20,16,0.3)" : C.warm, fontWeight: 800, fontSize: 14, cursor: page === 1 ? "not-allowed" : "pointer" }}>
              {t("prev")}
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(26,20,16,0.5)" }}>{t("page_of", { page, total: totalPages })}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: "10px 22px", borderRadius: 12, border: `1.5px solid ${C.taupe}`, background: page === totalPages ? "rgba(26,20,16,0.04)" : C.dark, color: page === totalPages ? "rgba(26,20,16,0.3)" : C.warm, fontWeight: 800, fontSize: 14, cursor: page === totalPages ? "not-allowed" : "pointer" }}>
              {t("next")}
            </button>
          </div>
        )}
        </>
        )}
      </div>

      {/* ── AVIS CLIENTS — sous la grille produits, avant Essentiels ──
            Affiche tous les avis approuvés (fetch /api/reviews sans
            product_id). Si pas d'avis → rien rendu. */}
      <ReviewsBlock />

      {/* Section essentiels — pleine largeur avec Divider */}
      <div style={{ marginTop: 64 }}>
        <Divider from={C.light} to={C.taupe} />
        <div style={{ background: C.taupe, padding: "56px 4vw" }}>
          <Reveal>
            <h2 style={{ margin: "0 0 32px", fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 950, letterSpacing: -1.5, color: C.dark, lineHeight: 1.1 }}>
              {t("ess_title")}
            </h2>
          </Reveal>
          <div className="ess-grid">
            {essentiels.map((e, i) => (
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

      {/* Réassurance — pleine largeur */}
      <div style={{ padding: "40px 4vw 80px", background: C.light }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
          {[
            { label: t("reass_bamboo_l"),   desc: t("reass_bamboo_d")  },
            { label: t("reass_shipping_l"), desc: t("reass_shipping_d", { amount: freeShipThreshold }) },
            { label: t("reass_returns_l"),  desc: t("reass_returns_d")  },
            { label: t("reass_payment_l"),  desc: t("reass_payment_d")  },
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