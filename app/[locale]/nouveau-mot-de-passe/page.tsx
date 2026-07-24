"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import PasswordInput from "@/components/PasswordInput";

export default function NouveauMotDePassePage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");
  const [success,         setSuccess]         = useState(false);
  const [ready,           setReady]           = useState(false);

  // Supabase envoie le token via le hash de l'URL — on attend qu'il soit prêt
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError(t("err_pwd_short"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("err_pwd_mismatch"));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(t("newpwd_update_error"));
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/connexion"), 3000);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#1a1410", display: "grid", placeItems: "center", padding: 24, paddingTop: 100 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 32, fontWeight: 950, letterSpacing: -1.5, marginBottom: 6, color: "#f2ede6" }}>M!LK</div>
          <div style={{ fontSize: 15, color: "rgba(242,237,230,0.45)" }}>{t("newpwd_title")}</div>
        </div>

        <div style={{ background: "#221c16", borderRadius: 24, border: "1px solid rgba(242,237,230,0.08)", padding: 36, display: "grid", gap: 20 }}>

          {success ? (
            <>
              <div style={{ textAlign: "center", fontSize: 48 }}>✅</div>
              <div style={{ textAlign: "center", fontWeight: 900, fontSize: 20, color: "#f2ede6" }}>
                {t("newpwd_updated")}
              </div>
              <div style={{ textAlign: "center", fontSize: 14, color: "rgba(242,237,230,0.45)", lineHeight: 1.7 }}>
                {t("newpwd_redirect")}
              </div>
              <div style={{ height: 4, background: "rgba(242,237,230,0.08)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "#c49a4a", borderRadius: 99, animation: "progress 3s linear forwards" }} />
              </div>
              <style>{`@keyframes progress { from { width: 0% } to { width: 100% } }`}</style>
            </>

          ) : !ready ? (
            <>
              <div style={{ textAlign: "center", fontSize: 48 }}>⏳</div>
              <div style={{ textAlign: "center", fontWeight: 900, fontSize: 18, color: "#f2ede6" }}>
                {t("newpwd_checking")}
              </div>
              <div style={{ textAlign: "center", fontSize: 14, color: "rgba(242,237,230,0.45)", lineHeight: 1.7 }}>
                {t("newpwd_expired")}{" "}
                <span
                  onClick={() => router.push("/mot-de-passe-oublie")}
                  style={{ color: "#c49a4a", cursor: "pointer", textDecoration: "underline" }}
                >
                  {t("newpwd_request_new")}
                </span>
              </div>
            </>

          ) : (
            <>
              <div style={{ fontWeight: 900, fontSize: 18, color: "#f2ede6" }}>
                {t("newpwd_choose")}
              </div>

              <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(242,237,230,0.4)" }}>
                    {t("newpwd_label")}
                  </label>
                  <PasswordInput
                    value={password} onChange={setPassword}
                    required autoComplete="new-password" placeholder={t("ph_password")}
                    variant="dark" labelShow={t("pwd_show")} labelHide={t("pwd_hide")}
                    inputStyle={{ padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(242,237,230,0.12)", background: "rgba(242,237,230,0.05)", color: "#f2ede6", fontSize: 15, outline: "none", width: "100%", boxSizing: "border-box" }}
                  />
                  {/* Indicateur de force */}
                  {password.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{
                          flex: 1, height: 3, borderRadius: 99,
                          background: password.length >= i * 3
                            ? i <= 1 ? "#ef4444" : i <= 2 ? "#f59e0b" : i <= 3 ? "#22c55e" : "#16a34a"
                            : "rgba(242,237,230,0.1)",
                          transition: "background 0.2s",
                        }} />
                      ))}
                    </div>
                  )}
                  {password.length > 0 && (
                    <div style={{ fontSize: 11, color: "rgba(242,237,230,0.35)" }}>
                      {password.length < 4 ? t("str_short") : password.length < 7 ? t("str_weak") : password.length < 10 ? t("str_ok") : t("str_strong")}
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(242,237,230,0.4)" }}>
                    {t("f_confirm")}
                  </label>
                  <PasswordInput
                    value={confirmPassword} onChange={setConfirmPassword}
                    required autoComplete="new-password" placeholder="••••••••"
                    variant="dark" labelShow={t("pwd_show")} labelHide={t("pwd_hide")}
                    inputStyle={{ padding: "12px 14px", borderRadius: 10, border: `1px solid ${confirmPassword && confirmPassword !== password ? "rgba(239,68,68,0.4)" : "rgba(242,237,230,0.12)"}`, background: "rgba(242,237,230,0.05)", color: "#f2ede6", fontSize: 15, outline: "none", width: "100%", boxSizing: "border-box" }}
                  />
                  {confirmPassword && confirmPassword !== password && (
                    <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700 }}>
                      ❌ {t("pwd_mismatch_short")}
                    </div>
                  )}
                  {confirmPassword && confirmPassword === password && (
                    <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>
                      ✅ {t("pwd_match")}
                    </div>
                  )}
                </div>

                {error && (
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 13, fontWeight: 700 }}>
                    ❌ {error}
                  </div>
                )}

                <button
                  type="submit" disabled={loading || password !== confirmPassword || password.length < 8}
                  style={{ padding: "15px", borderRadius: 12, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 15, border: "none", cursor: (loading || password !== confirmPassword || password.length < 8) ? "not-allowed" : "pointer", opacity: (loading || password !== confirmPassword || password.length < 8) ? 0.5 : 1, transition: "opacity 0.2s" }}
                >
                  {loading ? t("updating") : t("save_newpwd")}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}