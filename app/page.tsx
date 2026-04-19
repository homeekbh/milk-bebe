"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Image from "next/image";
import Link  from "next/link";

// ✅ Fond marron plus clair
const C = {
  bg:    "#3a2a1a",
  bg2:   "#44301e",
  bg3:   "#503822",
  warm:  "#f2ede6",
  muted: "rgba(242,237,230,0.6)",
  faint: "rgba(242,237,230,0.08)",
  amber: "#c49a4a",
};

function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el); return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold });
    obs.observe(el); return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible }  = useScrollReveal(0.3);
  useEffect(() => {
    if (!visible) return;
    let start = 0; const step = Math.ceil(value / 60);
    const timer = setInterval(() => { start += step; if (start >= value) { setCount(value); clearInterval(timer); } else setCount(start); }, 25);
    return () => clearInterval(timer);
  }, [visible, value]);
  return <span ref={ref}>{count.toLocaleString("fr-FR")}{suffix}</span>;
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(28px)", transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s` }}>
      {children}
    </div>
  );
}

// ✅ Icônes SVG au trait — couleurs site uniquement
function IconLeaf({ size = 30, color = "#c49a4a" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M12 22C12 22 4 16 4 9a8 8 0 0 1 16 0c0 7-8 13-8 13z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/><path d="M12 22V9" stroke={color} strokeWidth="1.8" strokeLinecap="round"/></svg>;
}
function IconTruck({ size = 30, color = "#c49a4a" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M1 3h13v13H1z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 8h4l3 3v5h-7V8z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/><circle cx="5.5" cy="18.5" r="2.5" stroke={color} strokeWidth="1.8"/><circle cx="18.5" cy="18.5" r="2.5" stroke={color} strokeWidth="1.8"/></svg>;
}
function IconReturn({ size = 30, color = "#c49a4a" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M9 14H4V9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 14a9 9 0 1 0 1.5-5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/></svg>;
}
function IconLock({ size = 30, color = "#c49a4a" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth="1.8" strokeLinecap="round"/></svg>;
}
function IconBodies({ size = 36, color = "#c49a4a" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M12 3c-1.5 0-2.5.8-2.5 2v1H7L5 8v4h2v8h10v-8h2V8l-2-2h-2.5V5c0-1.2-1-2-2.5-2Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round"/></svg>;
}
function IconPyjama({ size = 36, color = "#c49a4a" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M8 3h8M8 3C6 3 5 4.5 5 6v16h14V6c0-1.5-1-3-3-3" stroke={color} strokeWidth="1.6" strokeLinecap="round"/><path d="M9 3v4l3 2 3-2V3" stroke={color} strokeWidth="1.6" strokeLinejoin="round"/></svg>;
}
function IconGigoteuse({ size = 36, color = "#c49a4a" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M12 3c-3.5 0-6 2-6 5v8c0 2.5 2.5 5 6 5s6-2.5 6-5V8c0-3-2.5-5-6-5Z" stroke={color} strokeWidth="1.6"/><path d="M9 3.5c0-1 1.3-1.5 3-1.5s3 .5 3 1.5" stroke={color} strokeWidth="1.6" strokeLinecap="round"/></svg>;
}
function IconAccessoires({ size = 36, color = "#c49a4a" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M12 2C8.5 2 6 4 6 7v1H5a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-1V7c0-3-2.5-5-6-5Z" stroke={color} strokeWidth="1.6"/><path d="M6 11v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" stroke={color} strokeWidth="1.6"/></svg>;
}

const TICKER_ITEMS = [
  "✦ Bambou certifié OEKO-TEX", "✦ 3× plus doux que le coton",
  "✦ Thermorégulateur naturel",  "✦ Livraison offerte dès 60€",
  "✦ Retour gratuit 30 jours",   "✦ Antibactérien naturel",
  "✦ Peaux sensibles & eczéma",  "✦ Bodies · Pyjamas · Gigoteuses",
];

function Ticker() {
  const str = TICKER_ITEMS.join("   ");
  return (
    <div style={{ overflow: "hidden", background: C.amber, padding: "12px 0" }}>
      <style>{`@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}} .ticker-track{display:flex;animation:ticker 28s linear infinite;white-space:nowrap;width:max-content;}`}</style>
      <div className="ticker-track">
        {[...Array(2)].map((_, i) => <span key={i} style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.5, color: "#1a1410", paddingRight: 60 }}>{str}</span>)}
      </div>
    </div>
  );
}

const HIGHLIGHT_LABELS: Record<string, string> = {
  meilleure_vente: "Meilleures ventes", selection: "Sélection du moment",
  nouveaute: "Nouveautés", featured: "Nos essentiels du moment", default: "Nos essentiels du moment",
};

const CATS = [
  { label: "Bodies",      desc: "L'essentiel du quotidien",      href: "/categorie/bodies",      Icon: IconBodies      },
  { label: "Pyjamas",     desc: "Pour des nuits sereines",       href: "/categorie/pyjamas",     Icon: IconPyjama      },
  { label: "Gigoteuses",  desc: "Sommeil sécurisé",              href: "/categorie/gigoteuses",  Icon: IconGigoteuse   },
  { label: "Accessoires", desc: "Les détails qui changent tout", href: "/categorie/accessoires", Icon: IconAccessoires },
];

export default function HomePage() {
  const heroRef      = useRef<HTMLDivElement>(null);
  const bambouRef    = useRef<HTMLDivElement>(null);
  const [products,      setProducts]      = useState<any[]>([]);
  const [sectionLabel,  setSectionLabel]  = useState("Nos essentiels du moment");
  const scrollSection = useInView(0.1);

  useEffect(() => {
    fetch("/api/produits").then(r => r.json()).then(data => {
      if (!Array.isArray(data)) return;
      const m = data.filter(p => p.highlight === "meilleure_vente" && p.stock > 0);
      const s = data.filter(p => p.highlight === "selection"       && p.stock > 0);
      const n = data.filter(p => p.highlight === "nouveaute"       && p.stock > 0);
      const f = data.filter(p => p.featured                        && p.stock > 0);
      const a = data.filter(p => p.stock > 0);
      let chosen = a; let label = "default";
      if (m.length) { chosen = m; label = "meilleure_vente"; }
      else if (s.length) { chosen = s; label = "selection"; }
      else if (n.length) { chosen = n; label = "nouveaute"; }
      else if (f.length) { chosen = f; label = "featured"; }
      setProducts(chosen.slice(0, 4));
      setSectionLabel(HIGHLIGHT_LABELS[label] ?? HIGHLIGHT_LABELS.default);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const el = heroRef.current; if (!el) return;
    const h = () => { el.style.transform = `translateY(${window.scrollY * 0.3}px)`; };
    window.addEventListener("scroll", h, { passive: true }); return () => window.removeEventListener("scroll", h);
  }, []);

  function isPromoActive(p: any) {
    if (!p.promo_price || !p.promo_start || !p.promo_end) return false;
    const now = new Date(); return new Date(p.promo_start) <= now && new Date(p.promo_end) >= now;
  }

  return (
    <div style={{ background: C.bg, color: C.warm, overflowX: "hidden" }}>
      <style>{`
        @keyframes hero-in    { from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none} }
        @keyframes badge-spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
        @keyframes bounce-arr { 0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(6px)} }
        .hero-content { animation: hero-in 1s cubic-bezier(.22,.61,.36,1) 0.3s both; }
        .product-card-home { transition: all 0.3s ease; cursor: pointer; }
        .product-card-home:hover { transform: translateY(-6px); box-shadow: 0 32px 60px rgba(0,0,0,0.4); border-color: rgba(196,154,74,0.4) !important; }
        .product-card-home:hover .card-img { transform: scale(1.06) !important; }
        .cat-card:hover { background: rgba(196,154,74,0.08) !important; border-color: rgba(196,154,74,0.25) !important; transform: translateY(-4px) !important; }

        /* ✅ Responsive complet — aucun espace vide sur les côtés */
        .site-pad    { padding-left: 4vw; padding-right: 4vw; }
        .hero-pad    { padding: 160px 5vw 80px; }
        .bigtext     { font-size: clamp(36px, 6.5vw, 96px); font-weight: 950; letter-spacing: -1.5px; line-height: 1.02; text-transform: uppercase; color: rgba(242,237,230,0.15); text-shadow: 0 4px 6px rgba(0,0,0,0.3); text-align: center; white-space: nowrap; }
        .products-grid   { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
        .cat-grid        { grid-template-columns: repeat(4, 1fr); }
        .bambou-grid     { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
        .reviews-grid    { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
        .reassurance-grid{ grid-template-columns: repeat(4, 1fr); }

        @media (max-width: 1024px) {
          .cat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .bigtext  { font-size: clamp(28px, 5vw, 70px) !important; white-space: normal !important; }
        }
        @media (max-width: 768px) {
          .hero-pad    { padding: 110px 5vw 60px !important; }
          .hero-btns   { flex-direction: column !important; }
          .hero-btns a { text-align: center !important; width: 100%; box-sizing: border-box; }
          .badge-svg   { display: none !important; }
          .products-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .cat-grid    { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .bambou-grid { grid-template-columns: 1fr !important; }
          .reviews-grid{ grid-template-columns: 1fr !important; }
          .reassurance-grid { grid-template-columns: 1fr 1fr !important; }
          .reassurance-item { border-right: none !important; border-bottom: 1px solid rgba(242,237,230,0.07) !important; }
          .bigtext     { font-size: clamp(22px, 7vw, 48px) !important; white-space: normal !important; }
        }
      `}</style>

      {/* ── HERO ── */}
      <section data-theme="dark" style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
        <div ref={heroRef} style={{ position: "absolute", inset: "-20% 0 -20% 0", willChange: "transform" }}>
          <Image src="/images/hero/hero-papa-bebe.png" alt="M!LK" fill priority sizes="100vw" style={{ objectFit: "cover", objectPosition: "center 60%" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(13,11,9,0.88) 0%, rgba(13,11,9,0.5) 50%, rgba(13,11,9,0.75) 100%)" }} />

        <div className="hero-content hero-pad" style={{ position: "relative", zIndex: 2, width: "100%", boxSizing: "border-box" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
            {["Nouveau-né", "0-3 mois", "3-6 mois"].map(tag => (
              <span key={tag} style={{ padding: "7px 16px", borderRadius: 99, border: `1px solid ${C.amber}`, color: C.amber, fontSize: 13, fontWeight: 800 }}>{tag}</span>
            ))}
          </div>

          <h1 style={{ margin: "0 0 24px", fontSize: "clamp(42px, 7.5vw, 96px)", fontWeight: 950, letterSpacing: -3, lineHeight: 0.95, color: C.warm }}>
            L'essentiel.<br /><span style={{ color: C.amber }}>Sans compromis.</span>
          </h1>

          {/* ✅ Badge positionné absolument dans la section */}
          <div className="badge-svg" style={{ position: "absolute", top: "50%", right: "6%", transform: "translateY(-50%)", zIndex: 3 }}>
            <svg width="140" height="140" viewBox="0 0 140 140" style={{ animation: "badge-spin 14s linear infinite" }}>
              <path id="bc" d="M 70,70 m -55,0 a 55,55 0 1,1 110,0 a 55,55 0 1,1 -110,0" fill="none" />
              <text fontSize="12" fontWeight="700" letterSpacing="2.5" fill={C.amber}>
                <textPath href="#bc">BAMBOU OEKO-TEX · PREMIUM · NOURRISSON ·</textPath>
              </text>
            </svg>
          </div>

          <p style={{ margin: "0 0 36px", fontSize: "clamp(15px, 1.8vw, 20px)", color: C.muted, maxWidth: 560, lineHeight: 1.75, fontWeight: 500 }}>
            Vêtements nourrisson en bambou certifié OEKO-TEX. Ultra-doux, thermorégulateur, antibactérien — pensé pour les peaux les plus fragiles.
          </p>

          <div className="hero-btns" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/produits" style={{ padding: "17px 32px", borderRadius: 14, background: C.warm, color: "#1a1410", fontWeight: 900, fontSize: 17, textDecoration: "none", display: "inline-block" }}>
              Découvrir la collection →
            </Link>
            <Link href="/pourquoi-bambou" style={{ padding: "17px 32px", borderRadius: 14, border: "1px solid rgba(242,237,230,0.2)", color: C.warm, fontWeight: 700, fontSize: 17, textDecoration: "none", display: "inline-block" }}>
              Pourquoi le bambou ?
            </Link>
          </div>

          <div style={{ display: "flex", gap: 40, marginTop: 52, flexWrap: "wrap" }}>
            {[
              { value: 500, suffix: "+", label: "familles satisfaites" },
              { value: 100, suffix: "%", label: "Bambou OEKO-TEX"      },
              { value: 30,  suffix: "j", label: "retour gratuit"       },
            ].map(k => (
              <div key={k.label}>
                <div style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 950, letterSpacing: -1.5, color: C.warm, lineHeight: 1 }}>
                  <AnimatedCounter value={k.value} suffix={k.suffix} />
                </div>
                <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 24, left: "50%", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.35, zIndex: 3 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: C.warm }}>Découvrir</div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: "bounce-arr 2s ease infinite" }}>
            <path d="M12 5v14M5 12l7 7 7-7" stroke={C.warm} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ── TICKER ── */}
      <Ticker />

      {/* ── SECTION PRINCIPALE SCROLLANTE ── */}
      <div ref={scrollSection.ref} style={{ background: C.bg, overflow: "hidden" }}>

        {/* Texte scrollant haut */}
        <div style={{ padding: "60px 0 40px", overflow: "hidden" }}>
          <div className="bigtext" style={{ transform: scrollSection.visible ? "translateX(0)" : "translateX(100vw)", opacity: scrollSection.visible ? 1 : 0, transition: "transform 1s cubic-bezier(.22,1,.36,1), opacity 0.6s ease" }}>
            M!LK RÉDUIT LES GALÈRES DU QUOTIDIEN
          </div>
        </div>

        {/* ✅ Produits vedettes */}
        {products.length > 0 && (
          <div className="site-pad" style={{ paddingBottom: 56 }}>
            <Reveal>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 10 }}>Sélection</div>
                  <h2 style={{ margin: 0, fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 950, letterSpacing: -1.5, color: C.warm, lineHeight: 1 }}>{sectionLabel}</h2>
                </div>
                <Link href="/produits" style={{ fontSize: 16, fontWeight: 800, color: C.amber, textDecoration: "none", whiteSpace: "nowrap" }}>Voir tout →</Link>
              </div>
            </Reveal>
            <div className="products-grid" style={{ display: "grid", gap: 16 }}>
              {products.map((p, i) => {
                const promo = isPromoActive(p);
                const price = promo ? p.promo_price : p.price_ttc;
                const badgeText = p.label === "bestseller" ? "Best seller" : p.label === "nouveau" ? "Nouveau" : p.highlight === "meilleure_vente" ? "Best seller" : p.highlight === "nouveaute" ? "Nouveau" : null;
                return (
                  <Reveal key={p.id} delay={i * 0.08}>
                    <Link href={`/produits/${p.slug}`} style={{ textDecoration: "none", display: "block" }}>
                      <div className="product-card-home" style={{ borderRadius: 18, overflow: "visible", background: C.bg2, border: `1px solid ${C.faint}`, position: "relative" }}>
                        {badgeText && (
                          <div style={{ position: "absolute", top: 0, right: 0, width: 100, height: 100, overflow: "hidden", zIndex: 10, borderRadius: "0 18px 0 0", pointerEvents: "none" }}>
                            <div style={{ position: "absolute", top: 20, right: -28, background: "#c49a4a", color: "#1a1410", fontSize: 10, fontWeight: 900, padding: "7px 42px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{badgeText}</div>
                          </div>
                        )}
                        <div style={{ borderRadius: "18px 18px 0 0", overflow: "hidden", position: "relative", aspectRatio: "3/4", background: C.bg3 }}>
                          {p.image_url
                            ? <Image src={p.image_url} alt={p.name} fill sizes="(max-width:640px) 50vw, 25vw" className="card-img" style={{ objectFit: "cover", transition: "transform 0.5s ease" }} />
                            : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 22, fontWeight: 950, color: C.faint }}>M!LK</div>
                          }
                          {promo && <div style={{ position: "absolute", top: 10, left: 10 }}><span style={{ padding: "5px 10px", borderRadius: 99, background: C.amber, color: "#fff", fontSize: 11, fontWeight: 900 }}>PROMO</span></div>}
                          {p.stock <= 5 && p.stock > 0 && <div style={{ position: "absolute", bottom: 10, left: 10 }}><span style={{ padding: "5px 10px", borderRadius: 99, background: "rgba(0,0,0,0.7)", color: "#f59e0b", fontSize: 11, fontWeight: 800 }}>Plus que {p.stock}</span></div>}
                        </div>
                        <div style={{ padding: "14px 16px 18px" }}>
                          <div style={{ fontWeight: 900, fontSize: 16, color: C.warm, marginBottom: 5, lineHeight: 1.3 }}>{p.name}</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                            <span style={{ fontWeight: 950, fontSize: 19, color: promo ? C.amber : C.warm }}>{Number(price).toFixed(2)} €</span>
                            {promo && <span style={{ fontSize: 13, textDecoration: "line-through", color: "rgba(242,237,230,0.3)" }}>{Number(p.price_ttc).toFixed(2)} €</span>}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </div>
        )}

        {/* ✅ Catégories — 4 en une ligne sur PC */}
        <div className="site-pad" style={{ paddingBottom: 48 }}>
          <div className="cat-grid" style={{ display: "grid", gap: 14 }}>
            {CATS.map((cat, i) => (
              <div key={cat.label} style={{ opacity: scrollSection.visible ? 1 : 0, transform: scrollSection.visible ? "none" : "translateY(40px)", transition: `opacity 0.7s ease ${i * 0.1}s, transform 0.7s ease ${i * 0.1}s` }}>
                <Link href={cat.href} style={{ textDecoration: "none", display: "block" }}>
                  <div className="cat-card" style={{ padding: "26px 20px", borderRadius: 20, background: C.bg2, border: `1px solid ${C.faint}`, transition: "all 0.25s ease", cursor: "pointer", height: "100%", boxSizing: "border-box" }}>
                    <cat.Icon size={32} color={C.amber} />
                    <div style={{ fontWeight: 900, fontSize: 18, color: C.warm, marginBottom: 6, marginTop: 14 }}>{cat.label}</div>
                    <div style={{ fontSize: 14, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>{cat.desc}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.amber }}>Voir →</div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Texte scrollant bas */}
        <div style={{ padding: "40px 0 60px", overflow: "hidden" }}>
          <div className="bigtext" style={{ transform: scrollSection.visible ? "translateX(0)" : "translateX(-100vw)", opacity: scrollSection.visible ? 1 : 0, transition: "transform 1s cubic-bezier(.22,1,.36,1), opacity 0.6s ease" }}>
            MOINS D'IRRITATIONS. PLUS DE CALME.
          </div>
        </div>
      </div>

      {/* ✅ BANDEAU NOIR — texte sur UNE ligne, s'adapte au viewport */}
      <div style={{ background: "#0f0c09", padding: "40px 5vw" }}>
        <Reveal>
          <p style={{ margin: 0, fontSize: "clamp(20px, 3.5vw, 48px)", fontWeight: 800, lineHeight: 1.2, color: "#f2ede6", letterSpacing: -0.5 }}>
            M!LK n'est pas une marque de vêtements.
          </p>
          <p style={{ margin: "8px 0 0", fontSize: "clamp(20px, 3.5vw, 48px)", fontWeight: 800, lineHeight: 1.2, color: C.amber, letterSpacing: -0.5 }}>
            C'est une réponse aux petites galères répétées.
          </p>
        </Reveal>
      </div>

      {/* ── BAMBOU ── */}
      <div ref={bambouRef} style={{ position: "relative", backgroundImage: "url('/matiere/bambou-02.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(255,255,255,0.72), rgba(255,255,255,0.9))" }} />
        <div className="site-pad" style={{ padding: "60px 5vw 70px", position: "relative", zIndex: 2 }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 40px)", margin: "0 0 40px", fontWeight: 900, letterSpacing: -0.5, color: "#1a1410" }}>L'essentiel. Sans compromis.</h2>
          </Reveal>
          <div className="bambou-grid" style={{ display: "grid", gap: 20 }}>
            {[
              { t: "Pensé pour la vraie vie",  d: "Un body doit accompagner les mouvements, pas les contraindre.",  delay: 0   },
              { t: "Respirant, naturellement", d: "Moins de chaleur. Moins d'humidité. Moins d'irritation.",        delay: 0.1 },
              { t: "Coupe maîtrisée",          d: "Ni trop large. Ni trop serrée. Juste ajustée.",                  delay: 0.2 },
              { t: "Essentiels durables",      d: "Moins acheter. Mieux choisir.",                                  delay: 0.3 },
            ].map(card => (
              <Reveal key={card.t} delay={card.delay}>
                <div style={{ padding: "28px", borderRadius: 18, background: "rgba(255,255,255,0.97)", boxShadow: "0 12px 40px rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.04)" }}>
                  <div style={{ fontWeight: 900, marginBottom: 10, fontSize: 18, color: "#1a1410" }}>{card.t}</div>
                  <div style={{ opacity: 0.65, lineHeight: 1.7, fontSize: 15, color: "#1a1410" }}>{card.d}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* ✅ CHIFFRES — grands, sans vide vertical */}
      <div style={{ background: C.bg2, borderTop: `1px solid ${C.faint}`, borderBottom: `1px solid ${C.faint}` }}>
        <div className="reassurance-grid site-pad" style={{ display: "grid", padding: "0 5vw" }}>
          {[
            { Icon: IconTruck,  label: "Livraison offerte",  desc: "Dès 60€ d'achat"          },
            { Icon: IconReturn, label: "Retour gratuit",     desc: "Sous 30 jours"             },
            { Icon: IconLeaf,   label: "Bambou OEKO-TEX",   desc: "Certifié, testé, sécurisé" },
            { Icon: IconLock,   label: "Paiement sécurisé", desc: "Via Stripe"                },
          ].map((r, i) => (
            <div className="reassurance-item" key={r.label} style={{ padding: "24px 12px", textAlign: "center", borderRight: i < 3 ? `1px solid ${C.faint}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><r.Icon size={26} color={C.amber} /></div>
              <div style={{ fontWeight: 900, fontSize: 14, color: C.warm, marginBottom: 3 }}>{r.label}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPIs ── ✅ très grands chiffres, pas de vide */}
      <div style={{ background: C.bg }}>
        <div className="site-pad reassurance-grid" style={{ display: "grid", padding: "0 5vw" }}>
          {[
            { valeur: "100%", label: "Bambou certifié OEKO-TEX" },
            { valeur: "0",    label: "Substance nocive"          },
            { valeur: "3×",   label: "Plus doux que le coton"   },
            { valeur: "30j",  label: "Retour gratuit"            },
          ].map((k, i) => (
            <div key={k.label} className="reassurance-item" style={{ padding: "32px 12px", textAlign: "center", borderRight: i < 3 ? `1px solid ${C.faint}` : "none" }}>
              <div style={{ fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 950, letterSpacing: -2, color: C.amber, lineHeight: 1 }}>{k.valeur}</div>
              <div style={{ marginTop: 8, fontSize: "clamp(12px, 1.2vw, 15px)", color: C.muted, fontWeight: 700 }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── AVIS ── */}
      <div className="site-pad" style={{ padding: "60px 5vw" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 10 }}>Ce qu'on entend</div>
            <h2 style={{ margin: 0, fontSize: "clamp(24px, 3.5vw, 42px)", fontWeight: 950, letterSpacing: -1.5, color: C.warm }}>Des parents, pas des acteurs</h2>
          </div>
        </Reveal>
        <div className="reviews-grid" style={{ display: "grid", gap: 14 }}>
          {[
            { name: "Sophie M.",  role: "Maman de Léo, 2 mois",     stars: 5, text: "Mon fils avait des irritations avec tous les bodies en coton. Depuis M!LK, plus rien. La différence est immédiate dès la première nuit." },
            { name: "Thomas R.",  role: "Papa de Zoé, nouveau-né",   stars: 5, text: "On a reçu le coffret pour la naissance. La qualité est évidente, le bambou est incroyablement doux. On recommande à tous les futurs parents." },
            { name: "Amina B.",   role: "Maman de Samy, 3 mois",    stars: 5, text: "Samy transpire beaucoup la nuit. Avec les pyjamas M!LK, il dort mieux et se réveille moins. Le bambou thermorégulateur, ça marche vraiment." },
            { name: "Julie D.",   role: "Maman d'Emma, née en juin", stars: 5, text: "Cadeau de naissance parfait. Les matières sont premium, les finitions soignées. On a l'impression d'habiller bébé dans quelque chose de vraiment spécial." },
          ].map((r, i) => (
            <Reveal key={r.name} delay={i * 0.07}>
              <div style={{ padding: "24px 22px", borderRadius: 16, background: C.bg2, border: `1px solid ${C.faint}`, height: "100%", boxSizing: "border-box" }}>
                <div style={{ display: "flex", marginBottom: 12 }}>
                  {[...Array(r.stars)].map((_, j) => <span key={j} style={{ color: C.amber, fontSize: 15 }}>★</span>)}
                </div>
                <p style={{ margin: "0 0 14px", fontSize: 15, color: C.muted, lineHeight: 1.7, fontStyle: "italic" }}>&ldquo;{r.text}&rdquo;</p>
                <div style={{ fontWeight: 800, fontSize: 14, color: C.warm }}>{r.name}</div>
                <div style={{ fontSize: 12, color: "rgba(242,237,230,0.3)", marginTop: 2 }}>{r.role}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ── CTA FINAL ── */}
      <section data-theme="dark" style={{ padding: "70px 5vw", textAlign: "center", background: C.bg }}>
        <Reveal>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 18 }}>Prêt à chouchouter bébé ?</div>
            <h2 style={{ margin: "0 0 18px", fontSize: "clamp(28px, 4.5vw, 54px)", fontWeight: 950, letterSpacing: -2, color: C.warm, lineHeight: 1.05 }}>
              La douceur du bambou.<br /><span style={{ color: C.amber }}>Dès maintenant.</span>
            </h2>
            <p style={{ margin: "0 0 32px", fontSize: 17, color: C.muted, lineHeight: 1.7 }}>
              Rejoins les familles qui ont choisi M!LK pour les premières semaines de vie de leur bébé.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/produits" style={{ padding: "18px 40px", borderRadius: 14, background: C.warm, color: "#1a1410", fontWeight: 900, fontSize: 18, textDecoration: "none", display: "inline-block" }}>
                Voir la collection →
              </Link>
              <Link href="/qui-sommes-nous" style={{ padding: "18px 40px", borderRadius: 14, border: `1px solid ${C.faint}`, color: C.muted, fontWeight: 700, fontSize: 17, textDecoration: "none", display: "inline-block" }}>
                Notre histoire
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}