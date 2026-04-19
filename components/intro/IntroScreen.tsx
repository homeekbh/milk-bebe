"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

// Intro uniquement sur la homepage
const AMBER = "#f7cc38";

export default function IntroScreen() {
  const pathname = usePathname();
  const [show,      setShow]      = useState(false);
  const [ready,     setReady]     = useState(false);
  const [phase,     setPhase]     = useState(0);
  const [exiting,   setExiting]   = useState(false);
  const timers = useRef<NodeJS.Timeout[]>([]);

  function dismiss() {
    timers.current.forEach(clearTimeout);
    setExiting(true);
    setTimeout(() => {
      setShow(false);
      document.getElementById("intro-hide-header")?.remove();
    }, 700);
  }

  useEffect(() => {
    // Seulement sur la homepage
    if (pathname !== "/") { setShow(false); return; }

    // Aucun localStorage / sessionStorage → toujours visible au refresh
    setShow(true);
    setReady(false);
    setPhase(0);
    setExiting(false);

    const style       = document.createElement("style");
    style.id          = "intro-hide-header";
    style.textContent = "header { display: none !important; }";
    document.head.appendChild(style);

    // Léger délai avant de marquer ready (évite flash SSR)
    const t0 = setTimeout(() => setReady(true), 50);

    // Phase 1 : M L K s'allument (0.08s)
    const t1 = setTimeout(() => setPhase(1), 130);
    // Phase 2 : ! tombe et rebondit (0.5s)
    const t2 = setTimeout(() => setPhase(2), 500);
    // Phase 3 : tagline + glow (1.4s)
    const t3 = setTimeout(() => setPhase(3), 1400);
    // Auto-dismiss à 2.1s → fondu M!LK
    const t4 = setTimeout(() => dismiss(),   2100);

    timers.current = [t0, t1, t2, t3, t4];
    return () => {
      timers.current.forEach(clearTimeout);
      document.getElementById("intro-hide-header")?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!show) return null;

  return (
    <div
      onClick={dismiss}
      style={{
        position:   "fixed",
        inset:      0,
        zIndex:     999999,
        background: "#1a1410",
        display:    "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor:     "pointer",
        // Fade-out : fond disparaît
        opacity:    exiting ? 0 : 1,
        transition: exiting ? "opacity 0.65s ease" : "none",
      }}
    >
      {ready && (
        <style>{`
          @keyframes bulb-warmup {
            0%   { opacity: 0;    filter: brightness(0.1);  }
            40%  { opacity: 0.7;  filter: brightness(0.9);  }
            70%  { opacity: 1;    filter: brightness(1.2);  }
            100% { opacity: 1;    filter: brightness(1);    }
          }
          @keyframes drop-bounce {
            0%   { transform: translateY(-300px) scaleY(0.8); opacity: 0; }
            12%  { opacity: 1; }
            48%  { transform: translateY(22px) scaleY(1.04); }
            60%  { transform: translateY(-16px) scaleY(0.97); }
            72%  { transform: translateY(10px) scaleY(1.02); }
            81%  { transform: translateY(-6px) scaleY(0.99); }
            89%  { transform: translateY(3px); }
            94%  { transform: translateY(-2px); }
            100% { transform: translateY(0) scaleY(1); opacity: 1; }
          }
          @keyframes logo-exit {
            from { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); }
            to   { opacity: 0; transform: scale(1.12) translateY(-6px); filter: blur(3px); }
          }
          @keyframes fade-up {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: none; }
          }
          @keyframes progress-bar {
            from { width: 0%; }
            to   { width: 100%; }
          }
        `}</style>
      )}

      {/* Logo M!LK */}
      {ready && (
        <div
          style={{
            display:    "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            lineHeight: 1,
            marginBottom: 24,
            gap: 0,
            // Sortie : logo scale + blur + fade
            animation: exiting
              ? "logo-exit 0.65s ease forwards"
              : undefined,
          }}
        >
          {/* M */}
          <span style={{
            fontSize:   "clamp(64px, 14vw, 144px)",
            fontWeight: 950,
            color:      "#f2ede6",
            letterSpacing: -3,
            lineHeight: 1,
            display:    "inline-block",
            opacity:    phase >= 1 ? undefined : 0,
            animation:  phase >= 1 ? "bulb-warmup 0.6s ease forwards 0s" : "none",
          }}>M</span>

          {/* ! */}
          <span style={{
            fontSize:   "clamp(82px, 17.5vw, 178px)",
            fontWeight: 950,
            color:      AMBER,
            lineHeight: 1,
            display:    "inline-block",
            letterSpacing: 0,
            opacity:    phase >= 2 ? undefined : 0,
            animation:  phase >= 2
              ? "drop-bounce 0.75s cubic-bezier(0.22,0.61,0.36,1) forwards"
              : "none",
            textShadow: phase >= 3
              ? `0 0 18px ${AMBER}99, 0 0 40px ${AMBER}55, 0 0 70px ${AMBER}33`
              : "none",
            transition: "text-shadow 0.5s ease",
          }}>!</span>

          {/* L */}
          <span style={{
            fontSize:   "clamp(64px, 14vw, 144px)",
            fontWeight: 950,
            color:      "#f2ede6",
            letterSpacing: -3,
            lineHeight: 1,
            display:    "inline-block",
            opacity:    phase >= 1 ? undefined : 0,
            animation:  phase >= 1 ? "bulb-warmup 0.6s ease forwards 0.08s" : "none",
          }}>L</span>

          {/* K */}
          <span style={{
            fontSize:   "clamp(64px, 14vw, 144px)",
            fontWeight: 950,
            color:      "#f2ede6",
            letterSpacing: -4,
            lineHeight: 1,
            display:    "inline-block",
            opacity:    phase >= 1 ? undefined : 0,
            animation:  phase >= 1 ? "bulb-warmup 0.6s ease forwards 0.16s" : "none",
          }}>K</span>
        </div>
      )}

      {/* Tagline */}
      {ready && (
        <div style={{
          fontSize:       "clamp(11px, 1.4vw, 13px)",
          fontWeight:     700,
          letterSpacing:  5,
          textTransform:  "uppercase",
          color:          "rgba(242,237,230,0.38)",
          opacity:        phase >= 3 ? undefined : 0,
          animation:      phase >= 3 ? "fade-up 0.4s ease forwards" : "none",
        }}>
          Essentiels bébé bambou
        </div>
      )}

      {/* Barre de progression */}
      {ready && !exiting && (
        <div style={{
          position:   "absolute",
          bottom:     0,
          left:       0,
          height:     2,
          background: AMBER,
          opacity:    0.3,
          animation:  "progress-bar 2.1s linear forwards",
        }} />
      )}
    </div>
  );
}