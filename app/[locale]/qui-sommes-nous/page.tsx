"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffect, useRef, useState, RefObject } from "react";
import { Ticker, MILK_STYLES } from "@/components/shared/MilkDesign";
import { Breadcrumb } from "@/components/seo/Breadcrumb";

type Valeur = { titre: string; texte: string };
type Kpi = { val: string; label: string };

/* ──────────────────────────────────────────────────────────────────────────
   Palette CLAIRE — alignée homepage (plus de marron foncé).
   ────────────────────────────────────────────────────────────────────────── */
const P = {
  cream:    "#f2ede6",
  light:    "#ede8df",
  warm:     "#faf6f0",
  amber:    "#c49a4a",
  dark:     "#1a1410",
  muted:    "rgba(26,20,16,0.65)",
  mutedF:   "rgba(26,20,16,0.4)",
  faintLine:"rgba(26,20,16,0.08)",
};

const NOISE_BG = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.045 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/* ──────────────────────────────────────────────────────────────────────────
   useScrollProgress — 0→1 pendant que l'élément traverse le viewport.
   Throttlé rAF. Respecte prefers-reduced-motion.
   ────────────────────────────────────────────────────────────────────────── */
function useScrollProgress<T extends HTMLElement = HTMLDivElement>(): {
  ref: RefObject<T | null>;
  progress: number;
} {
  const ref = useRef<T>(null);
  // Défaut = 1 (état POSÉ) : SSR / sans JS / avant 1er calcul → transforms à 0
  // (contenu en place). Garantit « visible sans JS » (Lot S).
  const [progress, setProgress] = useState(1);
  const rafRef     = useRef<number | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setProgress(1); return; }

    const compute = () => {
      const rect  = el.getBoundingClientRect();
      const viewH = window.innerHeight;
      const total  = rect.height + viewH;
      const passed = viewH - rect.top;
      return Math.max(0, Math.min(1, passed / total));
    };
    const apply = () => { const p = compute(); setProgress(prev => (Math.abs(prev - p) < 0.0005 ? prev : p)); };

    // rAF tant que l'élément est en vue → progress jamais figé si la webview
    // retarde les événements scroll (cause du blanc, Lot S). Effet préservé.
    const loop = () => { apply(); rafRef.current = runningRef.current ? requestAnimationFrame(loop) : null; };
    const start = () => { if (!runningRef.current) { runningRef.current = true; if (rafRef.current == null) rafRef.current = requestAnimationFrame(loop); } };
    const stop  = () => { runningRef.current = false; if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } apply(); };

    apply();

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      try {
        io = new IntersectionObserver(([e]) => { if (e.isIntersecting) start(); else stop(); }, { rootMargin: "200px 0px 200px 0px" });
        io.observe(el);
      } catch { io = null; }
    }
    const onScroll = () => { if (!runningRef.current) apply(); };
    if (!io) window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", apply);

    return () => {
      io?.disconnect();
      runningRef.current = false;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", apply);
    };
  }, []);

  return { ref, progress };
}

/* ──────────────────────────────────────────────────────────────────────────
   useReveal — IntersectionObserver + safety-net 1.2s.
   ────────────────────────────────────────────────────────────────────────── */
function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.15): {
  ref: RefObject<T | null>;
  visible: boolean;
} {
  const ref = useRef<T>(null);
  // Visible par défaut (progressive enhancement, Lot S). Caché uniquement si, après
  // hydratation, l'élément est hors écran ET observable. Sens unique, jamais re-caché.
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return; // reste visible
    if (typeof IntersectionObserver === "undefined") return;                     // reste visible
    if (el.getBoundingClientRect().top < window.innerHeight) return;             // au-dessus/déjà visible → jamais caché

    setVisible(false);
    let obs: IntersectionObserver | null = null;
    let timer = 0;
    const reveal = () => { setVisible(true); obs?.disconnect(); window.clearTimeout(timer); };
    try {
      obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting || e.boundingClientRect.top < 0) reveal();
      }, { threshold, rootMargin: "0px 0px 10% 0px" });
      obs.observe(el);
    } catch { reveal(); return; }
    timer = window.setTimeout(reveal, 2500); // dernier recours ancré à l'élément
    return () => { obs?.disconnect(); window.clearTimeout(timer); };
  }, [threshold]);
  return { ref, visible };
}

/* ──────────────────────────────────────────────────────────────────────────
   ICÔNES — pour les valeurs.
   ────────────────────────────────────────────────────────────────────────── */
function IconHands()   { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M8 12V7.5a1.5 1.5 0 0 1 3 0V12m0 0V6.5a1.5 1.5 0 0 1 3 0V12m0 0V8.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6v-1a1.5 1.5 0 0 1 3 0" stroke={P.amber} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IconDiamond() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 2l3 6h5l-4 5 2 7-6-4-6 4 2-7L4 8h5l3-6z" stroke={P.amber} strokeWidth="1.6" strokeLinejoin="round"/></svg>; }
function IconLeafV()   { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 22C12 22 4 16 4 9a8 8 0 0 1 16 0c0 7-8 13-8 13z" stroke={P.amber} strokeWidth="1.6" strokeLinejoin="round"/><path d="M12 22V9" stroke={P.amber} strokeWidth="1.6" strokeLinecap="round"/></svg>; }
function IconBaby()    { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="6" r="3" stroke={P.amber} strokeWidth="1.6"/><path d="M5 20a7 7 0 0 1 14 0" stroke={P.amber} strokeWidth="1.6" strokeLinecap="round"/><path d="M9 13c0 1.5.5 3 3 3s3-1.5 3-3" stroke={P.amber} strokeWidth="1.6" strokeLinecap="round"/></svg>; }
const ICONS = [IconHands, IconDiamond, IconLeafV, IconBaby];

/* ──────────────────────────────────────────────────────────────────────────
   INTRO ERIKA — Photo top-left + texte side + bloc texte dessous
   Scroll-driven : photo glisse depuis la gauche, texte depuis la droite
   ────────────────────────────────────────────────────────────────────────── */
function IntroErika() {
  const t = useTranslations("about");
  // Seuil bas (5% visible) → l'entrée se déclenche dès que la section est
  // à peine entrée dans le viewport. Sur petit écran, la photo apparaît
  // immédiatement au scroll, plus besoin d'attendre.
  const { ref, visible } = useReveal<HTMLDivElement>(0.05);

  return (
    <section
      ref={ref}
      style={{
        position:   "relative",
        background: P.cream,
        padding:    "clamp(56px, 8vw, 96px) 5vw",
        overflow:   "hidden",
      }}
    >
      <div
        aria-hidden
        style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: NOISE_BG, mixBlendMode: "multiply", opacity: 0.35 }}
      />
      <div style={{ position: "relative", maxWidth: 1200, margin: "0 auto" }}>
        {/* Fil d'ariane — déplacé depuis l'ancien hero (supprimé). variant="dark"
            car la section est sur fond clair. */}
        <Breadcrumb
          variant="dark"
          padding="0 0 18px"
          items={[{ label: t("breadcrumb_home"), href: "/" }, { label: t("breadcrumb_self") }]}
        />
        {/* Eyebrow */}
        <div
          style={{
            fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase",
            color: P.amber, marginBottom: 14,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.7s ease, transform 0.7s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {t("founder_eyebrow")}
        </div>

        {/* Grid : photo gauche + texte droite */}
        <div
          className="qsn-intro-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.2fr",
            gap: "clamp(32px, 5vw, 72px)",
            alignItems: "start",
            marginBottom: "clamp(40px, 6vw, 72px)",
          }}
        >
          {/* Photo Erika (top-left) — entrée instantanée au reveal */}
          <div
            style={{
              position:   "relative",
              aspectRatio: "4/5",
              borderRadius: 24,
              overflow:   "hidden",
              boxShadow:  "0 26px 60px rgba(26,20,16,0.18), 0 8px 18px rgba(26,20,16,0.08)",
              border:     `1px solid ${P.faintLine}`,
              transform:  visible ? "translate3d(0,0,0) rotate(0deg)" : "translate3d(-80px,0,0) rotate(-4deg)",
              opacity:    visible ? 1 : 0,
              transition: "transform 0.85s cubic-bezier(0.22,1,0.36,1), opacity 0.7s ease",
              willChange: "transform, opacity",
            }}
          >
            <Image
              src="https://ntkqmnenczltlwplswka.supabase.co/storage/v1/object/public/product-images/erika-et-ses-enfants.jpg"
              alt="Erika et ses garçons — fondatrice de M!LK"
              fill
              sizes="(max-width: 900px) 90vw, 500px"
              style={{ objectFit: "cover", objectPosition: "center" }}
              priority
            />
            {/* Tag fondatrice */}
            <div
              style={{
                position: "absolute", bottom: 18, left: 18,
                padding: "8px 14px",
                borderRadius: 99,
                background: "rgba(26,20,16,0.85)",
                color: P.amber,
                fontSize: 10, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase",
              }}
            >
              {t("founder_tag")}
            </div>
          </div>

          {/* Texte droite — entrée différée légère */}
          <div
            style={{
              display: "flex", flexDirection: "column", gap: 16, paddingTop: 8,
              transform: visible ? "translate3d(0,0,0)" : "translate3d(80px,0,0)",
              opacity: visible ? 1 : 0,
              transition: "transform 0.85s cubic-bezier(0.22,1,0.36,1) 0.12s, opacity 0.7s ease 0.12s",
              willChange: "transform, opacity",
            }}
          >
            <h1 style={{ margin: 0, fontWeight: 950, letterSpacing: -1.5, lineHeight: 1.08, color: P.dark, fontSize: "clamp(30px, 4.5vw, 56px)" }}>
              {t("title")}
            </h1>
            <p style={{ margin: 0, fontSize: "clamp(20px, 2.2vw, 26px)", fontWeight: 900, color: P.dark, lineHeight: 1.35 }}>
              {t("mom")}
            </p>
            <p style={{ margin: 0, fontSize: "clamp(15px, 1.5vw, 17px)", lineHeight: 1.85, color: P.muted }}>
              {t("mom_p1")}
            </p>
            <p style={{ margin: 0, fontSize: "clamp(16px, 1.7vw, 19px)", fontWeight: 800, color: P.amber, lineHeight: 1.45 }}>
              {t("born")}
            </p>
            <p style={{ margin: 0, fontSize: "clamp(15px, 1.5vw, 17px)", lineHeight: 1.85, color: P.muted }}>
              {t("mom_p2")}
            </p>
          </div>
        </div>

        {/* Bloc texte dessous — entrée par le bas */}
        <div
          style={{
            maxWidth: 880,
            margin: "0 auto",
            padding: "clamp(28px, 4vw, 44px) clamp(24px, 4vw, 52px)",
            background: P.warm,
            borderRadius: 24,
            border: `1px solid ${P.faintLine}`,
            boxShadow: "0 14px 40px rgba(26,20,16,0.06)",
            transform: visible ? "translate3d(0,0,0)" : "translate3d(0, 40px, 0)",
            opacity: visible ? 1 : 0,
            transition: "transform 0.85s cubic-bezier(0.22,1,0.36,1) 0.24s, opacity 0.7s ease 0.24s",
            willChange: "transform, opacity",
          }}
        >
          <div style={{ display: "grid", gap: 16, fontSize: "clamp(15px, 1.5vw, 17px)", lineHeight: 1.85, color: P.muted }}>
            <p style={{ margin: 0 }}>
              {t("block_p1")}
            </p>
            <p style={{ margin: 0 }}>
              {t("block_p2")}
            </p>
            <p style={{ margin: 0 }}>
              {t("block_p3")}
            </p>
            <p style={{ margin: "10px 0 0", fontWeight: 800, color: P.dark, fontSize: "clamp(16px, 1.7vw, 19px)" }}>
              {t("block_support")}
            </p>
            <p style={{ margin: 0, fontWeight: 900, color: P.amber, fontSize: "clamp(18px, 2vw, 22px)", letterSpacing: -0.3 }}>
              {t("welcome")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   KPIs — 4 stats, scroll-driven cascade
   ────────────────────────────────────────────────────────────────────────── */
function KPIsSection() {
  const t = useTranslations("about");
  const KPIS = t.raw("kpis") as Kpi[];
  const reveal = useReveal<HTMLDivElement>(0.1);
  const scroll = useScrollProgress<HTMLDivElement>();
  const setRefs = (el: HTMLDivElement | null) => {
    (reveal.ref as { current: HTMLDivElement | null }).current = el;
    (scroll.ref as { current: HTMLDivElement | null }).current = el;
  };
  const visible = reveal.visible;
  const p = scroll.progress;

  return (
    <section
      ref={setRefs}
      style={{ background: P.light, padding: "clamp(48px, 6vw, 80px) 0", position: "relative" }}
    >
      <div className="qsn-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", padding: "0 5vw", maxWidth: 1280, margin: "0 auto" }}>
        {KPIS.map((k, i) => {
          const delay = i * 0.1;
          const cardP = Math.max(0, Math.min(1, (p - 0.05 - delay) * 3));
          const slideX = (1 - cardP) * (i % 2 === 0 ? -60 : 60);
          const liftY = (1 - cardP) * 40;
          const scl = 0.9 + cardP * 0.1;
          return (
            <div
              key={k.label}
              style={{
                padding: "32px 16px",
                textAlign: "center",
                borderRight: i < 3 ? `1px solid ${P.faintLine}` : "none",
                transform: `translate3d(${slideX}px, ${liftY}px, 0) scale(${scl})`,
                opacity: visible ? 1 : 0,
                willChange: "transform, opacity",
              }}
            >
              <div style={{ fontSize: "clamp(40px, 5.5vw, 70px)", fontWeight: 950, letterSpacing: -2, color: P.amber, lineHeight: 1 }}>{k.val}</div>
              <div style={{ marginTop: 10, fontSize: "clamp(11px, 1.1vw, 14px)", color: P.muted, fontWeight: 700 }}>{k.label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   VALEURS — 4 cartes, scroll-driven 3D depuis les côtés
   ────────────────────────────────────────────────────────────────────────── */
function ValeursSection() {
  const t = useTranslations("about");
  const VALEURS = t.raw("valeurs") as Valeur[];
  const reveal = useReveal<HTMLDivElement>(0.1);
  const scroll = useScrollProgress<HTMLDivElement>();
  const setRefs = (el: HTMLDivElement | null) => {
    (reveal.ref as { current: HTMLDivElement | null }).current = el;
    (scroll.ref as { current: HTMLDivElement | null }).current = el;
  };
  const visible = reveal.visible;
  const p = scroll.progress;

  return (
    <section
      ref={setRefs}
      style={{
        background: P.warm,
        padding: "clamp(56px, 8vw, 96px) 5vw",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: NOISE_BG, mixBlendMode: "multiply", opacity: 0.4 }}
      />
      <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ marginBottom: 36, opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.7s ease, transform 0.7s cubic-bezier(0.22,1,0.36,1)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: P.amber, marginBottom: 12 }}>{t("values_eyebrow")}</div>
          <h2 style={{ margin: 0, fontWeight: 950, letterSpacing: -1.5, lineHeight: 1.08, color: P.dark, fontSize: "clamp(28px, 4vw, 50px)" }}>{t("values_title")}</h2>
          <p style={{ margin: "12px 0 0", fontSize: "clamp(15px, 1.5vw, 18px)", color: P.muted, lineHeight: 1.6 }}>{t("values_sub")}</p>
        </div>

        <div
          className="qsn-val"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 18,
            perspective: 1600,
            perspectiveOrigin: "50% 110%",
          }}
        >
          {VALEURS.map((v, i) => {
            const Icon = ICONS[i];
            const delay = i * 0.1;
            const cardP = Math.max(0, Math.min(1, (p - 0.05 - delay) * 3));
            const tiltX = (1 - cardP) * 30;
            const liftY = (1 - cardP) * 70;
            const slideX = (1 - cardP) * (i % 2 === 0 ? -80 : 80);
            const scl = 0.86 + cardP * 0.14;
            return (
              <div
                key={v.titre}
                className="qsn-valcard"
                style={{
                  position: "relative",
                  background: P.cream,
                  borderRadius: 20,
                  border: `1px solid ${P.faintLine}`,
                  padding: "28px 26px 30px",
                  boxShadow: "0 10px 32px rgba(26,20,16,0.08)",
                  transition: "box-shadow 0.45s, border-color 0.3s, background 0.5s",
                  transformStyle: "preserve-3d",
                  transform: `perspective(1400px) rotateX(${tiltX}deg) translate3d(${slideX}px, ${liftY}px, 0) scale(${scl})`,
                  opacity: visible ? 1 : 0,
                  willChange: "transform, opacity",
                  overflow: "hidden",
                }}
              >
                <span
                  aria-hidden
                  className="qsn-valcard-num"
                  style={{
                    position: "absolute",
                    top: -20, right: -6,
                    fontFamily: '"BoldinBold", system-ui, sans-serif',
                    fontSize: "clamp(80px, 8vw, 130px)",
                    lineHeight: 1,
                    color: "rgba(196,154,74,0.10)",
                    fontWeight: 950,
                    pointerEvents: "none",
                    transition: "color 0.4s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
                  }}
                >
                  0{i + 1}
                </span>
                <div style={{ marginBottom: 16, position: "relative" }}><Icon /></div>
                <h3 style={{ margin: "0 0 12px", fontSize: "clamp(16px, 1.7vw, 20px)", fontWeight: 950, color: P.dark, lineHeight: 1.25, position: "relative" }}>{v.titre}</h3>
                <p style={{ margin: 0, lineHeight: 1.75, color: P.muted, fontSize: "clamp(13px, 1.2vw, 15px)", position: "relative" }}>{v.texte}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   FABRICATION — comment nos vêtements sont faits (provenance, partenaire).
   Même motif de section : eyebrow ambre + titre + contenu, entrée useReveal.
   ────────────────────────────────────────────────────────────────────────── */
function FabricationSection() {
  const t = useTranslations("about");
  const { ref, visible } = useReveal<HTMLDivElement>(0.1);
  const cols = [
    { label: t("fab_menton_label"),  l1: t("fab_menton_l1"),  l2: t("fab_menton_l2") },
    { label: t("fab_partner_label"), l1: t("fab_partner_l1"), l2: t("fab_partner_l2") },
  ];
  return (
    <section
      ref={ref}
      style={{ background: P.light, padding: "clamp(56px, 8vw, 96px) 5vw", position: "relative", overflow: "hidden" }}
    >
      <div
        aria-hidden
        style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: NOISE_BG, mixBlendMode: "multiply", opacity: 0.35 }}
      />
      <div
        style={{
          position: "relative",
          maxWidth: 880,
          margin: "0 auto",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.8s ease, transform 0.8s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: P.amber, marginBottom: 12 }}>{t("fab_eyebrow")}</div>
        <h2 style={{ margin: "0 0 24px", fontWeight: 950, letterSpacing: -1.5, lineHeight: 1.08, color: P.dark, fontSize: "clamp(28px, 4vw, 50px)" }}>{t("fab_title")}</h2>

        <p style={{ margin: "0 0 32px", fontSize: "clamp(15px, 1.5vw, 18px)", lineHeight: 1.85, color: P.muted }}>{t("fab_intro")}</p>

        <h3 style={{ margin: "0 0 12px", fontSize: "clamp(17px, 1.9vw, 22px)", fontWeight: 950, color: P.dark, letterSpacing: -0.4 }}>{t("fab_partner_title")}</h3>
        <p style={{ margin: "0 0 14px", fontSize: "clamp(15px, 1.5vw, 17px)", lineHeight: 1.85, color: P.muted }}>{t("fab_partner_p1")}</p>
        <p style={{ margin: "0 0 36px", fontSize: "clamp(15px, 1.5vw, 17px)", lineHeight: 1.85, color: P.muted }}>{t("fab_partner_p2")}</p>

        <h3 style={{ margin: "0 0 16px", fontSize: "clamp(17px, 1.9vw, 22px)", fontWeight: 950, color: P.dark, letterSpacing: -0.4 }}>{t("fab_where_title")}</h3>
        <div className="qsn-fab-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 36 }}>
          {cols.map((c) => (
            <div key={c.label} style={{ background: P.cream, border: `1px solid ${P.faintLine}`, borderRadius: 18, padding: "22px 24px", boxShadow: "0 8px 26px rgba(26,20,16,0.05)" }}>
              <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase", color: P.amber, marginBottom: 12 }}>{c.label}</div>
              <p style={{ margin: "0 0 6px", fontSize: "clamp(14px, 1.4vw, 16px)", fontWeight: 700, color: P.dark, lineHeight: 1.5 }}>{c.l1}</p>
              <p style={{ margin: 0, fontSize: "clamp(14px, 1.4vw, 16px)", fontWeight: 700, color: P.dark, lineHeight: 1.5 }}>{c.l2}</p>
            </div>
          ))}
        </div>

        <p style={{ margin: "0 0 36px", fontSize: "clamp(15px, 1.6vw, 18px)", lineHeight: 1.8, color: P.dark, fontWeight: 600 }}>{t("fab_closing")}</p>

        <h3 style={{ margin: "0 0 12px", fontSize: "clamp(17px, 1.9vw, 22px)", fontWeight: 950, color: P.dark, letterSpacing: -0.4 }}>{t("fab_notwanted_title")}</h3>
        <p style={{ margin: "0 0 14px", fontSize: "clamp(15px, 1.5vw, 17px)", lineHeight: 1.85, color: P.muted }}>{t("fab_notwanted_p1")}</p>
        <p style={{ margin: 0, fontSize: "clamp(15px, 1.5vw, 17px)", lineHeight: 1.85, color: P.muted }}>{t("fab_notwanted_p2")}</p>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   PHILOSOPHIE — citation, fond cream, scroll-driven
   ────────────────────────────────────────────────────────────────────────── */
function PhilosophieSection() {
  const t = useTranslations("about");
  const reveal = useReveal<HTMLDivElement>(0.1);
  const scroll = useScrollProgress<HTMLDivElement>();
  const setRefs = (el: HTMLDivElement | null) => {
    (reveal.ref as { current: HTMLDivElement | null }).current = el;
    (scroll.ref as { current: HTMLDivElement | null }).current = el;
  };
  const visible = reveal.visible;
  const p = scroll.progress;
  const qP = Math.max(0, Math.min(1, (p - 0.05) * 2.5));
  const qX = (1 - qP) * -80;

  return (
    <section
      ref={setRefs}
      style={{ background: P.cream, padding: "clamp(56px, 8vw, 96px) 5vw", position: "relative", overflow: "hidden" }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto", opacity: visible ? 1 : 0, transform: `translate3d(${qX}px, 0, 0)`, willChange: "transform, opacity" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: P.amber, marginBottom: 18 }}>{t("philo_eyebrow")}</div>
        <blockquote style={{ margin: 0, borderLeft: `3px solid ${P.amber}`, paddingLeft: 28 }}>
          <p style={{ margin: "0 0 18px", fontSize: "clamp(18px, 2.2vw, 26px)", fontWeight: 800, color: P.dark, lineHeight: 1.45, letterSpacing: -0.4 }}>
            « {t("philo_quote_l1")}<br />{t("philo_quote_l2")} »
          </p>
          <p style={{ margin: "0 0 18px", fontSize: "clamp(14px, 1.5vw, 17px)", color: P.muted, lineHeight: 1.75 }}>
            {t("philo_p1")}
          </p>
          <p style={{ margin: 0, fontSize: "clamp(14px, 1.5vw, 17px)", color: P.amber, fontWeight: 800, lineHeight: 1.5 }}>
            {t("philo_p2")}
          </p>
        </blockquote>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   CTA — fond clair, boutons
   ────────────────────────────────────────────────────────────────────────── */
function CTASection() {
  const t = useTranslations("about");
  const { ref, visible } = useReveal<HTMLDivElement>(0.1);
  return (
    <section
      ref={ref}
      style={{ background: P.light, padding: "clamp(64px, 8vw, 100px) 5vw", textAlign: "center" }}
    >
      <div
        style={{
          maxWidth: 620,
          margin: "0 auto",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(30px)",
          transition: "opacity 0.8s ease, transform 0.8s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <h2 style={{ margin: "0 0 18px", fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 950, letterSpacing: -1.2, color: P.dark, lineHeight: 1.1 }}>{t("cta_title")}</h2>
        <p style={{ margin: "0 0 32px", fontSize: "clamp(14px, 1.5vw, 17px)", color: P.muted, lineHeight: 1.7 }}>{t("cta_desc")}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/produits" className="qsn-cta-primary" style={{ padding: "16px 32px", borderRadius: 14, background: P.dark, color: P.cream, fontWeight: 900, fontSize: 15, textDecoration: "none", display: "inline-block", boxShadow: "0 8px 28px rgba(26,20,16,0.25)", transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s" }}>{t("cta_products")}</Link>
          <Link href="/pourquoi-bambou" className="qsn-cta-secondary" style={{ padding: "16px 32px", borderRadius: 14, border: `1.5px solid ${P.dark}`, color: P.dark, fontWeight: 800, fontSize: 15, textDecoration: "none", display: "inline-block", background: P.cream, transition: "background 0.3s, color 0.3s" }}>{t("cta_bamboo")}</Link>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   PAGE — Container fond cream (PLUS DE MARRON)
   ────────────────────────────────────────────────────────────────────────── */
export default function QuiSommesNousPage() {
  return (
    // padding-top 68px = hauteur de la navbar fixe (Header). Le hero ayant été
    // retiré, le 1er élément en flux (le Ticker) doit dégager la navbar pour ne
    // pas passer dessous. La compensation va donc ici, AVANT le ticker.
    <div style={{ background: P.cream, minHeight: "100vh", color: P.dark, paddingTop: 68 }}>
      <style>{`
        ${MILK_STYLES}
        .qsn-intro-grid { perspective: 1600px; }
        @media(max-width:900px){
          .qsn-intro-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
          .qsn-kpis       { grid-template-columns: repeat(2,1fr) !important; }
          .qsn-kpis > div:nth-child(2) { border-right: none !important; }
          .qsn-val        { grid-template-columns: 1fr !important; }
          .qsn-fab-cols   { grid-template-columns: 1fr !important; }
        }
        .qsn-valcard:hover {
          transform: perspective(1400px) translateY(-6px) scale(1.01) !important;
          box-shadow: 0 24px 50px rgba(26,20,16,0.16) !important;
          border-color: ${P.amber} !important;
          background: ${P.warm} !important;
        }
        .qsn-valcard:hover .qsn-valcard-num {
          color: rgba(196,154,74,0.28) !important;
          transform: translateY(4px) scale(1.06);
        }
        .qsn-cta-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 36px rgba(26,20,16,0.35) !important;
        }
        .qsn-cta-secondary:hover {
          background: ${P.dark} !important;
          color: ${P.cream} !important;
        }
      `}</style>

      <Ticker />
      <IntroErika />
      <KPIsSection />
      <ValeursSection />
      <FabricationSection />
      <PhilosophieSection />
      <CTASection />
    </div>
  );
}
