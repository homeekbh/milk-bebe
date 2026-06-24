"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import Image from "next/image";
import Link  from "next/link";

/* ──────────────────────────────────────────────────────────────────────────
   Palette beige texturée (plus de fond marron foncé en bloc).
   Marron/noir réservé à : bandeau, badges promo, badge OEKO, accents.
   ────────────────────────────────────────────────────────────────────────── */
const P = {
  cream:    "#f2ede6",
  light:    "#ede8df",
  warm:     "#e6ddcf",
  taupe:    "#e9e1d4",
  taupeAlt: "#c4ae94",
  dark:     "#1a1410",
  amber:    "#c49a4a",
  muted:    "rgba(26,20,16,0.6)",
  mutedSoft:"rgba(26,20,16,0.45)",
  mutedFaint:"rgba(26,20,16,0.3)",
  faintLine:"rgba(26,20,16,0.08)",
};

/* SSR-safe layoutEffect */
const useIsoLayoutEffect: typeof useLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const TOPBAR_H = 40; // hauteur bandeau (px) — utilisé pour --milk-topbar-h + hystérésis
const HYST_HIDE = 48;
const HYST_SHOW = 8;

/* Pattern grain SVG inline (réutilisable en arrière-plan) */
const NOISE_BG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.045 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/* ──────────────────────────────────────────────────────────────────────────
   useScrollProgress — retourne une valeur 0→1 pendant que l'élément traverse
   le viewport (0 quand top du viewport touche l'élément, 1 quand bottom
   passe). Throttlé en rAF. Sert aux effets de construction au scroll.
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
      // 0 quand le top entre dans le viewport (rect.top = viewH)
      // 1 quand le bottom sort (rect.bottom = 0)
      const total = rect.height + viewH;
      const passed = viewH - rect.top;
      const p = Math.max(0, Math.min(1, passed / total));
      setProgress(p);
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
   useReveal — IntersectionObserver, observer retiré au premier déclenchement.
   Respecte prefers-reduced-motion (renvoie visible:true immédiatement).
   ────────────────────────────────────────────────────────────────────────── */
function useReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.15,
): { ref: RefObject<T | null>; visible: boolean } {
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

    // Check immédiat : si l'élément est déjà dans le viewport au mount, on révèle direct.
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) {
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(el);

    // Safety-net : si l'IO ne tire jamais (cas exotique), on force après 1.2s.
    const safety = window.setTimeout(() => setVisible(true), 1200);

    return () => { obs.disconnect(); window.clearTimeout(safety); };
  }, [threshold]);

  return { ref, visible };
}

/* ──────────────────────────────────────────────────────────────────────────
   ICÔNES (réutilisées du code existant — non modifiées)
   ────────────────────────────────────────────────────────────────────────── */
function IconLeaf({ s = 22, c = P.amber }: { s?: number; c?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 22C12 22 4 16 4 9a8 8 0 0 1 16 0c0 7-8 13-8 13z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 22V9" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconTruck({ s = 22, c = P.amber }: { s?: number; c?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M1 3h13v13H1z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 8h4l3 3v5h-7V8z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="5.5" cy="18.5" r="2.5" stroke={c} strokeWidth="1.8" />
      <circle cx="18.5" cy="18.5" r="2.5" stroke={c} strokeWidth="1.8" />
    </svg>
  );
}
function IconLock({ s = 22, c = P.amber }: { s?: number; c?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" stroke={c} strokeWidth="1.8" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={c} strokeWidth="1.8" />
    </svg>
  );
}
/* ──────────────────────────────────────────────────────────────────────────
   TOPBAR — bandeau défilant au-dessus du header.
   Pose --milk-topbar-h:40px au montage (useIsoLayoutEffect pour pas de flash).
   Hystérésis : >48 cache (translate -100%), <8 montre. rAF throttlé.
   ────────────────────────────────────────────────────────────────────────── */
function Topbar({ freeShipThreshold = 60 }: { freeShipThreshold?: number }) {
  const [hidden, setHidden] = useState(false);
  const rafRef               = useRef<number | null>(null);
  const ticking              = useRef(false);

  // Pose la variable CSS dès le layout effect pour éviter le flash.
  useIsoLayoutEffect(() => {
    document.documentElement.style.setProperty("--milk-topbar-h", `${TOPBAR_H}px`);
    return () => {
      document.documentElement.style.setProperty("--milk-topbar-h", "0px");
    };
  }, []);

  // Quand on cache le bandeau, on remet --milk-topbar-h à 0 → header colle en haut.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--milk-topbar-h",
      hidden ? "0px" : `${TOPBAR_H}px`,
    );
  }, [hidden]);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      rafRef.current = requestAnimationFrame(() => {
        const y = window.scrollY;
        setHidden(prev => {
          if (!prev && y > HYST_HIDE) return true;
          if ( prev && y < HYST_SHOW) return false;
          return prev;
        });
        ticking.current = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const items = useMemo(
    () => [
      "✦ Bambou certifié OEKO-TEX",
      "✦ 3× plus doux que le coton",
      "✦ Thermorégulateur naturel",
      `✦ Livraison offerte dès ${freeShipThreshold}€`,
      "✦ Retour gratuit 15 jours",
      "✦ Antibactérien naturel",
      "✦ Bodies · Pyjamas · Gigoteuses",
    ],
    [freeShipThreshold],
  );
  const str = items.join("   ");

  return (
    <div
      aria-hidden={hidden}
      style={{
        position:   "fixed",
        top:        0,
        left:       0,
        width:      "100%",
        height:     TOPBAR_H,
        zIndex:     10000,
        background: "linear-gradient(90deg,#15110c,#3a2210 50%,#15110c)",
        color:      P.cream,
        overflow:   "hidden",
        transform:  hidden ? "translateY(-100%)" : "translateY(0)",
        transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
        boxShadow:  hidden ? "none" : "0 2px 12px rgba(0,0,0,0.18)",
        willChange: "transform",
      }}
    >
      <div className="milk-tk" style={{ display: "flex", whiteSpace: "nowrap", width: "max-content", height: "100%" }}>
        {[0, 1].map(i => (
          <span
            key={i}
            style={{
              display:       "inline-flex",
              alignItems:    "center",
              height:        "100%",
              paddingRight:  60,
              fontSize:      13,
              fontWeight:    800,
              letterSpacing: 1.4,
              color:         P.cream,
            }}
          >
            {str}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   HERO — 100vh, parallax photo au scroll, logo lettres en cascade.
   Stats + réassurances déplacées dans <HeroBand /> en dessous pour laisser
   le hero respirer.
   ────────────────────────────────────────────────────────────────────────── */
function Hero() {
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const ticking = useRef(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    setIsMobile(window.matchMedia("(max-width: 700px)").matches);
    // Resize : on n'écoute QUE le changement de largeur (orientation/window),
    // pas la hauteur (qui bouge avec la barre d'adresse iOS).
    let lastW = window.innerWidth;
    const onResize = () => {
      const w = window.innerWidth;
      if (w === lastW) return;
      lastW = w;
      setIsMobile(window.matchMedia("(max-width: 700px)").matches);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        ticking.current = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Desktop : parallax doux + contenu qui fade au scroll (effet WAW conservé).
  const photoY        = Math.min(scrollY * 0.35, 300);
  const logoY         = Math.min(scrollY * 0.18, 200);
  const desktopContY  = Math.min(scrollY * 0.55, 400);
  const desktopContOp = Math.max(0, 1 - scrollY / 600);

  // Mobile : hero simple 85svh, tout visible dès le premier paint.
  // Logo discret bottom-left (watermark), contenu lisible directement,
  // pas de scroll-driven complexe qui ferait apparaître du vide.
  const logoOp      = isMobile ? 0.78 : 1;
  const logoTrans   = isMobile ? "none" : `translateY(${-logoY}px)`;
  const contOp      = isMobile ? 1 : desktopContOp;
  const contTrans   = isMobile ? "none" : `translateY(${-desktopContY * 0.3}px)`;
  const photoScale  = isMobile ? (mounted ? 1.02 : 1.06) : (mounted ? 1.04 : 1.12);
  const photoTrans  = isMobile
    ? `translateY(0) scale(${photoScale})`
    : `translateY(${photoY}px) scale(${photoScale})`;
  const badgeOp     = isMobile ? 0 : (mounted ? 0.95 : 0); // mobile : badge masqué
  const hintOp      = isMobile ? 0 : (mounted ? 0.6 : 0);   // mobile : hint masqué (cohabite mal avec chat)

  const LETTERS = ["M", "!", "L", "K"];

  return (
    <section
      aria-label="Hero M!LK"
      style={{
        position:  "relative",
        height:    "100vh",
        minHeight: 560,
        overflow:  "hidden",
        background: P.cream,
      }}
      className="milk-hero-root"
    >
      <div
        className="milk-hero-sticky"
        style={{
          position: "absolute",
          inset:    0,
          overflow: "hidden",
        }}
      >
        {/* Photo plein écran : parallax + zoom doux au mount */}
        <div
          className="milk-hero-photo"
          style={{
            position: "absolute",
            inset:    "-10% 0 -10% 0",
            transform: photoTrans,
            transformOrigin: "center",
            willChange: "transform",
            transition: mounted ? "none" : "transform 1.8s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <Image
            src="/images/home/milk_pieds_chaussettes_logo_sol.webp"
            alt="M!LK — essentiels bébé bambou OEKO-TEX"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
          {/* Voile : confiné au hero. Sur desktop = diagonal, sur mobile = bottom-only chaud. */}
          <div
            className="milk-hero-veil"
            style={{
              position:   "absolute",
              inset:      0,
              background: `linear-gradient(135deg,rgba(13,11,9,0.62) 0%,rgba(13,11,9,0.22) 45%,rgba(13,11,9,0.68) 100%)`,
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Logo M!LK — bas-gauche (desktop) / centré (mobile), lettres en cascade */}
        <div
          aria-hidden
          className="milk-hero-logo-wrap"
          style={{
            position:        "absolute",
            bottom:          "5vh",
            left:            "2vw",
            pointerEvents:   "none",
            zIndex:          1,
            transform:       logoTrans,
            opacity:         logoOp,
            willChange:      "transform, opacity",
          }}
        >
          <div
            className="milk-logo-text milk-hero-logo milk-logo-float"
            style={{
              fontFamily: '"BoldinBold", system-ui, sans-serif',
              color:      P.cream,
              fontSize:   "clamp(50px, 10vw, 160px)",
              lineHeight: 0.85,
              letterSpacing: "0.02em",
              display:    "inline-flex",
              alignItems: "baseline",
              gap:        "0.04em",
              filter:     "drop-shadow(0 6px 22px rgba(13,11,9,0.55))",
              opacity:    0.92,
            }}
          >
            {LETTERS.map((ch, i) => (
              <span
                key={i}
                style={{
                  display:    "inline-block",
                  opacity:    mounted ? 1 : 0,
                  transform:  mounted ? "translateY(0) scale(1)" : "translateY(50px) scale(0.86)",
                  transition: `transform 0.95s cubic-bezier(0.16,1.18,0.4,1) ${0.25 + i * 0.11}s, opacity 0.7s ease ${0.25 + i * 0.11}s`,
                  color:      P.cream,
                }}
              >
                {ch}
              </span>
            ))}
          </div>
        </div>

        {/* Badge OEKO rotation — desktop seulement (display:none en mobile) */}
        <div
          aria-hidden
          className="milk-hero-badge"
          style={{
            position:  "absolute",
            top:       "50%",
            right:     "4vw",
            transform: `translateY(calc(-50% + ${-logoY * 0.5}px))`,
            zIndex:    2,
            pointerEvents: "none",
            opacity:   badgeOp,
            transition: "opacity 1.2s ease 0.6s",
          }}
        >
          <svg width="140" height="140" viewBox="0 0 140 140" style={{ animation: "milk-spin 16s linear infinite", filter: "drop-shadow(0 4px 18px rgba(13,11,9,0.5))" }}>
            <path id="milk-bc" d="M 70,70 m -52,0 a 52,52 0 1,1 104,0 a 52,52 0 1,1 -104,0" fill="none" />
            <text fontSize="11" fontWeight="700" letterSpacing="5.5" fill={P.amber}>
              <textPath href="#milk-bc" startOffset="0%"> —  OEKO-TEX  —  BAMBOU PREMIUM  </textPath>
            </text>
          </svg>
        </div>

        {/* Bloc contenu : H1 + tags + sous-titre + CTAs */}
        <div
          className="milk-hero-content"
          style={{
            position:   "absolute",
            inset:      "0 0 0 0",
            display:    "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            padding:    "clamp(80px, 14vh, 160px) 5vw clamp(160px, 22vh, 240px)",
            opacity:    contOp,
            transform:  contTrans,
            willChange: "transform, opacity",
            zIndex:     3,
            pointerEvents: contOp < 0.05 ? "none" : "auto",
          }}
        >
          <div style={{ maxWidth: 720 }}>
            {/* Tags */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {["Nouveau-né", "0-3 mois", "3-6 mois"].map(tag => (
                <span
                  key={tag}
                  style={{
                    padding:      "6px 14px",
                    borderRadius: 99,
                    border:       `1px solid ${P.amber}`,
                    color:        P.amber,
                    fontSize:     12,
                    fontWeight:   800,
                    background:   "rgba(13,11,9,0.35)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* H1 */}
            <h1
              className="milk-hero-h1"
              style={{
                margin:        "0 0 18px",
                fontSize:      "clamp(34px, 6.5vw, 84px)",
                fontWeight:    950,
                letterSpacing: -3,
                lineHeight:    0.95,
                color:         P.cream,
                textShadow:    "0 2px 18px rgba(13,11,9,0.45)",
              }}
            >
              L'essentiel.
              <br className="milk-hero-h1-br" />
              <span className="milk-hero-h1-rest" style={{ color: P.cream }}>Sans compromis.</span>
            </h1>

            {/* Sous-titre */}
            <p
              className="milk-hero-sub"
              style={{
                margin:    "0 0 28px",
                fontSize:  "clamp(14px, 1.7vw, 18px)",
                color:     "rgba(242,237,230,0.85)",
                maxWidth:  520,
                lineHeight: 1.7,
                textShadow:"0 1px 8px rgba(13,11,9,0.55)",
              }}
            >
              Des essentiels bébé en bambou certifié OEKO-TEX. Pensés pour réduire les galères du quotidien — pas pour faire joli en photo.
            </p>

            {/* Boutons */}
            <div className="milk-hero-btns" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link
                href="/produits"
                className="milk-hero-cta-primary"
                style={{
                  padding:      "16px 32px",
                  borderRadius: 14,
                  background:   P.cream,
                  color:        P.dark,
                  fontWeight:   900,
                  fontSize:     "clamp(14px, 1.5vw, 16px)",
                  textDecoration:"none",
                  display:      "inline-block",
                  boxShadow:    "0 8px 28px rgba(13,11,9,0.4)",
                  transition:   "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s",
                }}
              >
                Découvrir la collection →
              </Link>
              <Link
                href="/pourquoi-bambou"
                className="milk-hero-cta-secondary"
                style={{
                  padding:      "16px 32px",
                  borderRadius: 14,
                  border:       "1px solid rgba(242,237,230,0.4)",
                  color:        P.cream,
                  fontWeight:   700,
                  fontSize:     "clamp(14px, 1.5vw, 16px)",
                  textDecoration:"none",
                  display:      "inline-block",
                  background:   "rgba(13,11,9,0.3)",
                  backdropFilter: "blur(6px)",
                  transition:   "background 0.3s, border-color 0.3s",
                }}
              >
                Pourquoi le bambou ?
              </Link>
            </div>
          </div>
        </div>

        {/* Indicateur Découvrir — disparaît en même temps que le logo en mobile */}
        <div
          aria-hidden
          className="milk-hero-hint"
          style={{
            position:  "absolute",
            bottom:    20,
            left:      "50%",
            transform: "translateX(-50%)",
            display:   "flex",
            flexDirection: "column",
            alignItems:"center",
            gap:       6,
            opacity:   hintOp,
            pointerEvents: "none",
            transition: isMobile ? "none" : "opacity 0.6s ease 1s",
            zIndex:    3,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: P.cream }}>Découvrir</div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: "milk-bounce 2s ease infinite" }}>
            <path d="M12 5v14M5 12l7 7 7-7" stroke={P.cream} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   HeroBand — bande compacte stats + réassurances + badge OEKO, juste après
   le hero. Sépare visuellement le logo du contenu chiffré.
   ────────────────────────────────────────────────────────────────────────── */
function HeroBand({ freeShipThreshold }: { freeShipThreshold: number }) {
  const { ref, visible } = useReveal<HTMLDivElement>(0.1);

  const STATS = [
    { val: `Dès ${freeShipThreshold}€`, label: "livraison offerte" },
    { val: "100%", label: "Bambou OEKO-TEX" },
    { val: "15j",  label: "retour gratuit" },
    { val: "0",    label: "substance nocive" },
    { val: "3×",   label: "plus doux que le coton" },
  ];

  const REASS = [
    { Icon: IconTruck, label: "Retour gratuit",    desc: "15 jours" },
    { Icon: IconLeaf,  label: "Bambou OEKO-TEX",   desc: "certifié" },
    { Icon: IconLock,  label: "Paiement sécurisé", desc: "Stripe" },
  ];

  return (
    <section
      ref={ref}
      aria-label="Engagements M!LK"
      style={{
        position:   "relative",
        background: P.dark,
        color:      P.cream,
        padding:    "clamp(28px, 4vw, 44px) 5vw",
        overflow:   "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: NOISE_BG, mixBlendMode: "overlay", opacity: 0.35,
        }}
      />

      <div
        style={{
          position:  "relative",
          maxWidth:  1280,
          margin:    "0 auto",
          display:   "grid",
          gridTemplateColumns: "1fr",
          gap:       24,
        }}
      >
        {/* Stats */}
        <div className="milk-band-stats" style={{ display: "flex", flexWrap: "wrap", gap: 0, alignItems: "flex-end" }}>
          {STATS.map((k, i) => (
            <div
              key={k.label}
              style={{
                paddingRight:  24,
                marginRight:   24,
                borderRight:   i < STATS.length - 1 ? "1px solid rgba(242,237,230,0.18)" : "none",
                opacity:       visible ? 1 : 0,
                transform:     visible ? "translateY(0)" : "translateY(16px)",
                transition:    `opacity 0.6s ease ${i * 0.08}s, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 0.08}s`,
              }}
            >
              <div style={{ fontSize: "clamp(18px, 2.2vw, 30px)", fontWeight: 950, letterSpacing: -1.2, color: P.cream, lineHeight: 1, whiteSpace: "nowrap" }}>{k.val}</div>
              <div style={{ fontSize: "clamp(10px, 0.9vw, 12px)", color: "rgba(242,237,230,0.7)", marginTop: 4, whiteSpace: "nowrap" }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Réassurances */}
        <div className="milk-band-reass" style={{ display: "flex", flexWrap: "wrap", gap: 22, paddingTop: 12, borderTop: "1px solid rgba(242,237,230,0.12)" }}>
          {REASS.map((r, i) => (
            <div
              key={r.label}
              style={{
                display:    "flex",
                alignItems: "center",
                gap:        10,
                opacity:    visible ? 1 : 0,
                transform:  visible ? "translateY(0)" : "translateY(14px)",
                transition: `opacity 0.6s ease ${0.25 + i * 0.08}s, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${0.25 + i * 0.08}s`,
              }}
            >
              <r.Icon s={18} c={P.amber} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: P.cream, lineHeight: 1.1 }}>{r.label}</div>
                <div style={{ fontSize: 11, color: "rgba(242,237,230,0.65)" }}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   CategoryCards — 4 cards par besoin, animation cascade alternée G/D.
   ────────────────────────────────────────────────────────────────────────── */
const CATS = [
  { label: "Bodies",      desc: "L'essentiel du quotidien",      href: "/categorie/bodies"      },
  { label: "Pyjamas",     desc: "Pour des nuits sereines",       href: "/categorie/pyjamas"     },
  { label: "Gigoteuses",  desc: "Gigoteuse à nouer, sommeil serein", href: "/categorie/gigoteuses"  },
  { label: "Accessoires", desc: "Les détails qui changent tout", href: "/categorie/accessoires" },
];

function CategoriesSection() {
  const reveal = useReveal<HTMLDivElement>(0.15);
  const scroll = useScrollProgress<HTMLDivElement>();
  const setRefs = (el: HTMLDivElement | null) => {
    (reveal.ref as { current: HTMLDivElement | null }).current = el;
    (scroll.ref as { current: HTMLDivElement | null }).current = el;
  };

  // Effet "construction" : les cartes arrivent en 3D au scroll, en cascade.
  const p = scroll.progress;

  return (
    <section
      ref={setRefs}
      style={{
        position:  "relative",
        background: P.light,
        padding:   "clamp(40px, 6vw, 72px) 5vw",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: NOISE_BG, mixBlendMode: "multiply", opacity: 0.5,
        }}
      />
      <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ marginBottom: 24, opacity: reveal.visible ? 1 : 0, transform: reveal.visible ? "none" : "translateY(20px)", transition: "opacity 0.7s ease, transform 0.7s cubic-bezier(0.22,1,0.36,1)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: P.amber, marginBottom: 8 }}>Par besoin</div>
          <h2 style={{ margin: 0, fontSize: "clamp(24px, 3.4vw, 40px)", fontWeight: 950, letterSpacing: -1.2, color: P.dark, lineHeight: 1.05 }}>
            Trouvez l'essentiel qui vous correspond
          </h2>
        </div>

        <div
          className="milk-catgrid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 16,
            perspective: 1600,
            perspectiveOrigin: "50% 110%",
          }}
        >
          {CATS.map((cat, i) => {
            // Chaque carte a son délai propre — effet construction en cascade
            // Effet "construction" : chaque carte arrive d'une direction différente,
            // pilotée par le scroll. Cascade : carte 0 termine quand p≈0.35, carte 3 à p≈0.65.
            const delay = i * 0.08;
            const cardP = Math.max(0, Math.min(1, (p - 0.05 - delay) * 3.2));
            const cardTiltX = (1 - cardP) * 40;
            const cardLiftY = (1 - cardP) * 90;
            const cardSlideX = (1 - cardP) * (i % 2 === 0 ? -80 : 80);
            const cardScale = 0.82 + cardP * 0.18;
            return (
              <Link
                key={cat.href}
                href={cat.href}
                style={{
                  textDecoration: "none",
                  display:        "block",
                  transformStyle: "preserve-3d",
                }}
              >
                <div
                  className="milk-catcard"
                  style={{
                    position:     "relative",
                    padding:      "20px 22px 22px",
                    borderRadius: 18,
                    background:   P.cream,
                    border:       `1px solid ${P.faintLine}`,
                    boxShadow:    "0 8px 28px rgba(26,20,16,0.10)",
                    transition:   "box-shadow 0.45s, border-color 0.3s, background 0.5s",
                    display:      "flex",
                    flexDirection:"column",
                    justifyContent: "space-between",
                    gap:          12,
                    minHeight:    140,
                    overflow:     "hidden",
                    cursor:       "pointer",
                    transformStyle: "preserve-3d",
                    transform:    `perspective(1400px) rotateX(${cardTiltX}deg) translate3d(${cardSlideX}px, ${cardLiftY}px, 0) scale(${cardScale})`,
                    opacity:      reveal.visible ? 1 : 0,
                    willChange:   "transform, opacity",
                  }}
                >
                  {/* Gros numéro filigrane (effet waw) */}
                  <span
                    aria-hidden
                    className="milk-catcard-num"
                    style={{
                      position:    "absolute",
                      top:         -22,
                      right:       -8,
                      fontFamily:  '"BoldinBold", system-ui, sans-serif',
                      fontSize:    "clamp(90px, 9vw, 140px)",
                      lineHeight:  1,
                      color:       "rgba(196,154,74,0.10)",
                      fontWeight:  950,
                      pointerEvents: "none",
                      transition:  "color 0.4s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
                    }}
                  >
                    0{i + 1}
                  </span>

                  {/* Header : eyebrow + flèche */}
                  <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: P.amber }}>
                      Catégorie
                    </span>
                    <span className="milk-catcard-arrow" style={{ fontSize: 22, fontWeight: 900, color: P.amber, transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}>→</span>
                  </div>

                  {/* Label + desc */}
                  <div style={{ position: "relative" }}>
                    <div className="milk-cat-label" style={{ fontWeight: 950, fontSize: "clamp(22px, 2.4vw, 30px)", color: P.dark, marginBottom: 6, letterSpacing: -0.6, lineHeight: 1 }}>
                      {cat.label}
                    </div>
                    <div style={{ fontSize: "clamp(12px, 1vw, 13px)", color: P.muted, lineHeight: 1.5 }}>
                      {cat.desc}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   ProductsGrid — 2 lignes × 4 cols, cards 3D tilt + entrée alternée.
   ────────────────────────────────────────────────────────────────────────── */
function isPromo(p: any) {
  if (!p.promo_price) return false;
  if (!p.promo_start && !p.promo_end) return true;
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const start = p.promo_start ? String(p.promo_start).slice(0, 10) : null;
  const end   = p.promo_end   ? String(p.promo_end).slice(0, 10)   : null;
  if (start && today < start) return false;
  if (end   && today > end)   return false;
  return true;
}

function ProductCard3D({ p, index, visible }: { p: any; index: number; visible: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const promo = isPromo(p);
  const price = promo ? p.promo_price : p.price_ttc;
  const badge = p.label === "bestseller" ? "Best seller" : p.label === "nouveau" ? "Nouveau" : null;

  // Tilt désactivé en tactile (CSS @media hover:none ne suffit pas pour listener)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const supportsHover = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
    if (!supportsHover) return;

    const el = cardRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;  // 0..1
      const y = (e.clientY - rect.top)  / rect.height; // 0..1
      const rotY = (x - 0.5) * 12;   // ±6°
      const rotX = (0.5 - y) * 10;   // ±5°
      el.style.setProperty("--rx", `${rotX}deg`);
      el.style.setProperty("--ry", `${rotY}deg`);
      el.style.setProperty("--sx", `${x * 100}%`);
      el.style.setProperty("--sy", `${y * 100}%`);
    };
    const onLeave = () => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const fromRight = (index % 4) >= 2 || index >= 4 ? true : false;
  // Cascade — alternance G/D par colonne, stagger 80ms
  const dx = visible ? "0px" : `${fromRight ? "60px" : "-60px"}`;
  const ry = visible ? "0deg" : `${fromRight ? "-8deg" : "8deg"}`;

  return (
    <Link
      href={`/produits/${p.slug}`}
      style={{
        textDecoration: "none",
        display:        "block",
        perspective:    "1200px",
        opacity:        visible ? 1 : 0,
        transform:      `translateX(${dx}) rotateY(${ry}) scale(${visible ? 1 : 0.96})`,
        transition:     `opacity 0.65s ease ${index * 0.08}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${index * 0.08}s`,
      }}
    >
      <div
        ref={cardRef}
        className={`milk-pcard ${promo ? "milk-pcard-promo" : ""}`}
        style={{
          position:        "relative",
          borderRadius:    18,
          overflow:        "hidden",
          background:      P.cream,
          border:          `1px solid ${P.faintLine}`,
          boxShadow:       "0 6px 22px rgba(26,20,16,0.08)",
          transformStyle:  "preserve-3d",
          transition:      "transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s, border-color 0.3s",
        }}
      >
        {/* Coin badge */}
        {badge && (
          <div style={{ position: "absolute", top: 0, right: 0, width: 100, height: 100, overflow: "hidden", zIndex: 4, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: 20, right: -30, background: P.amber, color: P.dark, fontSize: 10, fontWeight: 900, padding: "6px 38px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
              {badge}
            </div>
          </div>
        )}

        {/* Coin PROMO rouge */}
        {promo && (
          <div style={{ position: "absolute", top: 0, right: 0, width: 110, height: 110, overflow: "hidden", zIndex: 4, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: 22, right: -32, background: "#dc2626", color: "#fff", fontSize: 10, fontWeight: 900, padding: "7px 44px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap", boxShadow: "0 2px 6px rgba(220,38,38,0.45)" }}>
              PROMO
            </div>
          </div>
        )}

        {/* Image */}
        <div className="milk-pcard-img-wrap" style={{ position: "relative", aspectRatio: "1/1", overflow: "hidden", background: P.warm }}>
          {p.image_url ? (
            <Image
              src={p.image_url}
              alt={p.name}
              fill
              sizes="(max-width: 700px) 50vw, 25vw"
              className="milk-pcard-img"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 22, fontWeight: 950, color: "rgba(26,20,16,0.18)" }}>M!LK</div>
          )}
          {/* Shine — balayage lumineux au hover */}
          <div className="milk-pcard-shine" />
        </div>

        {/* Texte */}
        <div style={{ padding: "16px 18px 20px" }}>
          <div style={{ fontWeight: 900, fontSize: 15, color: P.dark, marginBottom: 6, lineHeight: 1.3, minHeight: 38 }}>{p.name}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontWeight: 950, fontSize: 18, color: promo ? "#dc2626" : P.dark }}>{Number(price).toFixed(2)} €</span>
            {promo && (
              <span style={{ fontSize: 12, textDecoration: "line-through", color: P.mutedFaint }}>
                {Number(p.price_ttc).toFixed(2)} €
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProductsSection({ products, lbl }: { products: any[]; lbl: string }) {
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
      className="milk-sec-products"
      style={{
        position:  "relative",
        background: `linear-gradient(180deg, ${P.light} 0%, ${P.warm} 100%)`,
        padding:   "clamp(56px, 8vw, 96px) 5vw",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: NOISE_BG, mixBlendMode: "multiply", opacity: 0.45,
        }}
      />
      <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto" }}>
        <div
          style={{
            display:         "flex",
            justifyContent:  "space-between",
            alignItems:      "flex-end",
            marginBottom:    28,
            flexWrap:        "wrap",
            gap:             12,
            opacity:         visible ? 1 : 0,
            transform:       visible ? "none" : "translateY(20px)",
            transition:      "opacity 0.7s ease, transform 0.7s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: P.amber, marginBottom: 8 }}>Sélection</div>
            <h2 style={{ margin: 0, fontSize: "clamp(24px, 3.4vw, 40px)", fontWeight: 950, letterSpacing: -1.2, color: P.dark, lineHeight: 1.05 }}>{lbl}</h2>
          </div>
          <Link href="/produits" style={{ fontSize: 15, fontWeight: 800, color: P.amber, textDecoration: "none" }}>
            Voir tout →
          </Link>
        </div>

        <div
          className="milk-pgrid"
          style={{
            display:             "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap:                 18,
            perspective:         1800,
            perspectiveOrigin:   "50% 50%",
          }}
        >
          {products.slice(0, 8).map((prod, i) => {
            // Direction d'arrivée alternée : ↙, ↘, ↙, ↘, ↖, ↗, ↖, ↗
            const fromLeft = i % 2 === 0;
            const fromTop  = i >= 4;
            const delay    = (i % 4) * 0.06;
            const cardP    = Math.max(0, Math.min(1, (p - 0.05 - delay) * 3));
            const tx       = (1 - cardP) * (fromLeft ? -120 : 120);
            const ty       = (1 - cardP) * (fromTop ? -60 : 60);
            const rot      = (1 - cardP) * (fromLeft ? -8 : 8);
            const scl      = 0.85 + cardP * 0.15;
            return (
              <div
                key={prod.id}
                style={{
                  transform:    `perspective(1800px) translate3d(${tx}px, ${ty}px, 0) rotate(${rot}deg) scale(${scl})`,
                  opacity:      visible ? 1 : 0,
                  transition:   visible ? undefined : "opacity 0.5s ease",
                  willChange:   "transform, opacity",
                  transformStyle: "preserve-3d",
                }}
              >
                <ProductCard3D p={prod} index={i} visible={visible} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   EditoSplit — bloc texte/photo G/D ou D/G avec reveal côté image (clip-path).
   ────────────────────────────────────────────────────────────────────────── */
function EditoSplit({
  align,
  eyebrow,
  text,
  body,
  cta,
  imgSrc,
  imgAlt,
  bg = P.light,
  imgSquare = false,
}: {
  align: "text-left" | "image-left";
  eyebrow?: string;
  text: React.ReactNode;
  body?: React.ReactNode;
  cta?: { label: string; href: string };
  imgSrc: string;
  imgAlt: string;
  bg?: string;
  imgSquare?: boolean;
}) {
  const reveal = useReveal<HTMLDivElement>(0.15);
  const scroll = useScrollProgress<HTMLDivElement>();
  const setRefs = (el: HTMLDivElement | null) => {
    (reveal.ref as { current: HTMLDivElement | null }).current = el;
    (scroll.ref as { current: HTMLDivElement | null }).current = el;
  };
  const visible = reveal.visible;
  const p = scroll.progress;
  const imageFirst = align === "image-left";
  // Scroll-driven : image et texte arrivent en glissant des côtés opposés
  const imgP = Math.max(0, Math.min(1, (p - 0.05) * 2.6));
  const txtP = Math.max(0, Math.min(1, (p - 0.12) * 2.6));
  const imgX = (1 - imgP) * (imageFirst ? -100 : 100);
  const txtX = (1 - txtP) * (imageFirst ? 100 : -100);
  const imgScale = 0.92 + imgP * 0.08;

  return (
    <section
      ref={setRefs}
      style={{
        background: bg,
        position:   "relative",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: NOISE_BG, mixBlendMode: "multiply", opacity: 0.35,
        }}
      />
      <div
        className="milk-split"
        style={{
          position: "relative",
          display:  "grid",
          gridTemplateColumns: "1fr 1fr",
          alignItems: "stretch",
          minHeight: "clamp(360px, 50vh, 520px)",
        }}
      >
        {/* Image (scroll-driven slide-in + scale) */}
        <div
          style={{
            order:      imageFirst ? 0 : 1,
            position:   "relative",
            overflow:   "hidden",
            minHeight:  300,
            display:    imgSquare ? "flex" : undefined,
            alignItems: imgSquare ? "center" : undefined,
            justifyContent: imgSquare ? "center" : undefined,
            padding:    imgSquare ? "clamp(24px, 4vw, 56px)" : 0,
            background: imgSquare ? bg : undefined,
            opacity:    visible ? 1 : 0.001,
            transform:  `translate3d(${imgX}px, 0, 0) scale(${imgScale})`,
            willChange: "transform, opacity",
          }}
        >
          {imgSquare ? (
            <div
              style={{
                position:    "relative",
                width:       "100%",
                maxWidth:    480,
                aspectRatio: "1 / 1",
                borderRadius: 16,
                overflow:    "hidden",
                boxShadow:   "0 20px 50px rgba(26,20,16,0.14), 0 6px 16px rgba(26,20,16,0.08)",
                transform:   visible ? "scale(1)" : "scale(0.96)",
                transition:  "transform 1s cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              <Image
                src={imgSrc}
                alt={imgAlt}
                fill
                sizes="(max-width: 700px) 90vw, 480px"
                style={{ objectFit: "cover", objectPosition: "center" }}
              />
            </div>
          ) : (
            <Image
              src={imgSrc}
              alt={imgAlt}
              fill
              sizes="50vw"
              style={{
                objectFit:      "cover",
                objectPosition: "center",
                transform:      visible ? "scale(1)" : "scale(1.04)",
                transition:     "transform 1.2s cubic-bezier(0.22,1,0.36,1)",
              }}
            />
          )}
        </div>

        {/* Texte (scroll-driven slide-in côté opposé) */}
        <div
          style={{
            order:    imageFirst ? 1 : 0,
            padding:  "clamp(40px, 6vw, 80px) clamp(24px, 5vw, 80px)",
            display:  "flex",
            flexDirection: "column",
            justifyContent: "center",
            opacity:    visible ? 1 : 0,
            transform:  `translate3d(${txtX}px, 0, 0)`,
            willChange: "transform, opacity",
          }}
        >
          {eyebrow && (
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: P.amber, marginBottom: 14 }}>
              {eyebrow}
            </div>
          )}
          <div style={{ fontSize: "clamp(22px, 3.2vw, 44px)", fontWeight: 950, letterSpacing: -1.2, lineHeight: 1.08, color: P.dark, marginBottom: 18 }}>
            {text}
          </div>
          {body && (
            <p style={{ margin: 0, fontSize: "clamp(13px, 1.3vw, 16px)", color: P.muted, lineHeight: 1.75, maxWidth: 540 }}>
              {body}
            </p>
          )}
          {cta && (
            <div style={{ marginTop: 28 }}>
              <Link
                href={cta.href}
                style={{
                  display:      "inline-flex",
                  alignItems:   "center",
                  gap:          8,
                  padding:      "14px 26px",
                  borderRadius: 12,
                  background:   P.dark,
                  color:        P.cream,
                  fontWeight:   900,
                  fontSize:     14,
                  textDecoration:"none",
                }}
              >
                {cta.label}
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   FloatingCard — bande "carte image inclinée + texte" — Bande flottante.
   ────────────────────────────────────────────────────────────────────────── */
function FloatingCard() {
  const reveal = useReveal<HTMLDivElement>(0.15);
  const scroll = useScrollProgress<HTMLDivElement>();
  const setRefs = (el: HTMLDivElement | null) => {
    (reveal.ref as { current: HTMLDivElement | null }).current = el;
    (scroll.ref as { current: HTMLDivElement | null }).current = el;
  };
  const visible = reveal.visible;
  const p = scroll.progress;
  const imgP = Math.max(0, Math.min(1, (p - 0.05) * 2.5));
  const txtP = Math.max(0, Math.min(1, (p - 0.15) * 2.5));
  const imgRot = -3 + (1 - imgP) * -10;
  const imgY   = (1 - imgP) * 80;
  const txtX   = (1 - txtP) * 100;

  return (
    <section
      ref={setRefs}
      style={{
        background: P.warm,
        padding:    "clamp(56px, 8vw, 96px) 5vw",
        position:   "relative",
        overflow:   "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: NOISE_BG, mixBlendMode: "multiply", opacity: 0.4,
        }}
      />
      <div
        className="milk-floating"
        style={{
          position: "relative",
          maxWidth: 1200,
          margin:   "0 auto",
          display:  "grid",
          gridTemplateColumns: "1.05fr 1fr",
          gap:      "clamp(30px, 5vw, 80px)",
          alignItems: "center",
        }}
      >
        {/* Carte image inclinée scroll-driven */}
        <div
          style={{
            position:   "relative",
            aspectRatio:"4/5",
            borderRadius: 22,
            overflow:   "hidden",
            transform:  `rotate(${imgRot}deg) translate3d(0, ${imgY}px, 0)`,
            opacity:    visible ? 1 : 0,
            willChange: "transform, opacity",
            boxShadow:  "0 30px 60px rgba(26,20,16,0.18), 0 8px 16px rgba(26,20,16,0.1)",
          }}
        >
          <Image
            src="/images/home/milk_baby_shower_plateau_rotin.webp"
            alt="M!LK — coffret cadeau naissance plateau rotin"
            fill
            sizes="(max-width: 900px) 90vw, 45vw"
            style={{ objectFit: "cover" }}
          />
          {/* Badge "Le cadeau idéal" */}
          <div
            style={{
              position:     "absolute",
              top:          18,
              left:         18,
              padding:      "8px 14px",
              borderRadius: 99,
              background:   "rgba(26,20,16,0.85)",
              color:        P.amber,
              fontSize:     10,
              fontWeight:   900,
              letterSpacing:2,
              textTransform:"uppercase",
            }}
          >
            Le cadeau idéal
          </div>
        </div>

        {/* Texte droite */}
        <div
          style={{
            opacity:    visible ? 1 : 0,
            transform:  `translate3d(${txtX}px, 0, 0)`,
            willChange: "transform, opacity",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: P.amber, marginBottom: 14 }}>
            Chaque détail compte
          </div>
          <h2 style={{ margin: "0 0 18px", fontSize: "clamp(22px, 3vw, 38px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.1, color: P.dark }}>
            Le bambou, notre matière.
          </h2>
          <p style={{ margin: "0 0 24px", fontSize: "clamp(13px, 1.3vw, 16px)", color: P.muted, lineHeight: 1.75 }}>
            Pensé pour la nursery, idéal en cadeau de naissance. Bambou certifié OEKO-TEX, doux dès le premier contact, lavable en machine.
          </p>
          <Link
            href="/produits"
            style={{
              display:      "inline-flex",
              alignItems:   "center",
              gap:          8,
              padding:      "14px 26px",
              borderRadius: 12,
              background:   P.amber,
              color:        P.dark,
              fontWeight:   900,
              fontSize:     14,
              textDecoration:"none",
            }}
          >
            Voir la collection →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   CADEAU — section INTACTE (textes, ordre, liens, photo) — fond + animation.
   ────────────────────────────────────────────────────────────────────────── */
function CadeauSection() {
  const reveal = useReveal<HTMLDivElement>(0.1);
  const scroll = useScrollProgress<HTMLDivElement>();
  const setRefs = (el: HTMLDivElement | null) => {
    (reveal.ref as { current: HTMLDivElement | null }).current = el;
    (scroll.ref as { current: HTMLDivElement | null }).current = el;
  };
  const visible = reveal.visible;
  const p = scroll.progress;
  const txtP = Math.max(0, Math.min(1, (p - 0.05) * 2.5));
  const imgP = Math.max(0, Math.min(1, (p - 0.12) * 2.5));
  const txtX = (1 - txtP) * -120;
  const imgX = (1 - imgP) * 120;

  return (
    <section
      ref={setRefs}
      style={{
        background: P.taupeAlt,
        padding:    "clamp(56px, 8vw, 96px) 5vw",
        position:   "relative",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: NOISE_BG, mixBlendMode: "multiply", opacity: 0.35,
        }}
      />
      <div
        className="milk-cadeau"
        style={{
          position: "relative",
          display:  "grid",
          gridTemplateColumns: "1fr 1fr",
          gap:      48,
          alignItems: "center",
          maxWidth:  1280,
          margin:    "0 auto",
        }}
      >
        <div
          style={{
            opacity:    visible ? 1 : 0,
            transform:  `translate3d(${txtX}px, 0, 0)`,
            willChange: "transform, opacity",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: P.amber, marginBottom: 12 }}>Idée cadeau</div>
          <h2 style={{ margin: "0 0 16px", fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 950, letterSpacing: -1.5, color: P.dark, lineHeight: 1.05 }}>
            Le cadeau de naissance qui change vraiment la vie.
          </h2>
          <p style={{ margin: "0 0 16px", fontSize: "clamp(14px,1.4vw,17px)", color: "rgba(26,20,16,0.65)", lineHeight: 1.75 }}>
            Pas un énième doudou. Pas un vêtement trop petit en trois semaines. M!LK, c'est le cadeau qu'on n'ose pas s'offrir soi-même — mais qu'on utilise toutes les nuits.
          </p>
          <p style={{ margin: "0 0 24px", fontSize: "clamp(13px,1.3vw,15px)", color: "rgba(26,20,16,0.5)", lineHeight: 1.75 }}>
            Parfait pour les listes de naissance, les baby showers, les coffrets nouveau-né. En bambou certifié OEKO-TEX, doux dès le premier contact, lavable en machine.
          </p>
          <div className="milk-gift-btns" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/produits" style={{ padding: "14px 24px", borderRadius: 12, background: P.dark, color: P.cream, fontWeight: 900, fontSize: 15, textDecoration: "none", display: "inline-block" }}>
              Voir les essentiels →
            </Link>
            <Link href="/produits" style={{ padding: "14px 24px", borderRadius: 12, border: `2px solid ${P.dark}`, color: P.dark, fontWeight: 700, fontSize: 15, textDecoration: "none", display: "inline-block" }}>
              Liste de naissance
            </Link>
          </div>
        </div>

        <div
          style={{
            opacity:    visible ? 1 : 0,
            transform:  `translate3d(${imgX}px, 0, 0)`,
            willChange: "transform, opacity",
          }}
        >
          <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", borderRadius: 22, overflow: "hidden", marginBottom: 16, boxShadow: "0 20px 50px rgba(0,0,0,0.18)" }}>
            <Image
              src="/images/home/milk_baby_shower_ventre_bodysuit.webp"
              alt="M!LK — cadeau de naissance"
              fill
              sizes="(max-width: 900px) 90vw, 45vw"
              style={{ objectFit: "cover", objectPosition: "center" }}
            />
          </div>
          <div className="milk-gift-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { titre: "Liste de naissance", desc: "Ajoutez M!LK à votre liste. Les futurs parents vous remercieront." },
              { titre: "Baby shower",        desc: "Un coffret 2-3 pièces bambou. Pratique, beau, zéro déchet de style." },
              { titre: "Cadeau de naissance",desc: "Livraison rapide. Le bon cadeau pour les premières semaines." },
              { titre: "Coffret nouveau-né", desc: "Body + gigoteuse + lange. L'essentiel réuni dans un coffret simplifié." },
            ].map((item, i) => (
              <div
                key={item.titre}
                style={{
                  padding:      "18px 16px",
                  borderRadius: 14,
                  background:   P.cream,
                  border:       `1px solid ${P.faintLine}`,
                  boxShadow:    "0 4px 14px rgba(0,0,0,0.08)",
                  opacity:      visible ? 1 : 0,
                  transform:    visible ? "translateY(0)" : "translateY(20px)",
                  transition:   `opacity 0.6s ease ${0.3 + i * 0.08}s, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${0.3 + i * 0.08}s`,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 13, color: P.dark, marginBottom: 6 }}>{item.titre}</div>
                <div style={{ fontSize: 12, color: "rgba(26,20,16,0.55)", lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   HoverAccordion — repris du code original, restylé en beige.
   ────────────────────────────────────────────────────────────────────────── */
function HoverAccordion({ title, tag, children }: { title: string; tag: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{
        borderRadius: 20,
        background:   P.cream,
        border:       open ? `1.5px solid ${P.amber}` : `1.5px solid ${P.faintLine}`,
        overflow:     "hidden",
        transition:   "box-shadow 0.3s, border-color 0.3s",
        boxShadow:    open ? "0 22px 50px rgba(26,20,16,0.18), 0 4px 12px rgba(26,20,16,0.1)" : "0 6px 22px rgba(26,20,16,0.08)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          all: "unset",
          cursor: "pointer",
          width: "100%",
          padding: "20px 26px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxSizing: "border-box",
        }}
      >
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: P.amber, marginBottom: 5 }}>{tag}</div>
          <div style={{ fontSize: "clamp(15px,1.5vw,18px)", fontWeight: 900, color: P.dark }}>{title}</div>
        </div>
        <div style={{ fontSize: 22, color: P.amber, transition: "transform 0.3s", transform: open ? "rotate(45deg)" : "none", flexShrink: 0, marginLeft: 16 }}>+</div>
      </button>
      <div style={{ maxHeight: open ? 1400 : 0, overflow: "hidden", transition: "max-height 0.5s cubic-bezier(0.4,0,0.2,1)" }}>
        <div style={{ padding: "0 26px 26px" }}>{children}</div>
      </div>
    </div>
  );
}

function acard(content: React.ReactNode, key?: string) {
  return (
    <div
      key={key}
      style={{
        borderRadius: 14,
        background:   P.warm,
        border:       `1px solid ${P.faintLine}`,
        overflow:     "hidden",
        boxShadow:    "0 4px 14px rgba(26,20,16,0.06)",
      }}
    >
      {content}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   AccordionsSection — 4 accordéons conservés (textes inchangés).
   ────────────────────────────────────────────────────────────────────────── */
function AccordionsSection() {
  const { ref, visible } = useReveal<HTMLDivElement>(0.1);

  return (
    <section
      ref={ref}
      style={{
        background: P.light,
        padding:    "clamp(48px, 7vw, 80px) 5vw",
        position:   "relative",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: NOISE_BG, mixBlendMode: "multiply", opacity: 0.4,
        }}
      />
      <div
        style={{
          position: "relative",
          display:  "grid",
          gap:      14,
          maxWidth: 1100,
          margin:   "0 auto",
        }}
      >
        {[
          {
            title: "La vérité des parents", tag: "Nuits · Habillage · Sommeil",
            render: (
              <div className="milk-tgrid" style={{ display: "grid", gap: 14 }}>
                {[
                  { label: "Nuits pourries",   tension: "Se lever 5 fois, changer une couche dans le noir, rendormir un bébé hurlant.",                                benefice: "Des vêtements pensés pour changer vite sans tout défaire." },
                  { label: "Habillage combat", tension: "Un bébé qui se débat, 12 boutons-pression à aligner, ta patience qui fond.",                                  benefice: "Des ouvertures intelligentes, 3 gestes max, c'est fait." },
                  { label: "Sommeil fragile",  tension: "Un bébé qui sursaute, se réveille, pleure. Un lange qui se défait au premier mouvement.",                     benefice: "Un lange qui tient et calme le réflexe de Moro." },
                ].map(card =>
                  acard(
                    <>
                      <div style={{ padding: "16px 18px 12px" }}>
                        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: P.mutedFaint, marginBottom: 6 }}>La tension</div>
                        <div style={{ fontSize: "clamp(15px,1.6vw,18px)", fontWeight: 950, color: P.dark, letterSpacing: -0.5, marginBottom: 8, lineHeight: 1.1 }}>{card.label}</div>
                        <p style={{ margin: 0, fontSize: "clamp(12px,1.1vw,13px)", color: P.muted, lineHeight: 1.7 }}>{card.tension}</p>
                      </div>
                      <div style={{ padding: "10px 18px 16px", background: "rgba(196,154,74,0.13)", borderTop: `1px solid ${P.faintLine}` }}>
                        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: P.amber, marginBottom: 6 }}>Le bénéfice M!LK</div>
                        <p style={{ margin: 0, fontSize: "clamp(12px,1.2vw,14px)", color: P.dark, lineHeight: 1.6, fontWeight: 800 }}>{card.benefice}</p>
                      </div>
                    </>,
                    card.label,
                  ),
                )}
              </div>
            ),
          },
          {
            title: "Comment on conçoit nos essentiels", tag: "Notre approche",
            render: (
              <div className="milk-pillars" style={{ display: "grid", gap: 12 }}>
                {["Chaque seconde compte à 3h du mat'", "Zéro compromis sur la sécurité", "Matières douces et certifiées", "Testés par de vrais parents fatigués"].map((pillar, i) =>
                  acard(
                    <div style={{ padding: "16px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: P.amber, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ color: P.dark, fontWeight: 900, fontSize: 12 }}>{i + 1}</span>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: "clamp(12px,1.2vw,14px)", color: P.dark, lineHeight: 1.45 }}>{pillar}</div>
                    </div>,
                    pillar,
                  ),
                )}
              </div>
            ),
          },
          {
            title: "La différence M!LK", tag: "Classique vs M!LK",
            render: (
              <div>
                <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${P.faintLine}`, marginBottom: 20, boxShadow: "0 6px 20px rgba(26,20,16,0.08)" }}>
                  <div className="milk-comptable" style={{ display: "grid", background: P.warm, gridTemplateColumns: "1.4fr 1fr 1fr" }}>
                    {["Situation", "Classique", "M!LK"].map((h, i) => (
                      <div key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: i === 2 ? 900 : 700, color: i === 2 ? P.amber : P.mutedFaint, textTransform: "uppercase", letterSpacing: 1, borderLeft: i > 0 ? `1px solid ${P.faintLine}` : "none" }}>{h}</div>
                    ))}
                  </div>
                  {[
                    { s: "Change de nuit",     c: "Défaire tout le pyjama",     m: "Zip inversé, 30 sec"      },
                    { s: "Boutons-pression",   c: "8 à 12 à aligner",           m: "3 max, bien placés"       },
                    { s: "Emmaillotage",       c: "Se défait, bébé sursaute",   m: "Tient toute la nuit"      },
                    { s: "Habillage",          c: "Combat quotidien",           m: "2-3 gestes, c'est fait"   },
                    { s: "Conception",         c: "Pour faire joli",            m: "Pour simplifier"          },
                  ].map((row, i) => (
                    <div key={row.s} className="milk-comptable" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", borderTop: `1px solid ${P.faintLine}`, background: i % 2 === 0 ? P.cream : P.taupe }}>
                      <div style={{ padding: "10px 16px", fontWeight: 700, color: P.dark, fontSize: "clamp(11px,1.1vw,13px)" }}>{row.s}</div>
                      <div style={{ padding: "10px 16px", color: P.mutedFaint, fontSize: "clamp(10px,1vw,12px)", borderLeft: `1px solid ${P.faintLine}`, textDecoration: "line-through" }}>{row.c}</div>
                      <div style={{ padding: "10px 16px", color: P.amber, fontWeight: 800, fontSize: "clamp(10px,1vw,12px)", borderLeft: `1px solid ${P.faintLine}` }}>{row.m}</div>
                    </div>
                  ))}
                </div>
                {acard(
                  <div style={{ padding: "20px 24px" }}>
                    <div style={{ fontSize: 36, color: P.amber, lineHeight: 0.8, marginBottom: 10, fontFamily: "Georgia,serif", fontWeight: 900 }}>"</div>
                    <p style={{ margin: "0 0 8px", fontSize: "clamp(14px,1.8vw,20px)", color: P.dark, fontWeight: 800, fontStyle: "italic", lineHeight: 1.45 }}>
                      Premier pyjama où je n'ai pas eu envie de pleurer à 4h du mat'.
                    </p>
                    <div style={{ fontSize: 13, color: P.muted, fontWeight: 600 }}>— Marie, maman de Léo</div>
                  </div>,
                )}
              </div>
            ),
          },
          {
            title: "Des parents, pas des acteurs", tag: "Ce qu'on entend",
            render: (
              <div className="milk-rgrid" style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                {[
                  { name: "Thomas R.", role: "Papa de Luna",                        text: "La gigoteuse à nouer a sauvé nos premières semaines. Pas d'exagération." },
                  { name: "Sarah K.",  role: "Maman de Noah",                       text: "Enfin un lange qui ne se défait pas. Mon fils dort 4h d'affilée." },
                  { name: "Amina B.",  role: "Maman de Samy, 3 mois",               text: "Samy transpire beaucoup la nuit. Avec les pyjamas M!LK, il dort mieux et se réveille moins." },
                  { name: "Julie D.",  role: "Maman d'Emma, née en juin",           text: "Cadeau de naissance parfait. Les finitions sont soignées, le bambou est doux comme promis." },
                ].map(r =>
                  acard(
                    <div style={{ padding: "16px 18px" }}>
                      <div style={{ display: "flex", marginBottom: 8 }}>
                        {[...Array(5)].map((_, j) => (
                          <span key={j} style={{ color: P.amber, fontSize: 13 }}>★</span>
                        ))}
                      </div>
                      <p style={{ margin: "0 0 10px", fontSize: "clamp(12px,1.2vw,14px)", color: P.muted, lineHeight: 1.7, fontStyle: "italic" }}>&ldquo;{r.text}&rdquo;</p>
                      <div style={{ fontWeight: 800, fontSize: 13, color: P.dark }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: P.mutedFaint, marginTop: 2 }}>{r.role}</div>
                    </div>,
                    r.name,
                  ),
                )}
              </div>
            ),
          },
        ].map((item, i) => (
          <div
            key={item.title}
            style={{
              opacity:    visible ? 1 : 0,
              transform:  visible ? "none" : "translateY(24px)",
              transition: `opacity 0.7s ease ${0.05 + i * 0.08}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${0.05 + i * 0.08}s`,
            }}
          >
            <HoverAccordion title={item.title} tag={item.tag}>
              {item.render}
            </HoverAccordion>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   FinalCTA — fond beige, accents ambre. Liens intacts.
   ────────────────────────────────────────────────────────────────────────── */
function FinalCTA() {
  const { ref, visible } = useReveal<HTMLDivElement>(0.15);
  return (
    <section
      ref={ref}
      style={{
        padding:    "clamp(48px, 7vw, 96px) 5vw",
        textAlign:  "center",
        background: `linear-gradient(180deg, ${P.light} 0%, ${P.cream} 100%)`,
        position:   "relative",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: NOISE_BG, mixBlendMode: "multiply", opacity: 0.35,
        }}
      />
      <div
        style={{
          position:   "relative",
          maxWidth:   900,
          margin:     "0 auto",
          opacity:    visible ? 1 : 0,
          transform:  visible ? "none" : "translateY(30px)",
          transition: "opacity 0.8s ease, transform 0.8s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: P.amber, marginBottom: 12 }}>
          Prêts pour moins de galères au quotidien ?
        </div>
        <h2 style={{ margin: "0 0 14px", fontSize: "clamp(22px,3.8vw,46px)", fontWeight: 950, letterSpacing: -2, color: P.dark, lineHeight: 1.05 }}>
          Des essentiels conçus pour les vraies nuits, <span style={{ color: P.amber }}>les vrais matins, la vraie vie de parent.</span>
        </h2>
        <p style={{ margin: "0 0 24px", fontSize: "clamp(13px,1.4vw,16px)", color: P.muted, lineHeight: 1.6 }}>
          Des essentiels bébé. Sans le superflu.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/produits" style={{ padding: "16px 32px", borderRadius: 14, background: P.dark, color: P.cream, fontWeight: 900, fontSize: "clamp(14px,1.5vw,17px)", textDecoration: "none", display: "inline-block", boxShadow: "0 8px 24px rgba(26,20,16,0.25)" }}>
            Shopper les essentiels →
          </Link>
          <Link href="/qui-sommes-nous" style={{ padding: "16px 32px", borderRadius: 14, border: `1px solid ${P.faintLine}`, color: P.dark, fontWeight: 700, fontSize: "clamp(13px,1.4vw,16px)", textDecoration: "none", display: "inline-block", background: P.cream }}>
            Notre histoire
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   HOMEPAGE — entry point.
   ────────────────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const [products, setProducts]                   = useState<any[]>([]);
  const [lbl, setLbl]                             = useState("Sélection du moment");
  const [freeShipThreshold, setFreeShipThreshold] = useState<number>(60);
  const [coffretActive, setCoffretActive]         = useState(false);

  useEffect(() => {
    fetch("/api/settings/public")
      .then(r => r.json())
      .then((s: any) => {
        const n = Number(s?.free_shipping_threshold);
        if (Number.isFinite(n) && n > 0) setFreeShipThreshold(n);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/home/config")
      .then(r => r.json())
      .then((data: any) => {
        setCoffretActive(Boolean(data?.coffret_active));
        if (data?.products && Array.isArray(data.products) && data.products.length > 0) {
          setProducts(data.products);
          setLbl(data.section_title ?? "Sélection du moment");
        } else {
          fetch("/api/produits")
            .then(r => r.json())
            .then((all: any[]) => {
              if (!Array.isArray(all)) return;
              setProducts(all.filter((p: any) => p.stock > 0).slice(0, 8));
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="milk-home-root" style={{ background: P.light, color: P.dark, overflowX: "hidden" }}>
      <style>{`
        @keyframes milk-spin     { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes milk-bounce   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }
        @keyframes milk-ticker   { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes milk-float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes milk-pulse    { 0%,100%{opacity:0.92} 50%{opacity:1} }
        .milk-tk { animation: milk-ticker 22s linear infinite; }

        /* Hero — police BoldinBold (déjà déclarée dans globals.css) */
        .milk-logo-text { font-family: "BoldinBold", system-ui, sans-serif; }

        /* Logo M!LK : float doux infini */
        .milk-logo-float { animation: milk-float 6s ease-in-out infinite, milk-pulse 4s ease-in-out infinite; }

        /* CTA hero — hover : lift + glow */
        .milk-hero-cta-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 40px rgba(13,11,9,0.55) !important;
        }
        .milk-hero-cta-secondary:hover {
          background: rgba(13,11,9,0.55) !important;
          border-color: ${P.amber} !important;
        }

        /* Cards "Par besoin" — effet waw : lift + numéro grandit + flèche bounce + fond amber */
        .milk-catcard {
          will-change: transform, background, box-shadow;
        }
        .milk-catcard::after {
          content: "";
          position: absolute;
          left: 0; right: 0; bottom: 0;
          height: 3px;
          background: ${P.amber};
          transform: scaleX(0);
          transform-origin: left center;
          transition: transform 0.55s cubic-bezier(0.22,1,0.36,1);
        }
        .milk-catcard:hover {
          transform: translateY(-8px);
          box-shadow: 0 26px 50px rgba(26,20,16,0.18), 0 8px 20px rgba(26,20,16,0.08) !important;
          border-color: ${P.amber} !important;
          background: ${P.warm} !important;
        }
        .milk-catcard:hover::after { transform: scaleX(1); }
        .milk-catcard:hover .milk-catcard-num {
          color: rgba(196,154,74,0.32) !important;
          transform: translateY(4px) scale(1.06);
        }
        .milk-catcard:hover .milk-catcard-arrow { transform: translateX(8px); }
        @media (hover: none) {
          .milk-catcard:hover { transform: none; }
        }

        /* Cards produit — shine au hover */
        .milk-pcard {
          transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
        }
        .milk-pcard:hover {
          transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateY(-6px);
          box-shadow: 0 28px 60px rgba(26,20,16,0.18), 0 8px 16px rgba(26,20,16,0.1) !important;
          border-color: ${P.amber} !important;
        }
        .milk-pcard:hover .milk-pcard-img { transform: scale(1.06); }
        .milk-pcard-img { transition: transform 0.5s cubic-bezier(0.22,1,0.36,1); }
        .milk-pcard-shine {
          position: absolute; inset: 0; pointer-events: none; opacity: 0;
          background: radial-gradient(circle at var(--sx,50%) var(--sy,50%), rgba(255,255,255,0.55) 0%, transparent 28%);
          mix-blend-mode: overlay; transition: opacity 0.25s ease;
        }
        .milk-pcard:hover .milk-pcard-shine { opacity: 1; }
        @media (hover: none) {
          .milk-pcard:hover { transform: none; }
          .milk-pcard-shine { display: none; }
        }

        /* Grilles */
        .milk-catgrid { grid-template-columns: repeat(4, 1fr); }
        .milk-pgrid   { grid-template-columns: repeat(4, 1fr); }
        .milk-tgrid   { grid-template-columns: repeat(3, 1fr); }
        .milk-pillars { grid-template-columns: repeat(4, 1fr); }
        .milk-rgrid   { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }

        @media (max-width: 1024px) {
          .milk-catgrid { grid-template-columns: repeat(2, 1fr) !important; }
          .milk-pgrid   { grid-template-columns: repeat(2, 1fr) !important; }
          .milk-pillars { grid-template-columns: repeat(2, 1fr) !important; }
          .milk-tgrid   { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 700px) {
          .milk-rgrid     { grid-template-columns: repeat(2, 1fr) !important; }
          .milk-pillars   { grid-template-columns: 1fr 1fr !important; }
          .milk-comptable { grid-template-columns: 1fr 1fr 1fr !important; }
          .milk-floating  { grid-template-columns: 1fr !important; }
          .milk-cadeau    { grid-template-columns: 1fr !important; gap: 32px !important; }
          .milk-gift-grid { grid-template-columns: 1fr !important; }
          .milk-gift-btns { flex-direction: column !important; }
          .milk-gift-btns a { width: 100% !important; text-align: center !important; box-sizing: border-box !important; }
          .milk-split     { grid-template-columns: 1fr !important; }
          .milk-tgrid     { grid-template-columns: 1fr !important; }
          /* FIX 2 : CTA hero masqués sur mobile (re-présents plus bas dans la page) */
          .milk-hero-btns { display: none !important; }
          .milk-hero-btns a { width: 100% !important; text-align: center !important; box-sizing: border-box !important; }

          /* FIX 4 : réorg sections mobile → Hero, Produits, puis Stats + reste.
             Root passe en flex-col ; seuls Hero (order:-2) et Produits (order:-1)
             remontent, tout le reste garde son ordre source (order:0). Desktop intact. */
          .milk-home-root   { display: flex !important; flex-direction: column !important; }
          .milk-sec-products { order: -1 !important; }

          /* FIX 2 : sur mobile, ne garder que "L'essentiel." + les tags d'âge */
          .milk-hero-h1-br,
          .milk-hero-h1-rest { display: none !important; }
          .milk-hero-sub     { display: none !important; }
          .milk-band-stats { gap: 14px 0 !important; }
          .milk-band-stats > div { padding-right: 14px !important; margin-right: 14px !important; }
          .milk-heroband-badge { display: none !important; }

          /* ───── HERO MOBILE — plein écran 100svh, image qui couvre tout ───── */
          .milk-hero-root {
            /* Les 3 verrouillées à 100svh : en flex item, height seul peut être
               ignoré au profit de min-height. On force min=max=height=100svh →
               hauteur exacte écran, immunisé contre flex-shrink/grow. */
            height: 100svh !important;
            min-height: 100svh !important;
            max-height: 100svh !important;
            overflow: hidden !important;
            background: #f2ede6 !important; /* cream fallback explicite — jamais gris */
            order: -2 !important;           /* FIX 4 : hero en 1er */
          }
          /* Inner reste absolute inset 0 (default desktop), pas de sticky ici */
          .milk-hero-sticky { background: #f2ede6 !important; }
          /* FIX image hero : le wrapper photo utilisait inset:-10% (pourcentage),
             qui s'effondre quand .milk-hero-root devient un flex item (bug
             flexbox % height). On force inset:0 + pas de scale → l'image couvre
             tout le hero (100svh). object-position:center top = pieds visibles. */
          .milk-hero-photo {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            transform: none !important;
          }
          /* IMPORTANT override globals.css : [class*="hero"] img { max-height:60vh }
             et [style*="object-fit:cover"] { max-height:55vh } bridaient l'image
             hero a 60vh -> 40% de vide gris en bas. Selecteur plus specifique
             (0,2,1) + max-height:none pour lever le plafond. */
          .milk-hero-root .milk-hero-photo img {
            object-fit: cover !important;
            object-position: center top !important;
            width: 100% !important;
            height: 100% !important;
            max-height: none !important;
            min-height: 100% !important;
          }
          /* Watermark M!LK masqué sur mobile (le logo du header suffit) */
          .milk-hero-logo-wrap { display: none !important; }
          .milk-hero-logo {
            font-size: clamp(48px, 16vw, 96px) !important;
            letter-spacing: 0.02em !important;
          }
          .milk-logo-float { animation: none !important; }
          /* Badge OEKO + hint Découvrir masqués (cohabitation chat impossible) */
          .milk-hero-badge { display: none !important; }
          .milk-hero-hint  { display: none !important; }
          /* Contenu (tags + "L'essentiel.") collé en BAS de la photo, hauteur
             auto : plus de inset:0 + alignItems:center qui centrait le texte
             dans le vide quand la photo paraissait courte. */
          .milk-hero-content {
            inset: auto 0 0 0 !important;
            height: auto !important;
            align-items: flex-start !important;
            padding: 0 5vw 24px !important;
          }
          /* H1 mobile : letter-spacing détendu, "Sans compromis" ne se colle plus */
          .milk-hero-h1 {
            letter-spacing: -0.5px !important;
            word-spacing: normal !important;
            font-size: clamp(32px, 8.5vw, 50px) !important;
            line-height: 1.05 !important;
          }
          /* Voile confiné au bas 35% : il sert juste au contraste du texte.
             Avant il couvrait toute la photo et grisait la partie unie du drap
             sous les pieds → ça donnait l'illusion d'une zone vide grise. */
          .milk-hero-veil {
            top: auto !important;
            bottom: 0 !important;
            height: 35% !important;
            background: linear-gradient(to top,
              rgba(13,11,9,0.80) 0%,
              rgba(13,11,9,0.40) 45%,
              transparent 100%
            ) !important;
          }
          /* CTA "Pourquoi le bambou ?" : contraste renforcé */
          .milk-hero-cta-secondary {
            background: rgba(13,11,9,0.65) !important;
            border: 1.5px solid rgba(242,237,230,0.85) !important;
            backdrop-filter: blur(10px) !important;
          }
          /* Ticker bandeau : police réduite, pas de débordement */
          .milk-tk { font-size: 11px !important; }
          .milk-tk > span {
            font-size: 11px !important;
            letter-spacing: 1.1px !important;
            padding-right: 38px !important;
          }
        }
        @media (max-width: 360px) {
          .milk-rgrid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 900px) {
          .milk-tk { animation-duration: 14s; }
        }

        /* prefers-reduced-motion : on coupe les anims décoratives */
        @media (prefers-reduced-motion: reduce) {
          .milk-tk            { animation: none !important; }
          .milk-logo-float    { animation: none !important; }
          .milk-pcard, .milk-pcard-img, .milk-pcard-shine { transition: none !important; }
          [style*="badge-spin"], [style*="bounce-arr"] { animation: none !important; }
        }
      `}</style>

      <Topbar freeShipThreshold={freeShipThreshold} />
      <Hero />
      <HeroBand freeShipThreshold={freeShipThreshold} />
      <ProductsSection products={products} lbl={lbl} />
      <CategoriesSection />

      {/* Édito 1 — texte gauche / photo droite */}
      <EditoSplit
        align="text-left"
        eyebrow="Notre raison d'être"
        text={
          <>
            Parce que les parents n'ont pas besoin de plus de "mignon",
            <br />
            mais de moins de charge mentale.
          </>
        }
        body="M!LK conçoit des essentiels bébé qui simplifient les routines, réduisent les luttes et soutiennent les nuits difficiles."
        imgSrc="/images/home/milk_col_body_boule_tag.webp"
        imgAlt="M!LK — bébé bonnet camel + body smiley + maman, douceur bambou"
        bg={P.light}
      />

      <FloatingCard />

      {/* Édito 2 — photo gauche / texte droite */}
      <EditoSplit
        align="image-left"
        eyebrow="Notre conviction"
        text={
          <>
            M!LK n'est pas une marque de vêtements.
            <br />
            C'est une réponse aux petites galères répétées.
          </>
        }
        body="Chaque produit répond à un problème réel. Pas de design pour le design. Pas de fonctionnalité inutile. Juste ce qui compte quand t'es épuisé."
        cta={{ label: "Voir la collection →", href: "/produits" }}
        imgSrc="/images/home/milk_rouleaux_tissu_mur_jouets.webp"
        imgAlt="M!LK — rouleaux de tissu bambou OEKO-TEX"
        bg={P.taupe}
      />

      {/* Édito détail — texte gauche / photo carrée droite (étagère nursery) */}
      <EditoSplit
        align="text-left"
        eyebrow="Chaque détail compte"
        text="Les finitions soignées, les matières choisies, les coutures plates."
        body="Les détails qu'on remarque à 3h du matin. Bonnet damier, tag bois, étiquettes qui ne grattent pas. Le confort vient des petits choix."
        imgSrc="/images/home/milk_baby_shower_etagere_nursery.webp"
        imgAlt="M!LK — étagère nursery, pièces coordonnées, finitions soignées"
        bg={P.warm}
        imgSquare
      />

      {coffretActive && (
        <section style={{ background: P.taupeAlt, padding: "clamp(48px,7vw,88px) 5vw", textAlign: "center" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: P.amber, marginBottom: 12 }}>Idée cadeau</div>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(24px,4vw,44px)", fontWeight: 950, letterSpacing: -1.5, color: P.dark, lineHeight: 1.05 }}>Le coffret de naissance M!LK 🎁</h2>
            <p style={{ margin: "0 0 26px", fontSize: "clamp(14px,1.4vw,17px)", color: "rgba(26,20,16,0.65)", lineHeight: 1.7 }}>
              Nos essentiels bambou réunis à prix doux. Parfait pour une liste de naissance ou un cadeau.
            </p>
            <Link href="/packs" style={{ display: "inline-block", padding: "16px 32px", borderRadius: 14, background: P.dark, color: P.cream, fontWeight: 900, fontSize: "clamp(14px,1.5vw,17px)", textDecoration: "none" }}>
              Découvrir les coffrets →
            </Link>
          </div>
        </section>
      )}

      <CadeauSection />
      <AccordionsSection />
      <FinalCTA />
    </div>
  );
}
