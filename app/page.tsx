"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Image from "next/image";
import Link  from "next/link";

const C = {
  bg:    "#2a2018",
  bg2:   "#332619",
  bg3:   "#3d2e1e",
  warm:  "#f2ede6",
  muted: "rgba(242,237,230,0.55)",
  faint: "rgba(242,237,230,0.07)",
  amber: "#c49a4a",
};

function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setVisible(e.isIntersecting),
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible }  = useScrollReveal(0.3);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(value / 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setCount(value); clearInterval(timer); }
      else setCount(start);
    }, 25);
    return () => clearInterval(timer);
  }, [visible, value]);
  return <span ref={ref}>{count.toLocaleString("fr-FR")}{suffix}</span>;
}

const TICKER_ITEMS = [
  "✦ Bambou certifié OEKO-TEX",
  "✦ 3× plus doux que le coton",
  "✦ Thermorégulateur naturel",
  "✦ Livraison offerte dès 60€",
  "✦ Retour gratuit 30 jours",
  "✦ Antibactérien naturel",
  "✦ Peaux sensibles & eczéma",
  "✦ Bodies · Pyjamas · Gigoteuses",
];

function Ticker() {
  const str = TICKER_ITEMS.join("   ");
  return (
    <div style={{ overflow: "hidden", background: C.amber, padding: "12px 0" }}>
      <style>{`
        @keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .ticker-track { display: flex; animation: ticker 28s linear infinite; white-space: nowrap; width: max-content; }
      `}</style>
      <div className="ticker-track">
        {[...Array(2)].map((_, i) => (
          <span key={i} style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.5, color: "#1a1410", paddingRight: 60 }}>
            {str}
          </span>
        ))}
      </div>
    </div>
  );
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(32px)", transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s` }}>
      {children}
    </div>
  );
}

// ── Icônes SVG au trait ──────────────────────────────────────────────────────
function IconTruck({ size = 28, color = "#c49a4a" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M1 3h13v13H1zM14 8h4l3 3v5h-7V8z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="5.5" cy="18.5" r="2.5" stroke={color} strokeWidth="1.8" />
      <circle cx="18.5" cy="18.5" r="2.5" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

function IconReturn({ size = 28, color = "#c49a4a" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 14H4V9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 14a9 9 0 1 0 1.5-5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconLeaf({ size = 28, color = "#c49a4a" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 22C12 22 4 16 4 9a8 8 0 0 1 16 0c0 7-8 13-8 13z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 22V9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconLock({ size = 28, color = "#c49a4a" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth="1.8" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconBodies({ size = 32, color = "#c49a4a" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3c-1.5 0-2.5.8-2.5 2v1H7L5 8v4h2v8h10v-8h2V8l-2-2h-2.5V5c0-1.2-1-2-2.5-2Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function IconPyjama({ size = 32, color = "#c49a4a" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 3h8M8 3C6 3 5 4.5 5 6v16h14V6c0-1.5-1-3-3-3" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 3v4l3 2 3-2V3" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function IconGigoteuse({ size = 32, color = "#c49a4a" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3c-3.5 0-6 2-6 5v8c0 2.5 2.5 5 6 5s6-2.5 6-5V8c0-3-2.5-5-6-5Z" stroke={color} strokeWidth="1.6" />
      <path d="M9 3.5c0-1 1.3-1.5 3-1.5s3 .5 3 1.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconAccessoires({ size = 32, color = "#c49a4a" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C8.5 2 6 4 6 7v1H5a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-1V7c0-3-2.5-5-6-5Z" stroke={color} strokeWidth="1.6" />
      <path d="M6 11v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

const bigTextStyle = {
  fontSize: "clamp(32px, 7vw, 115px)",
  fontWeight: 950,
  letterSpacing: "-1.5px",
  lineHeight: 1.05,
  textTransform: "uppercase" as const,
  transition: "transform 1s cubic-bezier(.22,1,.36,1), opacity 0.6s ease",
  willChange: "transform",
  color: "rgba(242,237,230,0.15)",
  textShadow: "0 4px 6px rgba(0,0,0,0.3), 0 12px 20px rgba(0,0,0,0.2)",
  textAlign: "center" as const,
};

const HIGHLIGHT_LABELS: Record<string, string> = {
  meilleure_vente: "Meilleures ventes",
  selection:       "Sélection du moment",
  nouveaute:       "Nouveautés",
  featured:        "Nos essentiels du moment",
  default:         "Nos essentiels du moment",
};

export default function HomePage() {
  const heroRef   = useRef<HTMLDivElement>(null);
  const bambouRef = useRef<HTMLDivElement>(null);
  const [products,     setProducts]     = useState<any[]>([]);
  const [sectionLabel, setSectionLabel] = useState("Nos essentiels du moment");
  const [scrollY,      setScrollY]      = useState(0);

  const topText     = useMemo(() => "M!LK RÉDUIT LES GALÈRES", []);
  const topText2    = useMemo(() => "DU QUOTIDIEN", []);
  const bottomText  = useMemo(() => "MOINS D'IRRITATIONS.", []);
  const bottomText2 = useMemo(() => "PLUS DE CALME.", []);

  const scrollSection = useInView(0.1);

  useEffect(() => {
    fetch("/api/produits")
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        const meilleures = data.filter(p => p.highlight === "meilleure_vente" && p.stock > 0);
        const selection  = data.filter(p => p.highlight === "selection"       && p.stock > 0);
        const nouveautes = data.filter(p => p.highlight === "nouveaute"       && p.stock > 0);
        const featured   = data.filter(p => p.featured                        && p.stock > 0);
        const all        = data.filter(p => p.stock > 0);

        if (meilleures.length > 0) { setProducts(meilleures.slice(0, 4)); setSectionLabel(HIGHLIGHT_LABELS.meilleure_vente); }
        else if (selection.length > 0) { setProducts(selection.slice(0, 4)); setSectionLabel(HIGHLIGHT_LABELS.selection); }
        else if (nouveautes.length > 0) { setProducts(nouveautes.slice(0, 4)); setSectionLabel(HIGHLIGHT_LABELS.nouveaute); }
        else if (featured.length > 0) { setProducts(featured.slice(0, 4)); setSectionLabel(HIGHLIGHT_LABELS.featured); }
        else setProducts(all.slice(0, 4));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handle = () => {
      setScrollY(window.scrollY);
      if (heroRef.current) {
        heroRef.current.style.transform = `translateY(${window.scrollY * 0.4}px)`;
      }
    };
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  function isPromoActive(p: any) {
    if (!p.promo_price || !p.promo_start || !p.promo_end) return false;
    const now = new Date();
    return new Date(p.promo_start) <= now && new Date(p.promo_end) >= now;
  }

  const CATS = [
    { label: "Bodies",      desc: "L'essentiel du quotidien",       href: "/categorie/bodies",      Icon: IconBodies,      delay: 0   },
    { label: "Pyjamas",     desc: "Pour des nuits sereines",        href: "/categorie/pyjamas",     Icon: IconPyjama,      delay: 0.1 },
    { label: "Gigoteuses",  desc: "Sommeil sécurisé",               href: "/categorie/gigoteuses",  Icon: IconGigoteuse,   delay: 0.2 },
    { label: "Accessoires", desc: "Les détails qui changent tout",  href: "/categorie/accessoires", Icon: IconAccessoires, delay: 0.3 },
  ];

  return (
    <div style={{ background: C.bg, color: C.warm, overflowX: "hidden" }}>
      <style>{`
        @keyframes hero-in    { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:none; } }
        @keyframes badge-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bounce     { 0%,100% { transform:translateX(-50%) translateY(0); } 50% { transform:translateX(-50%) translateY(6px); } }

        .hero-content { animation: hero-in 1s cubic-bezier(.22,.61,.36,1) 0.3s both; }
        .product-card-home { transition: all 0.3s cubic-bezier(.22,.61,.36,1); cursor: pointer; }
        .product-card-home:hover { transform: translateY(-8px); box-shadow: 0 40px 70px rgba(0,0,0,0.5); border-color: rgba(196,154,74,0.4) !important; }
        .product-card-home:hover .card-img { transform: scale(1.07) !important; }
        .cat-card:hover { background: rgba(196,154,74,0.08) !important; border-color: rgba(196,154,74,0.25) !important; transform: translateY(-4px) !important; }

        .hero-padding    { padding: 160px 24px 80px; }
        .products-grid   { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
        .cat-grid        { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
        .univers-grid    { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
        .bambou-grid     { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
        .reviews-grid    { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
        .reassurance-grid { grid-template-columns: repeat(4, 1fr); }

        @media (max-width: 768px) {
          .hero-padding    { padding: 110px 20px 60px !important; }
          .hero-btns       { flex-direction: column !important; }
          .hero-btns a     { text-align: center !important; width: 100%; box-sizing: border-box; }
          .hero-kpis       { gap: 20px !important; flex-wrap: wrap !important; }
          .badge-svg       { display: none !important; }
          .products-grid   { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .cat-grid        { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .univers-grid    { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .bambou-grid     { grid-template-columns: 1fr !important; }
          .reviews-grid    { grid-template-columns: 1fr !important; }
          .reassurance-grid { grid-template-columns: 1fr 1fr !important; }
          .reassurance-item { border-right: none !important; border-bottom: 1px solid rgba(242,237,230,0.07) !important; }
          .cta-btns        { flex-direction: column !important; align-items: stretch !important; }
          .cta-btns a      { text-align: center !important; }
          .section-padding { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>

      {/* ── HERO ── */}
      <section data-theme="dark" style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
        <div ref={heroRef} style={{ position: "absolute", inset: "-20% 0 -20% 0", willChange: "transform" }}>
          <Image src="/images/hero/hero-papa-bebe.png" alt="M!LK — Papa et bébé" fill priority sizes="100vw" style={{ objectFit: "cover", objectPosition: "center 60%" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(13,11,9,0.88) 0%, rgba(13,11,9,0.5) 50%, rgba(13,11,9,0.75) 100%)" }} />

        <div className="hero-content hero-padding" style={{ position: "relative", zIndex: 2, maxWidth: 1200, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
            {["Nouveau-né", "0-3 mois", "3-6 mois"].map(tag => (
              <span key={tag} style={{ padding: "7px 16px", borderRadius: 99, border: `1px solid ${C.amber}`, color: C.amber, fontSize: 13, fontWeight: 800, letterSpacing: 0.5 }}>
                {tag}
              </span>
            ))}
          </div>

          <div style={{ position: "relative", display: "inline-block", marginBottom: 20, maxWidth: "100%" }}>
            <h1 style={{ margin: 0, fontSize: "clamp(42px, 7.5vw, 92px)", fontWeight: 950, letterSpacing: -3, lineHeight: 0.95, color: C.warm }}>
              L'essentiel.<br />
              <span style={{ color: C.amber }}>Sans compromis.</span>
            </h1>

            {/* ✅ Badge OEKO-TEX plus à droite */}
            <div className="badge-svg" style={{ position: "absolute", top: -20, right: -160 }}>
              <svg width="120" height="120" viewBox="0 0 120 120" style={{ animation: "badge-spin 12s linear infinite" }}>
                <path id="badgecircle" d="M 60,60 m -46,0 a 46,46 0 1,1 92,0 a 46,46 0 1,1 -92,0" fill="none" />
                <text fontSize="11" fontWeight="700" letterSpacing="2.2" fill={C.amber}>
                  <textPath href="#badgecircle">BAMBOU OEKO-TEX · PREMIUM · NOURRISSON ·</textPath>
                </text>
              </svg>
            </div>
          </div>

          <p style={{ margin: "0 0 36px", fontSize: "clamp(16px, 2vw, 20px)", color: C.muted, maxWidth: 560, lineHeight: 1.7, fontWeight: 500 }}>
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

          <div className="hero-kpis" style={{ display: "flex", gap: 40, marginTop: 52, flexWrap: "wrap" }}>
            {[
              { value: 500, suffix: "+", label: "familles satisfaites" },
              { value: 100, suffix: "%", label: "Bambou OEKO-TEX"      },
              { value: 30,  suffix: "j", label: "retour gratuit"        },
            ].map(k => (
              <div key={k.label}>
                <div style={{ fontSize: "clamp(26px, 4vw, 46px)", fontWeight: 950, letterSpacing: -1.5, color: C.warm, lineHeight: 1 }}>
                  <AnimatedCounter value={k.value} suffix={k.suffix} />
                </div>
                <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 28, left: "50%", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.35 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: C.warm }}>Découvrir</div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: "bounce 2s ease infinite" }}>
            <path d="M12 5v14M5 12l7 7 7-7" stroke={C.warm} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ── TICKER ── */}
      <Ticker />

      {/* ── TEXTE SCROLL + CARDS CATÉGORIES ── */}
      <div ref={scrollSection.ref} style={{ background: C.bg, padding: "80px 24px", overflow: "hidden" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          <div style={{ overflow: "hidden", marginBottom: 56 }}>
            <div style={{ ...bigTextStyle, transform: scrollSection.visible ? "translateX(0)" : "translateX(100vw)", opacity: scrollSection.visible ? 1 : 0 }}>
              {topText}
            </div>
            <div style={{ ...bigTextStyle, display: "block", marginTop: 12, transform: scrollSection.visible ? "translateX(0)" : "translateX(-100vw)", opacity: scrollSection.visible ? 1 : 0 }}>
              {topText2}
            </div>
          </div>

          {/* ✅ PRODUITS VEDETTES — remontés ici, juste sous le texte scrollant */}
          {products.length > 0 && (
            <div style={{ marginBottom: 56 }}>
              <Reveal>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36, flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 10 }}>
                      Sélection
                    </div>
                    <h2 style={{ margin: 0, fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 950, letterSpacing: -1.5, color: C.warm }}>
                      {sectionLabel}
                    </h2>
                  </div>
                  <Link href="/produits" style={{ fontSize: 16, fontWeight: 800, color: C.amber, textDecoration: "none" }}>
                    Voir tout →
                  </Link>
                </div>
              </Reveal>

              <div className="products-grid" style={{ display: "grid", gap: 16 }}>
                {products.map((p, i) => {
                  const promo = isPromoActive(p);
                  const price = promo ? p.promo_price : p.price_ttc;
                  const badgeLabel = p.label || (p.highlight === "meilleure_vente" ? "bestseller" : p.highlight === "nouveaute" ? "nouveau" : null);
                  return (
                    <Reveal key={p.id} delay={i * 0.08}>
                      <Link href={`/produits/${p.slug}`} style={{ textDecoration: "none", display: "block" }}>
                        <div className="product-card-home" style={{ borderRadius: 18, overflow: "visible", background: C.bg2, border: `1px solid ${C.faint}`, position: "relative" }}>

                          {/* ✅ Badge diagonal */}
                          {badgeLabel && (
                            <div style={{ position: "absolute", top: 0, right: 0, width: 100, height: 100, overflow: "hidden", zIndex: 10, borderRadius: "0 18px 0 0", pointerEvents: "none" }}>
                              <div style={{ position: "absolute", top: 20, right: -28, background: "#c49a4a", color: "#1a1410", fontSize: 10, fontWeight: 900, letterSpacing: 0.5, padding: "7px 42px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                                {badgeLabel === "bestseller" ? "Best seller" : badgeLabel === "nouveau" ? "Nouveau" : badgeLabel}
                              </div>
                            </div>
                          )}

                          <div style={{ borderRadius: "18px 18px 0 0", overflow: "hidden", position: "relative", aspectRatio: "3/4", background: C.bg3 }}>
                            {p.image_url ? (
                              <Image src={p.image_url} alt={p.name} fill sizes="(max-width:640px) 50vw, 25vw" className="card-img" style={{ objectFit: "cover", transition: "transform 0.5s ease" }} />
                            ) : (
                              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 24, fontWeight: 950, color: C.faint }}>M!LK</div>
                            )}
                            {promo && (
                              <div style={{ position: "absolute", top: 10, left: 10 }}>
                                <span style={{ padding: "5px 10px", borderRadius: 99, background: C.amber, color: "#fff", fontSize: 11, fontWeight: 900 }}>PROMO</span>
                              </div>
                            )}
                            {p.stock <= 5 && p.stock > 0 && (
                              <div style={{ position: "absolute", bottom: 10, left: 10 }}>
                                <span style={{ padding: "5px 10px", borderRadius: 99, background: "rgba(0,0,0,0.7)", color: "#f59e0b", fontSize: 11, fontWeight: 800 }}>Plus que {p.stock}</span>
                              </div>
                            )}
                          </div>

                          <div style={{ padding: "16px 18px 20px" }}>
                            <div style={{ fontWeight: 900, fontSize: 17, color: C.warm, marginBottom: 6, letterSpacing: -0.3 }}>{p.name}</div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                              <span style={{ fontWeight: 950, fontSize: 20, color: promo ? C.amber : C.warm }}>{Number(price).toFixed(2)} €</span>
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

          {/* Catégories */}
          <div className="cat-grid" style={{ display: "grid", gap: 16, marginBottom: 56 }}>
            {CATS.map(cat => (
              <div key={cat.label} style={{ opacity: scrollSection.visible ? 1 : 0, transform: scrollSection.visible ? "translateX(0)" : "translateX(-80px)", transition: `opacity 0.7s ease ${cat.delay}s, transform 0.7s cubic-bezier(.22,1,.36,1) ${cat.delay}s` }}>
                <Link href={cat.href} style={{ textDecoration: "none", display: "block" }}>
                  <div
                    className="cat-card"
                    style={{ padding: "28px 22px", borderRadius: 20, background: C.bg2, border: `1px solid ${C.faint}`, transition: "all 0.25s ease", cursor: "pointer" }}
                  >
                    <cat.Icon size={34} color={C.amber} />
                    <div style={{ fontWeight: 900, fontSize: 20, color: C.warm, marginBottom: 8, marginTop: 14 }}>{cat.label}</div>
                    <div style={{ fontSize: 15, color: C.muted, marginBottom: 18, lineHeight: 1.5 }}>{cat.desc}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.amber }}>Voir la collection →</div>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          <div style={{ overflow: "hidden" }}>
            <div style={{ ...bigTextStyle, transform: scrollSection.visible ? "translateX(0)" : "translateX(-100vw)", opacity: scrollSection.visible ? 1 : 0 }}>
              {bottomText}
            </div>
            <div style={{ ...bigTextStyle, display: "block", marginTop: 12, transform: scrollSection.visible ? "translateX(0)" : "translateX(100vw)", opacity: scrollSection.visible ? 1 : 0 }}>
              {bottomText2}
            </div>
          </div>
        </div>
      </div>

      {/* ── BANDEAU NOIR ── ✅ texte très grand, pleine largeur, hauteur compacte */}
      <div style={{ background: "#111", color: "#fff", padding: "32px 24px", overflow: "hidden" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Reveal>
            <p style={{ margin: 0, fontSize: "clamp(22px, 4.5vw, 52px)", fontWeight: 800, lineHeight: 1.25, color: "#f2ede6", letterSpacing: -0.5 }}>
              M!LK n'est pas une marque de vêtements.{" "}
              <span style={{ color: C.amber }}>C'est une réponse aux petites galères répétées.</span>
            </p>
          </Reveal>
        </div>
      </div>

      {/* ── BAMBOU parallaxe ── */}
      <div ref={bambouRef} style={{ position: "relative", backgroundImage: "url('/matiere/bambou-02.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 60%), linear-gradient(to bottom, rgba(255,255,255,0.72), rgba(255,255,255,0.87))" }} />
        <div style={{ padding: "80px 24px 90px", position: "relative", zIndex: 2 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <Reveal>
              <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", margin: "0 0 48px", fontWeight: 900, letterSpacing: -0.5, color: "#1a1410" }}>
                L'essentiel. Sans compromis.
              </h2>
            </Reveal>
            <div className="bambou-grid" style={{ display: "grid", gap: 24 }}>
              {[
                { t: "Pensé pour la vraie vie",  d: "Un body doit accompagner les mouvements, pas les contraindre.",  delay: 0   },
                { t: "Respirant, naturellement", d: "Moins de chaleur. Moins d'humidité. Moins d'irritation.",        delay: 0.1 },
                { t: "Coupe maîtrisée",          d: "Ni trop large. Ni trop serrée. Juste ajustée.",                  delay: 0.2 },
                { t: "Essentiels durables",      d: "Moins acheter. Mieux choisir.",                                  delay: 0.3 },
              ].map(card => (
                <Reveal key={card.t} delay={card.delay}>
                  <div style={{ padding: 32, borderRadius: 18, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(3px)", boxShadow: "0 20px 50px rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.04)" }}>
                    <div style={{ fontWeight: 900, marginBottom: 12, fontSize: 20, color: "#1a1410" }}>{card.t}</div>
                    <div style={{ opacity: 0.7, lineHeight: 1.7, fontSize: 16, color: "#1a1410" }}>{card.d}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── UNIVERS ── */}
      <section data-theme="dark" className="section-padding" style={{ padding: "80px 24px", maxWidth: 1200, margin: "0 auto", boxSizing: "border-box", width: "100%" }}>
        <Reveal>
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 12 }}>Univers M!LK</div>
            <h2 style={{ margin: 0, fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 950, letterSpacing: -1.5, color: C.warm }}>
              La vraie vie avec bébé
            </h2>
          </div>
        </Reveal>
        <div className="univers-grid" style={{ display: "grid", gap: 14 }}>
          {[
            { src: "/univers-maman-bebe.png",   label: "Le lien maman-bébé", delay: 0   },
            { src: "/univers-nuit-calme.png",    label: "Des nuits sereines", delay: 0.1 },
            { src: "/univers-change-rapide.png", label: "Le change facile",   delay: 0.2 },
            { src: "/univers-moment-calme.png",  label: "Les moments calmes", delay: 0.3 },
          ].map(img => (
            <Reveal key={img.src} delay={img.delay}>
              <div style={{ borderRadius: 18, overflow: "hidden", position: "relative", aspectRatio: "3/4", background: C.bg3, cursor: "pointer" }}>
                <Image src={img.src} alt={img.label} fill sizes="(max-width:640px) 50vw, 25vw" style={{ objectFit: "cover", transition: "transform 0.5s ease" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,11,9,0.75) 0%, transparent 55%)" }} />
                <div style={{ position: "absolute", bottom: 14, left: 14, fontWeight: 800, fontSize: 16, color: C.warm }}>{img.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── AVIS CLIENTS ── */}
      <section data-theme="dark" className="section-padding" style={{ padding: "0 24px 80px", maxWidth: 1200, margin: "0 auto", boxSizing: "border-box", width: "100%" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 12 }}>Ce qu'on entend</div>
            <h2 style={{ margin: 0, fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 950, letterSpacing: -1.5, color: C.warm }}>
              Des parents, pas des acteurs
            </h2>
          </div>
        </Reveal>
        <div className="reviews-grid" style={{ display: "grid", gap: 14 }}>
          {[
            { name: "Sophie M.",  role: "Maman de Léo, 2 mois",     stars: 5, text: "Mon fils avait des irritations avec tous les bodies en coton. Depuis M!LK, plus rien. La différence est immédiate dès la première nuit." },
            { name: "Thomas R.",  role: "Papa de Zoé, nouveau-né",   stars: 5, text: "On a reçu le coffret pour la naissance. La qualité est évidente, le bambou est incroyablement doux. On recommande à tous les futurs parents." },
            { name: "Amina B.",   role: "Maman de Samy, 3 mois",    stars: 5, text: "Samy transpire beaucoup la nuit. Avec les pyjamas M!LK, il dort mieux et se réveille moins. Le bambou thermorégulateur, ça marche vraiment." },
            { name: "Julie D.",   role: "Maman d'Emma, née en juin", stars: 5, text: "Cadeau de naissance parfait. Les matières sont premium, les finitions soignées. On a l'impression d'habiller bébé dans quelque chose de vraiment spécial." },
          ].map((review, i) => (
            <Reveal key={review.name} delay={i * 0.08}>
              <div style={{ padding: "26px 24px", borderRadius: 16, background: C.bg2, border: `1px solid ${C.faint}` }}>
                <div style={{ display: "flex", marginBottom: 12 }}>
                  {[...Array(review.stars)].map((_, j) => <span key={j} style={{ color: C.amber, fontSize: 16 }}>★</span>)}
                </div>
                <p style={{ margin: "0 0 16px", fontSize: 16, color: C.muted, lineHeight: 1.75, fontStyle: "italic" }}>
                  &ldquo;{review.text}&rdquo;
                </p>
                <div style={{ fontWeight: 800, fontSize: 15, color: C.warm }}>{review.name}</div>
                <div style={{ fontSize: 13, color: "rgba(242,237,230,0.3)", marginTop: 3 }}>{review.role}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── RÉASSURANCE ── ✅ icônes SVG */}
      <div style={{ borderTop: `1px solid ${C.faint}`, borderBottom: `1px solid ${C.faint}` }}>
        <div className="reassurance-grid" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "grid" }}>
          {[
            { Icon: IconTruck,  label: "Livraison offerte",  desc: "Dès 60€ d'achat"          },
            { Icon: IconReturn, label: "Retour gratuit",     desc: "Sous 30 jours"             },
            { Icon: IconLeaf,   label: "Bambou OEKO-TEX",   desc: "Certifié, testé, sécurisé" },
            { Icon: IconLock,   label: "Paiement sécurisé", desc: "Via Stripe"                },
          ].map((r, i) => (
            <div className="reassurance-item" key={r.label} style={{ padding: "28px 16px", textAlign: "center", borderRight: i < 3 ? `1px solid ${C.faint}` : "none" }}>
              <r.Icon size={30} color={C.amber} />
              <div style={{ fontWeight: 900, fontSize: 15, color: C.warm, marginTop: 12, marginBottom: 4 }}>{r.label}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA FINAL ── */}
      <section data-theme="dark" style={{ padding: "90px 24px", textAlign: "center" }}>
        <Reveal>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 20 }}>
              Prêt à chouchouter bébé ?
            </div>
            <h2 style={{ margin: "0 0 20px", fontSize: "clamp(28px, 5vw, 56px)", fontWeight: 950, letterSpacing: -2, color: C.warm, lineHeight: 1 }}>
              La douceur du bambou.<br />
              <span style={{ color: C.amber }}>Dès maintenant.</span>
            </h2>
            <p style={{ margin: "0 0 36px", fontSize: 17, color: C.muted, lineHeight: 1.7 }}>
              Rejoins les familles qui ont choisi M!LK pour les premières semaines de vie de leur bébé.
            </p>
            <div className="cta-btns" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
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