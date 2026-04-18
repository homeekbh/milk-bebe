"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

export default function IntroScreen() {
  const pathname = usePathname();
  const [show,   setShow]   = useState(false);
  const [phase,  setPhase]  = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const timers = useRef<any[]>([]);

  // phase 0 = caché
  // phase 1 = M L K allument (flicker ampoule)
  // phase 2 = ! tombe lentement avec rebond
  // phase 3 = tagline + bouton apparaissent

  function dismiss() {
    setFadeOut(true);
    setTimeout(() => {
      setShow(false);
      // Retire le CSS qui cache le header
      const s = document.getElementById("intro-hide-header");
      if (s) s.remove();
      sessionStorage.setItem("milk_intro_done", "true");
    }, 700);
  }

  useEffect(() => {
    const noIntroPages = ["/admin", "/success", "/connexion", "/inscription", "/profil", "/panier"];
    if (noIntroPages.some(p => pathname.startsWith(p))) return;
    if (sessionStorage.getItem("milk_intro_done")) return;
    if (localStorage.getItem("milk_intro_done"))   return;

    // ✅ Injecte CSS pour cacher le header pendant l'intro
    const style = document.createElement("style");
    style.id      = "intro-hide-header";
    style.textContent = "header { display: none !important; }";
    document.head.appendChild(style);

    setShow(true);
    setPhase(0);

    const t1 = setTimeout(() => setPhase(1), 80);    // M L K commencent à flickerer
    const t2 = setTimeout(() => setPhase(2), 1000);  // ! commence à tomber
    const t3 = setTimeout(() => setPhase(3), 3400);  // tagline + bouton
    const t4 = setTimeout(() => dismiss(),   10000); // auto-dismiss après 10s

    timers.current = [t1, t2, t3, t4];
    return () => {
      timers.current.forEach(clearTimeout);
      const s = document.getElementById("intro-hide-header");
      if (s) s.remove();
    };
  }, [pathname]);

  if (!show) return null;

  const AMBER = "#f5c030"; // Jaune lumineux

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999999,
      background: "#1a1410",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      opacity: fadeOut ? 0 : 1,
      transition: fadeOut ? "opacity 0.7s ease" : "none",
    }}>
      <style>{`
        /* ── Ampoule flicker pour M L K ── */
        @keyframes bulb-on {
          0%   { opacity: 0;   text-shadow: none; }
          7%   { opacity: 0.9; text-shadow: 0 0 80px rgba(245,192,48,0.9), 0 0 160px rgba(245,192,48,0.4); }
          13%  { opacity: 0.1; text-shadow: none; }
          22%  { opacity: 1;   text-shadow: 0 0 100px rgba(245,192,48,0.7), 0 0 200px rgba(245,192,48,0.3); }
          28%  { opacity: 0.4; text-shadow: none; }
          38%  { opacity: 1;   text-shadow: 0 0 80px rgba(245,192,48,0.5); }
          44%  { opacity: 0.8; }
          55%  { opacity: 1;   text-shadow: 0 0 60px rgba(245,192,48,0.4); }
          70%  { opacity: 1;   text-shadow: 0 0 40px rgba(245,192,48,0.3); }
          100% { opacity: 1;   text-shadow: 0 0 30px rgba(245,192,48,0.15); }
        }

        /* ── ! tombe lentement avec rebond très visible ── */
        @keyframes drop-bounce {
          0%   { transform: translateY(-420px); opacity: 0; }
          12%  { opacity: 1; }
          50%  { transform: translateY(32px);   opacity: 1; }
          62%  { transform: translateY(-26px);  }
          72%  { transform: translateY(18px);   }
          80%  { transform: translateY(-12px);  }
          87%  { transform: translateY(8px);    }
          92%  { transform: translateY(-5px);   }
          96%  { transform: translateY(3px);    }
          99%  { transform: translateY(-1px);   }
          100% { transform: translateY(0);      }
        }

        /* ── tagline et bouton ── */
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Bouton pulse ── */
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,192,48,0.5); }
          50%      { box-shadow: 0 0 0 12px rgba(245,192,48,0); }
        }
      `}</style>

      {/* ── Logo animé ── */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",  // ✅ Aligne les bases au bas = même niveau
        justifyContent: "center",
        gap: 0,
        lineHeight: 1,
        marginBottom: 32,
      }}>
        {/* M */}
        <span style={{
          fontSize: "clamp(72px, 16vw, 160px)",
          fontWeight: 950,
          color: "#f2ede6",
          letterSpacing: -4,
          lineHeight: 1,
          display: "inline-block",
          opacity: phase >= 1 ? undefined : 0,
          animation: phase >= 1 ? "bulb-on 1.1s ease forwards" : "none",
          animationDelay: "0s",
        }}>M</span>

        {/* ✅ ! — même niveau que les lettres, plus grand, tombe lentement */}
        <span style={{
          fontSize: "clamp(90px, 20vw, 200px)", // Plus grand que les lettres
          fontWeight: 950,
          color: AMBER,
          letterSpacing: 0,
          lineHeight: 1,
          display: "inline-block",
          opacity: phase >= 2 ? undefined : 0,
          animation: phase >= 2 ? "drop-bounce 2.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards" : "none",
          filter: phase >= 3 ? `drop-shadow(0 0 24px ${AMBER}cc)` : "none",
          transition: "filter 0.4s ease",
          marginBottom: "0.06em", // ✅ Légère correction pour aligner à la baseline des autres
        }}>!</span>

        {/* L */}
        <span style={{
          fontSize: "clamp(72px, 16vw, 160px)",
          fontWeight: 950,
          color: "#f2ede6",
          letterSpacing: -4,
          lineHeight: 1,
          display: "inline-block",
          opacity: phase >= 1 ? undefined : 0,
          animation: phase >= 1 ? "bulb-on 1.1s ease forwards" : "none",
          animationDelay: "0.1s",
        }}>L</span>

        {/* K */}
        <span style={{
          fontSize: "clamp(72px, 16vw, 160px)",
          fontWeight: 950,
          color: "#f2ede6",
          letterSpacing: -4,
          lineHeight: 1,
          display: "inline-block",
          opacity: phase >= 1 ? undefined : 0,
          animation: phase >= 1 ? "bulb-on 1.1s ease forwards" : "none",
          animationDelay: "0.2s",
        }}>K</span>
      </div>

      {/* ── Tagline ── */}
      <div style={{
        fontSize: "clamp(12px, 1.6vw, 16px)",
        fontWeight: 700,
        letterSpacing: 5,
        textTransform: "uppercase",
        color: "rgba(242,237,230,0.4)",
        opacity: phase >= 3 ? undefined : 0,
        animation: phase >= 3 ? "fade-up 0.6s ease forwards" : "none",
        marginBottom: 60,
      }}>
        Essentiels bébé bambou
      </div>

      {/* ✅ Bouton "Entrez vous détendre" en jaune tout en bas */}
      <div style={{
        position: "absolute",
        bottom: 48,
        left: "50%",
        transform: "translateX(-50%)",
        opacity: phase >= 3 ? undefined : 0,
        animation: phase >= 3 ? "fade-up 0.6s ease 0.2s forwards" : "none",
        animationFillMode: "both",
      }}>
        <button
          onClick={dismiss}
          style={{
            padding: "16px 40px",
            borderRadius: 99,
            background: "transparent",
            border: `2px solid ${AMBER}`,
            color: AMBER,
            fontWeight: 900,
            fontSize: "clamp(14px, 1.8vw, 17px)",
            letterSpacing: 1.5,
            cursor: "pointer",
            animation: "pulse-glow 2s ease infinite",
            whiteSpace: "nowrap",
          }}
        >
          Entrez vous détendre →
        </button>
      </div>

      {/* Barre de progression discrète */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        height: 2,
        background: AMBER,
        opacity: 0.3,
        width: phase >= 3 ? "100%" : phase >= 2 ? "60%" : phase >= 1 ? "25%" : "0%",
        transition: "width 1.2s ease",
      }} />
    </div>
  );
}