"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

const COMMENT_CONNU = [
  "Instagram", "Bouche à oreille", "Google", "Facebook",
  "Un ami / famille", "Blog ou article", "Autre",
];

// Mappe les messages d'erreur Supabase Auth vers une CLÉ de traduction (auth.*).
function authErrorKey(msg?: string | null): string {
  const m = String(msg ?? "").toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered")) return "err_email_taken";
  if (m.includes("invalid login credentials")) return "login_error";
  if (m.includes("email not confirmed")) return "err_email_not_confirmed";
  if (m.includes("password") && (m.includes("at least") || m.includes("should be") || m.includes("weak"))) return "err_pwd_short";
  if (m.includes("invalid email") || m.includes("unable to validate email")) return "err_invalid_email";
  if (m.includes("rate limit") || m.includes("too many")) return "err_rate_limit";
  return "err_generic";
}

function Field({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(242,237,230,0.45)" }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  padding: "12px 14px", borderRadius: 10,
  border: "1px solid rgba(242,237,230,0.12)",
  fontSize: 15, outline: "none",
  width: "100%", boxSizing: "border-box" as const,
  background: "rgba(242,237,230,0.05)",
  color: "#f2ede6",
};

const selectStyle = {
  ...inputStyle,
  appearance: "none" as const,
};

export default function InscriptionPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    email: "", password: "", confirmPassword: "",
    prenom: "", nom: "", telephone: "",
    adresse_livraison: "", ville: "", code_postal: "", pays: "France",
    adresse_diff: false,
    adresse_livraison_alt: "", ville_alt: "", code_postal_alt: "",
    instagram: "", facebook: "", comment_connu: "",
    newsletter: true,
  });

  function set(key: string, val: any) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function createAccount() {
    if (form.password !== form.confirmPassword) {
      setError(t("err_pwd_mismatch"));
      return false;
    }
    if (form.password.length < 8) {
      setError(t("err_pwd_short"));
      return false;
    }

    setLoading(true);
    setError("");

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { prenom: form.prenom, nom: form.nom },
      },
    });

    if (signUpError || !data.user) {
      setError(t(authErrorKey(signUpError?.message)));
      setLoading(false);
      return false;
    }

    await supabase.from("profiles").insert([{
      id: data.user.id,
      email: form.email,
      prenom: form.prenom,
      nom: form.nom,
      telephone: form.telephone,
      adresse_livraison: form.adresse_livraison,
      ville: form.ville,
      code_postal: form.code_postal,
      pays: form.pays,
      adresse_livraison_alt: form.adresse_diff ? form.adresse_livraison_alt : null,
      ville_alt: form.adresse_diff ? form.ville_alt : null,
      code_postal_alt: form.adresse_diff ? form.code_postal_alt : null,
      instagram: form.instagram || null,
      facebook: form.facebook || null,
      comment_connu: form.comment_connu || null,
      newsletter: true, // opt-in systématique (plus de case à décocher)
    }]);

    // Email de bienvenue — fire-and-forget. N'attend pas la réponse pour
    // ne pas bloquer la redirection vers /profil. Si échoue (Resend down,
    // rate limit), on continue normalement.
    fetch("/api/emails/welcome", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: form.email, prenom: form.prenom }),
    }).catch(() => {});

    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step < 3) { setStep(s => s + 1); return; }
    const ok = await createAccount();
    if (ok) router.push("/profil?welcome=1");
  }

  async function handleSkip() {
    const ok = await createAccount();
    if (ok) router.push("/profil?welcome=1");
  }

  const stepLabels = [t("register_step1"), t("register_step2"), t("register_step3")];

  return (
    <div style={{ minHeight: "100vh", background: "#1a1410", padding: "100px 24px 60px", display: "grid", placeItems: "start center" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 950, letterSpacing: -1.5, marginBottom: 6, color: "#f2ede6" }}>M!LK</div>
          <div style={{ fontSize: 15, color: "rgba(242,237,230,0.45)" }}>{t("register_title")}</div>
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
          {stepLabels.map((label, i) => {
            const n = i + 1;
            const active = n === step;
            const done = n < step;
            return (
              <div key={label} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: done ? "#16a34a" : active ? "#c49a4a" : "rgba(242,237,230,0.1)",
                    color: done || active ? "#fff" : "rgba(242,237,230,0.3)",
                    display: "grid", placeItems: "center",
                    fontWeight: 900, fontSize: 14, flexShrink: 0,
                  }}>
                    {done ? "✓" : n}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: active ? 800 : 500, color: active ? "#f2ede6" : "rgba(242,237,230,0.35)" }}>
                    {label}
                  </span>
                </div>
                {i < 2 && (
                  <div style={{ flex: 1, height: 2, background: done ? "#16a34a" : "rgba(242,237,230,0.1)", margin: "0 12px" }} />
                )}
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ background: "#221c16", borderRadius: 24, border: "1px solid rgba(242,237,230,0.08)", padding: 36, display: "grid", gap: 20 }}>

            {/* ── ÉTAPE 1 : COMPTE ── */}
            {step === 1 && (
              <>
                <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4, color: "#f2ede6" }}>
                  {t("step1_title")}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field label={t("f_firstname")} required>
                    <input type="text" value={form.prenom} onChange={(e) => set("prenom", e.target.value)} required placeholder="Marie" style={inputStyle} />
                  </Field>
                  <Field label={t("f_lastname")} required>
                    <input type="text" value={form.nom} onChange={(e) => set("nom", e.target.value)} required placeholder="Dupont" style={inputStyle} />
                  </Field>
                </div>

                <Field label={t("login_email")} required>
                  <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required placeholder="marie@email.com" style={inputStyle} />
                </Field>

                <Field label={t("f_phone")}>
                  <input type="tel" value={form.telephone} onChange={(e) => set("telephone", e.target.value)} placeholder="+33 6 00 00 00 00" style={inputStyle} />
                </Field>

                <Field label={t("f_password")} required>
                  <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required placeholder={t("ph_password")} style={inputStyle} />
                </Field>

                <Field label={t("f_confirm")} required>
                  <input type="password" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} required placeholder="••••••••" style={inputStyle} />
                </Field>

                <div style={{ textAlign: "center", fontSize: 14, color: "rgba(242,237,230,0.45)", marginTop: 4 }}>
                  {t("already_account")}{" "}
                  <Link href="/connexion" style={{ fontWeight: 800, color: "#c49a4a", textDecoration: "underline" }}>
                    {t("login_btn")}
                  </Link>
                </div>
              </>
            )}

            {/* ── ÉTAPE 2 : LIVRAISON ── */}
            {step === 2 && (
              <>
                <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4, color: "#f2ede6" }}>
                  {t("step2_title")}
                </div>

                <Field label={t("f_address")} required>
                  <input type="text" value={form.adresse_livraison} onChange={(e) => set("adresse_livraison", e.target.value)} required placeholder="12 rue des Fleurs" style={inputStyle} />
                </Field>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field label={t("f_postal")} required>
                    <input type="text" value={form.code_postal} onChange={(e) => set("code_postal", e.target.value)} required placeholder="75001" style={inputStyle} />
                  </Field>
                  <Field label={t("f_city")} required>
                    <input type="text" value={form.ville} onChange={(e) => set("ville", e.target.value)} required placeholder="Paris" style={inputStyle} />
                  </Field>
                </div>

                <Field label={t("f_country")}>
                  <select value={form.pays} onChange={(e) => set("pays", e.target.value)} style={selectStyle}>
                    {["France", "Belgique", "Suisse", "Luxembourg", "Monaco"].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </Field>

                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#f2ede6" }}>
                  <input type="checkbox" checked={form.adresse_diff} onChange={(e) => set("adresse_diff", e.target.checked)} style={{ width: 18, height: 18 }} />
                  {t("diff_address")}
                </label>

                {form.adresse_diff && (
                  <div style={{ padding: 20, borderRadius: 14, background: "rgba(242,237,230,0.04)", border: "1px solid rgba(242,237,230,0.08)", display: "grid", gap: 14 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#f2ede6" }}>{t("secondary_address")}</div>
                    <Field label={t("f_address")}>
                      <input type="text" value={form.adresse_livraison_alt} onChange={(e) => set("adresse_livraison_alt", e.target.value)} placeholder={t("ph_alt_address")} style={inputStyle} />
                    </Field>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <Field label={t("f_postal")}>
                        <input type="text" value={form.code_postal_alt} onChange={(e) => set("code_postal_alt", e.target.value)} placeholder="75001" style={inputStyle} />
                      </Field>
                      <Field label={t("f_city")}>
                        <input type="text" value={form.ville_alt} onChange={(e) => set("ville_alt", e.target.value)} placeholder="Paris" style={inputStyle} />
                      </Field>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── ÉTAPE 3 : PROFIL OPTIONNEL ── */}
            {step === 3 && (
              <>
                <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
                  <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 99, background: "rgba(196,154,74,0.15)", border: "1px solid rgba(196,154,74,0.3)", fontSize: 12, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16, color: "#c49a4a" }}>
                    {t("step_optional")}
                  </div>
                  <div style={{ fontWeight: 950, fontSize: 20, letterSpacing: -0.5, marginBottom: 10, color: "#f2ede6" }}>
                    {t("step3_title")}
                  </div>
                  <div style={{ fontSize: 14, color: "rgba(242,237,230,0.45)", lineHeight: 1.7, maxWidth: 380, margin: "0 auto" }}>
                    {t("step3_desc")}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={loading}
                  style={{ padding: "13px", borderRadius: 12, border: "1px dashed rgba(242,237,230,0.2)", background: "transparent", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", color: "rgba(242,237,230,0.55)", opacity: loading ? 0.6 : 1 }}
                >
                  {loading ? t("register_creating") : t("skip_btn")}
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(242,237,230,0.08)" }} />
                  <span style={{ fontSize: 12, color: "rgba(242,237,230,0.3)", fontWeight: 600 }}>{t("or_fill")}</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(242,237,230,0.08)" }} />
                </div>

                <Field label={t("how_known")}>
                  <select value={form.comment_connu} onChange={(e) => set("comment_connu", e.target.value)} style={selectStyle}>
                    <option value="">{t("select_placeholder")}</option>
                    {COMMENT_CONNU.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field label="Instagram (pseudo)">
                    <input type="text" value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@tonpseudo" style={inputStyle} />
                  </Field>
                  <Field label="Facebook (pseudo)">
                    <input type="text" value={form.facebook} onChange={(e) => set("facebook", e.target.value)} placeholder="Ton prénom nom" style={inputStyle} />
                  </Field>
                </div>

                {/* Newsletter : opt-in automatique à la création de compte (demande de
                    Bou). Plus de case à décocher — mention passive RGPD suffisante, le
                    lien de désabonnement est présent dans les emails marketing envoyés. */}
                <div style={{ padding: 14, borderRadius: 12, background: "rgba(196,154,74,0.08)", border: "1px solid rgba(196,154,74,0.2)", fontSize: 12, color: "rgba(242,237,230,0.55)", lineHeight: 1.6 }}>
                  📩 En créant un compte, tu acceptes de recevoir nos actualités et offres M!LK par email. Désabonnement possible à tout moment en un clic.
                </div>
              </>
            )}

            {/* Erreur */}
            {error && (
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 13, fontWeight: 700 }}>
                ❌ {error}
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(s => s - 1)}
                  style={{ padding: "14px 20px", borderRadius: 12, border: "1px solid rgba(242,237,230,0.12)", background: "transparent", fontWeight: 700, fontSize: 14, cursor: "pointer", color: "#f2ede6" }}
                >
                  {t("register_back")}
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{ flex: 1, padding: "15px", borderRadius: 12, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 15, border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}
              >
                {loading ? t("register_creating") : step < 3 ? t("register_next") : t("register_btn")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}