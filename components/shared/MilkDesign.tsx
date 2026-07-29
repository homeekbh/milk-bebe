"use client";
import React, { useEffect, useRef, useState } from "react";


export const C = {
  bg:    "#2d1a0e",
  amber: "#c49a4a",
  taupe: "#c4ae94",
  light: "#ede8df",
  warm:  "#f2ede6",
  muted: "rgba(242,237,230,0.55)",
  faint: "rgba(242,237,230,0.08)",
  dark:  "#1a1410",
};

// ── Hauteur identique à la homepage (16px au lieu de 32) ──
export function Divider({ from, to }: { from: string; to: string }) {
  return <div style={{ height: 16, background: `linear-gradient(to bottom, ${from}, ${to})`, flexShrink: 0 }} />;
}

// Reveal — VISIBLE PAR DÉFAUT (progressive enhancement, Lot S). Le contenu n'est
// jamais caché au SSR ni au 1er render client → aucun blanc si pas de JS, IO
// indisponible, reduced-motion ou fling rapide. `enhance` ne passe à true QUE
// lorsqu'on a délibérément caché un élément SOUS la ligne de flottaison (hors
// écran) pour l'animer à l'entrée. SENS UNIQUE : une fois révélé, jamais re-caché.
export function useBiReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [enhance, setEnhance] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current; if (!el) return;
    // reduced-motion OU IO indisponible → on ne cache jamais (reste visible).
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;
    // Déjà dans le viewport / au-dessus de la ligne de flottaison → jamais caché (aucun flash).
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    // Sous la ligne de flottaison (hors écran) : on cache puis on anime à l'entrée.
    setEnhance(true);
    setVisible(false);
    let obs: IntersectionObserver | null = null;
    let timer = 0;
    const reveal = () => { setVisible(true); obs?.disconnect(); window.clearTimeout(timer); };
    try {
      obs = new IntersectionObserver(([e]) => {
        // Révèle à l'entrée OU si on a flingué AU-DELÀ (top repassé au-dessus).
        if (e.isIntersecting || e.boundingClientRect.top < 0) reveal();
      }, { threshold, rootMargin: "0px 0px 10% 0px" });
      obs.observe(el);
    } catch { reveal(); return; }
    // Dernier recours anti-blanc ancré à l'ÉLÉMENT (pas au montage) : si l'IO ne
    // délivre jamais (webview extrême), on révèle après 2,5 s. Ne fait que rendre visible.
    timer = window.setTimeout(reveal, 2500);
    return () => { obs?.disconnect(); window.clearTimeout(timer); };
  }, [threshold]);
  return { ref, visible, enhance };
}

export function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible, enhance } = useBiReveal();
  return (
    <div
      ref={ref}
      style={enhance ? {
        opacity:    visible ? 1 : 0,
        transform:  visible ? "none" : "translateY(28px)",
        transition: `opacity 0.65s ease ${delay}s, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
      } : undefined}
    >
      {children}
    </div>
  );
}

export function BigTextScroll({ text, speed = 28, bg }: { text: string; speed?: number; bg?: string }) {
  const bgColor = bg ?? C.light;
  const isDark  = bgColor === C.bg;
  const color   = isDark ? "rgba(242,237,230,0.15)" : "rgba(26,20,16,0.10)";
  const shadow  = isDark
    ? "1px 1px 0 rgba(196,154,74,0.3), 2px 2px 0 rgba(196,154,74,0.2), 3px 3px 0 rgba(196,154,74,0.1), 4px 4px 10px rgba(0,0,0,0.5)"
    : "1px 1px 0 rgba(26,20,16,0.18), 2px 2px 0 rgba(26,20,16,0.10), 3px 3px 6px rgba(0,0,0,0.10)";
  const rep = `${text}   ✦   ${text}   ✦   `;
  return (
    <div style={{ overflow: "hidden", height: "clamp(56px,7vw,100px)", display: "flex", alignItems: "center", userSelect: "none", background: bgColor }}>
      <div className="bts-mk" style={{ "--spd": `${speed}s` } as React.CSSProperties}>
        {[...Array(2)].map((_,i) => (
          <span key={i} style={{ fontSize: "clamp(26px,5vw,76px)", fontWeight: 950, letterSpacing: "-0.01em", color, textTransform: "uppercase", paddingRight: "4vw", lineHeight: 1, textShadow: shadow, WebkitFontSmoothing: "antialiased" } as React.CSSProperties}>
            {rep}
          </span>
        ))}
      </div>
    </div>
  );
}

const TICKER_ITEMS = ["✦ Bambou certifié OEKO-TEX","✦ 3× plus doux que le coton","✦ Thermorégulateur naturel","✦ Livraison offerte dès 60€ en France","✦ Retour sous 14 jours","✦ Antibactérien naturel","✦ Des essentiels bébé. Sans le superflu.","✦ Bodies · Pyjamas · Gigoteuses"];

export function Ticker() {
  const str = TICKER_ITEMS.join("   ");
  return (
    <div style={{ overflow: "hidden", background: C.amber, padding: "11px 0" }}>
      <div className="tk-mk">{[...Array(2)].map((_,i) => <span key={i} style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, color: C.dark, paddingRight: 60, whiteSpace: "nowrap" }}>{str}</span>)}</div>
    </div>
  );
}

export const MILK_STYLES = `
  @keyframes tk-mk  { from{transform:translateX(0)} to{transform:translateX(-50%)} }
  @keyframes bts-mk { from{transform:translateX(0)} to{transform:translateX(-50%)} }
  .tk-mk  { display:flex; animation:tk-mk 32s linear infinite; white-space:nowrap; width:max-content; }
  .bts-mk { display:flex; white-space:nowrap; width:max-content; animation:bts-mk var(--spd,28s) linear infinite; }
`;