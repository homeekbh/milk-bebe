"use client";

import { useEffect, useState, useRef } from "react";
import { useCart } from "@/context/CartContext";
import Link from "next/link";

export default function SuccessPage() {
  const { clearCart } = useCart();
  const [show, setShow] = useState(false);
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
      localStorage.setItem("milk_intro_done",   "true");
    }
    setTimeout(() => setShow(true), 100);
  }, [clearCart]);

  return (
    <div style={{ background: "#1a1410", minHeight: "100vh", display: "grid", placeItems: "center", padding: "100px 24px 60px" }}>
      <div style={{ maxWidth: 560, width: "100%", textAlign: "center", opacity: show ? 1 : 0, transition: "opacity 0.3s" }}>

        <div style={{ background: "#221c16", borderRadius: 24, border: "1px solid rgba(196,154,74,0.2)", padding: "52px 44px", marginBottom: 20 }}>
          <div style={{ width: 84, height: 84, borderRadius: "50%", background: "rgba(34,197,94,0.1)", border: "2px solid rgba(34,197,94,0.3)", display: "grid", placeItems: "center", margin: "0 auto 28px" }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h1 style={{ margin: "0 0 14px", fontSize: "clamp(28px, 5vw, 38px)", fontWeight: 950, letterSpacing: -1.5, color: "#f2ede6" }}>
            Commande confirmée !
          </h1>

          <p style={{ margin: "0 0 10px", fontSize: 17, color: "rgba(242,237,230,0.55)", lineHeight: 1.75 }}>
            Merci pour ta confiance. Bébé va être chouchouté dans du bambou premium certifié OEKO-TEX.
          </p>
          <p style={{ margin: "0 0 36px", fontSize: 16, color: "rgba(242,237,230,0.4)", lineHeight: 1.75 }}>
            Un email de confirmation a été envoyé. On prépare ton colis avec soin.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 36 }}>
            {[
              { label: "Préparation", value: "1-2 jours ouvrés" },
              { label: "Livraison",   value: "2-4 jours ouvrés" },
            ].map(item => (
              <div key={item.label} style={{ padding: "18px", borderRadius: 14, background: "rgba(242,237,230,0.04)", border: "1px solid rgba(242,237,230,0.06)" }}>
                <div style={{ fontSize: 13, color: "rgba(242,237,230,0.35)", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</div>
                <div style={{ fontSize: 16, color: "#f2ede6", fontWeight: 800 }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* ✅ Lien profil simple — pas de commandes séparées */}
          <Link href="/profil" style={{ display: "block", padding: "17px", borderRadius: 14, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 17, textDecoration: "none", marginBottom: 12 }}>
            Voir mes commandes →
          </Link>
          <Link href="/produits" style={{ display: "block", padding: "15px", borderRadius: 14, border: "1px solid rgba(242,237,230,0.1)", color: "rgba(242,237,230,0.5)", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
            Continuer mes achats
          </Link>
        </div>
      </div>
    </div>
  );
}