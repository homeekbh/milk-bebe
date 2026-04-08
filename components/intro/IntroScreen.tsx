"use client";

import { useEffect, useState } from "react";
import { useIntro } from "@/context/IntroContext";

export default function IntroScreen() {
  const { isOpen, close, markSeen } = useIntro();
  const [phase, setPhase] = useState<"letters" | "drop" | "hold">("letters");

  useEffect(() => {
    if (!isOpen) return;
    setPhase("letters");
    const t1 = setTimeout(() => setPhase("drop"), 700);
    const t2 = setTimeout(() => setPhase("hold"), 1500);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { markSeen(); close(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const dropDone = phase === "drop" || phase === "hold";
  const holdDone = phase === "hold";

  return (
    <>
      <style>{`
        @keyframes milk-letter-in {
          0%   { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes milk-bang-drop {
          0%   { transform: translateY(-200px) scaleY(1.4); opacity: 0; }
          55%  { transform: translateY(18px) scaleY(0.82); opacity: 1; }
          70%  { transform: translateY(-12px) scaleY(1.08); }
          82%  { transform: translateY(8px) scaleY(0.94); }
          91%  { transform: translateY(-4px) scaleY(1.03); }
          100% { transform: translateY(0px) scaleY(1); opacity: 1; }
        }

        @keyframes milk-line {
          0%   { width: 0; opacity: 0; }
          100% { width: 80px; opacity: 1; }
        }

        @keyframes milk-tagline-in {
          0%   { opacity: 0; transform: translateY(10px); }
          100% { opacity: 0.45; transform: translateY(0); }
        }

        @keyframes milk-cta-in {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes milk-cta-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,196,0,0.4); }
          50%       { box-shadow: 0 0 0 12px rgba(245,196,0,0); }
        }

        .milk-m { animation: milk-letter-in 0.45s ease 0.1s both; }
        .milk-l { animation: milk-letter-in 0.45s ease 0.25s both; }
        .milk-k { animation: milk-letter-in 0.45s ease 0.4s both; }

        .milk-bang { opacity: 0; display: inline-block; }
        .milk-bang.drop {
          animation: milk-bang-drop 0.75s cubic-bezier(.22,.61,.36,1) forwards;
        }

        .milk-line {
          height: 2px;
          background: #f5c400;
          border-radius: 2px;
          width: 0;
          opacity: 0;
          margin: 0 auto;
        }
        .milk-line.show {
          animation: milk-line 0.5s ease 0.2s forwards;
        }

        .milk-tagline {
          opacity: 0;
        }
        .milk-tagline.show {
          animation: milk-tagline-in 0.6s ease 0.4s forwards;
        }

        .milk-cta {
          opacity: 0;
        }
        .milk-cta.show {
          animation: milk-cta-in 0.6s ease 0.7s forwards;
        }

        .milk-cta-btn {
          animation: milk-cta-pulse 2s ease 1.5s infinite;
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "#0a0a0a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        {/* ── LOGO ─────────────────────────────────────────────────── */}
        <div style={{
          display: "flex",
          alignItems: "baseline",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: "clamp(120px, 28vw, 240px)",
          fontWeight: 950,
          letterSpacing: -8,
          color: "#ffffff",
          lineHeight: 1,
          userSelect: "none",
        }}>
          <span className="milk-m">M</span>
          <span
            className={`milk-bang${dropDone ? " drop" : ""}`}
            style={{ color: "#ffffff" }}
          >
            !
          </span>
          <span className="milk-l">L</span>
          <span className="milk-k">K</span>
        </div>

        {/* ── LIGNE ────────────────────────────────────────────────── */}
        <div
          className={`milk-line${holdDone ? " show" : ""}`}
          style={{ marginTop: 32, marginBottom: 24 }}
        />

        {/* ── TAGLINE ──────────────────────────────────────────────── */}
        <div
          className={`milk-tagline${holdDone ? " show" : ""}`}
          style={{
            fontSize: "clamp(11px, 1.8vw, 15px)",
            letterSpacing: 5,
            textTransform: "uppercase",
            color: "#fff",
            fontWeight: 600,
            textAlign: "center",
            marginBottom: 56,
          }}
        >
          L'exigence premium pour la peau la plus fragile
        </div>

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <div className={`milk-cta${holdDone ? " show" : ""}`}>
          <button
            className="milk-cta-btn"
            onClick={() => { markSeen(); close(); }}
            style={{
              padding: "20px 48px",
              borderRadius: 16,
              background: "#f5c400",
              color: "#000",
              fontWeight: 900,
              fontSize: "clamp(15px, 2vw, 18px)",
              border: "none",
              cursor: "pointer",
              letterSpacing: 0.5,
              transition: "transform 0.15s ease, background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)";
              (e.currentTarget as HTMLButtonElement).style.background = "#ffd100";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLButtonElement).style.background = "#f5c400";
            }}
          >
            Entrez vous détendre →
          </button>
        </div>

        {/* ── ESC hint ─────────────────────────────────────────────── */}
        <div
          className={`milk-tagline${holdDone ? " show" : ""}`}
          style={{
            position: "absolute",
            bottom: 28,
            fontSize: 12,
            color: "#fff",
            opacity: 0,
            letterSpacing: 2,
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          Échap pour passer
        </div>
      </div>
    </>
  );
}