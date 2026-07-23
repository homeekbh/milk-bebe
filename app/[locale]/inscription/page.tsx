"use client";

import { useState, Suspense } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import CountrySelector from "@/components/checkout/CountrySelector";

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

function InscriptionForm() {
  const router = useRouter();
  // Redirection post-inscription : revenir là d'où on vient (?redirect=/panier envoyé
  // depuis le panier) si c'est un chemin INTERNE sûr, sinon /profil?welcome=1 (défaut).
  // Garde anti-open-redirect : commence par "/" mais pas "//" (URL protocol-relative).
  const redirect     = useSearchParams().get("redirect");
  // Rejette "//evil.com" (protocol-relative) ET "/\evil.com" (le navigateur normalise \ → / →
  // "//evil.com"). On n'autorise qu'un chemin interne commençant par "/" sans 2ᵉ car. / ou \.
  const safeRedirect = redirect && redirect.startsWith("/") && !/^\/[/\\]/.test(redirect)
    ? redirect
    : "/profil?welcome=1";
  const t = useTranslations("auth");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    email: "", password: "", confirmPassword: "",
    prenom: "", nom: "", telephone: "",
    adresse_livraison: "", ville: "", code_postal: "", pays: "FR",
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
      // Colonnes canoniques EN (lues par /api/profil → page /profil) remplies EN PLUS
      // des FR, sinon la page compte du client affichait des champs vides (mismatch
      // prenom/nom/ville ↔ first_name/last_name/shipping_address). Backfill des comptes
      // déjà créés : supabase/migrations/012_backfill_profiles_en.sql (à exécuter par Bou).
      first_name: form.prenom,
      last_name:  form.nom,
      phone:      form.telephone,
      shipping_address: {
        name:        `${form.prenom} ${form.nom}`.trim(),
        line1:       form.adresse_livraison,
        line2:       "",
        postal_code: form.code_postal,
        city:        form.ville,
        country:     form.pays,
      },
      newsletter: true, // opt-in systématique — consentement affiché à l'étape 2 (RGPD)
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
    if (step < 2) { setStep(s => s + 1); return; }
    const ok = await createAccount();
    if (ok) router.push(safeRedirect);
  }

  const stepLabels = [t("register_step1"), t("register_step2")];

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
              <div key={label} style={{ display: "flex", alignItems: "center", flex: i < stepLabels.length - 1 ? 1 : "none" }}>
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
                {i < stepLabels.length - 1 && (
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

                {/* PAYS en premier : la validation du CP dépend du pays (5 chiffres FR, 6 RO…) → on choisit
                    le pays AVANT le code postal. Pays pleine largeur, CP + ville en dessous. */}
                <Field label={t("f_country")}>
                  <CountrySelector value={form.pays} onChange={(v) => set("pays", v)} hideLabel variant="dark" id="signup-country" />
                </Field>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field label={t("f_postal")} required>
                    <input type="text" value={form.code_postal} onChange={(e) => set("code_postal", e.target.value)} required placeholder="75001" style={inputStyle} />
                  </Field>
                  <Field label={t("f_city")} required>
                    <input type="text" value={form.ville} onChange={(e) => set("ville", e.target.value)} required placeholder="Paris" style={inputStyle} />
                  </Field>
                </div>

                {/* Consentement email (RGPD) — DÉPLACÉ depuis l'ancienne étape « Pour mieux vous
                    connaître » (supprimée). DOIT rester visible AVANT « Créer mon compte » : opt-in
                    newsletter à la création, désabonnement en 1 clic dans chaque email marketing. */}
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
                {loading ? t("register_creating") : step < 2 ? t("register_next") : t("register_btn")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// useSearchParams() exige une frontière Suspense au build Next.js (« should be wrapped
// in a suspense boundary »). On enveloppe le formulaire dans <Suspense>.
export default function InscriptionPage() {
  return (
    <Suspense fallback={null}>
      <InscriptionForm />
    </Suspense>
  );
}