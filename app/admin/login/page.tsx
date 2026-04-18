"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams }               from "next/navigation";
import { supabase }                      from "@/lib/supabase-client";

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const redirect     = searchParams.get("redirect") ?? "/admin";

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // Si déjà connecté admin → redirection directe
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.access_token) return;
      const res  = await fetch("/api/auth/check-admin", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ access_token: session.access_token }),
      });
      const data = await res.json();
      if (data.is_admin) window.location.href = redirect;
    });
  }, [redirect]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1. Connexion Supabase
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.user || !data.session) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    // 2. Vérifier is_admin via API serveur
    const res    = await fetch("/api/auth/check-admin", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ access_token: data.session.access_token }),
    });
    const result = await res.json();

    if (!result.is_admin) {
      await supabase.auth.signOut();
      setError("Accès non autorisé. Ce compte n'est pas administrateur.");
      setLoading(false);
      return;
    }

    // 3. ✅ Rechargement complet pour que le middleware prenne le cookie
    window.location.href = redirect;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#1a1410", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-block", background: "#c49a4a", borderRadius: 16, padding: "14px 32px", marginBottom: 16 }}>
            <span style={{ color: "#1a1410", fontWeight: 950, fontSize: 26, letterSpacing: -1 }}>
              M
              <span style={{ fontSize: 32, display: "inline-block", transform: "translateY(-4px)", lineHeight: 1 }}>!</span>
              LK
            </span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(242,237,230,0.35)", fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
            Accès administration
          </div>
        </div>

        {/* Formulaire */}
        <div style={{ background: "#221c16", borderRadius: 24, border: "1px solid rgba(242,237,230,0.08)", padding: "36px 32px" }}>
          <form onSubmit={handleLogin} style={{ display: "grid", gap: 20 }}>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(242,237,230,0.45)" }}>
                Email admin
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="admin@milkbebe.fr"
                style={{
                  padding: "14px 16px", borderRadius: 12,
                  border: "1px solid rgba(242,237,230,0.12)",
                  fontSize: 15, outline: "none",
                  background: "rgba(242,237,230,0.05)",
                  color: "#f2ede6", fontWeight: 600,
                  width: "100%", boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(242,237,230,0.45)" }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  padding: "14px 16px", borderRadius: 12,
                  border: "1px solid rgba(242,237,230,0.12)",
                  fontSize: 15, outline: "none",
                  background: "rgba(242,237,230,0.05)",
                  color: "#f2ede6", fontWeight: 600,
                  width: "100%", boxSizing: "border-box",
                }}
              />
            </div>

            {error && (
              <div style={{ padding: "13px 16px", borderRadius: 12, background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.25)", color: "#fca5a5", fontSize: 14, fontWeight: 700, lineHeight: 1.5 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "16px",
                borderRadius: 12,
                background: loading ? "rgba(196,154,74,0.35)" : "#c49a4a",
                color: "#1a1410",
                fontWeight: 900,
                fontSize: 16,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: 4,
                transition: "all 0.2s",
                letterSpacing: 0.3,
              }}
            >
              {loading ? "Connexion en cours..." : "Accéder à l'admin →"}
            </button>

          </form>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(242,237,230,0.06)", textAlign: "center" }}>
            <a href="/" style={{ fontSize: 13, color: "rgba(242,237,230,0.3)", textDecoration: "none", fontWeight: 600 }}>
              ← Retour au site
            </a>
          </div>
        </div>

        <div style={{ marginTop: 24, textAlign: "center", fontSize: 11, color: "rgba(242,237,230,0.18)", lineHeight: 1.8 }}>
          Accès réservé aux administrateurs M!LK.<br />
          Si tu n'es pas admin,{" "}
          <a href="/" style={{ color: "rgba(242,237,230,0.3)", textDecoration: "underline" }}>
            retourne au site
          </a>.
        </div>

      </div>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#1a1410", display: "grid", placeItems: "center" }}>
        <div style={{ color: "rgba(242,237,230,0.3)", fontSize: 16 }}>Chargement...</div>
      </div>
    }>
      <AdminLoginContent />
    </Suspense>
  );
}