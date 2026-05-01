"use client";
import React, { useEffect, useRef, useState } from "react";


export const C = {
  bg:    "#2d1a0e",
  amber: "#c49a4a",
  taupe: "#c4ae94",
  light: "#d8c8b0",
  warm:  "#f2ede6",
  muted: "rgba(242,237,230,0.55)",
  faint: "rgba(242,237,230,0.08)",
  dark:  "#1a1410",
};

// ── Hauteur identique à la homepage (16px au lieu de 32) ──
export function Divider({ from, to }: { from: string; to: string }) {
  return <div style={{ height: 16, background: `linear-gradient(to bottom, ${from}, ${to})`, flexShrink: 0 }} />;
}

export function useBiReveal(threshold = 0.15) {
  const ref   = useRef<HTMLDivElement>(null);
  const prevY = useRef(0);
  const [state, setState] = useState<{ visible: boolean; dir: "up"|"down" }>({ visible: false, dir: "down" });
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      const curY = e.boundingClientRect.top;
      const dir  = curY < prevY.current ? "up" : "down";
      prevY.current = curY;
      setState(e.isIntersecting ? { visible: true, dir } : { visible: false, dir });
    }, { threshold });
    obs.observe(el); return () => obs.disconnect();
  }, [threshold]);
  return { ref, ...state };
}

export function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible, dir } = useBiReveal();
  const offY = dir === "up" ? "-28px" : "28px";
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : `translateY(${offY})`, transition: `opacity 0.65s ease ${delay}s, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}s` }}>
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

const TICKER_ITEMS = ["✦ Bambou certifié OEKO-TEX","✦ 3× plus doux que le coton","✦ Thermorégulateur naturel","✦ Livraison offerte dès 60€","✦ Retour gratuit 15 jours","✦ Antibactérien naturel","✦ Des essentiels bébé. Sans le superflu.","✦ Bodies · Pyjamas · Gigoteuses"];

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