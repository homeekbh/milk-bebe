"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

const ADMIN_EMAILS = ["home.ekbh@gmail.com", "erika.koztandi@gmail.com"];

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const redirect     = searchParams.get("redirect") ?? "/admin";

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [checking, setChecking] = useState(true);
  const [error,    setError]    = useState("");

  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setChecking(false); return; }

        const sessionEmail = session.user.email ?? "";
        if (ADMIN_EMAILS.includes(sessionEmail)) {
          window.location.href = redirect;
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .single();

        if (profile?.is_admin) {
          window.location.href = redirect;
        } else {
          setChecking(false);
        }
      } catch {
        setChecking(false);
      }
    }
    checkSession();
  }, [redirect]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError || !data.user) {
        setError("Email ou mot de passe incorrect.");
        setLoading(false);
        return;
      }

      const userEmail = data.user.email ?? "";

      if (ADMIN_EMAILS.includes(userEmail)) {
        window.location.href = redirect;
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", data.user.id)
        .single();

      if (profile?.is_admin) {
        window.location.href = redirect;
      } else {
        await supabase.auth.signOut();
        setError("Accès non autorisé.");
        setLoading(false);
      }
    } catch {
      setError("Erreur de connexion.");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", background: "#1a1410", display: "grid", placeItems: "center" }}>
        <div style={{ color: "#c49a4a", fontSize: 16, fontWeight: 700 }}>Vérification session...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#1a1410", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-block", background: "#c49a4a", borderRadius: 16, padding: "14px 32px", marginBottom: 16 }}>
            <span style={{ color: "#1a1410", fontWeight: 950, fontSize: 26 }}>
              M<span style={{ fontSize: 32, display: "inline-block", transform: "translateY(-4px)" }}>!</span>LK
            </span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(242,237,230,0.35)", fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
            Accès administration
          </div>
        </div>

        <div style={{ background: "#221c16", borderRadius: 24, border: "1px solid rgba(242,237,230,0.08)", padding: "36px 32px" }}>
          <form onSubmit={handleLogin} style={{ display: "grid", gap: 20 }}>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(242,237,230,0.45)" }}>
                Email admin
              </label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                required autoComplete="email"
                placeholder="home.ekbh@gmail.com"
                style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(242,237,230,0.12)", fontSize: 15, outline: "none", background: "rgba(242,237,230,0.05)", color: "#f2ede6", fontWeight: 600, width: "100%", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(242,237,230,0.45)" }}>
                Mot de passe
              </label>
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                required autoComplete="current-password"
                placeholder="••••••••"
                style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(242,237,230,0.12)", fontSize: 15, outline: "none", background: "rgba(242,237,230,0.05)", color: "#f2ede6", fontWeight: 600, width: "100%", boxSizing: "border-box" }}
              />
            </div>

            {error && (
              <div style={{ padding: "13px 16px", borderRadius: 12, background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.25)", color: "#fca5a5", fontSize: 14, fontWeight: 700 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ padding: "16px", borderRadius: 12, background: loading ? "rgba(196,154,74,0.35)" : "#c49a4a", color: "#1a1410", fontWeight: 900, fontSize: 16, border: "none", cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Connexion..." : "Accéder à l'admin →"}
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(242,237,230,0.06)", textAlign: "center" }}>
            <a href="/" style={{ fontSize: 13, color: "rgba(242,237,230,0.3)", textDecoration: "none" }}>
              ← Retour au site
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#1a1410", display: "grid", placeItems: "center" }}>
        <div style={{ color: "#c49a4a" }}>Chargement...</div>
      </div>
    }>
      <AdminLoginContent />
    </Suspense>
  );
}