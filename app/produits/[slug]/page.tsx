"use client";

import { useEffect, useRef, useState } from "react";
import { useParams }                   from "next/navigation";
import Image                           from "next/image";
import Link                            from "next/link";
import { useCart }                     from "@/context/CartContext";

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
function isPromoActive(p: any) {
  if (!p?.promo_price || !p?.promo_start || !p?.promo_end) return false;
  const now = new Date();
  return new Date(p.promo_start) <= now && new Date(p.promo_end) >= now;
}

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTES
───────────────────────────────────────────────────────────────────────────── */
const TAILLES_ORDER = [
  "Naissance", "0-3 mois", "3-6 mois", "6-12 mois",
  "0-6 mois", "Taille unique", "120×120 cm",
];

const GUIDE_TAILLES = [
  { taille: "Naissance", poids: "2,5 – 4 kg",  hauteur: "44 – 54 cm", age: "0 – 1 mois"  },
  { taille: "0-3 mois",  poids: "3,5 – 6 kg",  hauteur: "50 – 62 cm", age: "1 – 3 mois"  },
  { taille: "3-6 mois",  poids: "6 – 8 kg",    hauteur: "60 – 68 cm", age: "3 – 6 mois"  },
  { taille: "6-12 mois", poids: "8 – 11 kg",   hauteur: "66 – 76 cm", age: "6 – 12 mois" },
];

/* ─────────────────────────────────────────────────────────────────────────────
   SVG ICONS — sans emoji
───────────────────────────────────────────────────────────────────────────── */
const IconThermometer = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2v10m0 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/><path d="M12 6h2M12 9h1" stroke="#c49a4a" strokeWidth="1.5" strokeLinecap="round"/></svg>;
const IconBan         = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#c49a4a" strokeWidth="1.8"/><path d="M6 6l12 12" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const IconFlat        = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 12h16M4 8h8M4 16h8" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const IconHeat        = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M8 6c0 2 2 2 2 4s-2 2-2 4M12 4c0 2 2 2 2 4s-2 2-2 4M16 6c0 2 2 2 2 4s-2 2-2 4" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/><path d="M5 19h14" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const IconLeaf        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 22C12 22 4 16 4 9a8 8 0 0 1 16 0c0 7-8 13-8 13z" stroke="#c49a4a" strokeWidth="1.8"/><path d="M12 22V9" stroke="#c49a4a" strokeWidth="1.8"/></svg>;
const IconTruck       = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M1 3h13v13H1z" stroke="#c49a4a" strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 8h4l3 3v5h-7V8z" stroke="#c49a4a" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="5.5" cy="18.5" r="2.5" stroke="#c49a4a" strokeWidth="1.8"/><circle cx="18.5" cy="18.5" r="2.5" stroke="#c49a4a" strokeWidth="1.8"/></svg>;
const IconReturn      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 14H4V9" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 14a9 9 0 1 0 1.5-5" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const IconLock        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#c49a4a" strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#c49a4a" strokeWidth="1.8"/></svg>;
const IconSize        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h10M3 18h6" stroke="#c49a4a" strokeWidth="2" strokeLinecap="round"/></svg>;

/* ─────────────────────────────────────────────────────────────────────────────
   BADGE DIAGONAL
───────────────────────────────────────────────────────────────────────────── */
function DiagonalBadge({ label, out }: { label?: string; out: boolean }) {
  if (out) return (
    <div style={{ position: "absolute", top: 0, right: 0, width: 110, height: 110, overflow: "hidden", zIndex: 30, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 26, right: -30, background: "#6b7280", color: "#fff", fontSize: 11, fontWeight: 900, padding: "8px 44px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>Épuisé</div>
    </div>
  );
  const cfg: Record<string, string> = { nouveau: "Nouveau", bestseller: "Best seller", exclusif: "Exclusif", last: "Dernières pièces", promo: "Promo", coup_de_coeur: "Coup de cœur" };
  const text = label ? cfg[label] : null;
  if (!text) return null;
  return (
    <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, overflow: "hidden", zIndex: 30, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 28, right: -34, background: "#c49a4a", color: "#1a1410", fontSize: 11, fontWeight: 900, padding: "9px 48px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{text}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LIGHTBOX
───────────────────────────────────────────────────────────────────────────── */
function Lightbox({ images, startIndex, onClose }: {
  images: string[]; startIndex: number; onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape")    onClose();
      if (e.key === "ArrowLeft") setIdx(i => Math.max(0, i - 1));
      if (e.key === "ArrowRight")setIdx(i => Math.min(images.length - 1, i + 1));
    };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [images.length, onClose]);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}
    >
      {/* Image principale */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ position: "relative", width: "min(90vw, 700px)", aspectRatio: "3/4", borderRadius: 16, overflow: "hidden", marginBottom: 16, flexShrink: 0 }}
      >
        <Image src={images[idx]} alt={`Photo ${idx + 1}`} fill style={{ objectFit: "cover" }} sizes="700px" />
        {/* Prev/Next */}
        {idx > 0 && (
          <button onClick={() => setIdx(i => i - 1)}
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: 99, background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", color: "#fff", fontSize: 22, display: "grid", placeItems: "center", backdropFilter: "blur(4px)" }}>
            ‹
          </button>
        )}
        {idx < images.length - 1 && (
          <button onClick={() => setIdx(i => i + 1)}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: 99, background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", color: "#fff", fontSize: 22, display: "grid", placeItems: "center", backdropFilter: "blur(4px)" }}>
            ›
          </button>
        )}
        {/* Fermer */}
        <button onClick={onClose}
          style={{ position: "absolute", top: 12, right: 12, width: 36, height: 36, borderRadius: 99, background: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer", color: "#fff", fontSize: 18, display: "grid", placeItems: "center" }}>
          ✕
        </button>
      </div>

      {/* Thumbnails en dessous */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", maxWidth: "min(90vw, 700px)" }}
      >
        {images.map((img, i) => (
          <div key={i} onClick={() => setIdx(i)}
            style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden", cursor: "pointer", border: `2px solid ${i === idx ? "#c49a4a" : "rgba(255,255,255,0.2)"}`, flexShrink: 0, position: "relative", opacity: i === idx ? 1 : 0.55, transition: "all 0.15s" }}>
            <Image src={img} alt={`Thumb ${i + 1}`} fill style={{ objectFit: "cover" }} sizes="64px" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FAQ ITEM
───────────────────────────────────────────────────────────────────────────── */
function FaqItem({ q, r }: { q: string; r: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: "1px solid rgba(242,237,230,0.07)" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: "100%", padding: "13px 0", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, textAlign: "left" }}>
        <span style={{ fontWeight: 800, fontSize: "clamp(13px, 1.3vw, 15px)", color: "#f2ede6", lineHeight: 1.3 }}>{q}</span>
        <span style={{ fontSize: 20, color: "#c49a4a", flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "none", lineHeight: 1 }}>+</span>
      </button>
      {open && (
        <div style={{ padding: "0 0 13px", fontSize: "clamp(13px, 1.2vw, 14px)", lineHeight: 1.7, color: "rgba(242,237,230,0.55)" }}>{r}</div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PAGE PRINCIPALE
───────────────────────────────────────────────────────────────────────────── */
export default function ProductPage() {
  const { slug }             = useParams<{ slug: string }>();
  const { addToCart, items } = useCart();

  const [product,    setProduct]    = useState<any>(null);
  const [related,    setRelated]    = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [taille,     setTaille]     = useState("");
  const [couleur,    setCouleur]    = useState("");
  const [qty,        setQty]        = useState(1);
  const [added,      setAdded]      = useState(false);
  const [lightboxIdx,setLightboxIdx]= useState<number | null>(null);
  const [guideOpen,  setGuideOpen]  = useState(false);  // ✅ guide tailles accordion

  const rightPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      fetch(`/api/produits?slug=${encodeURIComponent(slug)}`).then(r => r.json()),
      fetch("/api/produits").then(r => r.json()),
    ]).then(([found, all]) => {
      if (found && !found.error) {
        setProduct(found);
        setRelated((Array.isArray(all) ? all : []).filter((p: any) => p.id !== found.id && p.category_slug === found.category_slug).slice(0, 4));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug]);

  function handleAddToCart() {
    if (!product) return;
    const name = [product.name, taille, couleur].filter(Boolean).join(" — ");
    for (let i = 0; i < qty; i++) {
      addToCart({ id: String(product.id), slug: product.slug, name, price: promo ? product.promo_price : product.price_ttc, quantity: 1 });
    }
    setAdded(true); setTimeout(() => setAdded(false), 2500);
  }

  /* ── Loaders ── */
  if (loading) return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: "#f5f0e8" }}>
      <div style={{ opacity: 0.4, fontSize: 15 }}>Chargement...</div>
    </div>
  );
  if (!product) return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: "#f5f0e8", padding: 40, textAlign: "center" }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12, color: "#1a1410" }}>Produit introuvable</div>
        <Link href="/produits" style={{ padding: "12px 24px", borderRadius: 12, background: "#1a1410", color: "#f2ede6", fontWeight: 800, textDecoration: "none" }}>← Retour</Link>
      </div>
    </div>
  );

  /* ── Données dérivées ── */
  const promo         = isPromoActive(product);
  const out           = Number(product.stock ?? 0) <= 0;
  const lowStock      = !out && Number(product.stock ?? 0) <= 5;
  const displayPrice  = promo ? product.promo_price : product.price_ttc;
  const badgeLabel    = out ? undefined : (product.label || (promo ? "promo" : undefined));
  const allImages     = [product.image_url, product.image_url_2, product.image_url_3, product.image_url_4].filter(Boolean) as string[];
  const images        = allImages.length > 0 ? allImages : [];
  const taillesDispos : string[]             = Array.isArray(product.sizes)  ? product.sizes  : [];
  const sizesStock    : Record<string, number> = product.sizes_stock ?? {};
  const couleursDispos: any[]                = Array.isArray(product.colors) ? product.colors : [];
  const stockTaille   = taille ? (sizesStock[taille] ?? product.stock ?? 0) : (product.stock ?? 0);
  const outTaille     = taille ? Number(stockTaille) <= 0 : out;
  const cartCount     = items.reduce((s, i) => s + i.quantity, 0);

  const FAQ = [
    { q: "Comment entretenir ce vêtement ?",  r: "Lavage machine 30°C, cycle délicat. Pas d'adoucissant. Séchage à plat recommandé pour préserver la douceur et les propriétés du bambou." },
    { q: "Quelle taille choisir ?",            r: "En cas de doute, prenez la taille supérieure — le bambou est légèrement extensible et bébé grandit vite. Consultez le guide des tailles ci-dessus." },
    { q: "Le bambou est-il doux pour bébé ?",  r: "Oui — 3× plus doux que le coton. Les microfibres de bambou sont naturellement rondes. Idéal pour les peaux ultra-sensibles et sujettes aux irritations." },
    { q: "Retour possible ?",                  r: "Oui, 30 jours après réception. Retour entièrement gratuit pour les articles non utilisés. Contactez-nous : contact@milkbebe.fr" },
  ];

  /* ── Assemblage grille photos : paires de 2 ── */
  // On construit des rangées de 2 photos
  const photoRows: string[][] = [];
  for (let i = 0; i < images.length; i += 2) {
    photoRows.push(images.slice(i, i + 2));
  }
  // Si 0 photo → placeholder
  if (photoRows.length === 0) photoRows.push(["placeholder"]);

  return (
    <div style={{ background: "#f5f0e8", minHeight: "100vh" }}>

      {/* ── Lightbox ── */}
      {lightboxIdx !== null && images.length > 0 && (
        <Lightbox images={images} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      <style>{`
        /* ── Layout principal ── */
        .pl-outer  { display: grid; grid-template-columns: 1fr 440px; gap: 40px; align-items: start; padding: 16px 4vw 80px; max-width: 1600px; margin: 0 auto; }
        .pl-right  { position: sticky; top: 88px; display: grid; gap: 18px; }
        .pl-compo  { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        /* ── Photo grid ── */
        .photo-row     { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .photo-item    { position: relative; aspect-ratio: 3/4; border-radius: 14px; overflow: hidden; background: #ede8df; cursor: pointer; }
        .photo-item img{ transition: transform 0.4s ease; }
        .photo-item:hover img { transform: scale(2.2); }
        .photo-item.single { grid-column: 1 / -1; aspect-ratio: 4/5; }

        /* ── Reassurance ── */
        .reassu-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

        /* ── Guide tailles accordion ── */
        .guide-table th, .guide-table td { padding: 8px 12px; }

        /* ── Mobile ── */
        @media (max-width: 900px) {
          .pl-outer  { grid-template-columns: 1fr !important; gap: 24px !important; padding: 12px 4vw 120px !important; }
          .pl-right  { position: static !important; }
          .pl-compo  { grid-template-columns: 1fr !important; }
          .reassu-grid{ grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .photo-row { gap: 6px; margin-bottom: 6px; }
        }
      `}</style>

      {/* Breadcrumb */}
      <div style={{ paddingTop: 84, padding: "84px 4vw 0" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", padding: "10px 0 0" }}>
          <div style={{ display: "flex", gap: 8, fontSize: 13, color: "rgba(26,20,16,0.4)", flexWrap: "wrap" }}>
            <Link href="/"         style={{ textDecoration: "none", color: "inherit" }}>Accueil</Link>
            <span>/</span>
            <Link href="/produits" style={{ textDecoration: "none", color: "inherit" }}>Produits</Link>
            <span>/</span>
            <span style={{ color: "#1a1410", fontWeight: 600 }}>{product.name}</span>
          </div>
        </div>
      </div>

      {/* ── BODY : 2 colonnes ── */}
      <div className="pl-outer">

        {/* ════════════════════════════════════════════
            COLONNE GAUCHE — grille de photos illimitée
        ════════════════════════════════════════════ */}
        <div>
          {/* Badge sur le coin de la 1ère photo */}
          <div style={{ position: "relative" }}>
            <DiagonalBadge label={badgeLabel} out={out} />

            {photoRows.map((row, ri) => (
              <div key={ri} className="photo-row">
                {row.map((img, ci) => {
                  const globalIdx = ri * 2 + ci;
                  const isPlaceholder = img === "placeholder";
                  // Si dernière rangée a 1 seule photo, elle prend toute la largeur
                  const isSingle = row.length === 1;
                  return (
                    <div
                      key={ci}
                      className={`photo-item${isSingle ? " single" : ""}`}
                      onClick={() => { if (!isPlaceholder) setLightboxIdx(globalIdx); }}
                      style={{ cursor: isPlaceholder ? "default" : "zoom-in" }}
                    >
                      {isPlaceholder ? (
                        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 28, fontWeight: 950, color: "#c8bfb2" }}>M!LK</div>
                      ) : (
                        <>
                          <Image
                            src={img}
                            alt={`${product.name} ${globalIdx + 1}`}
                            fill
                            sizes="(max-width:900px) 50vw, 30vw"
                            style={{ objectFit: "cover", transformOrigin: "center" }}
                          />
                          {ri === 0 && ci === 0 && lowStock && (
                            <div style={{ position: "absolute", top: 10, left: 10, zIndex: 5 }}>
                              <span style={{ padding: "5px 11px", borderRadius: 99, background: "rgba(180,80,60,0.85)", color: "#fff", fontSize: 11, fontWeight: 800 }}>Plus que {product.stock} !</span>
                            </div>
                          )}
                          {/* Hint clique */}
                          <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.35)", borderRadius: 8, padding: "3px 8px", fontSize: 10, color: "#fff", fontWeight: 600, opacity: 0, transition: "opacity 0.2s", pointerEvents: "none" }} className="photo-hint">
                            Agrandir
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════
            COLONNE DROITE — infos produit (sticky)
        ════════════════════════════════════════════ */}
        <div ref={rightPanelRef} className="pl-right">

          {/* Catégorie */}
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: "#c49a4a" }}>
            {product.category_slug ?? "M!LK"} · Bambou OEKO-TEX
          </div>

          {/* Nom */}
          <h1 style={{ margin: 0, fontSize: "clamp(22px, 2.2vw, 32px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.1, color: "#1a1410" }}>
            {product.name}
          </h1>

          {/* Prix */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontSize: "clamp(24px, 2.5vw, 30px)", fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>
              {Number(displayPrice).toFixed(2)} €
            </span>
            {promo && (
              <span style={{ fontSize: 17, textDecoration: "line-through", color: "rgba(26,20,16,0.35)", fontWeight: 700 }}>
                {Number(product.price_ttc).toFixed(2)} €
              </span>
            )}
            <span style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>TTC</span>
          </div>

          {/* Description */}
          {product.description && (
            <p style={{ margin: 0, fontSize: "clamp(13px, 1.2vw, 15px)", lineHeight: 1.8, color: "rgba(26,20,16,0.6)" }}>
              {product.description}
            </p>
          )}

          {/* Matière pill */}
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "#2a2018", display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: "rgba(242,237,230,0.7)" }}>
              <strong style={{ color: "#c49a4a" }}>Matière :</strong> 95% bambou viscose · 5% spandex
            </div>
            <div style={{ fontSize: 12, color: "rgba(242,237,230,0.7)" }}>
              <strong style={{ color: "#c49a4a" }}>Cert. :</strong> OEKO-TEX Standard 100
            </div>
          </div>

          {/* ── Couleurs ── */}
          {couleursDispos.length > 0 && (
            <div style={{ display: "grid", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>
                Couleur {couleur && <span style={{ color: "#1a1410" }}>— {couleur}</span>}
              </span>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {couleursDispos.map((c: any) => {
                  const epuise  = Number(c.stock ?? 0) <= 0;
                  const selected = couleur === c.name;
                  return (
                    <button key={c.name} onClick={() => { if (!epuise) setCouleur(c.name); }} title={c.name}
                      style={{ position: "relative", width: 40, height: 40, borderRadius: 99, border: selected ? "3px solid #1a1410" : "2px solid rgba(0,0,0,0.15)", overflow: "hidden", background: c.hex, cursor: epuise ? "not-allowed" : "pointer", opacity: epuise ? 0.5 : 1, boxShadow: selected ? "0 0 0 3px #f5f0e8, 0 0 0 5px #1a1410" : "none" }}>
                      {c.image_url && <img src={c.image_url} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                      {epuise && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: "130%", height: 2, background: "#c49a4a", transform: "rotate(45deg)" }} /></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Tailles ── */}
          {taillesDispos.length > 0 && (
            <div style={{ display: "grid", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>
                Taille {taille && <span style={{ color: "#1a1410" }}>— {taille}</span>}
              </span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[...TAILLES_ORDER, ...taillesDispos.filter(t => !TAILLES_ORDER.includes(t))].filter(t => taillesDispos.includes(t)).map(t => {
                  const stockT   = Number(sizesStock[t] ?? product.stock ?? 0);
                  const epuise   = stockT <= 0;
                  const selected = taille === t;
                  return (
                    <button key={t} onClick={() => { if (!epuise) setTaille(t); }}
                      style={{ position: "relative", padding: "10px 18px", borderRadius: 10, border: "none", fontWeight: 800, fontSize: "clamp(13px, 1.1vw, 15px)", cursor: epuise ? "not-allowed" : "pointer", background: selected ? "#1a1410" : "#fff", color: selected ? "#f2ede6" : epuise ? "rgba(26,20,16,0.3)" : "#1a1410", boxShadow: selected ? "none" : "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {t}
                      {epuise && <div style={{ position: "absolute", top: "50%", left: "5%", width: "90%", height: 2.5, background: "#c49a4a", transform: "translateY(-50%) rotate(-6deg)", borderRadius: 2 }} />}
                      {!epuise && stockT <= 3 && <span style={{ marginLeft: 5, fontSize: 10, color: "#c49a4a", fontWeight: 700 }}>({stockT})</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ✅ GUIDE DES TAILLES — accordion juste sous les tailles, au-dessus de la quantité */}
          {taillesDispos.length > 0 && (
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(26,20,16,0.1)" }}>
              {/* Titre cliquable */}
              <button
                onClick={() => setGuideOpen(v => !v)}
                style={{ width: "100%", padding: "11px 14px", background: guideOpen ? "#1a1410" : "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <IconSize />
                  <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase", color: guideOpen ? "#c49a4a" : "#1a1410" }}>Guide des tailles</span>
                </div>
                <span style={{ fontSize: 18, color: guideOpen ? "#c49a4a" : "#1a1410", transition: "transform 0.2s", transform: guideOpen ? "rotate(45deg)" : "none", lineHeight: 1, fontWeight: 300 }}>+</span>
              </button>

              {/* Contenu accordion */}
              {guideOpen && (
                <div style={{ background: "#fff" }}>
                  <table className="guide-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f9f6f2" }}>
                        {["Taille", "Poids", "Hauteur", "Âge"].map(h => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", fontStyle: "normal" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {GUIDE_TAILLES.map((row, i) => (
                        <tr key={row.taille} style={{ borderTop: "1px solid rgba(26,20,16,0.05)", background: i % 2 === 0 ? "#fff" : "#faf7f4" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 900, color: "#c49a4a", fontSize: 13 }}>{row.taille}</td>
                          <td style={{ padding: "8px 12px", color: "rgba(26,20,16,0.6)", fontSize: 13 }}>{row.poids}</td>
                          <td style={{ padding: "8px 12px", color: "rgba(26,20,16,0.6)", fontSize: 13 }}>{row.hauteur}</td>
                          <td style={{ padding: "8px 12px", color: "rgba(26,20,16,0.6)", fontSize: 13 }}>{row.age}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: "7px 12px", fontSize: 11, color: "rgba(26,20,16,0.4)", background: "#f9f6f2" }}>
                    En cas de doute, prenez la taille supérieure.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Quantité ── */}
          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>Quantité</span>
            <div style={{ display: "flex", alignItems: "center", background: "#fff", borderRadius: 12, padding: 4, width: "fit-content", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))}
                style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 20, display: "grid", placeItems: "center", color: "#1a1410" }}>−</button>
              <span style={{ width: 40, textAlign: "center", fontWeight: 900, fontSize: 16, color: "#1a1410" }}>{qty}</span>
              <button onClick={() => setQty(Math.min(Number(product.stock ?? 10), qty + 1))}
                style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 20, display: "grid", placeItems: "center", color: "#1a1410" }}>+</button>
            </div>
          </div>

          {/* ── CTA ── */}
          <div style={{ display: "grid", gap: 10 }}>
            <button onClick={handleAddToCart} disabled={outTaille}
              style={{ padding: "17px 24px", borderRadius: 16, border: "none", fontWeight: 900, fontSize: "clamp(14px, 1.4vw, 17px)", cursor: outTaille ? "not-allowed" : "pointer", background: added ? "#2d6a2d" : outTaille ? "#d1cdc8" : "#1a1410", color: added ? "#fff" : outTaille ? "#9ca3af" : "#f2ede6", transition: "all 0.2s" }}>
              {added ? "✓ Ajouté au panier !" : outTaille ? "Épuisé" : `Ajouter — ${(Number(displayPrice) * qty).toFixed(2)} €`}
            </button>
            {cartCount > 0 && (
              <Link href="/panier"
                style={{ padding: "14px 24px", borderRadius: 16, border: "2px solid #1a1410", fontWeight: 800, fontSize: 15, textDecoration: "none", color: "#1a1410", textAlign: "center", display: "block" }}>
                Voir le panier ({cartCount})
              </Link>
            )}
          </div>

          {/* ── Réassurance ── */}
          <div className="reassu-grid">
            {[
              { Icon: IconLeaf,   label: "100% Bambou OEKO-TEX"     },
              { Icon: IconTruck,  label: "Livraison offerte dès 60€" },
              { Icon: IconReturn, label: "Retour gratuit 30 jours"   },
              { Icon: IconLock,   label: "Paiement sécurisé Stripe"  },
            ].map(r => (
              <div key={r.label} style={{ padding: "9px 12px", borderRadius: 10, background: "#fff", display: "flex", alignItems: "center", gap: 7, fontSize: "clamp(10px, 0.9vw, 12px)", fontWeight: 700, color: "rgba(26,20,16,0.65)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", whiteSpace: "nowrap" }}>
                <r.Icon />{r.label}
              </div>
            ))}
          </div>

          {/* ── Composition & Entretien (à droite, pas de vide) ── */}
          <div className="pl-compo">
            <div style={{ padding: "20px 22px", borderRadius: 16, background: "#2a2018", color: "#f2ede6" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: "clamp(13px, 1.3vw, 15px)", fontWeight: 950 }}>Composition</h3>
              {[
                { label: "Matière",    value: "95% Bambou · 5% Spandex"   },
                { label: "Cert.",      value: "OEKO-TEX Standard 100"      },
                { label: "Douceur",    value: "3× plus doux que le coton"  },
                { label: "Propriétés", value: "Thermorég. · Antibactérien" },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 8, paddingBottom: 7, borderBottom: "1px solid rgba(242,237,230,0.06)", marginBottom: 7 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", flexShrink: 0 }}>{row.label}</span>
                  <span style={{ fontSize: 11, color: "rgba(242,237,230,0.65)", textAlign: "right" }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "20px 22px", borderRadius: 16, background: "#fff", border: "1px solid rgba(26,20,16,0.07)" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: "clamp(13px, 1.3vw, 15px)", fontWeight: 950, color: "#1a1410" }}>Entretien</h3>
              {[
                { Icon: IconThermometer, text: "Machine 30°C cycle délicat" },
                { Icon: IconBan,         text: "Pas d'adoucissant"           },
                { Icon: IconFlat,        text: "Séchage à plat"              },
                { Icon: IconHeat,        text: "Pas de sèche-linge chaud"    },
              ].map(item => (
                <div key={item.text} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 9 }}>
                  <div style={{ flexShrink: 0 }}><item.Icon /></div>
                  <span style={{ fontSize: 11, color: "rgba(26,20,16,0.65)", lineHeight: 1.4 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>{/* fin colonne droite */}
      </div>{/* fin pl-outer */}

      {/* ════════════════════════════════════════════════════════════════════
          SECTION PLEINE LARGEUR — en dessous des 2 colonnes
      ════════════════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "0 4vw 80px" }}>

        {/* ✅ PRODUITS LIÉS — avant FAQ */}
        {related.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 8 }}>
                Complétez votre collection
              </div>
              <h2 style={{ margin: 0, fontSize: "clamp(20px, 2.5vw, 28px)", fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>
                Les clients ont aussi acheté
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {related.map((p: any) => (
                <Link key={p.id} href={`/produits/${p.slug}`}
                  style={{ textDecoration: "none", color: "inherit", borderRadius: 16, overflow: "hidden", background: "#fff", border: "1px solid rgba(26,20,16,0.07)", display: "block", transition: "transform 0.2s, box-shadow 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 12px 32px rgba(0,0,0,0.1)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ""; (e.currentTarget as HTMLAnchorElement).style.boxShadow = ""; }}
                >
                  <div style={{ position: "relative", aspectRatio: "3/4", background: "#ede8df" }}>
                    {p.image_url
                      ? <Image src={p.image_url} alt={p.name} fill sizes="240px" style={{ objectFit: "cover" }} />
                      : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 22, fontWeight: 950, color: "#c8bfb2" }}>M!LK</div>
                    }
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 800, fontSize: "clamp(13px, 1.2vw, 15px)", marginBottom: 4, color: "#1a1410", lineHeight: 1.3 }}>{p.name}</div>
                    <div style={{ fontWeight: 950, fontSize: "clamp(15px, 1.5vw, 17px)", color: "#1a1410" }}>{Number(p.price_ttc).toFixed(2)} €</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ✅ FAQ — tout en bas */}
        <div style={{ padding: "24px 28px", borderRadius: 20, background: "#2a2018" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: "clamp(16px, 1.8vw, 20px)", fontWeight: 950, color: "#f2ede6" }}>
            Questions fréquentes
          </h3>
          {FAQ.map(item => <FaqItem key={item.q} q={item.q} r={item.r} />)}
        </div>

      </div>

      {/* ── CTA sticky mobile ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, padding: "12px 16px", background: "rgba(245,240,232,0.97)", backdropFilter: "blur(8px)", borderTop: "1px solid rgba(26,20,16,0.1)", display: "none" }} className="mobile-cta">
        <button onClick={handleAddToCart} disabled={outTaille}
          style={{ width: "100%", padding: "17px", borderRadius: 14, border: "none", fontWeight: 900, fontSize: 17, cursor: outTaille ? "not-allowed" : "pointer", background: added ? "#2d6a2d" : outTaille ? "#d1cdc8" : "#1a1410", color: "#f2ede6" }}>
          {added ? "✓ Ajouté !" : outTaille ? "Épuisé" : `Ajouter — ${(Number(displayPrice) * qty).toFixed(2)} €`}
        </button>
      </div>
      <style>{`.mobile-cta { display: none !important; } @media (max-width: 900px) { .mobile-cta { display: block !important; } }`}</style>

    </div>
  );
}