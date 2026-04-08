"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-client";

export default function MotDePasseOubliePage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nouveau-mot-de-passe`,
    });
    if (error) { setError("Email introuvable ou erreur."); setLoading(false); return; }
    setSent(true);
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#1a1410", display: "grid", placeItems: "center", padding: 24, paddingTop: 100 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 32, fontWeight: 950, letterSpacing: -1.5, marginBottom: 6, color: "#f2ede6" }}>M!LK</div>
          <div style={{ fontSize: 15, color: "rgba(242,237,230,0.45)" }}>Mot de passe oublié</div>
        </div>

        <div style={{ background: "#221c16", borderRadius: 24, border: "1px solid rgba(242,237,230,0.08)", padding: 36, display: "grid", gap: 20 }}>
          {sent ? (
            <>
              <div style={{ textAlign: "center", fontSize: 48 }}>📧</div>
              <div style={{ textAlign: "center", fontWeight: 900, fontSize: 18, color: "#f2ede6" }}>Email envoyé !</div>
              <div style={{ textAlign: "center", fontSize: 14, color: "rgba(242,237,230,0.5)", lineHeight: 1.7 }}>
                Vérifie ta boîte mail et clique sur le lien pour réinitialiser ton mot de passe. Le lien est valable 1 heure.
              </div>
              <Link href="/connexion" style={{ padding: "14px", borderRadius: 12, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 15, textDecoration: "none", textAlign: "center", display: "block" }}>
                Retour à la connexion
              </Link>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 900, fontSize: 17, color: "#f2ede6" }}>Réinitialiser le mot de passe</div>
              <div style={{ fontSize: 14, color: "rgba(242,237,230,0.45)", lineHeight: 1.6 }}>
                Entre ton adresse email — on t'envoie un lien pour créer un nouveau mot de passe.
              </div>
              <form onSubmit={handleReset} style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(242,237,230,0.4)" }}>Email</label>
                  <input
                    type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    required placeholder="ton@email.com"
                    style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(242,237,230,0.12)", background: "rgba(242,237,230,0.05)", color: "#f2ede6", fontSize: 15, outline: "none", width: "100%", boxSizing: "border-box" }}
                  />
                </div>
                {error && (
                  <div style={{ padding: "12px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 13, fontWeight: 700 }}>
                    ❌ {error}
                  </div>
                )}
                <button type="submit" disabled={loading} style={{ padding: "15px", borderRadius: 12, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 15, border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
                  {loading ? "Envoi en cours..." : "Envoyer le lien →"}
                </button>
              </form>
              <div style={{ textAlign: "center", fontSize: 14, color: "rgba(242,237,230,0.4)" }}>
                <Link href="/connexion" style={{ color: "#c49a4a", fontWeight: 700, textDecoration: "underline" }}>
                  ← Retour à la connexion
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}