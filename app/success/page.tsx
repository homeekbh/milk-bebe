"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import Link from "next/link";

export default function SuccessPage() {
  const { clearCart } = useCart();
  const [show, setShow] = useState(false);

  useEffect(() => {
    clearCart();
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
            <div key={i} className="confetti-dot" style={{
              position: "absolute", left: `${15 + i * 16}%`,
              width: 10, height: 10, borderRadius: "50%",
              background: color, animationDelay: `${i * 0.12}s`,
            }} />
          ))}
        </div>

        {/* Card principale */}
        <div className="success-card" style={{ background: "#221c16", borderRadius: 24, border: "1px solid rgba(196,154,74,0.2)", padding: "48px 40px", marginBottom: 20 }}>

          {/* Icône succès */}
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(34,197,94,0.1)", border: "2px solid rgba(34,197,94,0.3)", display: "grid", placeItems: "center", margin: "0 auto 24px" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h1 style={{ margin: "0 0 12px", fontSize: 32, fontWeight: 950, letterSpacing: -1.5, color: "#f2ede6" }}>
            Commande confirmée !
          </h1>

          <p style={{ margin: "0 0 8px", fontSize: 16, color: "rgba(242,237,230,0.55)", lineHeight: 1.7 }}>
            Merci pour ta confiance 🌿 Ton bébé va être chouchouté dans du bambou premium certifié OEKO-TEX.
          </p>

          <p style={{ margin: "0 0 32px", fontSize: 14, color: "rgba(242,237,230,0.35)", lineHeight: 1.7 }}>
            Un email de confirmation va t'être envoyé. Ton colis sera expédié sous 1 à 2 jours ouvrés.
          </p>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 36 }}>
            {[
              { icon: "📦", label: "Préparation", value: "1-2 jours" },
              { icon: "🚚", label: "Livraison", value: "2-4 jours" },
              { icon: "↩️", label: "Retours", value: "30 jours" },
            ].map(k => (
              <div key={k.label} style={{ padding: "14px 10px", borderRadius: 14, background: "rgba(242,237,230,0.04)", border: "1px solid rgba(242,237,230,0.06)" }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</div>
                <div style={{ fontSize: 11, color: "rgba(242,237,230,0.35)", fontWeight: 700, marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 13, color: "#f2ede6", fontWeight: 900 }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: "grid", gap: 12 }}>
            <Link href="/profil" style={{ display: "block", padding: "14px", borderRadius: 12, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 15, textDecoration: "none" }}>
              Voir mes commandes →
            </Link>
            <Link href="/produits" style={{ display: "block", padding: "14px", borderRadius: 12, border: "1px solid rgba(242,237,230,0.12)", color: "rgba(242,237,230,0.6)", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
              Continuer mes achats
            </Link>
          </div>
        </div>

        {/* Partage social */}
        <div style={{ padding: "20px 24px", borderRadius: 16, background: "rgba(196,154,74,0.06)", border: "1px solid rgba(196,154,74,0.12)" }}>
          <div style={{ fontSize: 13, color: "rgba(242,237,230,0.45)", marginBottom: 12 }}>
            Tu aimes M!LK ? Parle-en autour de toi 💛
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <a href="https://instagram.com/milk_bebe" target="_blank" rel="noopener noreferrer"
              style={{ padding: "9px 20px", borderRadius: 10, background: "rgba(242,237,230,0.08)", color: "rgba(242,237,230,0.6)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              Instagram
            </a>
            <a href="https://facebook.com/milkbebe" target="_blank" rel="noopener noreferrer"
              style={{ padding: "9px 20px", borderRadius: 10, background: "rgba(242,237,230,0.08)", color: "rgba(242,237,230,0.6)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              Facebook
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}