"use client";

import { useEffect, useState, useRef } from "react";
import { useCart } from "@/context/CartContext";
import Link from "next/link";

export default function SuccessPage() {
  const { clearCart } = useCart();
  const [show,    setShow]    = useState(false);
  const cleared = useRef(false);

  useEffect(() => {
    // ✅ clearCart une seule fois — pas au refresh
    if (!cleared.current) {
      clearCart();
      cleared.current = true;
    }
    // ✅ Désactiver l'intro pour cette session
    if (typeof window !== "undefined") {
      sessionStorage.setItem("milk_intro_done", "true");
      localStorage.setItem("milk_intro_done", "true");
    }
    setTimeout(() => setShow(true), 100);
  }, []);

  return (
    <div style={{ background: "#1a1410", minHeight: "100vh", display: "grid", placeItems: "center", padding: "100px 24px 60px" }}>
      <style>{`
        @keyframes pop-in {
          0%   { opacity: 0; transform: scale(0.85) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes confetti {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(80px) rotate(360deg); opacity: 0; }
        }
        .success-card { animation: pop-in 0.5s cubic-bezier(.22,.61,.36,1) forwards; }
        .confetti-dot { animation: confetti 1.2s ease forwards; }
      `}</style>

      <div style={{ maxWidth: 560, width: "100%", textAlign: "center", opacity: show ? 1 : 0, transition: "opacity 0.3s" }}>

        {/* Confettis */}
        <div style={{ position: "relative", height: 60, marginBottom: 8 }}>
          {["#c49a4a", "#f2ede6", "#22c55e", "#c49a4a", "#f2ede6"].map((color, i) => (
            <div key={i} className="confetti-dot" style={{ position: "absolute", left: `${15 + i * 16}%`, width: 10, height: 10, borderRadius: "50%", background: color, animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>

        <div className="success-card" style={{ background: "#221c16", borderRadius: 24, border: "1px solid rgba(196,154,74,0.2)", padding: "48px 40px", marginBottom: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(34,197,94,0.1)", border: "2px solid rgba(34,197,94,0.3)", display: "grid", placeItems: "center", margin: "0 auto 24px" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h1 style={{ margin: "0 0 12px", fontSize: 32, fontWeight: 950, letterSpacing: -1.5, color: "#f2ede6" }}>
            Commande confirmée !
          </h1>

          <p style={{ margin: "0 0 8px", fontSize: 16, color: "rgba(242,237,230,0.55)", lineHeight: 1.7 }}>
            Merci pour ta confiance. Bébé va être chouchouté dans du bambou premium certifié OEKO-TEX.
          </p>
          <p style={{ margin: "0 0 32px", fontSize: 15, color: "rgba(242,237,230,0.4)", lineHeight: 1.7 }}>
            Un email de confirmation a été envoyé. On prépare ton colis avec soin.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
            {[
              { icon: "📦", label: "Préparation", value: "1-2 jours ouvrés" },
              { icon: "🚚", label: "Livraison",   value: "2-4 jours ouvrés" },
            ].map(item => (
              <div key={item.label} style={{ padding: "16px", borderRadius: 14, background: "rgba(242,237,230,0.04)", border: "1px solid rgba(242,237,230,0.06)" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                <div style={{ fontSize: 12, color: "rgba(242,237,230,0.35)", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</div>
                <div style={{ fontSize: 14, color: "#f2ede6", fontWeight: 800 }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: "16px 20px", borderRadius: 14, background: "rgba(196,154,74,0.08)", border: "1px solid rgba(196,154,74,0.15)", marginBottom: 32 }}>
            <div style={{ fontSize: 13, color: "#c49a4a", fontWeight: 700, lineHeight: 1.8 }}>
              Bambou certifié OEKO-TEX · 3× plus doux que le coton<br />
              Thermorégulateur naturel · Antibactérien · Hypoallergénique
            </div>
          </div>

          <Link href="/profil" style={{ display: "block", padding: "16px", borderRadius: 14, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 16, textDecoration: "none", marginBottom: 12 }}>
            Voir mes commandes →
          </Link>
          <Link href="/produits" style={{ display: "block", padding: "14px", borderRadius: 14, border: "1px solid rgba(242,237,230,0.1)", color: "rgba(242,237,230,0.5)", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            Continuer mes achats
          </Link>
        </div>
      </div>
    </div>
  );
}