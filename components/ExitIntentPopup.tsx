"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function ExitIntentPopup() {
  const [show, setShow]       = useState(false);
  const [email, setEmail]     = useState("");
  const [sent, setSent]       = useState(false);
  const [closed, setClosed]   = useState(false);
  const pathname              = usePathname();

  useEffect(() => {
    if (closed) return;
    if (pathname.startsWith("/admin") || pathname.startsWith("/connexion") || pathname.startsWith("/success")) return;
    if (typeof window === "undefined") return;
    // Pas réafficher si déjà vu dans les 7 derniers jours
    const lastSeen = localStorage.getItem("exit_intent_seen");
    if (lastSeen && Date.now() - Number(lastSeen) < 7 * 86400 * 1000) return;

    function handleMouseLeave(e: MouseEvent) {
      if (e.clientY <= 10) { setShow(true); }
    }
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [pathname, closed]);

  function handleClose() {
    setShow(false);
    setClosed(true);
    localStorage.setItem("exit_intent_seen", String(Date.now()));
  }

  async function handleSubmit() {
    if (!email.includes("@")) return;
    await fetch("/api/newsletter/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "exit_intent" }),
    }).catch(() => {});
    setSent(true);
    localStorage.setItem("exit_intent_seen", String(Date.now()));
    setTimeout(handleClose, 2500);
  }

  if (!show) return null;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(26,20,16,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#f2ede6", borderRadius: 24, padding: "40px 36px", maxWidth: 420, width: "100%", textAlign: "center", position: "relative", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
        <button onClick={handleClose} aria-label="Fermer"
          style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: 99, background: "rgba(26,20,16,0.08)", border: "none", cursor: "pointer", fontSize: 16, fontWeight: 900, color: "#1a1410" }}>✕</button>

        {sent ? (
          <div>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 22, fontWeight: 950, color: "#1a1410", marginBottom: 8 }}>C'est dans la boîte !</div>
            <div style={{ fontSize: 15, color: "rgba(26,20,16,0.6)" }}>Ton code -10% arrive dans ta boîte mail.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎁</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>
              Avant de partir...
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: 15, color: "rgba(26,20,16,0.6)", lineHeight: 1.6 }}>
              Reçois <strong>-10% sur ta première commande</strong> et nos conseils bambou pour bébé.
            </p>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="ton@email.fr"
              type="email"
              style={{ width: "100%", padding: "14px 18px", borderRadius: 12, border: "2px solid rgba(26,20,16,0.12)", fontSize: 16, background: "#fff", marginBottom: 12, boxSizing: "border-box" }} />
            <button onClick={handleSubmit}
              style={{ width: "100%", padding: "15px", borderRadius: 12, background: "#1a1410", color: "#c49a4a", fontWeight: 900, fontSize: 16, border: "none", cursor: "pointer" }}>
              Recevoir mon -10% →
            </button>
            <button onClick={handleClose}
              style={{ marginTop: 12, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "rgba(26,20,16,0.4)", textDecoration: "underline" }}>
              Non merci, je préfère payer plein tarif
            </button>
          </>
        )}
      </div>
    </div>
  );
}