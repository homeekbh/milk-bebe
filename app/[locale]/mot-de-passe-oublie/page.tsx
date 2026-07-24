"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase-client";

export default function MotDePasseOubliePage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      // redirectTo AVEC préfixe de locale (/fr, /en) : un lien sans locale subit une redirection
      // 307 côté middleware i18n qui casse certaines webviews mail (cf. mémoire projet).
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/${locale}/nouveau-mot-de-passe`,
      });
      // NON-ÉNUMÉRANT : Supabase ne signale PAS si l'email existe. On n'affiche donc JAMAIS
      // « email introuvable » : succès OU email inexistant → même message neutre « sent ».
      // Seul un vrai rate-limit est signalé honnêtement (ne révèle pas l'existence d'un compte).
      if (error && /rate|too many|429/i.test(error.message ?? "")) {
        setError(t("err_rate_limit"));
      } else {
        setSent(true);
      }
    } catch {
      setError(t("forgot_error")); // erreur réseau (message neutre, cf. i18n)
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#1a1410", display: "grid", placeItems: "center", padding: 24, paddingTop: 100 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 32, fontWeight: 950, letterSpacing: -1.5, marginBottom: 6, color: "#f2ede6" }}>M!LK</div>
          <div style={{ fontSize: 15, color: "rgba(242,237,230,0.45)" }}>{t("forgot_title")}</div>
        </div>

        <div style={{ background: "#221c16", borderRadius: 24, border: "1px solid rgba(242,237,230,0.08)", padding: 36, display: "grid", gap: 20 }}>
          {sent ? (
            <>
              <div style={{ textAlign: "center", fontSize: 48 }}>📧</div>
              <div style={{ textAlign: "center", fontWeight: 900, fontSize: 18, color: "#f2ede6" }}>{t("sent_title")}</div>
              <div style={{ textAlign: "center", fontSize: 14, color: "rgba(242,237,230,0.5)", lineHeight: 1.7 }}>
                {t("sent_desc")}
              </div>
              <Link href="/connexion" style={{ padding: "14px", borderRadius: 12, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 15, textDecoration: "none", textAlign: "center", display: "block" }}>
                {t("back_to_login")}
              </Link>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 900, fontSize: 17, color: "#f2ede6" }}>{t("reset_title")}</div>
              <div style={{ fontSize: 14, color: "rgba(242,237,230,0.45)", lineHeight: 1.6 }}>
                {t("reset_desc")}
              </div>
              <form onSubmit={handleReset} style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(242,237,230,0.4)" }}>{t("login_email")}</label>
                  <input
                    type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    required placeholder={t("email_placeholder")}
                    style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(242,237,230,0.12)", background: "rgba(242,237,230,0.05)", color: "#f2ede6", fontSize: 15, outline: "none", width: "100%", boxSizing: "border-box" }}
                  />
                </div>
                {error && (
                  <div style={{ padding: "12px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 13, fontWeight: 700 }}>
                    ❌ {error}
                  </div>
                )}
                <button type="submit" disabled={loading} style={{ padding: "15px", borderRadius: 12, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 15, border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
                  {loading ? t("sending") : t("send_link")}
                </button>
              </form>
              <div style={{ textAlign: "center", fontSize: 14, color: "rgba(242,237,230,0.4)" }}>
                <Link href="/connexion" style={{ color: "#c49a4a", fontWeight: 700, textDecoration: "underline" }}>
                  {t("back_to_login_arrow")}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}