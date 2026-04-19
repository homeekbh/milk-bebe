"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link  from "next/link";

const C = {
  bg:    "#3a2a1a",
  bg2:   "#44301e",
  bg3:   "#503822",
  warm:  "#f2ede6",
  muted: "rgba(242,237,230,0.6)",
  faint: "rgba(242,237,230,0.08)",
  amber: "#c49a4a",
};

/* ── Hooks ── */
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
    let n = 0; const step = Math.ceil(value / 60);
    const t = setInterval(() => { n += step; if (n >= value) { setCount(value); clearInterval(t); } else setCount(n); }, 25);
    return () => clearInterval(t);
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

/* ── SVG icons ── */
function IconLeaf({ s = 28, c = C.amber }: { s?: number; c?: string }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 22C12 22 4 16 4 9a8 8 0 0 1 16 0c0 7-8 13-8 13z" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/><path d="M12 22V9" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>;
}
function IconTruck({ s = 28, c = C.amber }: { s?: number; c?: string }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M1 3h13v13H1z" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 8h4l3 3v5h-7V8z" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/><circle cx="5.5" cy="18.5" r="2.5" stroke={c} strokeWidth="1.8"/><circle cx="18.5" cy="18.5" r="2.5" stroke={c} strokeWidth="1.8"/></svg>;
}
function IconReturn({ s = 28, c = C.amber }: { s?: number; c?: string }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M9 14H4V9" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 14a9 9 0 1 0 1.5-5" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>;
}
function IconLock({ s = 28, c = C.amber }: { s?: number; c?: string }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke={c} strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>;
}
function IconBodies({ s = 34, c = C.amber }: { s?: number; c?: string }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 3c-1.5 0-2.5.8-2.5 2v1H7L5 8v4h2v8h10v-8h2V8l-2-2h-2.5V5c0-1.2-1-2-2.5-2Z" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/></svg>;
}
function IconPyjama({ s = 34, c = C.amber }: { s?: number; c?: string }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M8 3h8M8 3C6 3 5 4.5 5 6v16h14V6c0-1.5-1-3-3-3" stroke={c} strokeWidth="1.6" strokeLinecap="round"/><path d="M9 3v4l3 2 3-2V3" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/></svg>;
}
function IconGigoteuse({ s = 34, c = C.amber }: { s?: number; c?: string }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 3c-3.5 0-6 2-6 5v8c0 2.5 2.5 5 6 5s6-2.5 6-5V8c0-3-2.5-5-6-5Z" stroke={c} strokeWidth="1.6"/><path d="M9 3.5c0-1 1.3-1.5 3-1.5s3 .5 3 1.5" stroke={c} strokeWidth="1.6" strokeLinecap="round"/></svg>;
}
function IconAccessoires({ s = 34, c = C.amber }: { s?: number; c?: string }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 2C8.5 2 6 4 6 7v1H5a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-1V7c0-3-2.5-5-6-5Z" stroke={c} strokeWidth="1.6"/><path d="M6 11v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" stroke={c} strokeWidth="1.6"/></svg>;
}

const TICKER = ["✦ Bambou certifié OEKO-TEX","✦ 3× plus doux que le coton","✦ Thermorégulateur naturel","✦ Livraison offerte dès 60€","✦ Retour gratuit 30 jours","✦ Antibactérien naturel","✦ Peaux sensibles & eczéma","✦ Bodies · Pyjamas · Gigoteuses"];

function Ticker() {
  const str = TICKER.join("   ");
  return (
    <div style={{ overflow: "hidden", background: C.amber, padding: "11px 0" }}>
      <style>{`@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}} .tk{display:flex;animation:ticker 28s linear infinite;white-space:nowrap;width:max-content;}`}</style>
      <div className="tk">{[...Array(2)].map((_, i) => <span key={i} style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, color: "#1a1410", paddingRight: 60 }}>{str}</span>)}</div>
    </div>
  );
}

const HIGHLIGHT_LABELS: Record<string, string> = {
  meilleure_vente: "Meilleures ventes", selection: "Sélection du moment",
  nouveaute: "Nouveautés", default: "Nos essentiels du moment",
};

const CATS = [
  { label: "Bodies",      desc: "L'essentiel du quotidien",      href: "/categorie/bodies",     Icon: IconBodies      },
  { label: "Pyjamas",     desc: "Pour des nuits sereines",       href: "/categorie/pyjamas",    Icon: IconPyjama      },
  { label: "Gigoteuses",  desc: "Sommeil sécurisé",              href: "/categorie/gigoteuses", Icon: IconGigoteuse   },
  { label: "Accessoires", desc: "Les détails qui changent tout", href: "/categorie/accessoires",Icon: IconAccessoires },
];

export default function HomePage() {
  const heroRef       = useRef<HTMLDivElement>(null);
  const [products,     setProducts]     = useState<any[]>([]);
  const [sectionLabel, setSectionLabel] = useState("Nos essentiels du moment");
  const scrollSection  = useInView(0.1);

  useEffect(() => {
    fetch("/api/produits").then(r => r.json()).then((data: any[]) => {
      if (!Array.isArray(data)) return;
      const m = data.filter(p => p.highlight === "meilleure_vente" && p.stock > 0);
      const s = data.filter(p => p.highlight === "selection"       && p.stock > 0);
      const n = data.filter(p => p.highlight === "nouveaute"       && p.stock > 0);
      const a = data.filter(p => p.stock > 0);
      let chosen = a; let label = "default";
      if (m.length) { chosen = m; label = "meilleure_vente"; }
      else if (s.length) { chosen = s; label = "selection"; }
      else if (n.length) { chosen = n; label = "nouveaute"; }
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
        .pcard:hover  { transform: translateY(-6px); box-shadow: 0 32px 60px rgba(0,0,0,0.4); border-color: rgba(196,154,74,0.4) !important; }
        .pcard:hover .pcard-img { transform: scale(1.06) !important; }
        .cat-card:hover { background: rgba(196,154,74,0.08) !important; border-color: rgba(196,154,74,0.25) !important; transform: translateY(-4px) !important; }

        /* ✅ Responsive — aucun vide latéral */
        .pgrid     { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
        .catgrid   { grid-template-columns: repeat(4, 1fr); }
        .reassgrid { grid-template-columns: repeat(4, 1fr); }
        .kpigrid   { grid-template-columns: repeat(4, 1fr); }

        @media (max-width: 1024px) {
          .catgrid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .pgrid     { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .catgrid   { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .reassgrid { grid-template-columns: 1fr 1fr !important; }
          .kpigrid   { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* ── HERO ── */}
      <section data-theme="dark" style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
        <div ref={heroRef} style={{ position: "absolute", inset: "-20% 0 -20% 0", willChange: "transform" }}>
          <Image src="/images/hero/hero-papa-bebe.png" alt="M!LK" fill priority sizes="100vw" style={{ objectFit: "cover", objectPosition: "center 60%" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(13,11,9,0.88) 0%, rgba(13,11,9,0.5) 50%, rgba(13,11,9,0.75) 100%)" }} />
        <div className="hero-content" style={{ position: "relative", zIndex: 2, padding: "clamp(110px, 15vh, 180px) 5vw 80px", width: "100%", boxSizing: "border-box" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
            {["Nouveau-né", "0-3 mois", "3-6 mois"].map(tag => (
              <span key={tag} style={{ padding: "6px 14px", borderRadius: 99, border: `1px solid ${C.amber}`, color: C.amber, fontSize: 12, fontWeight: 800 }}>{tag}</span>
            ))}
          </div>
          <h1 style={{ margin: "0 0 22px", fontSize: "clamp(38px, 7.5vw, 96px)", fontWeight: 950, letterSpacing: -3, lineHeight: 0.95, color: C.warm }}>
            L'essentiel.<br /><span style={{ color: C.amber }}>Sans compromis.</span>
          </h1>
          {/* Badge rotatif */}
          <div style={{ position: "absolute", top: "50%", right: "6%", transform: "translateY(-50%)", zIndex: 3, display: "block" }} className="badge-svg">
            <svg width="130" height="130" viewBox="0 0 140 140" style={{ animation: "badge-spin 14s linear infinite" }}>
              <path id="bc" d="M 70,70 m -55,0 a 55,55 0 1,1 110,0 a 55,55 0 1,1 -110,0" fill="none"/>
              <text fontSize="12" fontWeight="700" letterSpacing="2.5" fill={C.amber}><textPath href="#bc">BAMBOU OEKO-TEX · PREMIUM · NOURRISSON ·</textPath></text>
            </svg>
          </div>
          <p style={{ margin: "0 0 32px", fontSize: "clamp(14px, 1.8vw, 19px)", color: C.muted, maxWidth: 520, lineHeight: 1.75, fontWeight: 500 }}>
            Vêtements nourrisson en bambou certifié OEKO-TEX. Ultra-doux, thermorégulateur, antibactérien — pensé pour les peaux les plus fragiles.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/produits" style={{ padding: "16px 30px", borderRadius: 14, background: C.warm, color: "#1a1410", fontWeight: 900, fontSize: "clamp(14px, 1.6vw, 17px)", textDecoration: "none", display: "inline-block" }}>
              Découvrir la collection →
            </Link>
            <Link href="/pourquoi-bambou" style={{ padding: "16px 30px", borderRadius: 14, border: "1px solid rgba(242,237,230,0.2)", color: C.warm, fontWeight: 700, fontSize: "clamp(14px, 1.6vw, 17px)", textDecoration: "none", display: "inline-block" }}>
              Pourquoi le bambou ?
            </Link>
          </div>
          <div style={{ display: "flex", gap: 40, marginTop: 48, flexWrap: "wrap" }}>
            {[
              { value: 500, suffix: "+", label: "familles satisfaites" },
              { value: 100, suffix: "%", label: "Bambou OEKO-TEX"      },
              { value: 30,  suffix: "j", label: "retour gratuit"       },
            ].map(k => (
              <div key={k.label}>
                <div style={{ fontSize: "clamp(26px, 4vw, 48px)", fontWeight: 950, letterSpacing: -1.5, color: C.warm, lineHeight: 1 }}><AnimatedCounter value={k.value} suffix={k.suffix} /></div>
                <div style={{ fontSize: "clamp(11px, 1.2vw, 14px)", color: C.muted, marginTop: 5 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 24, left: "50%", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.35, zIndex: 3, transform: "translateX(-50%)" }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: C.warm }}>Découvrir</div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: "bounce-arr 2s ease infinite" }}>
            <path d="M12 5v14M5 12l7 7 7-7" stroke={C.warm} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </section>

      <Ticker />

      {/* ── SECTION PRINCIPALE ── */}
      <div ref={scrollSection.ref} style={{ background: C.bg }}>

        {/* ✅ Texte scrollant — s'adapte exactement à la largeur, pas de vide */}
        <div style={{ overflow: "hidden" }}>
          <div style={{
            display: "block", width: "100%", boxSizing: "border-box",
            padding: "28px 5vw 20px",
            fontSize: "clamp(20px, 5.5vw, 96px)",
            fontWeight: 950, letterSpacing: "-0.02em", lineHeight: 1.02,
            textTransform: "uppercase",
            color: "rgba(242,237,230,0.15)",
            textShadow: "0 4px 6px rgba(0,0,0,0.3)",
            whiteSpace: "nowrap", overflow: "hidden",
            opacity: scrollSection.visible ? 1 : 0,
            transform: scrollSection.visible ? "translateX(0)" : "translateX(100vw)",
            transition: "transform 1s cubic-bezier(.22,1,.36,1), opacity 0.6s ease",
          }}>
            M!LK RÉDUIT LES GALÈRES DU QUOTIDIEN
          </div>
        </div>

        {/* Produits vedettes */}
        {products.length > 0 && (
          <div style={{ padding: "0 5vw 48px" }}>
            <Reveal>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 8 }}>Sélection</div>
                  <h2 style={{ margin: 0, fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: 950, letterSpacing: -1.5, color: C.warm, lineHeight: 1 }}>{sectionLabel}</h2>
                </div>
                <Link href="/produits" style={{ fontSize: 15, fontWeight: 800, color: C.amber, textDecoration: "none", whiteSpace: "nowrap" }}>Voir tout →</Link>
              </div>
            </Reveal>
            <div className="pgrid" style={{ display: "grid", gap: 16 }}>
              {products.map((p, i) => {
                const promo = isPromoActive(p);
                const price = promo ? p.promo_price : p.price_ttc;
                const badge = p.label === "bestseller" ? "Best seller" : p.label === "nouveau" ? "Nouveau" : p.highlight === "meilleure_vente" ? "Best seller" : p.highlight === "nouveaute" ? "Nouveau" : null;
                return (
                  <Reveal key={p.id} delay={i * 0.08}>
                    <Link href={`/produits/${p.slug}`} style={{ textDecoration: "none", display: "block" }}>
                      <div className="pcard" style={{ borderRadius: 18, overflow: "visible", background: C.bg2, border: `1px solid ${C.faint}`, position: "relative", transition: "all 0.3s ease", cursor: "pointer" }}>
                        {badge && (
                          <div style={{ position: "absolute", top: 0, right: 0, width: 100, height: 100, overflow: "hidden", zIndex: 10, borderRadius: "0 18px 0 0", pointerEvents: "none" }}>
                            <div style={{ position: "absolute", top: 20, right: -28, background: "#c49a4a", color: "#1a1410", fontSize: 10, fontWeight: 900, padding: "7px 42px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{badge}</div>
                          </div>
                        )}
                        <div style={{ borderRadius: "18px 18px 0 0", overflow: "hidden", position: "relative", aspectRatio: "3/4", background: C.bg3 }}>
                          {p.image_url
                            ? <Image src={p.image_url} alt={p.name} fill sizes="(max-width:640px) 50vw, 25vw" className="pcard-img" style={{ objectFit: "cover", transition: "transform 0.5s ease" }} />
                            : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 20, fontWeight: 950, color: C.faint }}>M!LK</div>
                          }
                          {promo && <div style={{ position: "absolute", top: 10, left: 10 }}><span style={{ padding: "5px 10px", borderRadius: 99, background: C.amber, color: "#fff", fontSize: 11, fontWeight: 900 }}>PROMO</span></div>}
                        </div>
                        <div style={{ padding: "12px 14px 16px" }}>
                          <div style={{ fontWeight: 900, fontSize: "clamp(13px, 1.4vw, 16px)", color: C.warm, marginBottom: 4, lineHeight: 1.3 }}>{p.name}</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                            <span style={{ fontWeight: 950, fontSize: "clamp(16px, 1.8vw, 19px)", color: promo ? C.amber : C.warm }}>{Number(price).toFixed(2)} €</span>
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
        <div style={{ padding: "0 5vw 40px" }}>
          <div className="catgrid" style={{ display: "grid", gap: 14 }}>
            {CATS.map((cat, i) => (
              <div key={cat.label} style={{ opacity: scrollSection.visible ? 1 : 0, transform: scrollSection.visible ? "none" : "translateY(40px)", transition: `opacity 0.7s ease ${i*0.1}s, transform 0.7s ease ${i*0.1}s` }}>
                <Link href={cat.href} style={{ textDecoration: "none", display: "block" }}>
                  <div className="cat-card" style={{ padding: "24px 20px", borderRadius: 20, background: C.bg2, border: `1px solid ${C.faint}`, transition: "all 0.25s ease", height: "100%", boxSizing: "border-box" }}>
                    <cat.Icon />
                    <div style={{ fontWeight: 900, fontSize: "clamp(15px, 1.6vw, 18px)", color: C.warm, marginBottom: 5, marginTop: 12 }}>{cat.label}</div>
                    <div style={{ fontSize: "clamp(12px, 1.2vw, 14px)", color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>{cat.desc}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.amber }}>Voir →</div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* ✅ Texte scrollant bas */}
        <div style={{ overflow: "hidden" }}>
          <div style={{
            display: "block", width: "100%", boxSizing: "border-box",
            padding: "20px 5vw 32px",
            fontSize: "clamp(20px, 5.5vw, 96px)",
            fontWeight: 950, letterSpacing: "-0.02em", lineHeight: 1.02,
            textTransform: "uppercase",
            color: "rgba(242,237,230,0.15)",
            textShadow: "0 4px 6px rgba(0,0,0,0.3)",
            whiteSpace: "nowrap", overflow: "hidden",
            opacity: scrollSection.visible ? 1 : 0,
            transform: scrollSection.visible ? "translateX(0)" : "translateX(-100vw)",
            transition: "transform 1s cubic-bezier(.22,1,.36,1), opacity 0.6s ease",
          }}>
            MOINS D'IRRITATIONS. PLUS DE CALME.
          </div>
        </div>
      </div>

      {/* ✅ Bandeau noir — une ligne blanche + une ligne jaune */}
      <div style={{ background: "#0f0c09", padding: "36px 5vw" }}>
        <Reveal>
          <p style={{ margin: 0, fontSize: "clamp(18px, 3.5vw, 48px)", fontWeight: 800, lineHeight: 1.2, color: "#f2ede6", letterSpacing: -0.5, whiteSpace: "nowrap", overflow: "hidden" }}>
            M!LK n'est pas une marque de vêtements.
          </p>
          <p style={{ margin: "6px 0 0", fontSize: "clamp(18px, 3.5vw, 48px)", fontWeight: 800, lineHeight: 1.2, color: C.amber, letterSpacing: -0.5, whiteSpace: "nowrap", overflow: "hidden" }}>
            C'est une réponse aux petites galères répétées.
          </p>
        </Reveal>
      </div>

      {/* Bambou */}
      <div style={{ position: "relative", backgroundImage: "url('/matiere/bambou-02.png')", backgroundSize: "cover", backgroundPosition: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.85)" }} />
        <div style={{ position: "relative", zIndex: 2, padding: "56px 5vw" }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(22px, 3.5vw, 38px)", margin: "0 0 36px", fontWeight: 900, letterSpacing: -0.5, color: "#1a1410" }}>L'essentiel. Sans compromis.</h2>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
            {[
              { t: "Pensé pour la vraie vie",  d: "Un body doit accompagner les mouvements, pas les contraindre.",  delay: 0   },
              { t: "Respirant, naturellement", d: "Moins de chaleur. Moins d'humidité. Moins d'irritation.",        delay: 0.1 },
              { t: "Coupe maîtrisée",          d: "Ni trop large. Ni trop serrée. Juste ajustée.",                  delay: 0.2 },
              { t: "Essentiels durables",      d: "Moins acheter. Mieux choisir.",                                  delay: 0.3 },
            ].map(card => (
              <Reveal key={card.t} delay={card.delay}>
                <div style={{ padding: "24px", borderRadius: 16, background: "rgba(255,255,255,0.97)", boxShadow: "0 10px 36px rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.04)" }}>
                  <div style={{ fontWeight: 900, marginBottom: 8, fontSize: "clamp(15px, 1.6vw, 18px)", color: "#1a1410" }}>{card.t}</div>
                  <div style={{ opacity: 0.6, lineHeight: 1.7, fontSize: "clamp(13px, 1.3vw, 15px)", color: "#1a1410" }}>{card.d}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* ✅ Réassurance — sans vide latéral */}
      <div style={{ background: C.bg2, borderTop: `1px solid ${C.faint}`, borderBottom: `1px solid ${C.faint}` }}>
        <div className="reassgrid" style={{ display: "grid", padding: "0 5vw" }}>
          {[
            { Icon: IconTruck,  label: "Livraison offerte",  desc: "Dès 60€ d'achat"          },
            { Icon: IconReturn, label: "Retour gratuit",     desc: "Sous 30 jours"             },
            { Icon: IconLeaf,   label: "Bambou OEKO-TEX",   desc: "Certifié, testé, sécurisé" },
            { Icon: IconLock,   label: "Paiement sécurisé", desc: "Via Stripe"                },
          ].map((r, i) => (
            <div key={r.label} style={{ padding: "22px 12px", textAlign: "center", borderRight: i < 3 ? `1px solid ${C.faint}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><r.Icon s={24} /></div>
              <div style={{ fontWeight: 900, fontSize: "clamp(12px, 1.2vw, 14px)", color: C.warm, marginBottom: 2 }}>{r.label}</div>
              <div style={{ fontSize: "clamp(11px, 1vw, 12px)", color: C.muted }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ✅ KPIs grands — sans vide */}
      <div style={{ background: C.bg }}>
        <div className="kpigrid" style={{ display: "grid", padding: "0 5vw" }}>
          {[
            { valeur: "100%", label: "Bambou certifié OEKO-TEX" },
            { valeur: "0",    label: "Substance nocive"          },
            { valeur: "3×",   label: "Plus doux que le coton"   },
            { valeur: "30j",  label: "Retour gratuit"            },
          ].map((k, i) => (
            <div key={k.label} style={{ padding: "30px 12px", textAlign: "center", borderRight: i < 3 ? `1px solid ${C.faint}` : "none" }}>
              <div style={{ fontSize: "clamp(36px, 5.5vw, 70px)", fontWeight: 950, letterSpacing: -2, color: C.amber, lineHeight: 1 }}>{k.valeur}</div>
              <div style={{ marginTop: 6, fontSize: "clamp(11px, 1.1vw, 14px)", color: C.muted, fontWeight: 700 }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Avis */}
      <div style={{ padding: "56px 5vw" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 8 }}>Ce qu'on entend</div>
            <h2 style={{ margin: 0, fontSize: "clamp(22px, 3.5vw, 40px)", fontWeight: 950, letterSpacing: -1.5, color: C.warm }}>Des parents, pas des acteurs</h2>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {[
            { name: "Sophie M.", role: "Maman de Léo, 2 mois",     text: "Mon fils avait des irritations avec tous les bodies en coton. Depuis M!LK, plus rien. La différence est immédiate dès la première nuit." },
            { name: "Thomas R.", role: "Papa de Zoé, nouveau-né",   text: "On a reçu le coffret pour la naissance. La qualité est évidente, le bambou est incroyablement doux." },
            { name: "Amina B.",  role: "Maman de Samy, 3 mois",    text: "Samy transpire beaucoup la nuit. Avec les pyjamas M!LK, il dort mieux et se réveille moins. Le bambou thermorégulateur, ça marche vraiment." },
            { name: "Julie D.",  role: "Maman d'Emma, née en juin", text: "Cadeau de naissance parfait. Les matières sont premium, les finitions soignées." },
          ].map((r, i) => (
            <Reveal key={r.name} delay={i * 0.07}>
              <div style={{ padding: "22px 20px", borderRadius: 16, background: C.bg2, border: `1px solid ${C.faint}`, height: "100%", boxSizing: "border-box" }}>
                <div style={{ display: "flex", marginBottom: 10 }}>{[...Array(5)].map((_, j) => <span key={j} style={{ color: C.amber, fontSize: 14 }}>★</span>)}</div>
                <p style={{ margin: "0 0 12px", fontSize: "clamp(13px, 1.3vw, 15px)", color: C.muted, lineHeight: 1.7, fontStyle: "italic" }}>&ldquo;{r.text}&rdquo;</p>
                <div style={{ fontWeight: 800, fontSize: 14, color: C.warm }}>{r.name}</div>
                <div style={{ fontSize: 12, color: "rgba(242,237,230,0.3)", marginTop: 2 }}>{r.role}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* CTA final */}
      <section style={{ padding: "60px 5vw", textAlign: "center", background: C.bg }}>
        <Reveal>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 16 }}>Prêt à chouchouter bébé ?</div>
            <h2 style={{ margin: "0 0 16px", fontSize: "clamp(26px, 4.5vw, 52px)", fontWeight: 950, letterSpacing: -2, color: C.warm, lineHeight: 1.05 }}>
              La douceur du bambou.<br /><span style={{ color: C.amber }}>Dès maintenant.</span>
            </h2>
            <p style={{ margin: "0 0 28px", fontSize: "clamp(14px, 1.5vw, 17px)", color: C.muted, lineHeight: 1.7 }}>
              Rejoins les familles qui ont choisi M!LK pour les premières semaines de vie de leur bébé.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/produits" style={{ padding: "17px 38px", borderRadius: 14, background: C.warm, color: "#1a1410", fontWeight: 900, fontSize: "clamp(15px, 1.6vw, 18px)", textDecoration: "none", display: "inline-block" }}>
                Voir la collection →
              </Link>
              <Link href="/qui-sommes-nous" style={{ padding: "17px 38px", borderRadius: 14, border: `1px solid ${C.faint}`, color: C.muted, fontWeight: 700, fontSize: "clamp(14px, 1.5vw, 17px)", textDecoration: "none", display: "inline-block" }}>
                Notre histoire
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}