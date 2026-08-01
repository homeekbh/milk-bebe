"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import ProductBadge from "@/components/product/ProductBadge";
import { BADGE_KEYFRAMES } from "@/components/product/badgeStyles";

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
  // Défaut = 1 (état POSÉ) : au SSR / sans JS / avant le 1er calcul, les transforms
  // dérivées valent (1 - 1) * déplacement = 0 → contenu en place, jamais translaté
  // hors de sa colonne (Lot S : garantit « visible sans JS »).
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
      // 0 quand le top entre dans le viewport (rect.top = viewH) ; 1 quand le bottom sort.
      const total  = rect.height + viewH;
      const passed = viewH - rect.top;
      return Math.max(0, Math.min(1, passed / total));
    };
    // Bail-out React si valeur ~inchangée → pas de re-render inutile (idle en vue).
    const apply = () => { const p = compute(); setProgress(prev => (Math.abs(prev - p) < 0.0005 ? prev : p)); };

    // rAF tant que l'élément est proche/dans le viewport → `progress` TOUJOURS à jour,
    // même si la webview coalesce/retarde les événements scroll (cause du blanc : Lot S).
    // Le glissement reste piloté par la position réelle → effet préservé en scroll normal.
    const loop = () => { apply(); rafRef.current = runningRef.current ? requestAnimationFrame(loop) : null; };
    const start = () => { if (!runningRef.current) { runningRef.current = true; if (rafRef.current == null) rafRef.current = requestAnimationFrame(loop); } };
    const stop  = () => { runningRef.current = false; if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } apply(); };

    apply(); // valeur initiale correcte au mount

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      try {
        io = new IntersectionObserver(([e]) => { if (e.isIntersecting) start(); else stop(); }, { rootMargin: "200px 0px 200px 0px" });
        io.observe(el);
      } catch { io = null; }
    }
    // Repli si IO indisponible : écouteur scroll classique (comportement historique).
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
   useReveal — IntersectionObserver, observer retiré au premier déclenchement.
   Respecte prefers-reduced-motion (renvoie visible:true immédiatement).
   ────────────────────────────────────────────────────────────────────────── */
function useReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.15,
): { ref: RefObject<T | null>; visible: boolean } {
  const ref = useRef<T>(null);
  // VISIBLE PAR DÉFAUT (progressive enhancement, Lot S) : SSR + 1er render client
  // rendent le contenu visible. On ne le cache QUE si, après hydratation, il est
  // hors écran (sous la ligne de flottaison) ET observable. SENS UNIQUE.
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return; // reste visible
    if (typeof IntersectionObserver === "undefined") return;                     // reste visible
    // Déjà visible / au-dessus de la ligne de flottaison → jamais caché (aucun flash).
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    // Hors écran (sous la ligne de flottaison) : on cache puis on anime à l'entrée.
    setVisible(false);
    let obs: IntersectionObserver | null = null;
    let timer = 0;
    const reveal = () => { setVisible(true); obs?.disconnect(); window.clearTimeout(timer); };
    try {
      obs = new IntersectionObserver(
        // Révèle à l'entrée OU si on a flingué AU-DELÀ (top repassé au-dessus).
        ([e]) => { if (e.isIntersecting || e.boundingClientRect.top < 0) reveal(); },
        { threshold, rootMargin: "0px 0px 10% 0px" },
      );
      obs.observe(el);
    } catch { reveal(); return; }
    // Dernier recours anti-blanc ancré à l'ÉLÉMENT (pas au montage).
    timer = window.setTimeout(reveal, 2500);
    return () => { obs?.disconnect(); window.clearTimeout(timer); };
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

  const t = useTranslations("home");
  const items = useMemo(
    () => [
      t("ticker1"),
      t("ticker2"),
      t("ticker3"),
      t("ticker4", { amount: freeShipThreshold }),
      t("ticker5"),
      t("ticker6"),
      t("ticker7"),
    ],
    [freeShipThreshold, t],
  );
  const str = items.join("   ");

  return (
    <div
      aria-hidden={hidden}
      style={{
        position:   "fixed",
        // Sous le bandeau promo mobile (--milk-promo-h, 0 sur desktop) → s'empile
        // en dessous quand le promo est visible ; inchangé sur desktop.
        top:        "var(--milk-promo-h, 0px)",
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
  const t = useTranslations("home");
  const heroTags = t.raw("hero_tags") as string[];
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
            fetchPriority="high"
            quality={75}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
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
            padding:    "clamp(80px, 14vh, 160px) 5vw clamp(240px, 28vh, 320px)",
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
              {heroTags.map(tag => (
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
              {t("hero_h1_l1")}
              <br className="milk-hero-h1-br" />
              <span className="milk-hero-h1-rest" style={{ color: P.cream }}>{t("hero_h1_l2")}</span>
            </h1>

            {/* Sous-titre */}
            <p
              className="milk-hero-sub"
              style={{
                margin:    "0 0 26px",
                fontSize:  "clamp(14px, 1.7vw, 18px)",
                fontWeight: 400,
                color:     "rgba(242,237,230,0.72)",
                maxWidth:  460,
                lineHeight: 1.5,
                textShadow:"0 1px 8px rgba(13,11,9,0.55)",
              }}
            >
              {t("hero_sub")}
            </p>

            {/* Boutons */}
            <div className="milk-hero-btns" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link
                href="/produits"
                className="milk-hero-cta-primary"
                style={{
                  padding:      "12px 30px",
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
                {t("hero_cta1")}
              </Link>
              <Link
                href="/pourquoi-bambou"
                className="milk-hero-cta-secondary"
                style={{
                  padding:      "12px 30px",
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
                {t("hero_cta2")}
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
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: P.cream }}>{t("hero_hint")}</div>
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
  const t = useTranslations("home");
  const { ref, visible } = useReveal<HTMLDivElement>(0.1);

  const STATS = [
    { val: t("band_free", { amount: freeShipThreshold }), label: t("band_free_label") },
    { val: "100%", label: t("band_oeko") },
    { val: "14j",  label: t("band_returns") },
    { val: "0",    label: t("band_nocive") },
    { val: "3×",   label: t("band_soft") },
  ];

  const REASS = [
    { Icon: IconTruck, label: t("reass_returns"), desc: t("reass_returns_d") },
    { Icon: IconLeaf,  label: t("reass_oeko"),    desc: t("reass_oeko_d") },
    { Icon: IconLock,  label: t("reass_pay"),     desc: t("reass_pay_d") },
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
function CategoriesSection() {
  const t = useTranslations("home");
  const CATS = t.raw("cats") as { label: string; desc: string; href: string }[];
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
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: P.amber, marginBottom: 8 }}>{t("cats_eyebrow")}</div>
          <h2 style={{ margin: 0, fontSize: "clamp(24px, 3.4vw, 40px)", fontWeight: 950, letterSpacing: -1.2, color: P.dark, lineHeight: 1.05 }}>
            {t("cats_title")}
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
                      {t("cat_tag")}
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
        height:         "100%",
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
          height:          "100%",
          display:         "flex",
          flexDirection:   "column",
        }}
      >
        {/* Badges diagonaux SUPPRIMÉS (Lot D) — la pastille passe sous la photo (voir plus bas),
            via le composant partagé ProductBadge. Plus rien posé sur l'image. */}

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
        <div style={{ padding: "10px 18px 14px", flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Pastille SOUS la photo, au-dessus du titre (Lot D) — composant partagé, 6 types + promo, i18n. */}
          <ProductBadge label={p.label} isPromo={promo} size="card" />
          <div translate="no" style={{ fontWeight: 900, fontSize: 15, color: P.dark, marginBottom: 3, lineHeight: 1.3, minHeight: 38 }}>{p.name}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: "auto" }}>
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
  const t = useTranslations("home");
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
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: P.amber, marginBottom: 8 }}>{t("products_eyebrow")}</div>
            <h2 style={{ margin: 0, fontSize: "clamp(24px, 3.4vw, 40px)", fontWeight: 950, letterSpacing: -1.2, color: P.dark, lineHeight: 1.05 }}>{lbl}</h2>
          </div>
          <Link href="/produits" style={{ fontSize: 15, fontWeight: 800, color: P.amber, textDecoration: "none" }}>
            {t("see_all")}
          </Link>
        </div>

        {/* Animation « respiration » de la pastille — injectée une fois pour la grille (source unique). */}
        <style>{BADGE_KEYFRAMES}</style>
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
                  height:       "100%",
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
  const t = useTranslations("home");
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
            {t("float_badge")}
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
            {t("float_eyebrow")}
          </div>
          <h2 style={{ margin: "0 0 18px", fontSize: "clamp(22px, 3vw, 38px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.1, color: P.dark }}>
            {t("float_title")}
          </h2>
          <p style={{ margin: "0 0 24px", fontSize: "clamp(13px, 1.3vw, 16px)", color: P.muted, lineHeight: 1.75 }}>
            {t("float_body")}
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
            {t("float_cta")}
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
  const t = useTranslations("home");
  const giftCards = t.raw("gift_cards") as { titre: string; desc: string }[];
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
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: P.amber, marginBottom: 12 }}>{t("gift_eyebrow")}</div>
          <h2 style={{ margin: "0 0 16px", fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 950, letterSpacing: -1.5, color: P.dark, lineHeight: 1.05 }}>
            {t("gift_title")}
          </h2>
          <p style={{ margin: "0 0 16px", fontSize: "clamp(14px,1.4vw,17px)", color: "rgba(26,20,16,0.65)", lineHeight: 1.75 }}>
            {t("gift_p1")}
          </p>
          <p style={{ margin: "0 0 24px", fontSize: "clamp(13px,1.3vw,15px)", color: "rgba(26,20,16,0.5)", lineHeight: 1.75 }}>
            {t("gift_p2")}
          </p>
          <div className="milk-gift-btns" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/packs" style={{ padding: "16px 30px", borderRadius: 12, background: P.amber, color: P.dark, fontWeight: 900, fontSize: 16, textDecoration: "none", display: "inline-block" }}>
              {t("gift_cta")}
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
            {giftCards.map((item, i) => (
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
  const t = useTranslations("home");
  const acc1Cards = t.raw("acc1_cards") as { label: string; tension: string; benefice: string }[];
  const pillars = t.raw("pillars") as string[];
  const diffHeaders = t.raw("diff_headers") as string[];
  const diffRows = t.raw("diff_rows") as { s: string; c: string; m: string }[];
  const reviews = t.raw("reviews") as { name: string; role: string; text: string }[];
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
            title: t("acc1_title"), tag: t("acc1_tag"),
            render: (
              <div className="milk-tgrid" style={{ display: "grid", gap: 14 }}>
                {acc1Cards.map(card =>
                  acard(
                    <>
                      <div style={{ padding: "16px 18px 12px" }}>
                        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: P.mutedFaint, marginBottom: 6 }}>{t("acc_tension")}</div>
                        <div style={{ fontSize: "clamp(15px,1.6vw,18px)", fontWeight: 950, color: P.dark, letterSpacing: -0.5, marginBottom: 8, lineHeight: 1.1 }}>{card.label}</div>
                        <p style={{ margin: 0, fontSize: "clamp(12px,1.1vw,13px)", color: P.muted, lineHeight: 1.7 }}>{card.tension}</p>
                      </div>
                      <div style={{ padding: "10px 18px 16px", background: "rgba(196,154,74,0.13)", borderTop: `1px solid ${P.faintLine}` }}>
                        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: P.amber, marginBottom: 6 }}>{t("acc_benefit")}</div>
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
            title: t("acc2_title"), tag: t("acc2_tag"),
            render: (
              <div className="milk-pillars" style={{ display: "grid", gap: 12 }}>
                {pillars.map((pillar, i) =>
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
            title: t("acc3_title"), tag: t("acc3_tag"),
            render: (
              <div>
                <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${P.faintLine}`, marginBottom: 20, boxShadow: "0 6px 20px rgba(26,20,16,0.08)" }}>
                  <div className="milk-comptable" style={{ display: "grid", background: P.warm, gridTemplateColumns: "1.4fr 1fr 1fr" }}>
                    {diffHeaders.map((h, i) => (
                      <div key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: i === 2 ? 900 : 700, color: i === 2 ? P.amber : P.mutedFaint, textTransform: "uppercase", letterSpacing: 1, borderLeft: i > 0 ? `1px solid ${P.faintLine}` : "none" }}>{h}</div>
                    ))}
                  </div>
                  {diffRows.map((row, i) => (
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
                      {t("acc3_quote")}
                    </p>
                    <div style={{ fontSize: 13, color: P.muted, fontWeight: 600 }}>{t("acc3_author")}</div>
                  </div>,
                )}
              </div>
            ),
          },
          {
            title: t("acc4_title"), tag: t("acc4_tag"),
            render: (
              <div className="milk-rgrid" style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                {reviews.map(r =>
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
  const t = useTranslations("home");
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
          {t("final_eyebrow")}
        </div>
        <h2 style={{ margin: "0 0 14px", fontSize: "clamp(22px,3.8vw,46px)", fontWeight: 950, letterSpacing: -2, color: P.dark, lineHeight: 1.05 }}>
          {t("final_h2_l1")}<span style={{ color: P.amber }}>{t("final_h2_l2")}</span>
        </h2>
        <p style={{ margin: "0 0 24px", fontSize: "clamp(13px,1.4vw,16px)", color: P.muted, lineHeight: 1.6 }}>
          {t("final_sub")}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/produits" style={{ padding: "16px 32px", borderRadius: 14, background: P.dark, color: P.cream, fontWeight: 900, fontSize: "clamp(14px,1.5vw,17px)", textDecoration: "none", display: "inline-block", boxShadow: "0 8px 24px rgba(26,20,16,0.25)" }}>
            {t("final_cta1")}
          </Link>
          <Link href="/qui-sommes-nous" style={{ padding: "16px 32px", borderRadius: 14, border: `1px solid ${P.faintLine}`, color: P.dark, fontWeight: 700, fontSize: "clamp(13px,1.4vw,16px)", textDecoration: "none", display: "inline-block", background: P.cream }}>
            {t("final_cta2")}
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
  const t = useTranslations("home");
  const locale = useLocale();
  const [products, setProducts]                   = useState<any[]>([]);
  const [lbl, setLbl]                             = useState("");
  const [freeShipThreshold, setFreeShipThreshold] = useState<number>(60);
  const [coffretActive, setCoffretActive]         = useState(false);
  // Pack mis à l'honneur : UN des packs actifs, tiré au sort à chaque chargement de
  // page (côté client → change à chaque visite, « vivant »). Pas de setInterval.
  const [featuredPack, setFeaturedPack]           = useState<any>(null);

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
          setLbl(data.section_title ?? "");
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

  // Packs actifs (dynamiques, depuis la table `packs` via /api/packs) → tirage au sort
  // d'un seul, au montage (donc à chaque visite/rechargement). Reste à jour si un pack
  // est désactivé/ajouté (pas de liste codée en dur).
  useEffect(() => {
    fetch("/api/packs")
      .then(r => r.json())
      .then((data: any) => {
        const list = Array.isArray(data?.packs) ? data.packs : [];
        if (list.length > 0) setFeaturedPack(list[Math.floor(Math.random() * list.length)]);
      })
      .catch(() => {});
  }, []);

  return (
    // clip et NON hidden : hidden fait calculer overflow-y:auto → conteneur de scroll qui casse
    // position:sticky et rogne tout enfant dépassant (cf. convention globals.css:48-50 / 286-289).
    <div className="milk-home-root" style={{ background: P.light, color: P.dark, overflowX: "clip" }}>
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
      {/* Le titre de section vient du DB (FR uniquement). Hors FR, on retombe
          sur la clé traduite pour ne pas afficher de français sur /en. */}
      <ProductsSection products={products} lbl={(locale === "fr" && lbl) ? lbl : t("products_default_lbl")} />

      {/* Bandeau « Coffret de naissance » — remonté juste après les produits, avant les catégories */}
      {coffretActive && (
        <section style={{ background: P.taupeAlt, padding: "clamp(48px,7vw,88px) 5vw", textAlign: "center" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: P.amber, marginBottom: 12 }}>{t("coffret_eyebrow")}</div>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(24px,4vw,44px)", fontWeight: 950, letterSpacing: -1.5, color: P.dark, lineHeight: 1.05 }}>{t("coffret_title")}</h2>
            <p style={{ margin: "0 0 26px", fontSize: "clamp(14px,1.4vw,17px)", color: "rgba(26,20,16,0.65)", lineHeight: 1.7 }}>
              {t("coffret_desc")}
            </p>
            <Link href="/packs" style={{ display: "inline-block", padding: "16px 32px", borderRadius: 14, background: P.dark, color: P.cream, fontWeight: 900, fontSize: "clamp(14px,1.5vw,17px)", textDecoration: "none" }}>
              {t("coffret_cta")}
            </Link>

            {/* Pack à l'honneur — tiré au sort à chaque visite (image + nom + prix). */}
            {featuredPack && (
              <Link href={`/packs/${featuredPack.slug}`}
                style={{ display: "block", marginTop: 40, maxWidth: 440, marginInline: "auto", background: P.cream, borderRadius: 22, overflow: "hidden", textDecoration: "none", border: "1px solid rgba(26,20,16,0.08)", boxShadow: "0 14px 44px rgba(13,11,9,0.14)" }}>
                {featuredPack.image_url && (
                  <div style={{ width: "100%", aspectRatio: "4 / 3", backgroundColor: "#e8e2d8", backgroundImage: `url("${featuredPack.image_url}")`, backgroundSize: "cover", backgroundPosition: "center" }} />
                )}
                <div style={{ padding: "20px 24px", textAlign: "left" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: P.amber, marginBottom: 6 }}>Coffret à l'honneur</div>
                  <div style={{ fontSize: "clamp(18px,2.2vw,22px)", fontWeight: 950, letterSpacing: -0.5, color: P.dark, marginBottom: 10 }}>{featuredPack.title}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontSize: "clamp(20px,2.4vw,26px)", fontWeight: 950, color: P.dark }}>{Number(featuredPack.price).toFixed(2)} €</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: P.amber, whiteSpace: "nowrap" }}>Voir ce coffret →</span>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </section>
      )}

      <CategoriesSection />

      {/* Édito 1 — texte gauche / photo droite */}
      <EditoSplit
        align="text-left"
        eyebrow={t("edito1_eyebrow")}
        text={
          <>
            {t("edito1_text_l1")}
            <br />
            {t("edito1_text_l2")}
          </>
        }
        body={t("edito1_body")}
        imgSrc="/images/home/milk_col_body_boule_tag.webp"
        imgAlt="M!LK — bébé bonnet camel + body smiley + maman, douceur bambou"
        bg={P.light}
      />

      <FloatingCard />

      {/* Édito 2 — photo gauche / texte droite */}
      <EditoSplit
        align="image-left"
        eyebrow={t("edito2_eyebrow")}
        text={
          <>
            {t("edito2_text_l1")}
            <br />
            {t("edito2_text_l2")}
          </>
        }
        body={t("edito2_body")}
        cta={{ label: t("edito2_cta"), href: "/produits" }}
        imgSrc="/images/home/milk_rouleaux_tissu_mur_jouets.webp"
        imgAlt="M!LK — rouleaux de tissu bambou OEKO-TEX"
        bg={P.taupe}
      />

      {/* Édito détail — texte gauche / photo carrée droite (étagère nursery) */}
      <EditoSplit
        align="text-left"
        eyebrow={t("edito3_eyebrow")}
        text={t("edito3_text")}
        body={t("edito3_body")}
        imgSrc="/images/home/milk_baby_shower_etagere_nursery.webp"
        imgAlt="M!LK — étagère nursery, pièces coordonnées, finitions soignées"
        bg={P.warm}
        imgSquare
      />

      <CadeauSection />
      <AccordionsSection />
      <FinalCTA />
    </div>
  );
}
