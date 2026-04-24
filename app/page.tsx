"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link  from "next/link";

const C = {
  bg:       "#3a2a1a",
  bg2:      "#44301e",
  bg3:      "#503822",
  warm:     "#f2ede6",
  muted:    "rgba(242,237,230,0.55)",
  faint:    "rgba(242,237,230,0.08)",
  amber:    "#c49a4a",
  taupe1:   "#f0e8dc",
  taupe2:   "#e4d8c8",
  taupe3:   "#d4c4b0",
  taupeDark:"#c2af97",
  taupeCard:"#ede4d6",
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

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(28px)", transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s` }}>
      {children}
    </div>
  );
}

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useScrollReveal(0.3);
  useEffect(() => {
    if (!visible) return;
    let n = 0; const step = Math.ceil(value / 60);
    const t = setInterval(() => { n += step; if (n >= value) { setCount(value); clearInterval(t); } else setCount(n); }, 25);
    return () => clearInterval(t);
  }, [visible, value]);
  return <span ref={ref}>{count.toLocaleString("fr-FR")}{suffix}</span>;
}

// ── Texte défilant — centré verticalement en hauteur fixe ──
function BigTextScroll({ text, speed = 28 }: { text: string; speed?: number }) {
  const repeated = `${text}   ✦   ${text}   ✦   `;
  return (
    <div style={{ overflow: "hidden", height: "clamp(60px,8vw,110px)", display: "flex", alignItems: "center", userSelect: "none", background: C.bg }}>
      <style>{`
        @keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes bigtxt { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .tk  { display:flex; animation:ticker 32s linear infinite; white-space:nowrap; width:max-content; }
        .bts { display:flex; white-space:nowrap; width:max-content; animation:bigtxt var(--spd,28s) linear infinite; }
      `}</style>
      <div className="bts" style={{ "--spd": `${speed}s` } as React.CSSProperties}>
        {[...Array(2)].map((_, i) => (
          <span key={i} style={{ fontSize: "clamp(28px,5.5vw,80px)", fontWeight: 950, letterSpacing: "-0.02em", color: "rgba(242,237,230,0.13)", textTransform: "uppercase", paddingRight: "4vw", lineHeight: 1 }}>
            {repeated}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Accordion hover — fond taupe moyen ──
function HoverAccordion({ title, tag, children }: { title: string; tag: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{
        borderRadius: 20,
        background: open ? C.taupeCard : C.taupeDark,
        border: open ? `1.5px solid ${C.amber}` : `1.5px solid ${C.taupe3}`,
        overflow: "hidden",
        transition: "box-shadow 0.3s ease, border-color 0.3s ease, background 0.3s ease",
        boxShadow: open ? "0 20px 60px rgba(0,0,0,0.1)" : "0 2px 8px rgba(0,0,0,0.04)",
        cursor: "default",
      }}
    >
      <div style={{ padding: "22px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 6 }}>{tag}</div>
          <div style={{ fontSize: "clamp(15px,1.6vw,19px)", fontWeight: 900, color: "#1a1410" }}>{title}</div>
        </div>
        <div style={{ fontSize: 22, color: C.amber, transition: "transform 0.3s ease", transform: open ? "rotate(45deg)" : "none", flexShrink: 0, marginLeft: 16 }}>+</div>
      </div>
      <div style={{ maxHeight: open ? "1200px" : 0, overflow: "hidden", transition: "max-height 0.5s cubic-bezier(0.4,0,0.2,1)" }}>
        <div style={{ padding: "0 28px 28px" }}>{children}</div>
      </div>
    </div>
  );
}

function IconLeaf({ s=26,c=C.amber }:{s?:number;c?:string}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 22C12 22 4 16 4 9a8 8 0 0 1 16 0c0 7-8 13-8 13z" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/><path d="M12 22V9" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>; }
function IconTruck({ s=26,c=C.amber }:{s?:number;c?:string}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M1 3h13v13H1z" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 8h4l3 3v5h-7V8z" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/><circle cx="5.5" cy="18.5" r="2.5" stroke={c} strokeWidth="1.8"/><circle cx="18.5" cy="18.5" r="2.5" stroke={c} strokeWidth="1.8"/></svg>; }
function IconLock({ s=26,c=C.amber }:{s?:number;c?:string}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke={c} strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={c} strokeWidth="1.8"/></svg>; }
function IconBodies({ s=32,c=C.amber }:{s?:number;c?:string}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 3c-1.5 0-2.5.8-2.5 2v1H7L5 8v4h2v8h10v-8h2V8l-2-2h-2.5V5c0-1.2-1-2-2.5-2Z" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/></svg>; }
function IconPyjama({ s=32,c=C.amber }:{s?:number;c?:string}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M8 3h8M8 3C6 3 5 4.5 5 6v16h14V6c0-1.5-1-3-3-3" stroke={c} strokeWidth="1.6" strokeLinecap="round"/><path d="M9 3v4l3 2 3-2V3" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/></svg>; }
function IconGigoteuse({ s=32,c=C.amber }:{s?:number;c?:string}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 3c-3.5 0-6 2-6 5v8c0 2.5 2.5 5 6 5s6-2.5 6-5V8c0-3-2.5-5-6-5Z" stroke={c} strokeWidth="1.6"/><path d="M9 3.5c0-1 1.3-1.5 3-1.5s3 .5 3 1.5" stroke={c} strokeWidth="1.6" strokeLinecap="round"/></svg>; }
function IconAccessoires({ s=32,c=C.amber }:{s?:number;c?:string}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 2C8.5 2 6 4 6 7v1H5a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-1V7c0-3-2.5-5-6-5Z" stroke={c} strokeWidth="1.6"/><path d="M6 11v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" stroke={c} strokeWidth="1.6"/></svg>; }

const TICKER_ITEMS = ["✦ Bambou certifié OEKO-TEX","✦ 3× plus doux que le coton","✦ Thermorégulateur naturel","✦ Livraison offerte dès 60€","✦ Retour gratuit 15 jours","✦ Antibactérien naturel","✦ Des essentiels bébé. Sans le superflu.","✦ Bodies · Pyjamas · Gigoteuses"];

function Ticker() {
  const str = TICKER_ITEMS.join("   ");
  return (
    <div style={{ overflow: "hidden", background: C.amber, padding: "11px 0" }}>
      <div className="tk">{[...Array(2)].map((_, i) => <span key={i} style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, color: "#1a1410", paddingRight: 60 }}>{str}</span>)}</div>
    </div>
  );
}

const HIGHLIGHT_LABELS: Record<string, string> = {
  meilleure_vente: "Meilleures ventes",
  selection: "Sélection du moment",
  nouveaute: "Nouveautés",
  default: "Nos essentiels du moment",
};

const CATS = [
  { label: "Bodies",      desc: "L'essentiel du quotidien",      href: "/categorie/bodies",      Icon: IconBodies      },
  { label: "Pyjamas",     desc: "Pour des nuits sereines",       href: "/categorie/pyjamas",     Icon: IconPyjama      },
  { label: "Gigoteuses",  desc: "Sommeil sécurisé",              href: "/categorie/gigoteuses",  Icon: IconGigoteuse   },
  { label: "Accessoires", desc: "Les détails qui changent tout", href: "/categorie/accessoires", Icon: IconAccessoires },
];

function CatCard({ cat }: { cat: typeof CATS[0] }) {
  const [hov, setHov] = useState(false);
  return (
    <Link href={cat.href} style={{ textDecoration: "none", display: "block", height: "100%" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{
        padding: "20px 18px", borderRadius: 18,
        background: hov ? "#1a1410" : C.taupeCard,
        border: hov ? `2px solid ${C.amber}` : `2px solid ${C.taupe3}`,
        transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        transform: hov ? "translateY(-8px) scale(1.02)" : "none",
        boxShadow: hov ? `0 28px 56px rgba(0,0,0,0.22), 0 0 0 1px ${C.amber}44` : "0 2px 12px rgba(0,0,0,0.06)",
        height: "100%", boxSizing: "border-box" as const,
      }}>
        <div style={{ marginBottom: 12, transition: "transform 0.3s ease", transform: hov ? "scale(1.15)" : "none", display: "inline-block" }}>
          <cat.Icon s={28} c={hov ? C.amber : "#1a1410"} />
        </div>
        <div style={{ fontWeight: 900, fontSize: "clamp(14px,1.4vw,17px)", color: hov ? C.warm : "#1a1410", marginBottom: 5, transition: "color 0.25s" }}>{cat.label}</div>
        <div style={{ fontSize: "clamp(11px,1vw,13px)", color: hov ? C.muted : "rgba(26,20,16,0.5)", marginBottom: 14, lineHeight: 1.5, transition: "color 0.25s" }}>{cat.desc}</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: hov ? C.amber : "#1a1410", transition: "color 0.25s, transform 0.25s", transform: hov ? "translateX(5px)" : "none", display: "inline-block" }}>Voir →</div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [products, setProducts]         = useState<any[]>([]);
  const [sectionLabel, setSectionLabel] = useState("Nos essentiels du moment");
  const scrollSection = useInView(0.1);

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
        .pcard:hover  { transform:translateY(-5px) !important; box-shadow:0 24px 48px rgba(0,0,0,0.15) !important; border-color:${C.amber} !important; }
        .pcard:hover .pcard-img { transform:scale(1.05) !important; }
        .catgrid  { grid-template-columns: repeat(4,1fr); }
        .tgrid    { grid-template-columns: repeat(3,1fr); }
        .pillars  { grid-template-columns: repeat(4,1fr); }
        .comptable{ grid-template-columns: 1.4fr 1fr 1fr; }
        .rgrid    { grid-template-columns: repeat(auto-fit,minmax(260px,1fr)); }
        @media(max-width:1024px){ .catgrid{grid-template-columns:repeat(2,1fr)!important} .pillars{grid-template-columns:repeat(2,1fr)!important} }
        @media(max-width:768px){
          .catgrid{grid-template-columns:repeat(2,1fr)!important}
          .tgrid{grid-template-columns:1fr!important}
          .pillars{grid-template-columns:1fr 1fr!important}
          .comptable{grid-template-columns:1fr 1fr 1fr!important}
          .hero-btns{flex-direction:column!important}
          .hero-btns a{text-align:center!important;width:100%;box-sizing:border-box}
          .badge-svg{display:none!important}
        }
      `}</style>

      {/* ── HERO ── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
        <div ref={heroRef} style={{ position: "absolute", inset: "-20% 0 -20% 0", willChange: "transform" }}>
          <Image src="/images/hero/hero-papa-bebe.png" alt="M!LK" fill priority sizes="100vw" style={{ objectFit: "cover", objectPosition: "center 60%" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(13,11,9,0.88) 0%,rgba(13,11,9,0.5) 50%,rgba(13,11,9,0.75) 100%)" }} />

        <div className="hero-content" style={{ position: "relative", zIndex: 2, padding: "clamp(110px,15vh,180px) 5vw 80px", width: "100%", boxSizing: "border-box" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
            {["Nouveau-né","0-3 mois","3-6 mois"].map(tag => (
              <span key={tag} style={{ padding: "6px 14px", borderRadius: 99, border: `1px solid ${C.amber}`, color: C.amber, fontSize: 12, fontWeight: 800 }}>{tag}</span>
            ))}
          </div>

          <h1 style={{ margin: "0 0 22px", fontSize: "clamp(38px,7.5vw,96px)", fontWeight: 950, letterSpacing: -3, lineHeight: 0.95, color: C.warm }}>
            L'essentiel.<br /><span style={{ color: C.amber }}>Sans compromis.</span>
          </h1>

          <div className="badge-svg" style={{ position: "absolute", top: "50%", right: "6%", transform: "translateY(-50%)", zIndex: 3 }}>
            <svg width="130" height="130" viewBox="0 0 140 140" style={{ animation: "badge-spin 14s linear infinite" }}>
              <path id="bc" d="M 70,70 m -55,0 a 55,55 0 1,1 110,0 a 55,55 0 1,1 -110,0" fill="none"/>
              <text fontSize="12" fontWeight="700" letterSpacing="2.5" fill={C.amber}><textPath href="#bc">BAMBOU OEKO-TEX · PREMIUM · NOURRISSON ·</textPath></text>
            </svg>
          </div>

          <p style={{ margin: "0 0 32px", fontSize: "clamp(14px,1.8vw,19px)", color: C.muted, maxWidth: 520, lineHeight: 1.75 }}>
            Des essentiels bébé en bambou certifié OEKO-TEX. Pensés pour réduire les galères du quotidien — pas pour faire joli en photo.
          </p>

          <div className="hero-btns" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
            <Link href="/produits" style={{ padding: "16px 30px", borderRadius: 14, background: C.warm, color: "#1a1410", fontWeight: 900, fontSize: "clamp(14px,1.6vw,17px)", textDecoration: "none", display: "inline-block" }}>
              Découvrir la collection →
            </Link>
            <Link href="/pourquoi-bambou" style={{ padding: "16px 30px", borderRadius: 14, border: "1px solid rgba(242,237,230,0.2)", color: C.warm, fontWeight: 700, fontSize: "clamp(14px,1.6vw,17px)", textDecoration: "none", display: "inline-block" }}>
              Pourquoi le bambou ?
            </Link>
          </div>

          {/* KPIs */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 0, marginBottom: 28 }}>
            {[
              { val: "500+", label: "familles satisfaites"    },
              { val: "100%", label: "Bambou OEKO-TEX"         },
              { val: "15j",  label: "retour gratuit"          },
              { val: "0",    label: "substance nocive"        },
              { val: "3×",   label: "plus doux que le coton" },
            ].map((k, i) => (
              <div key={k.label} style={{ paddingRight: 28, marginRight: 28, borderRight: i < 4 ? "1px solid rgba(242,237,230,0.12)" : "none", paddingBottom: 8 }}>
                <div style={{ fontSize: "clamp(22px,3vw,40px)", fontWeight: 950, letterSpacing: -1.5, color: C.warm, lineHeight: 1 }}>{k.val}</div>
                <div style={{ fontSize: "clamp(10px,0.9vw,12px)", color: C.muted, marginTop: 4 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Réassurance sans doublon */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", paddingTop: 18, borderTop: "1px solid rgba(242,237,230,0.08)" }}>
            {[
              { Icon: IconTruck, label: "Livraison offerte",  desc: "dès 60€"  },
              { Icon: IconLeaf,  label: "Bambou OEKO-TEX",   desc: "certifié" },
              { Icon: IconLock,  label: "Paiement sécurisé", desc: "Stripe"   },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <r.Icon s={16} c={C.amber} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.warm, lineHeight: 1 }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.35, zIndex: 3 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: C.warm }}>Découvrir</div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: "bounce-arr 2s ease infinite" }}>
            <path d="M12 5v14M5 12l7 7 7-7" stroke={C.warm} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </section>

      <Ticker />

      {/* ── PRODUITS — fond taupe1, cards centrées ── */}
      <div ref={scrollSection.ref} style={{ background: C.taupe1, padding: "48px 5vw" }}>
        <Reveal>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 8 }}>Sélection</div>
              <h2 style={{ margin: 0, fontSize: "clamp(22px,3vw,36px)", fontWeight: 950, letterSpacing: -1.5, color: "#1a1410", lineHeight: 1 }}>{sectionLabel}</h2>
            </div>
            <Link href="/produits" style={{ fontSize: 15, fontWeight: 800, color: C.amber, textDecoration: "none", whiteSpace: "nowrap" }}>Voir tout →</Link>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,280px))", gap: 16, justifyContent: "center" }}>
          {products.map((p, i) => {
            const promo = isPromoActive(p);
            const price = promo ? p.promo_price : p.price_ttc;
            const badge = p.label === "bestseller" ? "Best seller" : p.label === "nouveau" ? "Nouveau" : p.highlight === "meilleure_vente" ? "Best seller" : p.highlight === "nouveaute" ? "Nouveau" : null;
            return (
              <Reveal key={p.id} delay={i * 0.08}>
                <Link href={`/produits/${p.slug}`} style={{ textDecoration: "none", display: "block" }}>
                  <div className="pcard" style={{ borderRadius: 16, overflow: "visible", background: C.taupeCard, border: `1.5px solid ${C.taupe3}`, position: "relative", transition: "all 0.28s cubic-bezier(0.34,1.56,0.64,1)", cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                    {badge && (
                      <div style={{ position: "absolute", top: 0, right: 0, width: 90, height: 90, overflow: "hidden", zIndex: 10, borderRadius: "0 16px 0 0", pointerEvents: "none" }}>
                        <div style={{ position: "absolute", top: 18, right: -26, background: C.amber, color: "#1a1410", fontSize: 9, fontWeight: 900, padding: "6px 36px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{badge}</div>
                      </div>
                    )}
                    <div style={{ borderRadius: "14px 14px 0 0", overflow: "hidden", position: "relative", aspectRatio: "1/1", background: C.taupe2 }}>
                      {p.image_url
                        ? <Image src={p.image_url} alt={p.name} fill sizes="280px" className="pcard-img" style={{ objectFit: "cover", transition: "transform 0.4s ease" }} />
                        : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 20, fontWeight: 950, color: C.taupeDark }}>M!LK</div>
                      }
                      {promo && <div style={{ position: "absolute", top: 10, left: 10 }}><span style={{ padding: "4px 9px", borderRadius: 99, background: C.amber, color: "#fff", fontSize: 10, fontWeight: 900 }}>PROMO</span></div>}
                    </div>
                    <div style={{ padding: "12px 14px 16px" }}>
                      <div style={{ fontWeight: 900, fontSize: "clamp(12px,1.3vw,15px)", color: "#1a1410", marginBottom: 4, lineHeight: 1.3 }}>{p.name}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontWeight: 950, fontSize: "clamp(15px,1.6vw,18px)", color: promo ? C.amber : "#1a1410" }}>{Number(price).toFixed(2)} €</span>
                        {promo && <span style={{ fontSize: 12, textDecoration: "line-through", color: "rgba(26,20,16,0.3)" }}>{Number(p.price_ttc).toFixed(2)} €</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* ── TEXTE DÉFILANT — centré verticalement ── */}
      <BigTextScroll text="M!LK RÉDUIT LES GALÈRES DU QUOTIDIEN" speed={28} />

      {/* ── CATÉGORIES — fond taupe2 ── */}
      <div style={{ background: C.taupe2, padding: "48px 5vw" }}>
        <Reveal>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", marginBottom: 8 }}>Par besoin</div>
            <h2 style={{ margin: 0, fontSize: "clamp(22px,3vw,36px)", fontWeight: 950, letterSpacing: -1, color: "#1a1410", lineHeight: 1 }}>Trouvez l'essentiel qui vous correspond</h2>
          </div>
        </Reveal>
        <div className="catgrid" style={{ display: "grid", gap: 14 }}>
          {CATS.map((cat, i) => (
            <div key={cat.label} style={{ opacity: scrollSection.visible ? 1 : 0, transform: scrollSection.visible ? "none" : "translateY(30px)", transition: `opacity 0.7s ease ${i*0.12}s, transform 0.7s ease ${i*0.12}s` }}>
              <CatCard cat={cat} />
            </div>
          ))}
        </div>
      </div>

      {/* ── BANDEAU ERIKA — fond taupe1, textes lisibles ── */}
      <div style={{ background: C.taupe1 }}>
        <div style={{ padding: "56px 5vw 32px" }}>
          <Reveal>
            <p style={{ margin: "0 0 6px", fontSize: "clamp(18px,3.2vw,48px)", fontWeight: 950, lineHeight: 1.1, color: "#1a1410", letterSpacing: -1 }}>
              Parce que les parents n'ont pas besoin de plus de "mignon",
            </p>
            <p style={{ margin: "0 0 20px", fontSize: "clamp(18px,3.2vw,48px)", fontWeight: 950, lineHeight: 1.1, color: C.amber, letterSpacing: -1 }}>
              mais de moins de charge mentale.
            </p>
            <p style={{ margin: 0, fontSize: "clamp(13px,1.4vw,17px)", color: "rgba(26,20,16,0.6)", lineHeight: 1.75 }}>
              M!LK conçoit des essentiels bébé qui simplifient les routines, réduisent les luttes et soutiennent les nuits difficiles.
            </p>
          </Reveal>
        </div>

        {/* Séparateur défilant — centré ── */}
        <BigTextScroll text="MOINS D'IRRITATIONS. PLUS DE CALME." speed={30} />

        <div style={{ padding: "32px 5vw 56px" }}>
          <Reveal>
            <p style={{ margin: "0 0 6px", fontSize: "clamp(18px,3.2vw,48px)", fontWeight: 950, lineHeight: 1.1, color: "#1a1410", letterSpacing: -1 }}>
              M!LK n'est pas une marque de vêtements.
            </p>
            <p style={{ margin: "0 0 20px", fontSize: "clamp(18px,3.2vw,48px)", fontWeight: 950, lineHeight: 1.1, color: C.amber, letterSpacing: -1 }}>
              C'est une réponse aux petites galères répétées.
            </p>
            <p style={{ margin: 0, fontSize: "clamp(13px,1.4vw,17px)", color: "rgba(26,20,16,0.5)", lineHeight: 1.7 }}>
              Chaque produit répond à un problème réel. Pas de design pour le design. Pas de fonctionnalité inutile. Juste ce qui compte quand t'es épuisé.
            </p>
          </Reveal>
        </div>
      </div>

      {/* ── CADEAU DE NAISSANCE — fond taupe2 ── */}
      <div style={{ background: C.taupe2, padding: "64px 5vw" }}>
        <Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 12 }}>Idée cadeau</div>
              <h2 style={{ margin: "0 0 16px", fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 950, letterSpacing: -1.5, color: "#1a1410", lineHeight: 1.05 }}>
                Le cadeau de naissance qui change vraiment la vie.
              </h2>
              <p style={{ margin: "0 0 16px", fontSize: "clamp(14px,1.4vw,17px)", color: "rgba(26,20,16,0.65)", lineHeight: 1.75 }}>
                Pas un énième doudou. Pas un vêtement trop petit en trois semaines. M!LK, c'est le cadeau qu'on n'ose pas s'offrir soi-même — mais qu'on utilise toutes les nuits.
              </p>
              <p style={{ margin: "0 0 24px", fontSize: "clamp(13px,1.3vw,15px)", color: "rgba(26,20,16,0.5)", lineHeight: 1.75 }}>
                Parfait pour les listes de naissance, les baby showers, les coffrets nouveau-né. En bambou certifié OEKO-TEX, doux dès le premier contact, lavable en machine.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link href="/produits" style={{ padding: "14px 24px", borderRadius: 12, background: "#1a1410", color: C.warm, fontWeight: 900, fontSize: 15, textDecoration: "none", display: "inline-block" }}>
                  Voir les essentiels →
                </Link>
                <Link href="/produits" style={{ padding: "14px 24px", borderRadius: 12, border: "2px solid #1a1410", color: "#1a1410", fontWeight: 700, fontSize: 15, textDecoration: "none", display: "inline-block" }}>
                  Liste de naissance
                </Link>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { titre: "Liste de naissance",  desc: "Ajoutez M!LK à votre liste. Les futurs parents vous remercieront." },
                { titre: "Baby shower",          desc: "Un coffret 2-3 pièces bambou. Pratique, beau, zéro déchet de style." },
                { titre: "Cadeau de naissance",  desc: "Livraison rapide. Le bon cadeau pour les premières semaines." },
                { titre: "Coffret nouveau-né",   desc: "Body + gigoteuse + lange. L'essentiel réuni dans un coffret simplifié." },
              ].map((item, i) => (
                <div key={item.titre} style={{ padding: "18px 16px", borderRadius: 14, background: i % 2 === 0 ? C.taupeCard : "rgba(196,154,74,0.09)", border: `1px solid ${C.taupe3}` }}>
                  <div style={{ fontWeight: 900, fontSize: 13, color: "#1a1410", marginBottom: 6 }}>{item.titre}</div>
                  <div style={{ fontSize: 12, color: "rgba(26,20,16,0.55)", lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      {/* ── ACCORDÉONS AU HOVER — fond taupeDark, cards taupe2 ── */}
      <div style={{ background: C.taupeDark, padding: "64px 5vw", display: "grid", gap: 14 }}>

        <HoverAccordion title="La vérité des parents" tag="Nuits · Habillage · Sommeil">
          <div className="tgrid" style={{ display: "grid", gap: 14 }}>
            {[
              { label: "Nuits pourries",   tension: "Se lever 5 fois, changer une couche dans le noir, rendormir un bébé hurlant.",          benefice: "Des vêtements pensés pour changer vite sans tout défaire." },
              { label: "Habillage combat", tension: "Un bébé qui se débat, 12 boutons-pression à aligner, ta patience qui fond.",              benefice: "Des ouvertures intelligentes, 3 gestes max, c'est fait." },
              { label: "Sommeil fragile",  tension: "Un bébé qui sursaute, se réveille, pleure. Un lange qui se défait au premier mouvement.", benefice: "Un lange qui tient et calme le réflexe de Moro." },
            ].map(card => (
              <div key={card.label} style={{ borderRadius: 14, background: C.taupe2, border: `1px solid ${C.taupe3}`, overflow: "hidden" }}>
                <div style={{ padding: "16px 18px 12px" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "rgba(26,20,16,0.25)", marginBottom: 6 }}>La tension</div>
                  <div style={{ fontSize: "clamp(15px,1.6vw,18px)", fontWeight: 950, color: "#1a1410", letterSpacing: -0.5, marginBottom: 8, lineHeight: 1.1 }}>{card.label}</div>
                  <p style={{ margin: 0, fontSize: "clamp(12px,1.1vw,13px)", color: "rgba(26,20,16,0.55)", lineHeight: 1.7 }}>{card.tension}</p>
                </div>
                <div style={{ padding: "10px 18px 16px", background: "rgba(196,154,74,0.08)", borderTop: `1px solid ${C.taupe3}` }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 6 }}>Le bénéfice M!LK</div>
                  <p style={{ margin: 0, fontSize: "clamp(12px,1.2vw,14px)", color: "#1a1410", lineHeight: 1.6, fontWeight: 800 }}>{card.benefice}</p>
                </div>
              </div>
            ))}
          </div>
        </HoverAccordion>

        <HoverAccordion title="Comment on conçoit nos essentiels" tag="Notre approche">
          <div className="pillars" style={{ display: "grid", gap: 12 }}>
            {[
              "Chaque seconde compte à 3h du mat'",
              "Zéro compromis sur la sécurité",
              "Matières douces et certifiées",
              "Testés par de vrais parents fatigués",
            ].map((pillar, i) => (
              <div key={pillar} style={{ padding: "16px 18px", borderRadius: 14, background: C.taupe2, border: `1px solid ${C.taupe3}`, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.amber, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#1a1410", fontWeight: 900, fontSize: 12 }}>{i + 1}</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: "clamp(12px,1.2vw,14px)", color: "#1a1410", lineHeight: 1.45 }}>{pillar}</div>
              </div>
            ))}
          </div>
        </HoverAccordion>

        <HoverAccordion title="La différence M!LK" tag="Classique vs M!LK">
          <div>
            <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${C.taupe3}`, marginBottom: 20 }}>
              <div className="comptable" style={{ display: "grid", background: "#1a1410" }}>
                <div style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "rgba(242,237,230,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>Situation</div>
                <div style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "rgba(242,237,230,0.4)", textTransform: "uppercase", letterSpacing: 1, borderLeft: "1px solid rgba(242,237,230,0.06)" }}>Classique</div>
                <div style={{ padding: "12px 16px", fontSize: 11, fontWeight: 900, color: C.amber, textTransform: "uppercase", letterSpacing: 1, borderLeft: "1px solid rgba(242,237,230,0.06)" }}>M!LK</div>
              </div>
              {[
                { s: "Change de nuit",   c: "Défaire tout le pyjama",  m: "Zip inversé, 30 sec"    },
                { s: "Boutons-pression", c: "8 à 12 à aligner",        m: "3 max, bien placés"     },
                { s: "Emmaillotage",     c: "Se défait, bébé sursaute", m: "Tient toute la nuit"   },
                { s: "Habillage",        c: "Combat quotidien",         m: "2-3 gestes, c'est fait" },
                { s: "Conception",       c: "Pour faire joli",          m: "Pour simplifier"        },
              ].map((row, i) => (
                <div key={row.s} className="comptable" style={{ display: "grid", borderTop: `1px solid ${C.taupe3}`, background: i % 2 === 0 ? C.taupeCard : C.taupe2 }}>
                  <div style={{ padding: "10px 16px", fontWeight: 700, color: "#1a1410", fontSize: "clamp(11px,1.1vw,13px)" }}>{row.s}</div>
                  <div style={{ padding: "10px 16px", color: "rgba(26,20,16,0.3)", fontSize: "clamp(10px,1vw,12px)", borderLeft: `1px solid ${C.taupe3}`, textDecoration: "line-through" }}>{row.c}</div>
                  <div style={{ padding: "10px 16px", color: C.amber, fontWeight: 800, fontSize: "clamp(10px,1vw,12px)", borderLeft: `1px solid ${C.taupe3}` }}>{row.m}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: "20px 24px", borderRadius: 14, background: "rgba(196,154,74,0.08)", border: `1px solid ${C.taupe3}` }}>
              <div style={{ fontSize: 36, color: C.amber, lineHeight: 0.8, marginBottom: 10, fontFamily: "Georgia, serif", fontWeight: 900 }}>"</div>
              <p style={{ margin: "0 0 8px", fontSize: "clamp(14px,1.8vw,20px)", color: "#1a1410", fontWeight: 800, fontStyle: "italic", lineHeight: 1.45 }}>
                Premier pyjama où je n'ai pas eu envie de pleurer à 4h du mat'.
              </p>
              <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)", fontWeight: 600 }}>— Marie, maman de Léo</div>
            </div>
          </div>
        </HoverAccordion>

        <HoverAccordion title="Des parents, pas des acteurs" tag="Ce qu'on entend">
          <div className="rgrid" style={{ display: "grid", gap: 14 }}>
            {[
              { name: "Thomas R.", role: "Papa de Luna",              text: "La gigoteuse à nouer a sauvé nos premières semaines. Pas d'exagération." },
              { name: "Sarah K.",  role: "Maman de Noah",             text: "Enfin un lange qui ne se défait pas. Mon fils dort 4h d'affilée." },
              { name: "Amina B.",  role: "Maman de Samy, 3 mois",    text: "Samy transpire beaucoup la nuit. Avec les pyjamas M!LK, il dort mieux et se réveille moins. Moins de galères, plus de sommeil pour tout le monde." },
              { name: "Julie D.",  role: "Maman d'Emma, née en juin", text: "Cadeau de naissance parfait. Les finitions sont soignées, le bambou est doux comme promis. Lavage après lavage, c'est toujours aussi bien." },
            ].map(r => (
              <div key={r.name} style={{ padding: "16px 18px", borderRadius: 14, background: C.taupe2, border: `1px solid ${C.taupe3}` }}>
                <div style={{ display: "flex", marginBottom: 8 }}>{[...Array(5)].map((_, j) => <span key={j} style={{ color: C.amber, fontSize: 13 }}>★</span>)}</div>
                <p style={{ margin: "0 0 10px", fontSize: "clamp(12px,1.2vw,14px)", color: "rgba(26,20,16,0.65)", lineHeight: 1.7, fontStyle: "italic" }}>&ldquo;{r.text}&rdquo;</p>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#1a1410" }}>{r.name}</div>
                <div style={{ fontSize: 11, color: "rgba(26,20,16,0.35)", marginTop: 2 }}>{r.role}</div>
              </div>
            ))}
          </div>
        </HoverAccordion>

      </div>

      {/* ── CTA FINAL ── */}
      <section style={{ padding: "60px 5vw", textAlign: "center", background: C.bg }}>
        <Reveal>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 16 }}>Prêts pour moins de galères au quotidien ?</div>
            <h2 style={{ margin: "0 0 16px", fontSize: "clamp(26px,4.5vw,52px)", fontWeight: 950, letterSpacing: -2, color: C.warm, lineHeight: 1.05 }}>
              Des essentiels conçus pour les vraies nuits,<br /><span style={{ color: C.amber }}>les vrais matins, la vraie vie de parent.</span>
            </h2>
            <p style={{ margin: "0 0 28px", fontSize: "clamp(14px,1.5vw,17px)", color: C.muted, lineHeight: 1.7 }}>
              Des essentiels bébé. Sans le superflu.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/produits" style={{ padding: "17px 38px", borderRadius: 14, background: C.warm, color: "#1a1410", fontWeight: 900, fontSize: "clamp(15px,1.6vw,18px)", textDecoration: "none", display: "inline-block" }}>
                Shopper les essentiels →
              </Link>
              <Link href="/qui-sommes-nous" style={{ padding: "17px 38px", borderRadius: 14, border: `1px solid ${C.faint}`, color: C.muted, fontWeight: 700, fontSize: "clamp(14px,1.5vw,17px)", textDecoration: "none", display: "inline-block" }}>
                Notre histoire
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}