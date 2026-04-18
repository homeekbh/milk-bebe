"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function IntroScreen() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // ✅ Ne jamais afficher sur ces pages
    const noIntroPages = ["/admin", "/success", "/connexion", "/inscription", "/profil", "/panier"];
    if (noIntroPages.some(p => pathname.startsWith(p))) return;

    // ✅ Vérifier si déjà vu dans cette session OU si vient d'une commande
    const introDone    = sessionStorage.getItem("milk_intro_done");
    const introDonePerm = localStorage.getItem("milk_intro_done");

    if (introDone || introDonePerm) return;

    setShow(true);

    const t = setTimeout(() => {
      setShow(false);
      sessionStorage.setItem("milk_intro_done", "true");
    }, 3200);

    return () => clearTimeout(t);
  }, [pathname]);

  if (!show) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#1a1410", display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.5s ease" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "clamp(48px, 12vw, 120px)", fontWeight: 950, letterSpacing: -4, color: "#f2ede6", lineHeight: 1 }}>
          M<span style={{ color: "#c49a4a", fontSize: "1.2em" }}>!</span>LK
        </div>
        <div style={{ marginTop: 16, fontSize: 14, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", color: "rgba(242,237,230,0.4)" }}>
          Essentiels bébé bambou
        </div>
      </div>
    </div>
  );
}