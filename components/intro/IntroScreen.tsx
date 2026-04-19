"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

const NO_INTRO = ["/admin", "/success", "/connexion", "/inscription", "/profil", "/panier"];
const AMBER    = "#f7cc38";

export default function IntroScreen() {
  const pathname = usePathname();
  const [show,    setShow]    = useState(true);
  const [ready,   setReady]   = useState(false);
  const [phase,   setPhase]   = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const timers = useRef<NodeJS.Timeout[]>([]);

  function dismiss() {
    timers.current.forEach(clearTimeout);
    setFadeOut(true);
    setTimeout(() => {
      setShow(false);
      document.getElementById("intro-hide-header")?.remove();
      sessionStorage.setItem("milk_intro_done", "true");
    }, 600);
  }

  useEffect(() => {
    if (
      NO_INTRO.some(p => pathname.startsWith(p)) ||
      sessionStorage.getItem("milk_intro_done")  ||
      localStorage.getItem("milk_intro_done")
    ) {
      setShow(false);
      return;
    }

    const style       = document.createElement("style");
    style.id          = "intro-hide-header";
    style.textContent = "header { display: none !important; }";
    document.head.appendChild(style);

    setReady(true);

    // ✅ Durée réduite : auto-dismiss à 6.5s
    const t1 = setTimeout(() => setPhase(1), 80);    // M L K s'allument
    const t2 = setTimeout(() => setPhase(2), 900);   // ! tombe
    const t3 = setTimeout(() => setPhase(3), 2400);  // tagline
    const t4 = setTimeout(() => dismiss(),   6500);  // auto-dismiss

    timers.current = [t1, t2, t3, t4];
    return () => {
      timers.current.forEach(clearTimeout);
      document.getElementById("intro-hide-header")?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999999,
      background: "#1a1410",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      opacity: fadeOut ? 0 : 1,
      transition: fadeOut ? "opacity 0.6s ease" : "none",
    }}>

      {ready && (
        <style>{`
          @keyframes bulb-warmup {
            0%   { opacity: 0;    filter: brightness(0.15); text-shadow: none; }
            30%  { opacity: 0.55; filter: brightness(0.6);  text-shadow: 0 0 50px rgba(255,235,180,0.2); }
            60%  { opacity: 0.9;  filter: brightness(1.1);  text-shadow: 0 0 90px rgba(255,235,180,0.38); }
            78%  { opacity: 1;    filter: brightness(1.25); text-shadow: 0 0 110px rgba(255,235,180,0.48); }
            100% { opacity: 1;    filter: brightness(1);    text-shadow: 0 0 50px rgba(255,235,180,0.16); }
          }
          @keyframes drop-bounce {
            0%   { transform: translateY(-360px); opacity: 0; }
            14%  { opacity: 1; }
            50%  { transform: translateY(26px); }
            62%  { transform: translateY(-20px); }
            72%  { transform: translateY(13px); }
            80%  { transform: translateY(-8px); }
            87%  { transform: translateY(5px); }
            92%  { transform: translateY(-3px); }
            96%  { transform: translateY(2px); }
            100% { transform: translateY(0); opacity: 1; }
          }
          @keyframes fade-up {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      )}

      {ready && (
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", lineHeight: 1, marginBottom: 28, gap: 0 }}>
          <span style={{ fontSize: "clamp(64px, 14vw, 144px)", fontWeight: 950, color: "#f2ede6", letterSpacing: -3, lineHeight: 1, display: "inline-block", opacity: phase >= 1 ? undefined : 0, animation: phase >= 1 ? "bulb-warmup 1.3s ease forwards 0s" : "none" }}>M</span>
          <span style={{ fontSize: "clamp(82px, 17.5vw, 178px)", fontWeight: 950, color: AMBER, lineHeight: 1, display: "inline-block", letterSpacing: 0, opacity: phase >= 2 ? undefined : 0, animation: phase >= 2 ? "drop-bounce 1.4s cubic-bezier(0.22,0.61,0.36,1) forwards" : "none", textShadow: phase >= 3 ? `0 0 12px ${AMBER}88, 0 0 28px ${AMBER}55, 0 0 55px ${AMBER}33` : "none", transition: "text-shadow 0.6s ease" }}>!</span>
          <span style={{ fontSize: "clamp(64px, 14vw, 144px)", fontWeight: 950, color: "#f2ede6", letterSpacing: -3, lineHeight: 1, display: "inline-block", opacity: phase >= 1 ? undefined : 0, animation: phase >= 1 ? "bulb-warmup 1.3s ease forwards 0.1s" : "none" }}>L</span>
          <span style={{ fontSize: "clamp(64px, 14vw, 144px)", fontWeight: 950, color: "#f2ede6", letterSpacing: -4, lineHeight: 1, display: "inline-block", opacity: phase >= 1 ? undefined : 0, animation: phase >= 1 ? "bulb-warmup 1.3s ease forwards 0.2s" : "none" }}>K</span>
        </div>
      )}

      {ready && (
        <div style={{ fontSize: "clamp(11px, 1.4vw, 14px)", fontWeight: 600, letterSpacing: 5, textTransform: "uppercase", color: "rgba(242,237,230,0.38)", opacity: phase >= 3 ? undefined : 0, animation: phase >= 3 ? "fade-up 0.5s ease forwards" : "none" }}>
          Essentiels bébé bambou
        </div>
      )}

      {/* ✅ Barre de progression uniquement — pas de bouton */}
      {ready && (
        <div style={{ position: "absolute", bottom: 0, left: 0, height: 2, background: AMBER, opacity: 0.22, width: phase >= 3 ? "100%" : phase >= 2 ? "55%" : phase >= 1 ? "20%" : "0%", transition: "width 1.2s ease" }} />
      )}
    </div>
  );
}