"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase-client";
import { useAuth } from "@/context/AuthContext";
import { useCheckout } from "@/components/checkout/CheckoutContext";
import CheckoutProgress from "@/components/checkout/CheckoutProgress";

// Miroir de app/[locale]/inscription/page.tsx (authErrorKey non exporté) : mappe
// un message d'erreur Supabase Auth → clé de traduction du namespace "auth".
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Téléphone obligatoire (Sendcloud) — même validation que /panier.
function isValidPhone(p: string): boolean {
  const d = String(p ?? "").replace(/[^\d+]/g, "");
  return /^\+33[1-9]\d{8}$/.test(d) || /^0[1-9]\d{8}$/.test(d);
}

const INP: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(242,237,230,0.14)", fontSize: 15, outline: "none", background: "rgba(242,237,230,0.06)", color: "#f2ede6", boxSizing: "border-box" };
const INP_LIGHT: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(26,20,16,0.15)", fontSize: 15, outline: "none", background: "#fff", color: "#1a1410", boxSizing: "border-box" };

/**
 * Étape 1 — Compte (Lot 4b). Création de compte MISE EN AVANT, « continuer sans
 * compte » discret, connexion optionnelle. Téléphone collecté ICI (obligatoire,
 * cohérent avec /panier étape 1). Aucune session Stripe.
 */
export default function CheckoutComptePage() {
  const router = useRouter();
  const en = useLocale() === "en";
  const t  = useTranslations("auth");
  const { user, session } = useAuth();
  const { hydrated, isCartEmpty, state, update } = useCheckout();

  const [email,    setEmail]    = useState("");   // création / connexion (local, non persisté)
  const [password, setPassword] = useState("");   // jamais persisté
  const [showSignin, setShowSignin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // Garde : panier vide → /panier.
  useEffect(() => {
    if (hydrated && isCartEmpty) router.replace("/panier");
  }, [hydrated, isCartEmpty, router]);

  // Déjà connecté → pré-remplir l'email dans le Context.
  useEffect(() => {
    if (hydrated && user?.email && state.email !== user.email) update({ email: user.email });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user?.email]);

  // Connecté → charger les récompenses parrainage utilisables dans le Context
  // (prêtes pour le calcul du total à l'étape paiement).
  useEffect(() => {
    const token = session?.access_token;
    if (!token) return;
    fetch("/api/parrainage/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!d || d.error) return; update({ availableRewards: Array.isArray(d.rewards_usable) ? d.rewards_usable : [] }); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  if (!hydrated || isCartEmpty) return null;

  const phoneOk = isValidPhone(state.phone);
  const setPhone = (v: string) => update({ phone: v });

  const advance = (patch: Record<string, unknown>) => {
    update({ ...patch, phone: state.phone.trim(), completedSteps: Math.max(state.completedSteps, 1) });
    router.push("/checkout/livraison");
  };

  const onCreateAccount = async () => {
    setError("");
    if (!EMAIL_RE.test(email.trim())) { setError(t("err_invalid_email")); return; }
    if (password.length < 8)          { setError(t("err_pwd_short"));      return; }
    if (!phoneOk) return;
    setLoading(true);
    const { data, error: e } = await supabase.auth.signUp({ email: email.trim(), password });
    if (e || !data.user) { setError(t(authErrorKey(e?.message))); setLoading(false); return; }
    // Email de bienvenue (fire-and-forget), comme /inscription.
    fetch("/api/emails/welcome", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), prenom: "" }) }).catch(() => {});
    setLoading(false);
    advance({ email: email.trim() });
  };

  const onSignIn = async () => {
    setError("");
    if (!EMAIL_RE.test(email.trim())) { setError(t("err_invalid_email")); return; }
    if (!phoneOk) return;
    setLoading(true);
    const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (e) { setError(t(authErrorKey(e?.message))); setLoading(false); return; }
    setLoading(false);
    advance({ email: email.trim() });
  };

  const onGuest = () => {
    setError("");
    const ge = state.guestEmail.trim();
    if (!EMAIL_RE.test(ge)) { setError(t("err_invalid_email")); return; }
    if (!phoneOk) return;
    try { localStorage.setItem("milk_guest_email", ge.toLowerCase()); } catch {}
    advance({ guestEmail: ge });
  };

  const onLoggedInContinue = () => {
    if (!phoneOk || !user?.email) return;
    advance({ email: user.email });
  };

  // ── Champ téléphone partagé (toujours requis) ─────────────────────────────
  const phoneField = (
    <div style={{ marginBottom: 20 }}>
      <label htmlFor="co-phone" style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)", marginBottom: 6 }}>
        {en ? "Phone number" : "Numéro de téléphone"} <span style={{ color: "#b91c1c" }}>*</span>
      </label>
      <input id="co-phone" type="tel" inputMode="tel" autoComplete="tel"
        placeholder={en ? "e.g. 06 12 34 56 78" : "Ex : 06 12 34 56 78"}
        value={state.phone} onChange={e => setPhone(e.target.value)} style={INP_LIGHT} />
      <div style={{ marginTop: 6, fontSize: 11, color: "rgba(26,20,16,0.5)", lineHeight: 1.5 }}>
        {en ? "Used by the carrier to reach you about your delivery." : "Utilisé par le transporteur pour vous joindre au sujet de la livraison."}
      </div>
    </div>
  );

  const errorBox = error && (
    <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#b91c1c", fontSize: 13, fontWeight: 700 }}>
      ❌ {error}
    </div>
  );

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "100px 24px 80px" }}>
      <CheckoutProgress current="compte" />
      <h1 style={{ fontSize: 28, fontWeight: 950, letterSpacing: -1, color: "#1a1410", marginBottom: 20 }}>
        {en ? "Step 1 — Account" : "Étape 1 — Compte"}
      </h1>

      {phoneField}

      {user ? (
        /* ── Déjà connecté ── */
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.1)", padding: "22px 24px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "#c49a4a", marginBottom: 6 }}>
            {en ? "Signed in" : "Connecté"}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1410" }}>{user.email}</div>
          {state.availableRewards.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 13, color: "#16a34a", fontWeight: 700 }}>
              🎁 {en
                ? `${state.availableRewards.length} referral reward${state.availableRewards.length > 1 ? "s" : ""} available`
                : `${state.availableRewards.length} récompense${state.availableRewards.length > 1 ? "s" : ""} parrainage disponible${state.availableRewards.length > 1 ? "s" : ""}`}
            </div>
          )}
          {errorBox}
          <button onClick={onLoggedInContinue} disabled={!phoneOk}
            style={{ marginTop: 16, width: "100%", padding: "15px", borderRadius: 12, border: "none", background: phoneOk ? "#1a1410" : "#d1cdc8", color: "#f2ede6", fontWeight: 900, fontSize: 16, cursor: phoneOk ? "pointer" : "not-allowed" }}>
            {en ? "Continue" : "Continuer"}
          </button>
        </div>
      ) : (
        <>
          {/* ── CRÉER UN COMPTE — bloc PRINCIPAL (mis en avant) ── */}
          <div style={{ background: "#1a1410", borderRadius: 20, border: "1px solid rgba(196,154,74,0.3)", padding: "28px 26px" }}>
            <div style={{ display: "inline-block", padding: "5px 14px", borderRadius: 99, background: "rgba(196,154,74,0.15)", border: "1px solid rgba(196,154,74,0.3)", fontSize: 11, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 14 }}>
              {en ? "Recommended" : "Recommandé"}
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 950, letterSpacing: -0.5, color: "#f2ede6" }}>
              {en ? "Create your account" : "Créer un compte"}
            </h2>
            <ul style={{ margin: "0 0 18px", padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
              {(en
                ? ["Order tracking & history", "Referral rewards", "Faster future checkout"]
                : ["Suivi et historique de commande", "Récompenses parrainage", "Commandes plus rapides ensuite"]
              ).map(b => (
                <li key={b} style={{ fontSize: 13.5, color: "rgba(242,237,230,0.65)", display: "flex", gap: 8 }}>
                  <span style={{ color: "#c49a4a" }}>✓</span> {b}
                </li>
              ))}
            </ul>
            <div style={{ display: "grid", gap: 12 }}>
              <input type="email" inputMode="email" autoComplete="email"
                placeholder={en ? "Email" : "Email"} value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }} style={INP} />
              <input type="password" autoComplete="new-password"
                placeholder={en ? "Password (min. 8 characters)" : "Mot de passe (8 caractères min.)"} value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }} style={INP} />
            </div>
            {!showSignin && errorBox}
            <button onClick={onCreateAccount} disabled={loading || !phoneOk}
              style={{ marginTop: 16, width: "100%", padding: "15px", borderRadius: 12, border: "none", background: "#c49a4a", color: "#1a1410", fontWeight: 950, fontSize: 16, cursor: (loading || !phoneOk) ? "not-allowed" : "pointer", opacity: (loading || !phoneOk) ? 0.6 : 1 }}>
              {loading ? (en ? "Creating…" : "Création…") : (en ? "Create my account" : "Créer mon compte")}
            </button>
            {!phoneOk && (
              <div style={{ marginTop: 8, fontSize: 12, color: "rgba(242,237,230,0.5)", textAlign: "center" }}>
                {en ? "Enter a valid phone number above to continue." : "Saisis un numéro de téléphone valide ci-dessus pour continuer."}
              </div>
            )}
          </div>

          {/* ── Toggle : se connecter ── */}
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "rgba(26,20,16,0.55)" }}>
            {en ? "Already have an account?" : "J'ai déjà un compte ?"}{" "}
            <button onClick={() => { setShowSignin(v => !v); setError(""); }}
              style={{ background: "none", border: "none", color: "#c49a4a", fontWeight: 800, fontSize: 14, textDecoration: "underline", cursor: "pointer" }}>
              {en ? "Sign in" : "Se connecter"}
            </button>
          </div>

          {showSignin && (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.1)", padding: "20px 22px", marginTop: 12, display: "grid", gap: 12 }}>
              <input type="email" inputMode="email" autoComplete="email" placeholder={en ? "Email" : "Email"}
                value={email} onChange={e => { setEmail(e.target.value); setError(""); }} style={INP_LIGHT} />
              <input type="password" autoComplete="current-password" placeholder={en ? "Password" : "Mot de passe"}
                value={password} onChange={e => { setPassword(e.target.value); setError(""); }} style={INP_LIGHT} />
              {errorBox}
              <button onClick={onSignIn} disabled={loading || !phoneOk}
                style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: (loading || !phoneOk) ? "#d1cdc8" : "#1a1410", color: "#f2ede6", fontWeight: 900, fontSize: 15, cursor: (loading || !phoneOk) ? "not-allowed" : "pointer" }}>
                {loading ? "…" : (en ? "Sign in" : "Se connecter")}
              </button>
            </div>
          )}

          {/* ── CONTINUER SANS COMPTE — option SECONDAIRE, discrète ── */}
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(26,20,16,0.1)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(26,20,16,0.55)", marginBottom: 10 }}>
              {en ? "Or continue without an account" : "Ou continuer sans compte"}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input type="email" inputMode="email" autoComplete="email"
                placeholder={en ? "your@email.com" : "ton@email.fr"}
                value={state.guestEmail} onChange={e => { update({ guestEmail: e.target.value }); setError(""); }}
                style={{ ...INP_LIGHT, flex: "1 1 220px" }} />
              <button onClick={onGuest} disabled={!phoneOk}
                style={{ padding: "12px 18px", borderRadius: 10, border: "1px solid rgba(26,20,16,0.25)", background: "#fff", color: "#1a1410", fontWeight: 800, fontSize: 14, cursor: phoneOk ? "pointer" : "not-allowed", opacity: phoneOk ? 1 : 0.6, whiteSpace: "nowrap" }}>
                {en ? "Continue as guest" : "Continuer sans compte"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Retour */}
      <div style={{ marginTop: 28 }}>
        <button onClick={() => router.push("/panier")}
          style={{ padding: "13px 24px", borderRadius: 12, border: "1px solid rgba(26,20,16,0.2)", background: "#fff", color: "#1a1410", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
          {en ? "Back to cart" : "Retour au panier"}
        </button>
      </div>
    </div>
  );
}
