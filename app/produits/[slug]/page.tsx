"use client";

import { useEffect, useRef, useState } from "react";
import { useParams }                   from "next/navigation";
import Image                           from "next/image";
import Link                            from "next/link";
import { useCart }                     from "@/context/CartContext";

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
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

const GUIDE_TAILLES = [
  { taille: "Nouveau-né", poids: "2,5 – 4 kg", poitrine: "21 cm", longueur: "50 cm" },
  { taille: "0-3 mois",   poids: "3,5 – 6 kg", poitrine: "22 cm", longueur: "54 cm" },
  { taille: "3-6 mois",   poids: "6 – 8 kg",   poitrine: "24 cm", longueur: "57 cm" },
  { taille: "6-12 mois",  poids: "8 – 11 kg",  poitrine: "26 cm", longueur: "62 cm" },
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

/* ─────────────────────────────────────────────────────────────
   ✅ BANDEAU 5 ICÔNES — reproduction exacte de l'image
   Labels traduits en français, couleurs M!LK amber
───────────────────────────────────────────────────────────── */
function IconBandeau() {
  const C = "#c49a4a";
  const items = [
    {
      label: "Toutes\nSaisons",
      svg: (
        // Soleil + flocon fusionnés : moitié gauche flocon, moitié droite soleil
        <svg width="52" height="52" viewBox="0 0 64 64" fill="none">
          {/* ── Flocon côté gauche ── */}
          <line x1="32" y1="6"  x2="32" y2="58" stroke={C} strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="6"  y1="32" x2="32" y2="32" stroke={C} strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="11" y1="11" x2="32" y2="32" stroke={C} strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="11" y1="53" x2="32" y2="32" stroke={C} strokeWidth="1.8" strokeLinecap="round"/>
          {/* Petites branches flocon */}
          <line x1="32" y1="12" x2="27" y2="17" stroke={C} strokeWidth="1.4" strokeLinecap="round"/>
          <line x1="32" y1="12" x2="37" y2="17" stroke={C} strokeWidth="1.4" strokeLinecap="round"/>
          <line x1="32" y1="52" x2="27" y2="47" stroke={C} strokeWidth="1.4" strokeLinecap="round"/>
          <line x1="32" y1="52" x2="37" y2="47" stroke={C} strokeWidth="1.4" strokeLinecap="round"/>
          <line x1="10" y1="32" x2="15" y2="27" stroke={C} strokeWidth="1.4" strokeLinecap="round"/>
          <line x1="10" y1="32" x2="15" y2="37" stroke={C} strokeWidth="1.4" strokeLinecap="round"/>
          <line x1="14" y1="14" x2="19" y2="14" stroke={C} strokeWidth="1.4" strokeLinecap="round"/>
          <line x1="14" y1="14" x2="14" y2="19" stroke={C} strokeWidth="1.4" strokeLinecap="round"/>
          <line x1="14" y1="50" x2="19" y2="50" stroke={C} strokeWidth="1.4" strokeLinecap="round"/>
          <line x1="14" y1="50" x2="14" y2="45" stroke={C} strokeWidth="1.4" strokeLinecap="round"/>
          {/* ── Soleil côté droit ── */}
          {[0, 45, 90, 135, 180].map((deg, i) => {
            const r = (deg * Math.PI) / 180;
            const cx = 32, cy = 32;
            return <line key={i} x1={cx + 14*Math.cos(r)} y1={cy + 14*Math.sin(r)} x2={cx + 22*Math.cos(r)} y2={cy + 22*Math.sin(r)} stroke={C} strokeWidth="2" strokeLinecap="round"/>;
          })}
          {/* Demi-cercle soleil droite */}
          <path d="M32 18 A14 14 0 0 1 32 46 Z" stroke={C} strokeWidth="1.6" fill="none"/>
        </svg>
      ),
    },
    {
      label: "Anti-\nbactérien",
      svg: (
        // Bactérie ovale avec pattes dans un cercle barré
        <svg width="52" height="52" viewBox="0 0 64 64" fill="none">
          {/* Grand cercle barré */}
          <circle cx="32" cy="32" r="27" stroke={C} strokeWidth="1.8"/>
          <line x1="12" y1="12" x2="52" y2="52" stroke={C} strokeWidth="1.8" strokeLinecap="round"/>
          {/* Corps bactérie ovale */}
          <ellipse cx="32" cy="32" rx="10" ry="13" stroke={C} strokeWidth="1.8"/>
          {/* Pattes */}
          {[-7, -2, 4, 9].map((y, i) => (
            <g key={i}>
              <line x1="22" y1={32+y} x2="16" y2={30+y} stroke={C} strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="42" y1={32+y} x2="48" y2={30+y} stroke={C} strokeWidth="1.4" strokeLinecap="round"/>
            </g>
          ))}
          {/* Points surface bactérie */}
          <circle cx="29" cy="27" r="1.8" fill={C}/>
          <circle cx="36" cy="32" r="1.8" fill={C}/>
          <circle cx="28" cy="37" r="1.8" fill={C}/>
        </svg>
      ),
    },
    {
      label: "Hypo-\nallergénique",
      svg: (
        // Branche feuille + goutte d'eau + coche
        <svg width="52" height="52" viewBox="0 0 64 64" fill="none">
          {/* Feuille principale gauche */}
          <path d="M22 54 C22 54 8 42 10 26 C10 26 22 30 22 42" stroke={C} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          <path d="M22 54 C22 54 36 42 34 26 C34 26 22 30 22 42" stroke={C} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          <line x1="22" y1="16" x2="22" y2="54" stroke={C} strokeWidth="1.8" strokeLinecap="round"/>
          {/* Petite feuille en haut à droite */}
          <path d="M30 16 C36 8 46 12 42 22 C40 26 30 22 30 16Z" stroke={C} strokeWidth="1.5" fill="none"/>
          <line x1="30" y1="16" x2="40" y2="22" stroke={C} strokeWidth="1.2" strokeLinecap="round"/>
          {/* Goutte eau droite */}
          <path d="M48 40 C48 40 43 32 43 28 C43 25 45 23 48 23 C51 23 53 25 53 28 C53 32 48 40 48 40Z" stroke={C} strokeWidth="1.6" fill="none"/>
          {/* Grande coche */}
          <path d="M6 34 L14 44 L28 24" stroke={C} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      label: "Bambou\nBio",
      svg: (
        // 3 tiges bambou avec nœuds et feuilles
        <svg width="52" height="52" viewBox="0 0 64 64" fill="none">
          {/* Tige gauche */}
          <line x1="18" y1="58" x2="18" y2="10" stroke={C} strokeWidth="2.2" strokeLinecap="round"/>
          {[48,36,24,14].map((y,i) => <line key={i} x1="15" y1={y} x2="21" y2={y} stroke={C} strokeWidth="2" strokeLinecap="round"/>)}
          {/* Feuilles tige gauche */}
          <path d="M18 28 C8 22 4 12 10 10 C14 9 18 18 18 28Z" stroke={C} strokeWidth="1.5" fill="none"/>
          <path d="M18 40 C8 46 4 54 10 56 C14 57 18 46 18 40Z" stroke={C} strokeWidth="1.5" fill="none"/>

          {/* Tige centrale */}
          <line x1="32" y1="58" x2="32" y2="8" stroke={C} strokeWidth="2.2" strokeLinecap="round"/>
          {[50,38,26,14].map((y,i) => <line key={i} x1="29" y1={y} x2="35" y2={y} stroke={C} strokeWidth="2" strokeLinecap="round"/>)}

          {/* Tige droite */}
          <line x1="46" y1="58" x2="46" y2="10" stroke={C} strokeWidth="2.2" strokeLinecap="round"/>
          {[48,36,24,14].map((y,i) => <line key={i} x1="43" y1={y} x2="49" y2={y} stroke={C} strokeWidth="2" strokeLinecap="round"/>)}
          {/* Feuilles tige droite */}
          <path d="M46 22 C56 16 60 8 54 6 C50 5 46 14 46 22Z" stroke={C} strokeWidth="1.5" fill="none"/>
          <path d="M46 44 C56 50 60 58 54 60 C50 61 46 50 46 44Z" stroke={C} strokeWidth="1.5" fill="none"/>
        </svg>
      ),
    },
    {
      label: "Ultra\nDoux",
      svg: (
        // Main paume tendue + libellule
        <svg width="52" height="52" viewBox="0 0 64 64" fill="none">
          {/* Paume */}
          <path d="M10 44 C10 44 8 40 10 36 C12 32 16 36 16 36 L24 27 C24 27 27 24 30 26 C30 26 32 21 35 22 C35 22 37 18 40 19 C40 19 42 16 45 18 L51 25 C53 28 51 33 48 33 L38 42" stroke={C} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M10 44 L38 44 C38 44 45 46 45 54 L10 54 C10 54 8 50 10 44Z" stroke={C} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          {/* Lignes de la paume */}
          <path d="M14 49 Q26 47 38 49" stroke={C} strokeWidth="1.1" strokeLinecap="round" fill="none"/>
          {/* Corps libellule */}
          <ellipse cx="54" cy="14" rx="2.5" ry="5" stroke={C} strokeWidth="1.5" transform="rotate(-20 54 14)"/>
          <circle cx="54" cy="9" r="2" fill={C}/>
          {/* Ailes libellule — 4 ailes */}
          <path d="M52 12 C44 6 38 8 40 14" stroke={C} strokeWidth="1.3" strokeLinecap="round" fill="none"/>
          <path d="M56 12 C62 5 68 8 66 14" stroke={C} strokeWidth="1.3" strokeLinecap="round" fill="none"/>
          <path d="M52 16 C44 22 40 28 44 30" stroke={C} strokeWidth="1.3" strokeLinecap="round" fill="none"/>
          <path d="M56 16 C62 22 66 26 62 30" stroke={C} strokeWidth="1.3" strokeLinecap="round" fill="none"/>
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
    { q: "Comment entretenir ce vêtement ?",  r: "Lavage à froid, cycle délicat. Lessive douce, sans agents agressifs ni javel. Séchage à l'air libre recommandé (le sèche-linge fatigue la matière). Évite les adoucissants, ça encrasse les fibres. Stocke dans un endroit sec. Traite les taches rapidement." },
    { q: "Quelle taille choisir ?",            r: "En cas de doute, prenez la taille supérieure. Le bambou est extrêmement flexible — votre bébé sera à l'aise même si la taille est légèrement grande." },
    { q: "Le bambou est-il doux pour bébé ?",  r: "Oui — naturellement doux et respectueux des peaux sensibles. Respirant, il limite la surchauffe. Régule la température : frais en été, chaud en hiver. Absorbe l'humidité pour un confort optimal, jour et nuit." },
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
                          <Image src={img} alt={`${product.name} ${idx+1}`} fill sizes="(max-width:900px) 50vw, 25vw" style={{ objectFit: "cover" }}/>
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
          {/* ✅ Bandeau 5 icônes — sous les photos */}
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
            <div style={{ fontSize: "clamp(13px,1.1vw,15px)", lineHeight: 1.85, color: "rgba(26,20,16,0.65)", whiteSpace: "pre-line" }}>{description}</div>
          )}

          <details style={{ background: "rgba(196,154,74,0.07)", borderRadius: 12, border: "1px solid rgba(196,154,74,0.15)", overflow: "hidden" }}>
            <summary style={{ padding: "11px 14px", cursor: "pointer", fontWeight: 800, fontSize: 13, color: "#c49a4a", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              Pourquoi le bambou M!LK ?
              <span style={{ fontSize: 16, fontWeight: 300 }}>+</span>
            </summary>
            <div style={{ padding: "0 14px 14px", fontSize: 13, lineHeight: 1.8, color: "rgba(26,20,16,0.6)" }}>
              Le bambou n'est pas juste "tendance", il est surtout fonctionnel : naturellement doux et respectueux des peaux sensibles, respirant (limite la surchauffe), thermorégulateur (frais l'été, chaud l'hiver), et absorbe l'humidité pour un confort optimal jour et nuit.{" "}
              <strong style={{ color: "#1a1410" }}>Un seul pyjama, toute l'année.</strong>
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

              {/* Note flexibilité bambou */}
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

          {/* Guide des tailles */}
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
                        {["Taille","Poids","Poitrine (pyjama)","Longueur (pyjama)"].map(h => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "center", fontSize: 9, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {GUIDE_TAILLES.map((row, i) => (
                        <tr key={row.taille} style={{ borderTop: "1px solid rgba(26,20,16,0.05)", background: i % 2 === 0 ? "#fff" : "#faf7f4" }}>
                          <td style={{ padding: "9px 10px", fontWeight: 900, color: "#c49a4a", fontSize: 13, textAlign: "left" }}>{row.taille}</td>
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

          {/* Réassurance — 15 jours */}
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

          {/* Composition + Entretien */}
          <div className="care-stack">
            <div style={{ padding: "18px 20px", borderRadius: 16, background: "#2a2018", color: "#f2ede6" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: "clamp(13px,1.2vw,15px)", fontWeight: 950 }}>Composition</h3>
              {[
                { label: "Matière",    value: "95 % viscose de bambou · 5 % élasthanne"            },
                { label: "Cert.",      value: "OEKO-TEX Standard 100"                               },
                { label: "Douceur",    value: "3× plus doux que le coton"                           },
                { label: "Propriétés", value: "Thermorégulateur · Antibactérien · Hypoallergénique" },
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