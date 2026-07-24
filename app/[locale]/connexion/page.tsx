"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import PasswordInput from "@/components/PasswordInput";

export default function ConnexionPage() {
  const router = useRouter();
  const t = useTranslations("auth");
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
      setError(t("login_error"));
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
          <div style={{ fontSize: 15, color: "rgba(242,237,230,0.45)" }}>{t("login_title")}</div>
        </div>

        <div style={{ background: "#221c16", borderRadius: 24, border: "1px solid rgba(242,237,230,0.08)", padding: 36, display: "grid", gap: 20 }}>

          <form onSubmit={handleLogin} style={{ display: "grid", gap: 16 }}>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(242,237,230,0.45)" }}>{t("login_email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t("email_placeholder")}
                style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(242,237,230,0.12)", fontSize: 15, outline: "none", width: "100%", boxSizing: "border-box", background: "rgba(242,237,230,0.05)", color: "#f2ede6" }}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(242,237,230,0.45)" }}>{t("login_password")}</label>
                <Link href="/mot-de-passe-oublie" style={{ fontSize: 12, color: "#c49a4a", textDecoration: "underline" }}>
  {t("login_forgot")}
</Link>
              </div>
              <PasswordInput
                value={password}
                onChange={setPassword}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                variant="dark"
                labelShow={t("pwd_show")}
                labelHide={t("pwd_hide")}
                inputStyle={{ padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(242,237,230,0.12)", fontSize: 15, outline: "none", width: "100%", boxSizing: "border-box", background: "rgba(242,237,230,0.05)", color: "#f2ede6" }}
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
              {loading ? t("login_loading") : t("login_btn")}
            </button>
          </form>

          <div style={{ textAlign: "center", fontSize: 14, color: "rgba(242,237,230,0.45)" }}>
            {t("login_no_account")}{" "}
            <Link href="/inscription" style={{ fontWeight: 800, color: "#c49a4a", textDecoration: "underline" }}>
              {t("create_account")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}