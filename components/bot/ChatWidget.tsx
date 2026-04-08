"use client";

import { useState, useEffect } from "react";
import ChatWindow from "./ChatWindow";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  // Petit pulse d'attention après 8 secondes
  useEffect(() => {
    const t = setTimeout(() => setPulse(true), 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @keyframes widget-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(196,154,74,0.5); }
          70%  { box-shadow: 0 0 0 12px rgba(196,154,74,0); }
          100% { box-shadow: 0 0 0 0 rgba(196,154,74,0); }
        }
        @keyframes widget-bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-4px); }
        }
        .chat-btn-pulse { animation: widget-pulse 2s ease 3; }
        .chat-btn-bounce { animation: widget-bounce 0.5s ease; }
      `}</style>

      {open && <ChatWindow onClose={() => setOpen(false)} />}

      <button
        type="button"
        onClick={() => { setOpen(v => !v); setPulse(false); }}
        className={pulse && !open ? "chat-btn-pulse" : ""}
        aria-label="Ouvrir l'assistant M!LK"
        style={{
          position: "fixed", right: 20, bottom: 20, zIndex: 9990,
          width: 56, height: 56, borderRadius: 999,
          background: open ? "#2d2419" : "#1a1410",
          border: "1px solid rgba(196,154,74,0.3)",
          cursor: "pointer", transition: "all 0.2s ease",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#c49a4a"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(196,154,74,0.3)"; }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 6 6 18M6 6l12 12" stroke="#f2ede6" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 950, color: "#f2ede6", letterSpacing: -0.5, lineHeight: 1 }}>M!</span>
        )}
      </button>
    </>
  );
}