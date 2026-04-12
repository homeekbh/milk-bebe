"use client";

import { useState, useEffect } from "react";

export default function PopupBienvenue() {
  const [visible,  setVisible]  = useState(false);
  const [email,    setEmail]    = useState("");
  const [sending,  setSending]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [popup,    setPopup]    = useState<any>(null);

  useEffect(() => {
    // Ne pas afficher si déjà vu
    if (typeof window !== "undefined" && localStorage.getItem("milk_popup_seen")) return;

    // Charger le popup actif depuis l'API
    fetch("/api/popups/active")
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setPopup(data);
          // Apparaît après 4 secondes
          const t = setTimeout(() => setVisible(true), 4000);
          return () => clearTimeout(t);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit() {
    if (!email.trim() || !email.includes("@")) return;
    setSending(true);
    try {
      await fetch("/api/newsletter/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          email:      email.trim(),
          source:     "popup",
          promo_code: popup?.promo_code ?? null,
        }),
      });
      setDone(true);
      localStorage.setItem("milk_popup_seen", "1");
      setTimeout(() => setVisible(false), 3000);
    } catch {
      setSending(false);
    }
  }

  function close() {
    setVisible(false);
    localStorage.setItem("milk_popup_seen", "1");
  }

  if (!visible || !popup) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 8888, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div style={{ background: "#1a1410", borderRadius: 24, border: "1px solid rgba(196,154,74,0.25)", padding: "40px 36px", maxWidth: 420, width: "100%", position: "relative", boxShadow: "0 32px 80px rgba(0,0,0,0.5)", animation: "popupIn 0.4s cubic-bezier(.22,1,.36,1) both" }}>
        <style>{`@keyframes popupIn { from { opacity:0; transform:scale(0.9) translateY(20px); } to { opacity:1; transform:none; } }`}</style>

        {/* Fermer */}
        <button onClick={close} style={{ position: "absolute", top: 16, right: 16, background: "rgba(242,237,230,0.1)", border: "none", borderRadius: 8, cursor: "pointer", color: "rgba(242,237,230,0.5)", fontSize: 18, width: 32, height: 32, display: "grid", placeItems: "center" }}>✕</button>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "inline-block", background: "#c49a4a", borderRadius: 12, padding: "10px 20px" }}>
            <span style={{ color: "#1a1410", fontWeight: 950, fontSize: 22, letterSpacing: -1 }}>M!LK</span>
          </div>
        </div>

        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎁</div>
            <div style={{ fontSize: 20, fontWeight: 950, color: "#f2ede6", marginBottom: 10 }}>C'est noté !</div>
            {popup.promo_code && (
              <div style={{ padding: "12px 20px", borderRadius: 12, background: "#c49a4a", display: "inline-block", fontFamily: "monospace", fontWeight: 900, fontSize: 20, color: "#1a1410", letterSpacing: 2, marginBottom: 12 }}>
                {popup.promo_code}
              </div>
            )}
            <div style={{ fontSize: 14, color: "rgba(242,237,230,0.55)", lineHeight: 1.7 }}>
              {popup.promo_code ? "Ton code promo a été envoyé par email." : "Bienvenue dans la famille M!LK !"}
            </div>
          </div>
        ) : (
          <>
            <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 950, color: "#f2ede6", textAlign: "center", letterSpacing: -0.5, lineHeight: 1.2 }}>
              {popup.title}
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: 15, color: "rgba(242,237,230,0.55)", lineHeight: 1.7, textAlign: "center" }}>
              {popup.message}
            </p>

            {popup.promo_code && (
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ display: "inline-block", padding: "8px 18px", borderRadius: 8, background: "rgba(196,154,74,0.15)", border: "1px dashed rgba(196,154,74,0.4)", fontFamily: "monospace", fontWeight: 900, fontSize: 18, color: "#c49a4a", letterSpacing: 2 }}>
                  {popup.promo_code}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: "rgba(242,237,230,0.35)" }}>Code envoyé par email à l'inscription</div>
              </div>
            )}

            <div style={{ display: "grid", gap: 10 }}>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="votre@email.com"
                style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(242,237,230,0.15)", background: "rgba(242,237,230,0.07)", color: "#f2ede6", fontSize: 15, fontWeight: 600, outline: "none", width: "100%", boxSizing: "border-box" }}
              />
              <button onClick={handleSubmit} disabled={sending || !email.includes("@")}
                style={{ padding: "14px", borderRadius: 12, background: "#c49a4a", color: "#1a1410", fontWeight: 900, fontSize: 16, border: "none", cursor: "pointer", opacity: sending || !email.includes("@") ? 0.6 : 1 }}>
                {sending ? "..." : popup.promo_code ? "Recevoir mon code →" : "Je m'inscris →"}
              </button>
            </div>

            <div style={{ marginTop: 14, fontSize: 11, color: "rgba(242,237,230,0.25)", textAlign: "center", lineHeight: 1.6 }}>
              Pas de spam. Désabonnement en un clic. Conformément au RGPD.
            </div>
          </>
        )}
      </div>
    </div>
  );
}