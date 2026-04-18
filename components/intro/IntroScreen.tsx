"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function IntroScreen() {
  const pathname = usePathname();
  const [show,     setShow]     = useState(false);
  const [phase,    setPhase]    = useState(0);
  // phase 0 = rien
  // phase 1 = M L K s'allument comme une ampoule (flicker)
  // phase 2 = ! tombe d'en haut avec rebond
  // phase 3 = tout visible + tagline
  // phase 4 = fade out

  useEffect(() => {
    const noIntroPages = ["/admin", "/success", "/connexion", "/inscription", "/profil", "/panier"];
    if (noIntroPages.some(p => pathname.startsWith(p))) return;

    const introDone     = sessionStorage.getItem("milk_intro_done");
    const introDonePerm = localStorage.getItem("milk_intro_done");
    if (introDone || introDonePerm) return;

    setShow(true);
    setPhase(1);

    const t2 = setTimeout(() => setPhase(2), 700);   // ! tombe
    const t3 = setTimeout(() => setPhase(3), 1200);  // tagline
    const t4 = setTimeout(() => setPhase(4), 3000);  // fade out start
    const t5 = setTimeout(() => {                    // disparaît
      setShow(false);
      sessionStorage.setItem("milk_intro_done", "true");
    }, 3600);

    return () => { clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [pathname]);

  if (!show) return null;

  // Jaune plus lumineux
  const AMBER = "#f0b429";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "#1a1410",
      display: "flex", alignItems: "center", justifyContent: "center",
      opacity: phase === 4 ? 0 : 1,
      transition: phase === 4 ? "opacity 0.6s ease" : "none",
    }}>
      <style>{`
        /* ── Ampoule flicker pour M L K ── */
        @keyframes flicker-in {
          0%   { opacity: 0; text-shadow: none; }
          10%  { opacity: 0.9; text-shadow: 0 0 40px rgba(240,180,41,0.6); }
          15%  { opacity: 0.3; text-shadow: none; }
          25%  { opacity: 1;   text-shadow: 0 0 60px rgba(240,180,41,0.4), 0 0 120px rgba(240,180,41,0.2); }
          30%  { opacity: 0.6; text-shadow: 0 0 20px rgba(240,180,41,0.3); }
          40%  { opacity: 1;   text-shadow: 0 0 80px rgba(240,180,41,0.35), 0 0 160px rgba(240,180,41,0.15); }
          100% { opacity: 1;   text-shadow: 0 0 40px rgba(240,180,41,0.25); }
        }

        /* ── ! tombe avec rebond ── */
        @keyframes drop-bounce {
          0%   { transform: translateY(-180px) scaleY(0.6); opacity: 0; }
          55%  { transform: translateY(18px)   scaleY(1.1); opacity: 1; }
          70%  { transform: translateY(-10px)  scaleY(0.95); opacity: 1; }
          82%  { transform: translateY(6px)    scaleY(1.04); opacity: 1; }
          91%  { transform: translateY(-3px)   scaleY(0.98); opacity: 1; }
          97%  { transform: translateY(1px)    scaleY(1.01); opacity: 1; }
          100% { transform: translateY(0)      scaleY(1);    opacity: 1; }
        }

        /* ── tagline apparaît ── */
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .mlk-letter {
          display: inline-block;
          color: #f2ede6;
          opacity: 0;
        }
        .mlk-letter.lit {
          animation: flicker-in 0.7s ease forwards;
        }
        .mlk-letter.m  { animation-delay: 0s; }
        .mlk-letter.l  { animation-delay: 0.08s; }
        .mlk-letter.k  { animation-delay: 0.16s; }

        .mlk-bang {
          display: inline-block;
          opacity: 0;
          transform: translateY(-180px);
        }
        .mlk-bang.falling {
          animation: drop-bounce 0.55s cubic-bezier(.22,.61,.36,1) forwards;
        }

        .mlk-tagline {
          opacity: 0;
        }
        .mlk-tagline.visible {
          animation: fade-up 0.5s ease forwards;
        }
      `}</style>

      <div style={{ textAlign: "center" }}>

        {/* Logo */}
        <div style={{
          fontSize: "clamp(64px, 14vw, 140px)",
          fontWeight: 950,
          letterSpacing: -4,
          lineHeight: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 0,
        }}>
          <span className={`mlk-letter m ${phase >= 1 ? "lit" : ""}`}
            style={{ animationDelay: "0s" }}>
            M
          </span>

          {/* ✅ ! tombe d'en haut avec rebond */}
          <span
            className={`mlk-bang ${phase >= 2 ? "falling" : ""}`}
            style={{
              color: AMBER,
              fontSize: "1.25em",
              lineHeight: 1,
              display: "inline-block",
              transform: phase >= 2 ? undefined : "translateY(-180px)",
              // glow ambré une fois posé
              filter: phase >= 3 ? `drop-shadow(0 0 20px ${AMBER}99)` : "none",
              transition: "filter 0.3s ease",
            }}
          >
            !
          </span>

          <span className={`mlk-letter l ${phase >= 1 ? "lit" : ""}`}
            style={{ animationDelay: "0.08s" }}>
            L
          </span>
          <span className={`mlk-letter k ${phase >= 1 ? "lit" : ""}`}
            style={{ animationDelay: "0.16s" }}>
            K
          </span>
        </div>

        {/* Tagline */}
        <div
          className={`mlk-tagline ${phase >= 3 ? "visible" : ""}`}
          style={{
            marginTop: 20,
            fontSize: "clamp(11px, 1.5vw, 15px)",
            fontWeight: 700,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: "rgba(242,237,230,0.45)",
          }}
        >
          Essentiels bébé bambou
        </div>

        {/* Barre de chargement discrète */}
        <div style={{ marginTop: 40, width: 48, height: 2, background: "rgba(242,237,230,0.1)", borderRadius: 99, overflow: "hidden", margin: "36px auto 0" }}>
          <div style={{
            height: "100%",
            background: AMBER,
            borderRadius: 99,
            width: phase >= 3 ? "100%" : phase >= 2 ? "60%" : phase >= 1 ? "30%" : "0%",
            transition: "width 0.6s ease",
          }} />
        </div>
      </div>
    </div>
  );
}