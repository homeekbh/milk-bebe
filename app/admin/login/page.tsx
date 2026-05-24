"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

// ── Emails admin depuis variables d'environnement Vercel ──
// Ajouter NEXT_PUBLIC_ADMIN_EMAIL_1 et NEXT_PUBLIC_ADMIN_EMAIL_2 dans Vercel
function getAdminEmails(): string[] {
  return [
    process.env.NEXT_PUBLIC_ADMIN_EMAIL_1,
    process.env.NEXT_PUBLIC_ADMIN_EMAIL_2,
  ].filter(Boolean) as string[];
}

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const redirect     = searchParams.get("redirect") ?? "/admin";

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [checking, setChecking] = useState(true);
  const [error,    setError]    = useState("");

  useEffect(() => {
    // ⚠️ Source de vérité = profiles.is_admin en BDD.
    // L'env NEXT_PUBLIC_ADMIN_EMAIL_* est une whitelist additionnelle, JAMAIS
    // un raccourci. Sinon : un user dont l'email match l'env mais avec
    // is_admin=false provoque une boucle (login redirect → /admin → layout
    // kick out → /admin/login → login redirect → ...).
    //
    // 🛡 Try/catch/finally OBLIGATOIRE : si supabase.from() ou signOut()
    // throw (réseau, RLS, etc.), une promise rejection non catchée gèlerait
    // checking=true → spinner "Vérification..." infini. Le finally garantit
    // que le formulaire finit toujours par s'afficher.
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return; // finally → setChecking(false)

        const adminEmails = getAdminEmails();
        const emailWhitelistOk = adminEmails.length === 0
          || adminEmails.includes(session.user.email ?? "");
        if (!emailWhitelistOk) {
          await supabase.auth.signOut().catch(() => {});
          return;
        }

        const { data: profile } = await supabase
          .from("profiles").select("is_admin").eq("id", session.user.id).single();

        if (profile?.is_admin) {
          // window.location.href = hard reload, le finally du current scope
          // sera exécuté avant la nav (peu importe puisqu'on quitte la page).
          window.location.href = redirect;
          return;
        }

        await supabase.auth.signOut().catch(() => {});
      } catch (e) {
        // RLS, réseau, etc. — on dégrade en affichant le formulaire
        if (process.env.NODE_ENV !== "production") console.warn("[admin/login] auth probe error:", e);
      } finally {
        setChecking(false);
      }
    })();
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

      // Vérifier is_admin en BDD (source de vérité)
      const { data: profile } = await supabase
        .from("profiles").select("is_admin").eq("id", data.user.id).single();

      if (!profile?.is_admin) {
        await supabase.auth.signOut().catch(() => {});
        setError("Accès non autorisé.");
        setLoading(false);
        return;
      }

      // Petit délai (500ms) AVANT le hard reload pour laisser le SDK
      // Supabase finir d'écrire la session dans localStorage et émettre
      // ses events. Sans ce délai, certaines races (notamment le 1er
      // login après expiration) peuvent envoyer la prochaine page avec
      // un state SDK pas encore stabilisé.
      await new Promise(r => setTimeout(r, 500));
      window.location.href = redirect;
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.warn("[admin/login] handleLogin error:", e);
      setError("Erreur de connexion. Réessaie dans un instant.");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", background: "#1a1410", display: "grid", placeItems: "center" }}>
        <div style={{ color: "#c49a4a", fontSize: 16, fontWeight: 700 }}>Vérification...</div>
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
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="votre@email.com"
                style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(242,237,230,0.12)", fontSize: 15, outline: "none", background: "rgba(242,237,230,0.05)", color: "#f2ede6", fontWeight: 600, width: "100%", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(242,237,230,0.45)" }}>
                Mot de passe
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(242,237,230,0.12)", fontSize: 15, outline: "none", background: "rgba(242,237,230,0.05)", color: "#f2ede6", fontWeight: 600, width: "100%", boxSizing: "border-box" }} />
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
            <a href="/" style={{ fontSize: 13, color: "rgba(242,237,230,0.3)", textDecoration: "none" }}>← Retour au site</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#1a1410" }} />}>
      <AdminLoginContent />
    </Suspense>
  );
}