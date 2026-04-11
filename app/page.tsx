"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

const C = {
  bg:    "#2a2018",
  bg2:   "#332619",
  bg3:   "#3d2e1e",
  warm:  "#f2ede6",
  muted: "rgba(242,237,230,0.45)",
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
    <div style={{ overflow: "hidden", background: C.amber, padding: "10px 0" }}>
      <style>{`
        @keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .ticker-track { display: flex; animation: ticker 28s linear infinite; white-space: nowrap; width: max-content; }
      `}</style>
      <div className="ticker-track">
        {[...Array(2)].map((_, i) => (
          <span key={i} style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: "#1a1410", paddingRight: 60 }}>
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

const bigTextStyle = {
  fontSize: "clamp(28px, 6.5vw, 110px)",
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

export default function HomePage() {
  const heroRef   = useRef<HTMLDivElement>(null);
  const bambouRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<any[]>([]);

  const topText     = useMemo(() => "M!LK RÉDUIT LES GALÈRES", []);
  const topText2    = useMemo(() => "DU QUOTIDIEN", []);
  const bottomText  = useMemo(() => "MOINS D'IRRITATIONS.", []);
  const bottomText2 = useMemo(() => "PLUS DE CALME.", []);

  const scrollSection = useInView(0.1);

  useEffect(() => {
    fetch("/api/produits")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const featured = data.filter(p => p.featured && p.stock > 0).slice(0, 4);
          const fallback  = data.filter(p => p.stock > 0).slice(0, 4);
          setProducts(featured.length >= 2 ? featured : fallback);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const handle = () => { el.style.transform = `translateY(${window.scrollY * 0.3}px)`; };
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  useEffect(() => {
    const el = bambouRef.current;
    if (!el) return;
    const handle = () => {
      const rect = el.getBoundingClientRect();
      el.style.backgroundPosition = `center calc(50% + ${rect.top * 0.15}px)`;
    };
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  function isPromoActive(p: any) {
    if (!p.promo_price || !p.promo_start || !p.promo_end) return false;
    const now = new Date();
    return new Date(p.promo_start) <= now && new Date(p.promo_end) >= now;
  }

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

        .hero-padding   { padding: 160px 24px 80px; }
        .products-grid  { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
        .cat-grid       { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
        .univers-grid   { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
        .bambou-grid    { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
        .reviews-grid   { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
        .reassurance-grid { grid-template-columns: repeat(4, 1fr); }

        @media (max-width: 768px) {
          .hero-padding   { padding: 110px 20px 60px !important; }
          .hero-btns      { flex-direction: column !important; }
          .hero-btns a    { text-align: center !important; width: 100%; box-sizing: border-box; }
          .hero-kpis      { gap: 20px !important; flex-wrap: wrap !important; }
          .badge-svg      { display: none !important; }
          .products-grid  { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .cat-grid       { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .univers-grid   { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .bambou-grid    { grid-template-columns: 1fr !important; }
          .reviews-grid   { grid-template-columns: 1fr !important; }
          .reassurance-grid { grid-template-columns: 1fr 1fr !important; }
          .reassurance-item { border-right: none !important; border-bottom: 1px solid rgba(242,237,230,0.07) !important; }
          .cta-btns       { flex-direction: column !important; align-items: stretch !important; }
          .cta-btns a     { text-align: center !important; }
          .section-padding { padding-left: 20px !important; padding-right: 20px !important; }
        }

        @media (max-width: 480px) {
          .hero-kpis      { gap: 12px !important; }
          .products-grid  { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .cat-grid       { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .univers-grid   { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
          .reassurance-grid { grid-template-columns: 1fr 1fr !important; }
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
              <span key={tag} style={{ padding: "6px 14px", borderRadius: 99, border: `1px solid ${C.amber}`, color: C.amber, fontSize: 12, fontWeight: 800, letterSpacing: 0.5 }}>
                {tag}
              </span>
            ))}
          </div>

          <div style={{ position: "relative", display: "inline-block", marginBottom: 20, maxWidth: "100%" }}>
            <h1 style={{ margin: 0, fontSize: "clamp(38px, 7vw, 88px)", fontWeight: 950, letterSpacing: -3, lineHeight: 0.95, color: C.warm }}>
              L'essentiel.<br />
              <span style={{ color: C.amber }}>Sans compromis.</span>
            </h1>
            <div className="badge-svg" style={{ position: "absolute", top: -20, right: -130 }}>
              <svg width="110" height="110" viewBox="0 0 110 110" style={{ animation: "badge-spin 12s linear infinite" }}>
                <path id="badgecircle" d="M 55,55 m -42,0 a 42,42 0 1,1 84,0 a 42,42 0 1,1 -84,0" fill="none" />
                <text fontSize="10" fontWeight="700" letterSpacing="2.2" fill={C.amber}>
                  <textPath href="#badgecircle">BAMBOU OEKO-TEX · PREMIUM · NOURRISSON ·</textPath>
                </text>
              </svg>
            </div>
          </div>

          <p style={{ margin: "0 0 32px", fontSize: "clamp(14px, 2vw, 19px)", color: C.muted, maxWidth: 540, lineHeight: 1.7 }}>
            Vêtements nourrisson en bambou certifié OEKO-TEX. Ultra-doux, thermorégulateur, antibactérien — pensé pour les peaux les plus fragiles.
          </p>

          <div className="hero-btns" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/produits" style={{ padding: "15px 28px", borderRadius: 14, background: C.warm, color: "#1a1410", fontWeight: 900, fontSize: 15, textDecoration: "none", display: "inline-block" }}>
              Découvrir la collection →
            </Link>
            <Link href="/pourquoi-bambou" style={{ padding: "15px 28px", borderRadius: 14, border: "1px solid rgba(242,237,230,0.2)", color: C.warm, fontWeight: 700, fontSize: 15, textDecoration: "none", display: "inline-block" }}>
              Pourquoi le bambou ?
            </Link>
          </div>

          <div className="hero-kpis" style={{ display: "flex", gap: 36, marginTop: 48, flexWrap: "wrap" }}>
            {[
              { value: 500, suffix: "+", label: "familles satisfaites" },
              { value: 100, suffix: "%", label: "Bambou OEKO-TEX"      },
              { value: 30,  suffix: "j", label: "retour gratuit"        },
            ].map(k => (
              <div key={k.label}>
                <div style={{ fontSize: "clamp(22px, 4vw, 42px)", fontWeight: 950, letterSpacing: -1.5, color: C.warm, lineHeight: 1 }}>
                  <AnimatedCounter value={k.value} suffix={k.suffix} />
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 28, left: "50%", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.35 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: C.warm }}>Découvrir</div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: "bounce 2s ease infinite" }}>
            <path d="M12 5v14M5 12l7 7 7-7" stroke={C.warm} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ── TICKER ── */}
      <Ticker />

      {/* ── SECTION TEXTE SCROLL + CARDS CATÉGORIES ── */}
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

          {/* Cards catégories */}
          <div className="cat-grid" style={{ display: "grid", gap: 16, marginBottom: 56 }}>
            {[
              { emoji: "👶", label: "Bodies",      desc: "L'essentiel du quotidien",       href: "/categorie/bodies",      delay: 0,   from: "left"  },
              { emoji: "🌙", label: "Pyjamas",     desc: "Pour des nuits sereines",        href: "/categorie/pyjamas",     delay: 0.1, from: "right" },
              { emoji: "✦",  label: "Gigoteuses",  desc: "Sommeil sécurisé",               href: "/categorie/gigoteuses",  delay: 0.2, from: "left"  },
              { emoji: "🌿", label: "Accessoires", desc: "Les détails qui changent tout",  href: "/categorie/accessoires", delay: 0.3, from: "right" },
            ].map(cat => (
              <div
                key={cat.label}
                style={{
                  opacity:   scrollSection.visible ? 1 : 0,
                  transform: scrollSection.visible ? "translateX(0)" : cat.from === "left" ? "translateX(-80px)" : "translateX(80px)",
                  transition: `opacity 0.7s ease ${cat.delay}s, transform 0.7s cubic-bezier(.22,1,.36,1) ${cat.delay}s`,
                }}
              >
                <Link href={cat.href} style={{ textDecoration: "none", display: "block" }}>
                  <div
                    style={{ padding: "28px 22px", borderRadius: 20, background: C.bg2, border: `1px solid ${C.faint}`, transition: "all 0.25s ease", cursor: "pointer" }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.background = "rgba(196,154,74,0.08)";
                      el.style.borderColor = "rgba(196,154,74,0.25)";
                      el.style.transform = "translateY(-4px)";
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.background = C.bg2;
                      el.style.borderColor = C.faint;
                      el.style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{ fontSize: 34, marginBottom: 14 }}>{cat.emoji}</div>
                    <div style={{ fontWeight: 900, fontSize: 18, color: C.warm, marginBottom: 6 }}>{cat.label}</div>
                    <div style={{ fontSize: 13, color: C.muted, marginBottom: 18, lineHeight: 1.5 }}>{cat.desc}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.amber }}>Voir la collection →</div>
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

      {/* ── SIGNATURE ── */}
      <div style={{ background: "#111", color: "#fff", textAlign: "center", padding: "60px 24px" }}>
        <Reveal>
          <div style={{ fontSize: "clamp(15px, 2.5vw, 22px)", maxWidth: 800, margin: "0 auto", lineHeight: 1.7, fontWeight: 500 }}>
            M!LK n'est pas une marque de vêtements.<br />
            C'est une réponse aux petites galères répétées.
          </div>
        </Reveal>
      </div>

      {/* ── BAMBOU parallaxe ── */}
      <div
        ref={bambouRef}
        style={{
          position: "relative",
          backgroundImage: "url('/matiere/bambou-02.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 60%), linear-gradient(to bottom, rgba(255,255,255,0.72), rgba(255,255,255,0.87))" }} />
        <div style={{ padding: "80px 24px 90px", position: "relative", zIndex: 2 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <Reveal>
              <h2 style={{ fontSize: "clamp(22px, 4vw, 38px)", margin: "0 0 48px", fontWeight: 900, letterSpacing: -0.5, color: "#1a1410" }}>
                L'essentiel. Sans compromis.
              </h2>
            </Reveal>
            <div className="bambou-grid" style={{ display: "grid", gap: 24 }}>
              {[
                { t: "Pensé pour la vraie vie",   d: "Un body doit accompagner les mouvements, pas les contraindre.",  delay: 0   },
                { t: "Respirant, naturellement",  d: "Moins de chaleur. Moins d'humidité. Moins d'irritation.",        delay: 0.1 },
                { t: "Coupe maîtrisée",           d: "Ni trop large. Ni trop serrée. Juste ajustée.",                  delay: 0.2 },
                { t: "Essentiels durables",       d: "Moins acheter. Mieux choisir.",                                  delay: 0.3 },
              ].map(card => (
                <Reveal key={card.t} delay={card.delay}>
                  <div style={{ padding: 28, borderRadius: 18, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(3px)", boxShadow: "0 20px 50px rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.04)" }}>
                    <div style={{ fontWeight: 900, marginBottom: 10, fontSize: 17, color: "#1a1410" }}>{card.t}</div>
                    <div style={{ opacity: 0.8, lineHeight: 1.6, fontSize: 14, color: "#1a1410" }}>{card.d}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── PRODUITS VEDETTES ── */}
      {products.length > 0 && (
        <section data-theme="dark" className="section-padding" style={{ padding: "80px 24px", maxWidth: 1200, margin: "0 auto", boxSizing: "border-box", width: "100%" }}>
          <Reveal>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 10 }}>Sélection</div>
                <h2 style={{ margin: 0, fontSize: "clamp(22px, 3.5vw, 40px)", fontWeight: 950, letterSpacing: -1.5, color: C.warm }}>
                  Nos essentiels du moment
                </h2>
              </div>
              <Link href="/produits" style={{ fontSize: 14, fontWeight: 800, color: C.amber, textDecoration: "none" }}>
                Voir tout →
              </Link>
            </div>
          </Reveal>

          <div className="products-grid" style={{ display: "grid", gap: 16 }}>
            {products.map((p, i) => {
              const promo = isPromoActive(p);
              const price = promo ? p.promo_price : p.price_ttc;
              return (
                <Reveal key={p.id} delay={i * 0.08}>
                  <Link href={`/produits/${p.slug}`} style={{ textDecoration: "none", display: "block" }}>
                    <div className="product-card-home" style={{ borderRadius: 18, overflow: "hidden", background: C.bg2, border: `1px solid ${C.faint}` }}>
                      <div style={{ position: "relative", aspectRatio: "3/4", background: C.bg3, overflow: "hidden" }}>
                        {p.image_url ? (
                          <Image src={p.image_url} alt={p.name} fill sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw" className="card-img" style={{ objectFit: "cover", transition: "transform 0.5s ease" }} />
                        ) : (
                          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 24, fontWeight: 950, color: C.faint }}>M!LK</div>
                        )}
                        {promo && (
                          <div style={{ position: "absolute", top: 10, left: 10 }}>
                            <span style={{ padding: "4px 9px", borderRadius: 99, background: C.amber, color: "#fff", fontSize: 10, fontWeight: 900 }}>PROMO</span>
                          </div>
                        )}
                        {p.stock <= 5 && p.stock > 0 && (
                          <div style={{ position: "absolute", bottom: 10, left: 10 }}>
                            <span style={{ padding: "4px 9px", borderRadius: 99, background: "rgba(0,0,0,0.7)", color: "#f59e0b", fontSize: 10, fontWeight: 800 }}>Plus que {p.stock}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: "12px 14px 16px" }}>
                        <div style={{ fontWeight: 900, fontSize: 14, color: C.warm, marginBottom: 5, letterSpacing: -0.3 }}>{p.name}</div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                          <span style={{ fontWeight: 950, fontSize: 16, color: promo ? C.amber : C.warm }}>{Number(price).toFixed(2)} €</span>
                          {promo && <span style={{ fontSize: 12, textDecoration: "line-through", color: "rgba(242,237,230,0.3)" }}>{Number(p.price_ttc).toFixed(2)} €</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      {/* ── UNIVERS ── */}
      <section data-theme="dark" className="section-padding" style={{ padding: "0 24px 80px", maxWidth: 1200, margin: "0 auto", boxSizing: "border-box", width: "100%" }}>
        <Reveal>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 10 }}>Univers M!LK</div>
            <h2 style={{ margin: 0, fontSize: "clamp(22px, 4vw, 40px)", fontWeight: 950, letterSpacing: -1.5, color: C.warm }}>
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
                <div style={{ position: "absolute", bottom: 14, left: 14, fontWeight: 800, fontSize: 14, color: C.warm }}>{img.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── AVIS CLIENTS ── */}
      <section data-theme="dark" className="section-padding" style={{ padding: "0 24px 80px", maxWidth: 1200, margin: "0 auto", boxSizing: "border-box", width: "100%" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 10 }}>Ce qu'on entend</div>
            <h2 style={{ margin: 0, fontSize: "clamp(22px, 4vw, 40px)", fontWeight: 950, letterSpacing: -1.5, color: C.warm }}>
              Des parents, pas des acteurs
            </h2>
          </div>
        </Reveal>

        <div className="reviews-grid" style={{ display: "grid", gap: 14 }}>
          {[
            { name: "Sophie M.",  role: "Maman de Léo, 2 mois",      stars: 5, text: "Mon fils avait des irritations avec tous les bodies en coton. Depuis M!LK, plus rien. La différence est immédiate dès la première nuit." },
            { name: "Thomas R.",  role: "Papa de Zoé, nouveau-né",    stars: 5, text: "On a reçu le coffret pour la naissance. La qualité est évidente, le bambou est incroyablement doux. On recommande à tous les futurs parents." },
            { name: "Amina B.",   role: "Maman de Samy, 3 mois",     stars: 5, text: "Samy transpire beaucoup la nuit. Avec les pyjamas M!LK, il dort mieux et se réveille moins. Le bambou thermorégulateur, ça marche vraiment." },
            { name: "Julie D.",   role: "Maman d'Emma, née en juin",  stars: 5, text: "Cadeau de naissance parfait. Les matières sont premium, les finitions soignées. On a l'impression d'habiller bébé dans quelque chose de vraiment spécial." },
          ].map((review, i) => (
            <Reveal key={review.name} delay={i * 0.08}>
              <div style={{ padding: "22px 20px", borderRadius: 16, background: C.bg2, border: `1px solid ${C.faint}` }}>
                <div style={{ display: "flex", marginBottom: 10 }}>
                  {[...Array(review.stars)].map((_, j) => (
                    <span key={j} style={{ color: C.amber, fontSize: 13 }}>★</span>
                  ))}
                </div>
                <p style={{ margin: "0 0 14px", fontSize: 14, color: C.muted, lineHeight: 1.7, fontStyle: "italic" }}>
                  &ldquo;{review.text}&rdquo;
                </p>
                <div style={{ fontWeight: 800, fontSize: 13, color: C.warm }}>{review.name}</div>
                <div style={{ fontSize: 11, color: "rgba(242,237,230,0.3)", marginTop: 2 }}>{review.role}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── REASSURANCE ── */}
      <div style={{ borderTop: `1px solid ${C.faint}`, borderBottom: `1px solid ${C.faint}` }}>
        <div className="reassurance-grid" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "grid" }}>
          {[
            { icon: "🚚", label: "Livraison offerte",  desc: "Dès 60€ d'achat"           },
            { icon: "↩️", label: "Retour gratuit",     desc: "Sous 30 jours"              },
            { icon: "🌿", label: "Bambou OEKO-TEX",    desc: "Certifié, testé, sécurisé"  },
            { icon: "🔒", label: "Paiement sécurisé",  desc: "Via Stripe"                 },
          ].map((r, i) => (
            <div className="reassurance-item" key={r.label} style={{ padding: "24px 16px", textAlign: "center", borderRight: i < 3 ? `1px solid ${C.faint}` : "none" }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{r.icon}</div>
              <div style={{ fontWeight: 900, fontSize: 13, color: C.warm, marginBottom: 4 }}>{r.label}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA FINAL ── */}
      <section data-theme="dark" style={{ padding: "90px 24px", textAlign: "center" }}>
        <Reveal>
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 18 }}>
              Prêt à chouchouter bébé ?
            </div>
            <h2 style={{ margin: "0 0 18px", fontSize: "clamp(26px, 5vw, 52px)", fontWeight: 950, letterSpacing: -2, color: C.warm, lineHeight: 1 }}>
              La douceur du bambou.<br />
              <span style={{ color: C.amber }}>Dès maintenant.</span>
            </h2>
            <p style={{ margin: "0 0 32px", fontSize: 15, color: C.muted, lineHeight: 1.7 }}>
              Rejoins les familles qui ont choisi M!LK pour les premières semaines de vie de leur bébé.
            </p>
            <div className="cta-btns" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/produits" style={{ padding: "16px 36px", borderRadius: 14, background: C.warm, color: "#1a1410", fontWeight: 900, fontSize: 16, textDecoration: "none", display: "inline-block" }}>
                Voir la collection →
              </Link>
              <Link href="/qui-sommes-nous" style={{ padding: "16px 36px", borderRadius: 14, border: `1px solid ${C.faint}`, color: C.muted, fontWeight: 700, fontSize: 15, textDecoration: "none", display: "inline-block" }}>
                Notre histoire
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

    </div>
  );
}