"use client";

import { useEffect, useRef, useState } from "react";
import { useParams }                   from "next/navigation";
import Image                           from "next/image";
import Link                            from "next/link";
import { useCart }                     from "@/context/CartContext";

function isPromoActive(p: any) {
  if (!p?.promo_price || !p?.promo_start || !p?.promo_end) return false;
  const now = new Date();
  return new Date(p.promo_start) <= now && new Date(p.promo_end) >= now;
}

function getMotifDetails(slug: string) {
  if (slug.includes("eclair"))  return { motif: "Flash",  desc: "éclairs blancs minimalistes sur fond gris anthracite",      vibe: "cool kid" };
  if (slug.includes("smileys")) return { motif: "Smile",  desc: "petits visages souriants, ton beige chaud sur fond caramel", vibe: "cool kid" };
  if (slug.includes("damier"))  return { motif: "Check",  desc: "damier noir et écru, graphique et intemporel",              vibe: "cool kid" };
  if (slug.includes("uni"))     return { motif: "Uni",    desc: "côtelé intemporel, minimaliste et doux",                    vibe: "essentiel" };
  return null;
}

function getProductDescription(product: any): string {
  const cat   = product.category_slug ?? "";
  const motif = getMotifDetails(product.slug ?? "");
  if (cat === "pyjamas") {
    return `Conçu dans un bambou d'une douceur exceptionnelle, ce pyjama accompagne votre bébé aussi bien pendant le sommeil que dans ses moments d'éveil. Sa coupe est pensée pour durer et s'adapter au quotidien des parents : poignets rabattables sur les plus petites tailles pour garder les mains bien au chaud, pieds modulables à porter ouverts ou fermés selon les besoins.${motif ? `\n\nMotif ${motif.motif} : ${motif.desc}, vibe "${motif.vibe}".` : ""}\n\nTailles disponibles : Nouveau-né à 6 mois\nComposition : 95 % viscose de bambou · 5 % élasthanne\n\nExclusivité M!LK.`;
  }
  if (cat === "bodies") {
    return `Body nourrisson en bambou certifié OEKO-TEX. Conçu pour le quotidien : ouverture par le bas facile à 3h du matin, pressions solides, tissu qui ne tire pas.${motif ? `\n\nMotif ${motif.motif} : ${motif.desc}, vibe "${motif.vibe}".` : ""}\n\nTailles disponibles : Nouveau-né à 6 mois\nComposition : 95 % viscose de bambou · 5 % élasthanne\n\nExclusivité M!LK.`;
  }
  if (cat === "gigoteuses") {
    return `Gigoteuse à nouer en bambou certifié OEKO-TEX. Maintient bébé bien au chaud sans le contraindre. Le nœud se règle facilement, même en pleine nuit.${motif ? `\n\nMotif ${motif.motif} : ${motif.desc}, vibe "${motif.vibe}".` : ""}\n\nTailles disponibles : Nouveau-né à 6 mois\nComposition : 95 % viscose de bambou · 5 % élasthanne\n\nExclusivité M!LK.`;
  }
  return product.description ?? "";
}

/* ── Constantes ── */
const TAILLES_ORDER = ["Nouveau-né","0-3 mois","3-6 mois","6-12 mois","0-6 mois","Taille unique","120×120 cm"];

// ✅ Colonne Âge supprimée — juste Taille / Poids / Poitrine / Longueur
const GUIDE_TAILLES = [
  { taille: "Nouveau-né", poids: "2,5 – 4 kg",  poitrine: "21 cm", longueur: "50 cm" },
  { taille: "0-3 mois",   poids: "3,5 – 6 kg",  poitrine: "22 cm", longueur: "54 cm" },
  { taille: "3-6 mois",   poids: "6 – 8 kg",    poitrine: "24 cm", longueur: "57 cm" },
  { taille: "6-12 mois",  poids: "8 – 11 kg",   poitrine: "26 cm", longueur: "62 cm" },
];

/* ── SVG Icons ── */
const IconThermometer = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2v10m0 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/><path d="M12 6h2M12 9h1" stroke="#c49a4a" strokeWidth="1.5" strokeLinecap="round"/></svg>;
const IconBan         = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#c49a4a" strokeWidth="1.8"/><path d="M6 6l12 12" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const IconFlat        = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 12h16M4 8h8M4 16h8" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const IconHeat        = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M8 6c0 2 2 2 2 4s-2 2-2 4M12 4c0 2 2 2 2 4s-2 2-2 4M16 6c0 2 2 2 2 4s-2 2-2 4" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/><path d="M5 19h14" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const IconLeaf        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 22C12 22 4 16 4 9a8 8 0 0 1 16 0c0 7-8 13-8 13z" stroke="#c49a4a" strokeWidth="1.8"/><path d="M12 22V9" stroke="#c49a4a" strokeWidth="1.8"/></svg>;
const IconTruck       = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M1 3h13v13H1z" stroke="#c49a4a" strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 8h4l3 3v5h-7V8z" stroke="#c49a4a" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="5.5" cy="18.5" r="2.5" stroke="#c49a4a" strokeWidth="1.8"/><circle cx="18.5" cy="18.5" r="2.5" stroke="#c49a4a" strokeWidth="1.8"/></svg>;
const IconReturn      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 14H4V9" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 14a9 9 0 1 0 1.5-5" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const IconLock        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#c49a4a" strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#c49a4a" strokeWidth="1.8"/></svg>;
const IconSize        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h10M3 18h6" stroke="#c49a4a" strokeWidth="2" strokeLinecap="round"/></svg>;

/* ── Bandeau icônes ── */
function IconBandeau() {
  const items = [
    {
      label: "Seasonless\nFabric",
      svg: (
        <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="8" stroke="#c49a4a" strokeWidth="1.8"/>
          {[0,45,90,135,180,225,270,315].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            return <line key={i} x1={24+11*Math.cos(rad)} y1={24+11*Math.sin(rad)} x2={24+16*Math.cos(rad)} y2={24+16*Math.sin(rad)} stroke="#c49a4a" strokeWidth="1.6" strokeLinecap="round"/>;
          })}
          <line x1="24" y1="7"  x2="24" y2="41" stroke="#c49a4a" strokeWidth="1.2" opacity="0.4"/>
          <line x1="7"  y1="24" x2="41" y2="24" stroke="#c49a4a" strokeWidth="1.2" opacity="0.4"/>
          <line x1="12" y1="12" x2="36" y2="36" stroke="#c49a4a" strokeWidth="1.2" opacity="0.4"/>
          <line x1="36" y1="12" x2="12" y2="36" stroke="#c49a4a" strokeWidth="1.2" opacity="0.4"/>
        </svg>
      ),
    },
    {
      label: "Anti-\nbactérien",
      svg: (
        <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
          <ellipse cx="24" cy="24" rx="9" ry="11" stroke="#c49a4a" strokeWidth="1.8"/>
          {[-8,-4,0,4,8].map((y, i) => (
            <g key={i}>
              <line x1="15" y1={24+y} x2="11" y2={24+y-3} stroke="#c49a4a" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="33" y1={24+y} x2="37" y2={24+y-3} stroke="#c49a4a" strokeWidth="1.4" strokeLinecap="round"/>
            </g>
          ))}
          <circle cx="24" cy="24" r="19" stroke="#c49a4a" strokeWidth="1.8"/>
          <line x1="9" y1="9" x2="39" y2="39" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: "Hypo-\nallergénique",
      svg: (
        <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
          <path d="M20 38 C20 38 8 28 10 16 C10 16 18 20 20 30" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          <path d="M20 38 C20 38 32 28 30 16 C30 16 22 20 20 30" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          <line x1="20" y1="12" x2="20" y2="38" stroke="#c49a4a" strokeWidth="1.6" strokeLinecap="round"/>
          <path d="M35 28 C35 28 31 22 31 19 C31 16.5 32.8 15 35 15 C37.2 15 39 16.5 39 19 C39 22 35 28 35 28Z" stroke="#c49a4a" strokeWidth="1.6" fill="none"/>
          <path d="M8 20 L13 26 L22 14" stroke="#c49a4a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      label: "Bambou\nOrganique",
      svg: (
        <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
          {[16,24,32].map((x, i) => (
            <g key={i}>
              <line x1={x} y1="42" x2={x} y2="8" stroke="#c49a4a" strokeWidth="2" strokeLinecap="round"/>
              {[14,22,30,38].map((y, j) => (
                <line key={j} x1={x} y1={y} x2={x+(i===1?-6:6)} y2={y-4} stroke="#c49a4a" strokeWidth="1.4" strokeLinecap="round"/>
              ))}
            </g>
          ))}
          <path d="M32 14 C38 8 44 10 42 18 C40 22 34 18 32 14Z" stroke="#c49a4a" strokeWidth="1.5" fill="none"/>
          <path d="M16 20 C10 14 4 16 6 24 C8 28 14 24 16 20Z"   stroke="#c49a4a" strokeWidth="1.5" fill="none"/>
        </svg>
      ),
    },
    {
      label: "Douceur\nExtrême",
      svg: (
        <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
          <path d="M8 30 C8 30 6 28 8 26 C10 24 12 26 12 26 L18 20 C18 20 20 18 22 20 C22 20 24 16 26 17 C26 17 28 14 30 15 C30 15 32 12 34 14 L38 18 C40 20 38 24 36 24 L28 30" stroke="#c49a4a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M8 30 L28 30 C28 30 34 32 34 38 L8 38 C8 38 6 36 8 30Z" stroke="#c49a4a" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
          <ellipse cx="38" cy="10" rx="2" ry="4" stroke="#c49a4a" strokeWidth="1.4" transform="rotate(-30 38 10)"/>
          <path d="M36 8 C32 4 28 6 30 10"  stroke="#c49a4a" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
          <path d="M40 12 C44 8 48 10 46 14" stroke="#c49a4a" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
          <path d="M36 12 C32 16 30 14 32 10" stroke="#c49a4a" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
          <path d="M40 8 C44 4 46 6 44 10"  stroke="#c49a4a" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
          <circle cx="38" cy="10" r="1.5" fill="#c49a4a"/>
        </svg>
      ),
    },
  ];
  return (
    <div style={{ marginTop: 14, background: "#2a2018", borderRadius: 16, padding: "20px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
        {items.map(item => (
          <div key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, minWidth: 60, flex: "1 1 60px", maxWidth: 90 }}>
            {item.svg}
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: "rgba(242,237,230,0.65)", textAlign: "center", lineHeight: 1.4, whiteSpace: "pre-line" }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Badge diagonal ── */
function DiagonalBadge({ label, out }: { label?: string; out: boolean }) {
  if (out) return (
    <div style={{ position: "absolute", top: 0, right: 0, width: 110, height: 110, overflow: "hidden", zIndex: 30, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 26, right: -30, background: "#6b7280", color: "#fff", fontSize: 11, fontWeight: 900, padding: "8px 44px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>Épuisé</div>
    </div>
  );
  const cfg: Record<string,string> = { nouveau:"Nouveau", bestseller:"Best seller", exclusif:"Exclusif", last:"Dernières pièces", promo:"Promo", coup_de_coeur:"Coup de cœur" };
  const text = label ? cfg[label] : null;
  if (!text) return null;
  return (
    <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, overflow: "hidden", zIndex: 30, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 28, right: -34, background: "#c49a4a", color: "#1a1410", fontSize: 11, fontWeight: 900, padding: "9px 48px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{text}</div>
    </div>
  );
}

/* ── Lightbox ── */
function Lightbox({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = document.getElementById(`lb-img-${startIndex}`);
    if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [startIndex, onClose]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.94)", display: "flex", flexDirection: "column" }}>
      <div style={{ flexShrink: 0, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{images.length} photo{images.length > 1 ? "s" : ""}</div>
        <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: 99, background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: "#fff", fontSize: 18, display: "grid", placeItems: "center" }}>✕</button>
      </div>
      <div ref={containerRef} style={{ flex: 1, overflowY: "auto", padding: "0 20px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        {images.map((img, i) => (
          <div key={i} id={`lb-img-${i}`} style={{ width: "min(92vw, 680px)", flexShrink: 0 }}>
            <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", borderRadius: 14, overflow: "hidden" }}>
              <Image src={img} alt={`Photo ${i+1}`} fill style={{ objectFit: "cover" }} sizes="680px"/>
            </div>
            <div style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{i+1} / {images.length}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── FAQ item ── */
function FaqItem({ q, r }: { q: string; r: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: "1px solid rgba(242,237,230,0.07)" }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: "100%", padding: "13px 0", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, textAlign: "left" }}>
        <span style={{ fontWeight: 800, fontSize: "clamp(13px,1.3vw,15px)", color: "#f2ede6", lineHeight: 1.3 }}>{q}</span>
        <span style={{ fontSize: 20, color: "#c49a4a", flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "none", lineHeight: 1 }}>+</span>
      </button>
      {open && <div style={{ padding: "0 0 13px", fontSize: "clamp(13px,1.2vw,14px)", lineHeight: 1.75, color: "rgba(242,237,230,0.55)", whiteSpace: "pre-line" }}>{r}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE PRINCIPALE
═══════════════════════════════════════════════════════════ */
export default function ProductPage() {
  const { slug }             = useParams<{ slug: string }>();
  const { addToCart, items } = useCart();

  const [product,     setProduct]     = useState<any>(null);
  const [related,     setRelated]     = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [taille,      setTaille]      = useState("");
  const [couleur,     setCouleur]     = useState("");
  const [qty,         setQty]         = useState(1);
  const [added,       setAdded]       = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [guideOpen,   setGuideOpen]   = useState(false);

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
    for (let i = 0; i < qty; i++) addToCart({ id: String(product.id), slug: product.slug, name, price: promo ? product.promo_price : product.price_ttc, quantity: 1 });
    setAdded(true); setTimeout(() => setAdded(false), 2500);
  }

  if (loading) return <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: "#f5f0e8" }}><div style={{ opacity: 0.4 }}>Chargement...</div></div>;
  if (!product) return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: "#f5f0e8", padding: 40, textAlign: "center" }}>
      <div><div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12, color: "#1a1410" }}>Produit introuvable</div>
      <Link href="/produits" style={{ padding: "12px 24px", borderRadius: 12, background: "#1a1410", color: "#f2ede6", fontWeight: 800, textDecoration: "none" }}>← Retour</Link></div>
    </div>
  );

  const promo         = isPromoActive(product);
  const out           = Number(product.stock ?? 0) <= 0;
  const lowStock      = !out && Number(product.stock ?? 0) <= 5;
  const displayPrice  = promo ? product.promo_price : product.price_ttc;
  const badgeLabel    = out ? undefined : (product.label || (promo ? "promo" : undefined));
  const allImages     = [product.image_url, product.image_url_2, product.image_url_3, product.image_url_4].filter(Boolean) as string[];
  const taillesDispos : string[]              = Array.isArray(product.sizes)  ? product.sizes  : [];
  const sizesStock    : Record<string,number> = product.sizes_stock ?? {};
  const couleursDispos: any[]                 = Array.isArray(product.colors) ? product.colors : [];
  const outTaille     = taille ? Number(sizesStock[taille] ?? product.stock ?? 0) <= 0 : out;
  const cartCount     = items.reduce((s, i) => s + i.quantity, 0);
  const description   = getProductDescription(product);

  const photoRows: string[][] = [];
  if (allImages.length === 0) { photoRows.push(["placeholder"]); }
  else { for (let i = 0; i < allImages.length; i += 2) photoRows.push(allImages.slice(i, i + 2)); }

  const FAQ = [
    { q: "Comment entretenir ce vêtement ?",  r: "Lavage à froid, cycle délicat. Lessive douce, sans agents agressifs ni javel. Séchage à l'air libre recommandé (le sèche-linge fatigue la matière). Évite les adoucissants, ça encrasse les fibres. Stocke dans un endroit sec. Traite les taches rapidement pour éviter qu'elles s'installent." },
    { q: "Quelle taille choisir ?",            r: "En cas de doute, prenez la taille supérieure. Le bambou est extrêmement flexible — votre bébé sera à l'aise même si la taille est légèrement grande." },
    { q: "Le bambou est-il doux pour bébé ?",  r: "Oui — naturellement doux et respectueux des peaux sensibles. Respirant, il limite la surchauffe. Régule la température : frais en été, chaud en hiver. Absorbe l'humidité pour un confort optimal, jour et nuit." },
    // ✅ 15 jours
    { q: "Retour possible ?",                  r: "Oui, 15 jours après réception. Retour entièrement gratuit pour les articles non utilisés. contact@milkbebe.fr" },
  ];

  return (
    <div style={{ background: "#f5f0e8", minHeight: "100vh" }}>

      {lightboxIdx !== null && allImages.length > 0 && (
        <Lightbox images={allImages} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      <style>{`
        .pl-outer { display: grid; grid-template-columns: 1fr 1fr; gap: 0; align-items: start; max-width: 1800px; margin: 0 auto; }
        .pl-left  { padding: 16px 24px 80px 4vw; }
        .pl-right { position: sticky; top: 84px; padding: 16px 4vw 80px 24px; display: grid; gap: 18px; max-height: calc(100vh - 84px); overflow-y: auto; scrollbar-width: none; }
        .pl-right::-webkit-scrollbar { display: none; }
        .photo-row  { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .photo-item { position: relative; aspect-ratio: 3/4; border-radius: 14px; overflow: hidden; background: #ede8df; cursor: zoom-in; }
        .photo-item.single { grid-column: 1 / -1; aspect-ratio: 4/5; }
        .care-stack { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (max-width: 900px) {
          .pl-outer { grid-template-columns: 1fr !important; }
          .pl-left  { padding: 12px 4vw 24px !important; }
          .pl-right { position: static !important; max-height: none !important; padding: 0 4vw 120px !important; overflow: visible !important; }
          .photo-row { gap: 6px; margin-bottom: 6px; }
        }
      `}</style>

      {/* Breadcrumb */}
      <div style={{ paddingTop: 84, maxWidth: 1800, margin: "0 auto", padding: "84px 4vw 0" }}>
        <div style={{ display: "flex", gap: 8, fontSize: 13, color: "rgba(26,20,16,0.4)", flexWrap: "wrap", paddingBottom: 8 }}>
          <Link href="/"         style={{ textDecoration: "none", color: "inherit" }}>Accueil</Link>
          <span>/</span>
          <Link href="/produits" style={{ textDecoration: "none", color: "inherit" }}>Produits</Link>
          <span>/</span>
          <span style={{ color: "#1a1410", fontWeight: 600 }}>{product.name}</span>
        </div>
      </div>

      <div className="pl-outer">

        {/* ─── GAUCHE : photos + bandeau ─── */}
        <div className="pl-left">
          <div style={{ position: "relative" }}>
            <DiagonalBadge label={badgeLabel} out={out} />
            {photoRows.map((row, ri) => (
              <div key={ri} className="photo-row">
                {row.map((img, ci) => {
                  const idx = ri * 2 + ci;
                  const isPlaceholder = img === "placeholder";
                  const isSingle = row.length === 1;
                  return (
                    <div key={ci} className={`photo-item${isSingle ? " single" : ""}`}
                      onClick={() => { if (!isPlaceholder) setLightboxIdx(idx); }}>
                      {isPlaceholder ? (
                        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 28, fontWeight: 950, color: "#c8bfb2" }}>M!LK</div>
                      ) : (
                        <>
                          <Image src={img} alt={`${product.name} ${idx+1}`} fill sizes="(max-width:900px) 50vw, 25vw" style={{ objectFit: "cover" }} />
                          {ri === 0 && ci === 0 && lowStock && (
                            <div style={{ position: "absolute", top: 10, left: 10, zIndex: 5 }}>
                              <span style={{ padding: "5px 11px", borderRadius: 99, background: "rgba(180,80,60,0.85)", color: "#fff", fontSize: 11, fontWeight: 800 }}>Plus que {product.stock} !</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <IconBandeau />
        </div>

        {/* ─── DROITE : panneau achat ─── */}
        <div className="pl-right">

          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: "#c49a4a" }}>
            {product.category_slug ?? "M!LK"} · Bambou OEKO-TEX
          </div>

          <h1 style={{ margin: 0, fontSize: "clamp(22px,2vw,30px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.1, color: "#1a1410" }}>
            {product.name}
          </h1>

          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontSize: "clamp(24px,2.2vw,30px)", fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>{Number(displayPrice).toFixed(2)} €</span>
            {promo && <span style={{ fontSize: 17, textDecoration: "line-through", color: "rgba(26,20,16,0.35)", fontWeight: 700 }}>{Number(product.price_ttc).toFixed(2)} €</span>}
            <span style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>TTC</span>
          </div>

          {description && (
            <div style={{ fontSize: "clamp(13px,1.1vw,15px)", lineHeight: 1.85, color: "rgba(26,20,16,0.65)", whiteSpace: "pre-line" }}>
              {description}
            </div>
          )}

          <details style={{ background: "rgba(196,154,74,0.07)", borderRadius: 12, border: "1px solid rgba(196,154,74,0.15)", overflow: "hidden" }}>
            <summary style={{ padding: "11px 14px", cursor: "pointer", fontWeight: 800, fontSize: 13, color: "#c49a4a", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              Pourquoi le bambou M!LK ?
              <span style={{ fontSize: 16, fontWeight: 300 }}>+</span>
            </summary>
            <div style={{ padding: "0 14px 14px", fontSize: 13, lineHeight: 1.8, color: "rgba(26,20,16,0.6)" }}>
              Le bambou n'est pas juste "tendance", il est surtout fonctionnel : naturellement doux et respectueux des peaux sensibles, respirant (limite la surchauffe), thermorégulateur (frais l'été, chaud l'hiver), et absorbe l'humidité pour un confort optimal jour et nuit. <strong style={{ color: "#1a1410" }}>Un seul pyjama, toute l'année.</strong>
            </div>
          </details>

          <div style={{ padding: "10px 14px", borderRadius: 10, background: "#2a2018", display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: "rgba(242,237,230,0.7)" }}>
              <strong style={{ color: "#c49a4a" }}>Composition :</strong> 95 % viscose de bambou · 5 % élasthanne
            </div>
          </div>

          {/* Couleurs */}
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

          {/* Tailles */}
          {taillesDispos.length > 0 && (
            <div style={{ display: "grid", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>
                Taille {taille && <span style={{ color: "#1a1410" }}>— {taille}</span>}
              </span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[...TAILLES_ORDER, ...taillesDispos.filter(t => !TAILLES_ORDER.includes(t))].filter(t => taillesDispos.includes(t)).map(t => {
                  const stockT  = Number(sizesStock[t] ?? product.stock ?? 0);
                  const epuise  = stockT <= 0;
                  const selected = taille === t;
                  return (
                    <button key={t} onClick={() => { if (!epuise) setTaille(t); }}
                      style={{ position: "relative", padding: "10px 18px", borderRadius: 10, border: "none", fontWeight: 800, fontSize: "clamp(12px,1vw,14px)", cursor: epuise ? "not-allowed" : "pointer", background: selected ? "#1a1410" : "#fff", color: selected ? "#f2ede6" : epuise ? "rgba(26,20,16,0.3)" : "#1a1410", boxShadow: selected ? "none" : "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {t}
                      {epuise && <div style={{ position: "absolute", top: "50%", left: "5%", width: "90%", height: 2, background: "#c49a4a", transform: "translateY(-50%) rotate(-6deg)", borderRadius: 2 }} />}
                      {!epuise && stockT <= 3 && <span style={{ marginLeft: 5, fontSize: 10, color: "#c49a4a", fontWeight: 700 }}>({stockT})</span>}
                    </button>
                  );
                })}
              </div>

              {/* ✅ Note flexibilité bambou — juste sous les tailles */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 12px", borderRadius: 10, background: "rgba(196,154,74,0.08)", border: "1px solid rgba(196,154,74,0.18)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="9" stroke="#c49a4a" strokeWidth="1.8"/>
                  <path d="M12 8v4M12 16h.01" stroke="#c49a4a" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: 12, color: "rgba(26,20,16,0.6)", lineHeight: 1.5, fontWeight: 600 }}>
                  Le bambou est extrêmement flexible — pas de risque de trop petit ou trop grand. En cas de doute, prenez la taille au-dessus.
                </span>
              </div>
            </div>
          )}

          {/* ✅ Guide des tailles — accordion, colonnes centrées, sans colonne Âge */}
          {taillesDispos.length > 0 && (
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(26,20,16,0.1)" }}>
              <button onClick={() => setGuideOpen(v => !v)}
                style={{ width: "100%", padding: "11px 14px", background: guideOpen ? "#1a1410" : "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <IconSize />
                  <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase", color: guideOpen ? "#c49a4a" : "#1a1410" }}>Guide des tailles</span>
                </div>
                <span style={{ fontSize: 18, color: guideOpen ? "#c49a4a" : "#1a1410", transition: "transform 0.2s", transform: guideOpen ? "rotate(45deg)" : "none", fontWeight: 300 }}>+</span>
              </button>
              {guideOpen && (
                <div style={{ background: "#fff", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 280 }}>
                    <thead>
                      <tr style={{ background: "#f9f6f2" }}>
                        {["Taille", "Poids", "Poitrine (pyjama)", "Longueur (pyjama)"].map(h => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "center", fontSize: 9, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", whiteSpace: "nowrap" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {GUIDE_TAILLES.map((row, i) => (
                        <tr key={row.taille} style={{ borderTop: "1px solid rgba(26,20,16,0.05)", background: i % 2 === 0 ? "#fff" : "#faf7f4" }}>
                          {/* ✅ Taille : alignée à gauche en amber */}
                          <td style={{ padding: "9px 10px", fontWeight: 900, color: "#c49a4a", fontSize: 13, textAlign: "left" }}>{row.taille}</td>
                          {/* ✅ Autres colonnes : centrées */}
                          <td style={{ padding: "9px 10px", color: "rgba(26,20,16,0.6)", fontSize: 12, textAlign: "center" }}>{row.poids}</td>
                          <td style={{ padding: "9px 10px", color: "rgba(26,20,16,0.6)", fontSize: 13, fontWeight: 700, textAlign: "center" }}>{row.poitrine}</td>
                          <td style={{ padding: "9px 10px", color: "rgba(26,20,16,0.6)", fontSize: 13, fontWeight: 700, textAlign: "center" }}>{row.longueur}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: "7px 12px", fontSize: 11, color: "rgba(26,20,16,0.4)", background: "#f9f6f2" }}>
                    En cas de doute, prenez la taille supérieure. Mesures relevées à plat sur le vêtement.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quantité */}
          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>Quantité</span>
            <div style={{ display: "flex", alignItems: "center", background: "#fff", borderRadius: 12, padding: 4, width: "fit-content", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 20, display: "grid", placeItems: "center", color: "#1a1410" }}>−</button>
              <span style={{ width: 40, textAlign: "center", fontWeight: 900, fontSize: 16, color: "#1a1410" }}>{qty}</span>
              <button onClick={() => setQty(Math.min(Number(product.stock ?? 10), qty + 1))} style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 20, display: "grid", placeItems: "center", color: "#1a1410" }}>+</button>
            </div>
          </div>

          {/* CTA */}
          <div style={{ display: "grid", gap: 10 }}>
            <button onClick={handleAddToCart} disabled={outTaille}
              style={{ padding: "17px 24px", borderRadius: 16, border: "none", fontWeight: 900, fontSize: "clamp(14px,1.3vw,17px)", cursor: outTaille ? "not-allowed" : "pointer", background: added ? "#2d6a2d" : outTaille ? "#d1cdc8" : "#1a1410", color: added ? "#fff" : outTaille ? "#9ca3af" : "#f2ede6", transition: "all 0.2s" }}>
              {added ? "✓ Ajouté au panier !" : outTaille ? "Épuisé" : `Ajouter — ${(Number(displayPrice) * qty).toFixed(2)} €`}
            </button>
            {cartCount > 0 && (
              <Link href="/panier" style={{ padding: "13px 24px", borderRadius: 16, border: "2px solid #1a1410", fontWeight: 800, fontSize: 14, textDecoration: "none", color: "#1a1410", textAlign: "center", display: "block" }}>
                Voir le panier ({cartCount})
              </Link>
            )}
          </div>

          {/* ✅ Réassurance — 15 jours */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { Icon: IconLeaf,   label: "100% Bambou OEKO-TEX"     },
              { Icon: IconTruck,  label: "Livraison offerte dès 60€" },
              { Icon: IconReturn, label: "Retour gratuit 15 jours"   },
              { Icon: IconLock,   label: "Paiement sécurisé Stripe"  },
            ].map(r => (
              <div key={r.label} style={{ padding: "9px 11px", borderRadius: 10, background: "#fff", display: "flex", alignItems: "center", gap: 7, fontSize: "clamp(10px,0.9vw,12px)", fontWeight: 700, color: "rgba(26,20,16,0.65)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", whiteSpace: "nowrap" }}>
                <r.Icon />{r.label}
              </div>
            ))}
          </div>

          {/* Composition + Entretien — l'un sous l'autre */}
          <div className="care-stack">
            <div style={{ padding: "18px 20px", borderRadius: 16, background: "#2a2018", color: "#f2ede6" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: "clamp(13px,1.2vw,15px)", fontWeight: 950 }}>Composition</h3>
              {[
                { label: "Matière",    value: "95 % viscose de bambou · 5 % élasthanne"              },
                { label: "Cert.",      value: "OEKO-TEX Standard 100"                                 },
                { label: "Douceur",    value: "3× plus doux que le coton"                             },
                { label: "Propriétés", value: "Thermorégulateur · Antibactérien · Hypoallergénique"   },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 8, paddingBottom: 7, borderBottom: "1px solid rgba(242,237,230,0.06)", marginBottom: 7 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", flexShrink: 0, paddingTop: 1 }}>{row.label}</span>
                  <span style={{ fontSize: "clamp(11px,1vw,13px)", color: "rgba(242,237,230,0.65)", textAlign: "right" }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "18px 20px", borderRadius: 16, background: "#fff", border: "1px solid rgba(26,20,16,0.07)" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: "clamp(13px,1.2vw,15px)", fontWeight: 950, color: "#1a1410" }}>Conseils d'entretien</h3>
              {[
                { Icon: IconThermometer, text: "Lavage à froid, cycle délicat"    },
                { Icon: IconBan,         text: "Sans adoucissant ni javel"         },
                { Icon: IconFlat,        text: "Séchage à l'air libre recommandé" },
                { Icon: IconHeat,        text: "Sèche-linge déconseillé"           },
              ].map(item => (
                <div key={item.text} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <div style={{ flexShrink: 0 }}><item.Icon /></div>
                  <span style={{ fontSize: "clamp(12px,1vw,13px)", color: "rgba(26,20,16,0.65)", lineHeight: 1.4 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── BAS DE PAGE ── */}
      <div style={{ maxWidth: 1800, margin: "0 auto", padding: "0 4vw 80px" }}>

        {related.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 8 }}>Complétez votre collection</div>
              <h2 style={{ margin: 0, fontSize: "clamp(20px,2.5vw,28px)", fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>Les clients ont aussi acheté</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {related.map((p: any) => (
                <Link key={p.id} href={`/produits/${p.slug}`}
                  style={{ textDecoration: "none", color: "inherit", borderRadius: 16, overflow: "hidden", background: "#fff", border: "1px solid rgba(26,20,16,0.07)", display: "block", transition: "transform 0.2s, box-shadow 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 12px 32px rgba(0,0,0,0.1)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ""; (e.currentTarget as HTMLAnchorElement).style.boxShadow = ""; }}>
                  <div style={{ position: "relative", aspectRatio: "3/4", background: "#ede8df" }}>
                    {p.image_url ? <Image src={p.image_url} alt={p.name} fill sizes="240px" style={{ objectFit: "cover" }} /> : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 22, fontWeight: 950, color: "#c8bfb2" }}>M!LK</div>}
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 800, fontSize: "clamp(13px,1.1vw,15px)", marginBottom: 4, color: "#1a1410", lineHeight: 1.3 }}>{p.name}</div>
                    <div style={{ fontWeight: 950, fontSize: "clamp(15px,1.4vw,17px)", color: "#1a1410" }}>{Number(p.price_ttc).toFixed(2)} €</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: "24px 28px", borderRadius: 20, background: "#2a2018" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: "clamp(16px,1.8vw,20px)", fontWeight: 950, color: "#f2ede6" }}>Questions fréquentes</h3>
          {FAQ.map(item => <FaqItem key={item.q} q={item.q} r={item.r} />)}
        </div>
      </div>

      <div className="mobile-cta-bar" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, padding: "12px 16px", background: "rgba(245,240,232,0.97)", backdropFilter: "blur(8px)", borderTop: "1px solid rgba(26,20,16,0.1)" }}>
        <button onClick={handleAddToCart} disabled={outTaille}
          style={{ width: "100%", padding: "17px", borderRadius: 14, border: "none", fontWeight: 900, fontSize: 17, cursor: outTaille ? "not-allowed" : "pointer", background: added ? "#2d6a2d" : outTaille ? "#d1cdc8" : "#1a1410", color: "#f2ede6" }}>
          {added ? "✓ Ajouté !" : outTaille ? "Épuisé" : `Ajouter — ${(Number(displayPrice) * qty).toFixed(2)} €`}
        </button>
      </div>
      <style>{`.mobile-cta-bar{display:none!important}@media(max-width:900px){.mobile-cta-bar{display:block!important}}`}</style>
    </div>
  );
}