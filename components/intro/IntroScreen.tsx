"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

const NO_INTRO = ["/admin", "/success", "/connexion", "/inscription", "/profil", "/panier"];
const AMBER    = "#f7cc38";        // Jaune légèrement plus clair
const BEIGE    = "rgba(228,205,148,0.55)"; // Beige chaud pour le bouton

export default function IntroScreen() {
  const pathname = usePathname();

  // ✅ Démarre à TRUE → overlay sombre immédiat dès le 1er rendu → plus de flash
  const [show,    setShow]    = useState(true);
  const [ready,   setReady]   = useState(false); // animation active
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
    }, 700);
  }

  useEffect(() => {
    // ✅ Pas d'intro sur ces pages → masque immédiatement (overlay déjà sombre → invisible)
    if (
      NO_INTRO.some(p => pathname.startsWith(p)) ||
      sessionStorage.getItem("milk_intro_done")  ||
      localStorage.getItem("milk_intro_done")
    ) {
      setShow(false);
      return;
    }

    // ✅ Cache le header pendant toute la durée de l'intro
    const style = document.createElement("style");
    style.id = "intro-hide-header";
    style.textContent = "header { display: none !important; }";
    document.head.appendChild(style);

    // Lance les phases
    setReady(true);
    const t1 = setTimeout(() => setPhase(1), 100);   // M L K s'allument
    const t2 = setTimeout(() => setPhase(2), 1050);  // ! tombe
    const t3 = setTimeout(() => setPhase(3), 2800);  // tagline + bouton
    const t4 = setTimeout(() => dismiss(),   11000); // auto-dismiss (+1s)

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
      transition: fadeOut ? "opacity 0.7s ease" : "none",
    }}>

      {/* ── CSS animations ── */}
      {ready && (
        <style>{`
          /* ✅ Ampoule qui monte en intensité — aucun clignotement */
          @keyframes bulb-warmup {
            0%   { opacity: 0;   filter: brightness(0.15); text-shadow: none; }
            30%  { opacity: 0.55; filter: brightness(0.6);  text-shadow: 0 0 50px rgba(255,235,180,0.25); }
            60%  { opacity: 0.9; filter: brightness(1.1);  text-shadow: 0 0 90px rgba(255,235,180,0.45), 0 0 180px rgba(255,210,100,0.2); }
            78%  { opacity: 1;   filter: brightness(1.3);  text-shadow: 0 0 110px rgba(255,235,180,0.6), 0 0 220px rgba(255,210,100,0.25); }
            90%  { opacity: 1;   filter: brightness(1.1);  text-shadow: 0 0 80px rgba(255,235,180,0.4); }
            100% { opacity: 1;   filter: brightness(1);    text-shadow: 0 0 50px rgba(255,235,180,0.2); }
          }

          /* ✅ ! tombe avec rebond bien visible — 1.5s (pas trop lent) */
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

          @keyframes blink-border {
            0%, 100% { border-color: rgba(228,205,148,0.25); }
            50%      { border-color: rgba(228,205,148,0.5); }
          }
        `}</style>
      )}

      {/* ── Logo animé ── */}
      {ready && (
        <div style={{
          display: "flex",
          alignItems: "flex-end",  // ✅ Base des lettres alignée en bas
          justifyContent: "center",
          lineHeight: 1,
          marginBottom: 30,
          gap: 0,
        }}>

          {/* M */}
          <span style={{
            fontSize: "clamp(64px, 14vw, 144px)",
            fontWeight: 950,
            color: "#f2ede6",
            letterSpacing: -3,
            lineHeight: 1,
            display: "inline-block",
            opacity: phase >= 1 ? undefined : 0,
            animation: phase >= 1 ? "bulb-warmup 1.4s ease forwards 0s" : "none",
          }}>M</span>

          {/* ✅ ! — plus grand que les lettres, dot aligné en bas, tige dépasse en haut */}
          <span style={{
            fontSize: "clamp(82px, 17.5vw, 178px)", // ≈ 1.25× les lettres
            fontWeight: 950,
            color: AMBER,
            lineHeight: 1,
            display: "inline-block",
            letterSpacing: 0,
            opacity: phase >= 2 ? undefined : 0,
            animation: phase >= 2 ? "drop-bounce 1.5s cubic-bezier(0.22,0.61,0.36,1) forwards" : "none",
            // ✅ Halo arrondi via text-shadow (pas filter: drop-shadow rectangulaire)
            textShadow: phase >= 3
              ? `0 0 18px ${AMBER}ff, 0 0 36px ${AMBER}dd, 0 0 70px ${AMBER}99, 0 0 120px ${AMBER}55, 0 0 180px ${AMBER}22`
              : "none",
            transition: "text-shadow 0.5s ease",
          }}>!</span>

          {/* L */}
          <span style={{
            fontSize: "clamp(64px, 14vw, 144px)",
            fontWeight: 950,
            color: "#f2ede6",
            letterSpacing: -3,
            lineHeight: 1,
            display: "inline-block",
            opacity: phase >= 1 ? undefined : 0,
            animation: phase >= 1 ? "bulb-warmup 1.4s ease forwards 0.1s" : "none",
          }}>L</span>

          {/* K */}
          <span style={{
            fontSize: "clamp(64px, 14vw, 144px)",
            fontWeight: 950,
            color: "#f2ede6",
            letterSpacing: -4,
            lineHeight: 1,
            display: "inline-block",
            opacity: phase >= 1 ? undefined : 0,
            animation: phase >= 1 ? "bulb-warmup 1.4s ease forwards 0.2s" : "none",
          }}>K</span>
        </div>
      )}

      {/* ── Tagline ── */}
      {ready && (
        <div style={{
          fontSize: "clamp(11px, 1.4vw, 14px)",
          fontWeight: 600,
          letterSpacing: 5,
          textTransform: "uppercase",
          color: "rgba(242,237,230,0.38)",
          opacity: phase >= 3 ? undefined : 0,
          animation: phase >= 3 ? "fade-up 0.55s ease forwards" : "none",
        }}>
          Essentiels bébé bambou
        </div>
      )}

      {/* ✅ Bouton — beige discret, petit, centré en bas de page */}
      {ready && (
        <div style={{
          position: "absolute",
          bottom: 40,
          left: 0, right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: phase >= 3 ? undefined : 0,
          animation: phase >= 3 ? "fade-up 0.55s ease 0.25s forwards" : "none",
          animationFillMode: "both",
        }}>
          <button
            onClick={dismiss}
            style={{
              padding: "10px 28px",
              borderRadius: 99,
              background: "transparent",
              border: "1px solid rgba(228,205,148,0.3)",
              color: BEIGE,
              fontWeight: 600,
              fontSize: "clamp(10px, 1.2vw, 13px)",
              letterSpacing: 2.5,
              textTransform: "uppercase",
              cursor: "pointer",
              animation: "blink-border 3s ease infinite",
              whiteSpace: "nowrap",
            }}
          >
            Entrez vous détendre
          </button>
        </div>
      )}

      {/* Barre de progression */}
      {ready && (
        <div style={{
          position: "absolute",
          bottom: 0, left: 0,
          height: 2,
          background: AMBER,
          opacity: 0.22,
          width: phase >= 3 ? "100%" : phase >= 2 ? "55%" : phase >= 1 ? "20%" : "0%",
          transition: "width 1.3s ease",
        }} />
      )}
    </div>
  );
}