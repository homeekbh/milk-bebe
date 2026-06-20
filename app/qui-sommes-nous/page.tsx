"use client";

import Image from "next/image";
import Link  from "next/link";
import { useEffect, useRef, useState, RefObject } from "react";
import { Ticker, MILK_STYLES } from "@/components/shared/MilkDesign";
import { Breadcrumb } from "@/components/seo/Breadcrumb";

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
  const [progress, setProgress] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      return;
    }
    const update = () => {
      const el = ref.current;
      if (!el) { ticking.current = false; return; }
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight;
      const total = rect.height + viewH;
      const passed = viewH - rect.top;
      setProgress(Math.max(0, Math.min(1, passed / total)));
      ticking.current = false;
    };
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
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
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold, rootMargin: "0px 0px -10% 0px" });
    obs.observe(el);
    const safety = window.setTimeout(() => setVisible(true), 1200);
    return () => { obs.disconnect(); window.clearTimeout(safety); };
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

const VALEURS = [
  { titre: "Chaque produit répond à un problème réel.", texte: "Pas de design pour le design. Pas de fonctionnalité inutile. On part d'un problème concret — l'habillage qui tourne au combat, la surchauffe, les moufles perdues — et on cherche la solution la plus simple." },
  { titre: "Moins, mais mieux.", texte: "Pas de collections saisonnières à outrance. On perfectionne les pièces qui comptent vraiment : body, pyjama, gigoteuse. Celles qu'on utilise tous les jours, plusieurs fois par jour." },
  { titre: "La matière d'abord.", texte: "Chaque produit commence par une question : est-ce que cette matière est vraiment meilleure pour la peau de bébé ? Le bambou n'est pas une tendance. C'est la réponse la plus fonctionnelle qu'on a trouvée." },
  { titre: "Pensé par des parents, pour des parents épuisés.", texte: "On a vécu les galères. Les body qui s'ouvrent pas facilement à 3h du matin. La surchauffe. Les irritations. Les 15 boutons-pression à aligner pendant que bébé se débat. On les a réglées." },
];

/* ──────────────────────────────────────────────────────────────────────────
   HERO — clair, fond cream, photo + parallax léger
   ────────────────────────────────────────────────────────────────────────── */
function HeroQSN() {
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const ticking = useRef(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => { setScrollY(window.scrollY); ticking.current = false; });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const photoY = Math.min(scrollY * 0.35, 250);

  return (
    <section
      style={{
        position:   "relative",
        height:     "clamp(56vh, 64vh, 72vh)",
        minHeight:  360,
        overflow:   "hidden",
        background: P.cream,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset:    "-10% 0 -10% 0",
          transform: `translateY(${photoY}px) scale(${mounted ? 1.04 : 1.1})`,
          transition: "transform 1.8s cubic-bezier(0.22,1,0.36,1)",
          willChange: "transform",
        }}
      >
        <Image
          src="/images/qui-sommes-nous/milk_qui_sommes_nous_hero.jpg"
          alt="Collection M!LK — bodies, pyjamas et bonnet bambou"
          fill priority sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center 40%" }}
        />
        {/* Voile clair (au lieu du marron) */}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, rgba(242,237,230,0.35) 0%, rgba(242,237,230,0.15) 50%, rgba(26,20,16,0.55) 100%)` }} />
      </div>
      {/* Scrim haut — garantit la lisibilité du header (texte crème) dès le chargement,
          le voile clair du hero rendant sinon le logo/nav invisibles en haut de page. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, height: 160,
          background: "linear-gradient(to bottom, rgba(13,11,9,0.55) 0%, rgba(13,11,9,0) 100%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", padding: "0 0 56px" }}>
        <div style={{ padding: "0 clamp(16px,5vw,5vw)", width: "100%", boxSizing: "border-box" }}>
          <div
            style={{
              fontSize:     11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase",
              color:        P.amber, marginBottom: 14,
              opacity:      mounted ? 1 : 0,
              transform:    mounted ? "translateY(0)" : "translateY(20px)",
              transition:   "opacity 0.7s ease 0.15s, transform 0.7s cubic-bezier(0.22,1,0.36,1) 0.15s",
            }}
          >
            Notre histoire
          </div>
          <h1
            style={{
              color: P.cream, margin: 0, fontWeight: 950, letterSpacing: -2, lineHeight: 1.02,
              fontSize: "clamp(38px,6.5vw,82px)",
              textShadow: "0 4px 24px rgba(13,11,9,0.5)",
              opacity:    mounted ? 1 : 0,
              transform:  mounted ? "translateY(0)" : "translateY(28px)",
              transition: "opacity 0.8s ease 0.3s, transform 0.9s cubic-bezier(0.22,1,0.36,1) 0.3s",
            }}
          >
            Moins de galères.<br />Plus de moments.
          </h1>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   INTRO ERIKA — Photo top-left + texte side + bloc texte dessous
   Scroll-driven : photo glisse depuis la gauche, texte depuis la droite
   ────────────────────────────────────────────────────────────────────────── */
function IntroErika() {
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
          Mot de la fondatrice
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
              Erika · Fondatrice
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
            <h2 style={{ margin: 0, fontWeight: 950, letterSpacing: -1.5, lineHeight: 1.08, color: P.dark, fontSize: "clamp(30px, 4.5vw, 56px)" }}>
              Qui sommes-nous
            </h2>
            <p style={{ margin: 0, fontSize: "clamp(20px, 2.2vw, 26px)", fontWeight: 900, color: P.dark, lineHeight: 1.35 }}>
              Je suis maman. Deux fois.
            </p>
            <p style={{ margin: 0, fontSize: "clamp(15px, 1.5vw, 17px)", lineHeight: 1.85, color: P.muted }}>
              Et je me souviens encore de ces matins en pyjama — les deux collés contre moi, chauds, souriants, le monde encore un peu flou. Ces moments où rien d'autre n'existe.
            </p>
            <p style={{ margin: 0, fontSize: "clamp(16px, 1.7vw, 19px)", fontWeight: 800, color: P.amber, lineHeight: 1.45 }}>
              C'est là qu'est né M!LK.
            </p>
            <p style={{ margin: 0, fontSize: "clamp(15px, 1.5vw, 17px)", lineHeight: 1.85, color: P.muted }}>
              Dans ce quotidien intense et doux à la fois — où tout va vite, où tout est nouveau, où on cherche juste des choses simples. Une pièce qu'on attrape sans réfléchir, qu'on enfile en deux secondes, et qui est juste… parfaite. Pour eux. Pour nous.
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
              Pas de surcharge. Pas de superflu. Des essentiels avec du caractère — modernes, unisexes, différents — pour les tout-petits qui méritent déjà quelque chose d'un peu atypique.
            </p>
            <p style={{ margin: 0 }}>
              Mes garçons ont grandi. Et avec eux, j'ai appris. J'ai appris ce que j'aurais aimé trouver dès le premier jour. M!LK, c'est ça — des années de rêves, de regards, d'envies, mis enfin en pratique.
            </p>
            <p style={{ margin: 0 }}>
              On commence par les 0–6 mois. Mais la vision est bien plus grande.
            </p>
            <p style={{ margin: "10px 0 0", fontWeight: 800, color: P.dark, fontSize: "clamp(16px, 1.7vw, 19px)" }}>
              Soutenez-nous — les plus beaux projets arrivent.
            </p>
            <p style={{ margin: 0, fontWeight: 900, color: P.amber, fontSize: "clamp(18px, 2vw, 22px)", letterSpacing: -0.3 }}>
              Bienvenue chez M!LK.
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
        {[
          { val: "100%", label: "Bambou certifié OEKO-TEX" },
          { val: "0",    label: "Substance nocive"          },
          { val: "3×",   label: "Plus doux que le coton"   },
          { val: "15j",  label: "Retour gratuit"            },
        ].map((k, i) => {
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
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: P.amber, marginBottom: 12 }}>Ce en quoi on croit</div>
          <h2 style={{ margin: 0, fontWeight: 950, letterSpacing: -1.5, lineHeight: 1.08, color: P.dark, fontSize: "clamp(28px, 4vw, 50px)" }}>Pas de design pour le design.</h2>
          <p style={{ margin: "12px 0 0", fontSize: "clamp(15px, 1.5vw, 18px)", color: P.muted, lineHeight: 1.6 }}>Juste ce qui compte quand t'es épuisé.</p>
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
   PHILOSOPHIE — citation, fond cream, scroll-driven
   ────────────────────────────────────────────────────────────────────────── */
function PhilosophieSection() {
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
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: P.amber, marginBottom: 18 }}>Philosophie M!LK</div>
        <blockquote style={{ margin: 0, borderLeft: `3px solid ${P.amber}`, paddingLeft: 28 }}>
          <p style={{ margin: "0 0 18px", fontSize: "clamp(18px, 2.2vw, 26px)", fontWeight: 800, color: P.dark, lineHeight: 1.45, letterSpacing: -0.4 }}>
            « Les pyjamas à boutons ? Combat garanti à chaque change.<br />Les moufles séparées ? Elles se perdent, tombent, disparaissent quand bébé en a le plus besoin. »
          </p>
          <p style={{ margin: "0 0 18px", fontSize: "clamp(14px, 1.5vw, 17px)", color: P.muted, lineHeight: 1.75 }}>
            Ici, chaque produit M!LK répond à un problème réel. Moins de gestes, moins de lutte, moins d'objets à gérer. La routine du soir devient fluide, pas stressante.
          </p>
          <p style={{ margin: 0, fontSize: "clamp(14px, 1.5vw, 17px)", color: P.amber, fontWeight: 800, lineHeight: 1.5 }}>
            Pas de fonctionnalité inutile. Juste ce qui compte quand t'es épuisé.
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
        <h2 style={{ margin: "0 0 18px", fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 950, letterSpacing: -1.2, color: P.dark, lineHeight: 1.1 }}>Moins de galères. Plus de moments.</h2>
        <p style={{ margin: "0 0 32px", fontSize: "clamp(14px, 1.5vw, 17px)", color: P.muted, lineHeight: 1.7 }}>Des essentiels conçus pour les 6 premiers mois. Bambou certifié OEKO-TEX.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/produits" className="qsn-cta-primary" style={{ padding: "16px 32px", borderRadius: 14, background: P.dark, color: P.cream, fontWeight: 900, fontSize: 15, textDecoration: "none", display: "inline-block", boxShadow: "0 8px 28px rgba(26,20,16,0.25)", transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s" }}>Voir les produits</Link>
          <Link href="/pourquoi-bambou" className="qsn-cta-secondary" style={{ padding: "16px 32px", borderRadius: 14, border: `1.5px solid ${P.dark}`, color: P.dark, fontWeight: 800, fontSize: 15, textDecoration: "none", display: "inline-block", background: P.cream, transition: "background 0.3s, color 0.3s" }}>Pourquoi le bambou ?</Link>
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
    <div style={{ background: P.cream, minHeight: "100vh", color: P.dark }}>
      <style>{`
        ${MILK_STYLES}
        .qsn-intro-grid { perspective: 1600px; }
        @media(max-width:900px){
          .qsn-intro-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
          .qsn-kpis       { grid-template-columns: repeat(2,1fr) !important; }
          .qsn-kpis > div:nth-child(2) { border-right: none !important; }
          .qsn-val        { grid-template-columns: 1fr !important; }
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

      <div style={{ background: P.cream }}>
        <Breadcrumb
          variant="light"
          items={[{ label: "Accueil", href: "/" }, { label: "Qui sommes-nous" }]}
        />
      </div>

      <HeroQSN />
      <Ticker />
      <IntroErika />
      <KPIsSection />
      <ValeursSection />
      <PhilosophieSection />
      <CTASection />
    </div>
  );
}
