"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  slug: string;
  price_ttc: number;
  promo_price?: number;
  promo_start?: string;
  promo_end?: string;
  stock: number;
  sizes_stock?: Record<string, number>;
  category_slug: string;
  image_url?: string;
  image_url_2?: string;
  image_url_3?: string;
  image_url_4?: string;
  description?: string;
  sizes?: string[];
  colors?: any[];
  label?: string;
  fiche_cards?: any[];
  fiche_faqs?: any[];
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function slugify(str: string) {
  return String(str ?? "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function isPromoActive(p: Product) {
  if (!p?.promo_price || !p?.promo_start || !p?.promo_end) return false;
  const now = new Date();
  return new Date(p.promo_start) <= now && new Date(p.promo_end) >= now;
}

// ─── FEATURES PAR CATÉGORIE ───────────────────────────────────────────────────
function getFeatures(cat: string, slug?: string) {
  const base = [
    { src: "/icons/01_bambou.svg",          label: "Bambou Bio",        sublabel: "certifié" },
    { src: "/icons/02_anti_bacterien.svg",   label: "Anti-Bactérien",   sublabel: "naturel" },
    { src: "/icons/04_thermoregulation.svg", label: "Thermo-Régulateur",sublabel: "4 saisons" },
    { src: "/icons/05_goutte_validation.svg",label: "Hypo-Allergénique",sublabel: "peau sensible" },
    { src: "/icons/06_respiration_air.svg",  label: "Ultra-Respirant",  sublabel: "doux" },
    { src: "/icons/07_plume_douceur.svg",    label: "Ultra-Doux",       sublabel: "3× coton" },
  ];
  if (cat === "gigoteuses") {
    return [
      ...base,
      { src: "/icons/super_extensible.svg", label: "Super-Extensible", sublabel: "grandit avec bébé" },
    ];
  }
  return base;
}

function getFAQ(cat: string) {
  const base = [
    { q: "Comment choisir la bonne taille ?",          r: "En cas de doute entre deux tailles, prenez toujours la plus grande — le bambou est légèrement extensible et bébé grandit très vite." },
    { q: "Le bambou est-il vraiment doux ?",            r: "Oui — 3× plus doux que le coton classique. Les microfibres de bambou sont naturellement rondes, sans aspérités. Idéal pour la peau ultra-sensible des nourrissons." },
    { q: "Comment entretenir ce vêtement ?",            r: "Lavage machine à 30°C, cycle délicat. Sans adoucissant (altère les propriétés). Séchage à plat recommandé." },
    { q: "Puis-je retourner l'article s'il ne convient pas ?", r: "Oui — 30 jours pour retourner un article non utilisé dans son emballage d'origine. Retour gratuit. contact@milkbebe.fr" },
  ];
  if (cat === "gigoteuses") {
    return [
      { q: "Quelle TOG choisir selon la saison ?",     r: "TOG 0.5 pour l'été (>22°C), TOG 1.0 pour le printemps/automne (18–22°C), TOG 2.5 pour l'hiver (<18°C)." },
      ...base,
    ];
  }
  return base;
}

function getEntretien() {
  return [
    { icon: "🌡️", label: "Lavage",         value: "30°C — cycle délicat" },
    { icon: "🚫", label: "Adoucissant",     value: "À éviter — détériore les fibres" },
    { icon: "💨", label: "Séchage",         value: "À plat, hors lumière directe" },
    { icon: "♨️", label: "Repassage",       value: "Basse température uniquement" },
    { icon: "🚫", label: "Blanchiment",     value: "Interdit" },
  ];
}

// ─── COMPOSANTS ───────────────────────────────────────────────────────────────
function FaqItem({ q, r }: { q: string; r: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(26,20,16,0.08)" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: "100%", padding: "18px 0", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, textAlign: "left" }}
      >
        <span style={{ fontWeight: 800, fontSize: 15, color: "#1a1410" }}>{q}</span>
        <span style={{ fontSize: 22, fontWeight: 300, flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "rotate(0deg)", color: "#c49a4a" }}>+</span>
      </button>
      {open && <div style={{ paddingBottom: 18, fontSize: 14, color: "rgba(26,20,16,0.65)", lineHeight: 1.7 }}>{r}</div>}
    </div>
  );
}

// ─── SOCIAL PROOF (avis fictifs pré-lancement) ────────────────────────────────
const REVIEWS = [
  { name: "Sophie M.", role: "Maman de Léo, 2 mois",   stars: 5, text: "Mon fils avait des irritations avec tous les bodies en coton. Depuis M!LK, plus rien. Différence immédiate dès la première nuit." },
  { name: "Thomas R.", role: "Papa de Zoé, nouveau-né", stars: 5, text: "La qualité est évidente, le bambou est incroyablement doux. On recommande à tous les futurs parents sans hésiter." },
  { name: "Amina B.",  role: "Maman de Samy, 3 mois",  stars: 5, text: "Samy transpire beaucoup la nuit. Avec les pyjamas M!LK il dort mieux. Le bambou thermorégulateur, ça marche vraiment." },
];

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────
export default function ProduitPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : (params.slug ?? "");
  const { addToCart, items } = useCart();

  const [product, setProduct]   = useState<Product | null>(null);
  const [related, setRelated]   = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [taille, setTaille]     = useState("");
  const [couleur, setCouleur]   = useState("");
  const [qty, setQty]           = useState(1);
  const [added, setAdded]       = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  // Fetch produit
  useEffect(() => {
    fetch(`/api/produits?slug=${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setProduct(data);
          // Fetch produits liés
          fetch(`/api/produits?category=${data.category_slug}`)
            .then(r => r.json())
            .then((all: Product[]) => {
              if (Array.isArray(all)) {
                setRelated(all.filter(p => p.id !== data.id).slice(0, 4));
              }
            });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  // Reset sélections quand produit change
  useEffect(() => {
    if (!product) return;
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    if (sizes.length > 0) setTaille(sizes[0]);
    const colors = Array.isArray(product.colors) ? product.colors : [];
    if (colors.length > 0) setCouleur(typeof colors[0] === "string" ? colors[0] : colors[0]?.name ?? "");
  }, [product]);

  function handleAddToCart() {
    if (!product) return;
    const name = [product.name, taille, couleur].filter(Boolean).join(" — ");
    for (let i = 0; i < qty; i++) {
      addToCart({
        id: String(product.id),
        slug: product.slug,
        name,
        price: promo ? Number(product.promo_price) : Number(product.price_ttc),
        quantity: 1,
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  // ── États dérivés ─────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "80vh", display: "grid", placeItems: "center", background: "#f5f0e8" }}>
      <div style={{ opacity: 0.3, fontSize: 14, fontWeight: 700, letterSpacing: 2 }}>Chargement…</div>
    </div>
  );

  if (!product) return (
    <div style={{ minHeight: "80vh", display: "grid", placeItems: "center", background: "#f5f0e8", padding: 40, textAlign: "center" }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12, color: "#1a1410" }}>Produit introuvable</div>
        <Link href="/produits" style={{ padding: "12px 24px", borderRadius: 12, background: "#1a1410", color: "#f2ede6", fontWeight: 800, textDecoration: "none" }}>
          ← Retour aux produits
        </Link>
      </div>
    </div>
  );

  const promo        = isPromoActive(product);
  const out          = Number(product.stock ?? 0) <= 0;
  const lowStock     = !out && Number(product.stock ?? 0) <= 5;
  const displayPrice = promo ? Number(product.promo_price) : Number(product.price_ttc);
  const allImages    = [product.image_url, product.image_url_2, product.image_url_3, product.image_url_4].filter(Boolean) as string[];
  const taillesDispos: string[]              = Array.isArray(product.sizes)  ? product.sizes  : [];
  const sizesStock   : Record<string,number> = product.sizes_stock ?? {};
  const couleursDispos: any[]                = Array.isArray(product.colors) ? product.colors : [];
  const outTaille    = taille ? Number(sizesStock[taille] ?? product.stock ?? 0) <= 0 : out;
  const features     = getFeatures(product.category_slug ?? "", product.slug);
  const FAQ          = getFAQ(product.category_slug ?? "");
  const entretien    = getEntretien();

  // Breadcrumb catégorie label
  const catLabel: Record<string, string> = {
    bodies: "Bodies", pyjamas: "Pyjamas", gigoteuses: "Gigoteuses", accessoires: "Accessoires",
  };

  return (
    <div style={{ background: "#f5f0e8", minHeight: "100vh" }}>

      {/* ── STYLES RESPONSIVE ─────────────────────────────────────────────── */}
      <style>{`
        .prod-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 56px;
          align-items: start;
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 40px 80px;
        }
        .prod-sticky { position: sticky; top: 100px; }
        .prod-section-wrap { padding: 0 40px 80px; max-width: 1200px; margin: 0 auto; }
        .features-band {
          display: flex;
          gap: 0;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .features-band::-webkit-scrollbar { display: none; }
        .feature-item {
          flex: 0 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px 20px;
          min-width: 100px;
          text-align: center;
        }
        .desktop-cta  { display: block; }
        .mobile-cta-bar { display: none; }
        .reviews-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 900px) {
          .prod-layout {
            grid-template-columns: 1fr !important;
            gap: 0 !important;
            padding: 0 0 120px !important;
          }
          .prod-sticky { position: static !important; }
          .prod-section-wrap { padding: 0 16px 120px !important; }
          .desktop-cta  { display: none !important; }
          .mobile-cta-bar { display: block !important; }
          .reviews-grid { grid-template-columns: 1fr !important; }
          .feature-item { min-width: 85px; padding: 16px 12px; }
        }
      `}</style>

      {/* ── BREADCRUMB ───────────────────────────────────────────────────────── */}
      <div style={{ paddingTop: 96, background: "#f5f0e8" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 40px" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: "rgba(26,20,16,0.4)", flexWrap: "wrap" }}>
            <Link href="/"         style={{ textDecoration: "none", color: "inherit" }}>Accueil</Link>
            <span>/</span>
            <Link href="/produits" style={{ textDecoration: "none", color: "inherit" }}>Produits</Link>
            {product.category_slug && (
              <>
                <span>/</span>
                <Link href={`/produits?cat=${product.category_slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                  {catLabel[product.category_slug] ?? product.category_slug}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── LAYOUT PRINCIPAL ──────────────────────────────────────────────── */}
      <div className="prod-layout">

        {/* ══ GALERIE ══════════════════════════════════════════════════════ */}
        <div className="prod-sticky">

          {/* Image principale avec swipe mobile */}
          <div
            style={{ position: "relative", borderRadius: 20, overflow: "hidden", background: "#ede8df", aspectRatio: "4/5", cursor: allImages.length > 1 ? "grab" : "default" }}
            onTouchStart={e => setTouchStartX(e.touches[0].clientX)}
            onTouchEnd={e => {
              if (touchStartX === null) return;
              const dx = e.changedTouches[0].clientX - touchStartX;
              if (Math.abs(dx) > 50) {
                if (dx < 0) setActiveImg(i => Math.min(i + 1, allImages.length - 1));
                else        setActiveImg(i => Math.max(i - 1, 0));
              }
              setTouchStartX(null);
            }}
          >
            {allImages.length > 0 ? (
              <Image
                src={allImages[activeImg]}
                alt={product.name}
                fill
                sizes="(max-width: 900px) 100vw, 50vw"
                style={{ objectFit: "cover", transition: "opacity 0.25s ease" }}
                priority
              />
            ) : (
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 32, fontWeight: 950, color: "#c4b49a" }}>M!LK</div>
            )}

            {/* Badge NOUVEAU / PROMO */}
            {(product.label === "nouveau" || !promo) && (
              <div style={{
                position: "absolute", top: 0, right: 0,
                background: "#c49a4a", color: "#fff",
                fontWeight: 900, fontSize: 11, letterSpacing: 2, textTransform: "uppercase",
                padding: "6px 14px",
                clipPath: "polygon(0 0, 100% 0, 100% 100%, 14px 100%)",
                borderBottomLeftRadius: 8,
              }}>
                {product.label === "nouveau" ? "NOUVEAU" : promo ? "PROMO" : product.label?.toUpperCase() ?? "NOUVEAU"}
              </div>
            )}
            {promo && (
              <div style={{
                position: "absolute", top: 0, right: 0,
                background: "#c03a2b", color: "#fff",
                fontWeight: 900, fontSize: 11, letterSpacing: 2, textTransform: "uppercase",
                padding: "6px 14px",
                clipPath: "polygon(0 0, 100% 0, 100% 100%, 14px 100%)",
                borderBottomLeftRadius: 8,
              }}>PROMO</div>
            )}

            {/* Indicateur pagination mobile */}
            {allImages.length > 1 && (
              <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
                {allImages.map((_, i) => (
                  <button key={i} onClick={() => setActiveImg(i)} style={{
                    width: i === activeImg ? 20 : 6, height: 6, borderRadius: 3,
                    background: i === activeImg ? "#f2ede6" : "rgba(242,237,230,0.4)",
                    border: "none", cursor: "pointer", padding: 0, transition: "all 0.2s",
                  }} />
                ))}
              </div>
            )}
          </div>

          {/* Miniatures cliquables (desktop) */}
          {allImages.length > 1 && (
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              {allImages.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)} style={{
                  flex: 1, aspectRatio: "1", borderRadius: 12, overflow: "hidden",
                  border: `2px solid ${i === activeImg ? "#1a1410" : "transparent"}`,
                  background: "#ede8df", cursor: "pointer", padding: 0, position: "relative",
                  opacity: i === activeImg ? 1 : 0.55, transition: "all 0.2s",
                }}>
                  <Image src={img} alt={`vue ${i+1}`} fill sizes="80px" style={{ objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ══ PANNEAU DROIT ════════════════════════════════════════════════ */}
        <div style={{ padding: "0 0 40px" }}>

          {/* ① TITRE */}
          <h1 style={{ margin: "0 0 4px", fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 950, letterSpacing: -1, color: "#1a1410", lineHeight: 1.1 }}>
            {product.name}
          </h1>

          {/* ② PRIX — visible immédiatement, sous le titre */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "12px 0 16px", flexWrap: "wrap" }}>
            {promo ? (
              <>
                <span style={{ fontSize: 28, fontWeight: 950, color: "#c03a2b" }}>
                  {Number(product.promo_price).toFixed(2)} €
                </span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "rgba(26,20,16,0.35)", textDecoration: "line-through" }}>
                  {Number(product.price_ttc).toFixed(2)} €
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, background: "#c03a2b", color: "#fff", borderRadius: 6, padding: "3px 8px" }}>
                  -{Math.round((1 - Number(product.promo_price) / Number(product.price_ttc)) * 100)}%
                </span>
              </>
            ) : (
              <span style={{ fontSize: 28, fontWeight: 950, color: "#1a1410" }}>
                {Number(product.price_ttc).toFixed(2)} €
              </span>
            )}
            <span style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>TTC — Livraison offerte dès 60 €</span>
          </div>

          {/* ③ SOCIAL PROOF MICRO — étoiles inline */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid rgba(26,20,16,0.08)" }}>
            <div style={{ display: "flex", gap: 2 }}>
              {[1,2,3,4,5].map(s => (
                <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill="#c49a4a"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              ))}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1410" }}>5.0</span>
            <span style={{ fontSize: 12, color: "rgba(26,20,16,0.4)" }}>· 47 avis vérifiés</span>
          </div>

          {/* ④ DESCRIPTION COURTE */}
          {product.description && (
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "rgba(26,20,16,0.7)", lineHeight: 1.7 }}>
              {product.description}
            </p>
          )}

          {/* ⑤ ALERTE STOCK FAIBLE */}
          {lowStock && !out && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(196,154,74,0.12)", border: "1px solid rgba(196,154,74,0.3)", marginBottom: 20 }}>
              <span style={{ fontSize: 14 }}>⚡</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#8a6a20" }}>
                Plus que {product.stock} en stock — commandez maintenant
              </span>
            </div>
          )}

          {/* ⑥ SÉLECTEUR COULEUR */}
          {couleursDispos.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)", marginBottom: 10 }}>
                Couleur — <span style={{ color: "#1a1410", textTransform: "none" }}>{couleur || "—"}</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {couleursDispos.map((c: any) => {
                  const cName = typeof c === "string" ? c : c.name;
                  const cHex  = typeof c === "string" ? "#888" : (c.hex ?? "#888");
                  return (
                    <button key={cName} onClick={() => setCouleur(cName)} title={cName}
                      style={{
                        width: 32, height: 32, borderRadius: "50%", border: `3px solid ${couleur === cName ? "#1a1410" : "transparent"}`,
                        background: cHex, cursor: "pointer", padding: 0, outline: couleur === cName ? "2px solid #1a1410" : "none", outlineOffset: 2,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* ⑦ SÉLECTEUR TAILLE */}
          {taillesDispos.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)", marginBottom: 10 }}>
                Taille — <span style={{ color: "#1a1410", textTransform: "none" }}>{taille || "Choisir"}</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {taillesDispos.map(t => {
                  const tStock   = Number(sizesStock[t] ?? product.stock ?? 0);
                  const tOut     = tStock <= 0;
                  const tLow     = !tOut && tStock <= 3;
                  return (
                    <button
                      key={t}
                      onClick={() => !tOut && setTaille(t)}
                      disabled={tOut}
                      style={{
                        padding: "10px 16px", borderRadius: 10, fontSize: 14, fontWeight: 800,
                        border: `2px solid ${taille === t ? "#1a1410" : "rgba(26,20,16,0.15)"}`,
                        background: taille === t ? "#1a1410" : tOut ? "rgba(26,20,16,0.03)" : "#fff",
                        color: taille === t ? "#f2ede6" : tOut ? "rgba(26,20,16,0.25)" : "#1a1410",
                        cursor: tOut ? "not-allowed" : "pointer",
                        position: "relative",
                        textDecoration: tOut ? "line-through" : "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {t}
                      {tLow && !tOut && (
                        <span style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, borderRadius: "50%", background: "#c49a4a", border: "2px solid #f5f0e8" }} />
                      )}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>
                ● Point orange = dernières pièces
              </div>
            </div>
          )}

          {/* ⑧ QUANTITÉ */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>Quantité</div>
            <div style={{ display: "flex", alignItems: "center", gap: 0, border: "2px solid rgba(26,20,16,0.15)", borderRadius: 12, overflow: "hidden" }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                style={{ width: 40, height: 40, border: "none", background: "#fff", cursor: "pointer", fontSize: 18, fontWeight: 700, color: "#1a1410" }}>−</button>
              <span style={{ width: 36, textAlign: "center", fontWeight: 900, fontSize: 16, color: "#1a1410" }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)}
                style={{ width: 40, height: 40, border: "none", background: "#fff", cursor: "pointer", fontSize: 18, fontWeight: 700, color: "#1a1410" }}>+</button>
            </div>
          </div>

          {/* ⑨ CTA DESKTOP */}
          <div className="desktop-cta" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={handleAddToCart}
              disabled={outTaille}
              style={{
                width: "100%", padding: "18px", borderRadius: 14, border: "none",
                fontWeight: 900, fontSize: 17, cursor: outTaille ? "not-allowed" : "pointer",
                background: added ? "#2d6a2d" : outTaille ? "#d1cdc8" : "#1a1410",
                color: "#f2ede6", transition: "all 0.2s ease",
                letterSpacing: 0.3,
              }}
            >
              {added ? "✓ Ajouté au panier !" : outTaille ? "Épuisé" : `Ajouter au panier — ${(displayPrice * qty).toFixed(2)} €`}
            </button>
            {cartCount > 0 && (
              <Link href="/panier" style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "2px solid #1a1410",
                fontWeight: 800, fontSize: 14, textDecoration: "none", color: "#1a1410",
                textAlign: "center", display: "block", boxSizing: "border-box",
                background: "transparent", transition: "background 0.2s",
              }}>
                Voir le panier ({cartCount})
              </Link>
            )}
          </div>

          {/* ⑩ GARANTIES MICRO */}
          <div style={{ display: "flex", gap: 16, marginTop: 20, flexWrap: "wrap" }}>
            {[
              { icon: "🔒", label: "Paiement sécurisé" },
              { icon: "📦", label: "Livraison 2–4j" },
              { icon: "↩️",  label: "Retour 30j gratuit" },
            ].map(g => (
              <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(26,20,16,0.5)", fontWeight: 600 }}>
                <span>{g.icon}</span>
                <span>{g.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BANDEAU FEATURES ─────────────────────────────────────────────────── */}
      <div style={{ background: "#ede8df", borderTop: "1px solid rgba(26,20,16,0.07)", borderBottom: "1px solid rgba(26,20,16,0.07)", overflow: "hidden" }}>
        <div className="features-band" style={{ maxWidth: 1200, margin: "0 auto", padding: "4px 20px", justifyContent: "center" }}>
          {features.map((f, i) => (
            <div key={i} className="feature-item">
              <div style={{ width: 36, height: 36, position: "relative" }}>
                <Image
                  src={f.src}
                  alt={f.label}
                  fill
                  sizes="36px"
                  style={{ objectFit: "contain", filter: "invert(8%) sepia(38%) saturate(800%) hue-rotate(340deg) brightness(60%)" }}
                />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.5, textTransform: "uppercase", color: "#1a1410", lineHeight: 1.2 }}>{f.label}</div>
                {f.sublabel && <div style={{ fontSize: 10, color: "rgba(26,20,16,0.4)", fontWeight: 600, marginTop: 2 }}>{f.sublabel}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CONTENU BAS DE PAGE ──────────────────────────────────────────────── */}
      <div className="prod-section-wrap">

        {/* AVIS CLIENTS */}
        <div style={{ marginTop: 64 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 950, letterSpacing: -0.8, color: "#1a1410" }}>
              Ce qu'ils en disent
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {[1,2,3,4,5].map(s => (
                <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill="#c49a4a"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              ))}
              <span style={{ fontSize: 14, fontWeight: 800, color: "#1a1410", marginLeft: 4 }}>5.0 / 5</span>
              <span style={{ fontSize: 13, color: "rgba(26,20,16,0.4)" }}>· 47 avis</span>
            </div>
          </div>

          <div className="reviews-grid">
            {REVIEWS.map((r, i) => (
              <div key={i} style={{ padding: "24px", borderRadius: 18, background: "#fff", border: "1px solid rgba(26,20,16,0.07)" }}>
                <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} width="13" height="13" viewBox="0 0 24 24" fill="#c49a4a"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  ))}
                </div>
                <p style={{ margin: "0 0 14px", fontSize: 14, color: "rgba(26,20,16,0.7)", lineHeight: 1.6, fontStyle: "italic" }}>
                  « {r.text} »
                </p>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#1a1410" }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", marginTop: 2 }}>{r.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ENTRETIEN */}
        <div style={{ marginTop: 48, padding: "32px", borderRadius: 20, background: "#fff", border: "1px solid rgba(26,20,16,0.07)" }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 950, letterSpacing: -0.5, color: "#1a1410" }}>
            Conseils d'entretien
          </h3>
          <div style={{ display: "grid", gap: 10 }}>
            {entretien.map(item => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 14, paddingBottom: 10, borderBottom: "1px solid rgba(26,20,16,0.05)" }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ color: "rgba(26,20,16,0.45)", fontWeight: 600, minWidth: 110 }}>{item.label}</span>
                <span style={{ color: "#1a1410", fontWeight: 700 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 48, padding: "32px 32px 24px", borderRadius: 20, background: "#2a2018" }}>
          <h3 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 950, letterSpacing: -0.5, color: "#f2ede6" }}>
            Questions fréquentes
          </h3>
          <div style={{ fontSize: 13, color: "rgba(242,237,230,0.35)", marginBottom: 24 }}>Tout ce que vous voulez savoir</div>
          {FAQ.map(item => (
            <div key={item.q} style={{ borderBottom: "1px solid rgba(242,237,230,0.08)" }}>
              <FaqItem q={item.q} r={item.r} />
            </div>
          ))}
        </div>

        {/* PRODUITS LIÉS */}
        {related.length > 0 && (
          <div style={{ marginTop: 64 }}>
            <h2 style={{ margin: "0 0 24px", fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 950, letterSpacing: -0.8, color: "#1a1410" }}>
              Dans la même collection
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              {related.map(p => {
                const rSlug  = p.slug || slugify(p.name);
                const rPromo = isPromoActive(p);
                return (
                  <Link key={p.id} href={`/produits/${rSlug}`}
                    style={{ textDecoration: "none", color: "inherit", display: "block", borderRadius: 18, overflow: "hidden", background: "#fff", border: "1px solid rgba(26,20,16,0.07)", transition: "transform 0.2s, box-shadow 0.2s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 12px 32px rgba(0,0,0,0.1)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none"; }}
                  >
                    <div style={{ position: "relative", height: 200, background: "#ede8df" }}>
                      {p.image_url && <Image src={p.image_url} alt={p.name} fill sizes="250px" style={{ objectFit: "cover" }} />}
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4, color: "#1a1410" }}>{p.name}</div>
                      <div style={{ fontWeight: 900, fontSize: 16, color: "#1a1410" }}>
                        {rPromo ? (
                          <>
                            <span style={{ textDecoration: "line-through", opacity: 0.35, marginRight: 6, fontSize: 13 }}>{Number(p.price_ttc).toFixed(2)} €</span>
                            <span style={{ color: "#c03a2b" }}>{Number(p.promo_price).toFixed(2)} €</span>
                          </>
                        ) : (
                          <span>{Number(p.price_ttc).toFixed(2)} €</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── CTA STICKY MOBILE ────────────────────────────────────────────────── */}
      <div className="mobile-cta-bar" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        padding: "10px 16px 16px",
        background: "rgba(245,240,232,0.97)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(26,20,16,0.1)",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.08)",
      }}>
        {/* Prix visible dans la barre sticky */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: "#1a1410" }}>{product.name}</span>
          <span style={{ fontWeight: 900, fontSize: 17, color: promo ? "#c03a2b" : "#1a1410" }}>
            {displayPrice.toFixed(2)} €
          </span>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <button
            onClick={handleAddToCart}
            disabled={outTaille}
            style={{
              width: "100%", padding: "16px", borderRadius: 14, border: "none",
              fontWeight: 900, fontSize: 16, cursor: outTaille ? "not-allowed" : "pointer",
              background: added ? "#2d6a2d" : outTaille ? "#d1cdc8" : "#1a1410",
              color: "#f2ede6", transition: "all 0.2s ease",
            }}
          >
            {added ? "✓ Ajouté !" : outTaille ? "Épuisé" : taillesDispos.length > 0 && !taille ? "Choisir une taille" : `Ajouter — ${(displayPrice * qty).toFixed(2)} €`}
          </button>
          {cartCount > 0 && (
            <Link href="/panier" style={{
              width: "100%", padding: "12px", borderRadius: 12, border: "2px solid #1a1410",
              fontWeight: 800, fontSize: 14, textDecoration: "none", color: "#1a1410",
              textAlign: "center", display: "block", boxSizing: "border-box",
            }}>
              Voir le panier ({cartCount})
            </Link>
          )}
        </div>
      </div>

    </div>
  );
}