"use client";

import { useIntro } from "@/context/IntroContext";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function IntroScreen() {
  const { isOpen, close, markSeen } = useIntro();
  const path = usePathname();

  // ✅ Désactivée dans l'admin — ferme immédiatement
  useEffect(() => {
    if (path.startsWith("/admin")) {
      close();
    }
  }, [path, close]);

  useEffect(() => {
    if (!isOpen) return;
    if (path.startsWith("/admin")) return;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => { document.body.style.overflow = ""; }, 3500);
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") { markSeen(); close(); }
    };
    window.addEventListener("keydown", handle);
    return () => { clearTimeout(t); window.removeEventListener("keydown", handle); document.body.style.overflow = ""; };
  }, [isOpen, path, close, markSeen]);

  if (!isOpen || path.startsWith("/admin")) return null;

  return (
    <div
      onClick={() => { markSeen(); close(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#1a1410",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        cursor: "pointer",
        animation: "introFade 0.5s ease both",
      }}
    >
      <style>{`
        @keyframes introFade { from { opacity:0 } to { opacity:1 } }
        @keyframes introLogo { from { opacity:0; transform:scale(0.85) } to { opacity:1; transform:scale(1) } }
        @keyframes introSub  { from { opacity:0; transform:translateY(12px) } to { opacity:0.45; transform:translateY(0) } }
      `}</style>

      <div style={{ textAlign: "center", animation: "introLogo 0.9s cubic-bezier(.22,.61,.36,1) 0.2s both" }}>
        <div style={{ fontSize: "clamp(64px, 14vw, 140px)", fontWeight: 950, letterSpacing: -6, color: "#f2ede6", lineHeight: 0.9 }}>
          M!LK
        </div>
        <div style={{ width: 60, height: 3, background: "#c49a4a", borderRadius: 2, margin: "20px auto 0" }} />
        <div style={{ marginTop: 20, fontSize: 14, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", color: "rgba(242,237,230,0.45)", animation: "introSub 1s ease 0.7s both" }}>
          Essentiels bébé bambou
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 40, fontSize: 13, color: "rgba(242,237,230,0.25)", fontWeight: 600, letterSpacing: 1 }}>
        Toucher pour continuer
      </div>
    </div>
  );
}