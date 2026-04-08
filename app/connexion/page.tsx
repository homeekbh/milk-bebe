"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

export default function ConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
    } else {
      router.push("/profil");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#1a1410", display: "grid", placeItems: "center", padding: 24, paddingTop: 100 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 32, fontWeight: 950, letterSpacing: -1.5, marginBottom: 6, color: "#f2ede6" }}>M!LK</div>
          <div style={{ fontSize: 15, color: "rgba(242,237,230,0.45)" }}>Bon retour parmi nous</div>
        </div>

        <div style={{ background: "#221c16", borderRadius: 24, border: "1px solid rgba(242,237,230,0.08)", padding: 36, display: "grid", gap: 20 }}>

          <form onSubmit={handleLogin} style={{ display: "grid", gap: 16 }}>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(242,237,230,0.45)" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="prenom@email.com"
                style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(242,237,230,0.12)", fontSize: 15, outline: "none", width: "100%", boxSizing: "border-box", background: "rgba(242,237,230,0.05)", color: "#f2ede6" }}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(242,237,230,0.45)" }}>Mot de passe</label>
                <Link href="/mot-de-passe-oublie" style={{ fontSize: 12, color: "#c49a4a", textDecoration: "underline" }}>
  Oublié ?
</Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(242,237,230,0.12)", fontSize: 15, outline: "none", width: "100%", boxSizing: "border-box", background: "rgba(242,237,230,0.05)", color: "#f2ede6" }}
              />
            </div>

            {error && (
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 13, fontWeight: 700 }}>
                ❌ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ padding: "15px", borderRadius: 12, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 15, border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, marginTop: 4 }}
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <div style={{ textAlign: "center", fontSize: 14, color: "rgba(242,237,230,0.45)" }}>
            Pas encore de compte ?{" "}
            <Link href="/inscription" style={{ fontWeight: 800, color: "#c49a4a", textDecoration: "underline" }}>
              Créer un compte
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}