"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase-client";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useCheckout } from "@/components/checkout/CheckoutContext";
import CheckoutProgress from "@/components/checkout/CheckoutProgress";
import { ALL_COUNTRY_CODES } from "@/lib/countries";

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
// Téléphone à la création de compte : FR (+33 / 0X) OU international E.164.
function isValidPhoneIntl(p: string): boolean {
  const d = String(p ?? "").replace(/[^\d+]/g, "");
  return /^\+33[1-9]\d{8}$/.test(d) || /^0[1-9]\d{8}$/.test(d) || /^\+\d{6,15}$/.test(d);
}

const INP: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(242,237,230,0.14)", fontSize: 15, outline: "none", background: "rgba(242,237,230,0.06)", color: "#f2ede6", boxSizing: "border-box" };
const INP_DARK_SELECT: React.CSSProperties = { ...INP, appearance: "none" };
const INP_LIGHT: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(26,20,16,0.15)", fontSize: 15, outline: "none", background: "#fff", color: "#1a1410", boxSizing: "border-box" };

type AccountForm = {
  prenom: string; nom: string; line1: string; line2: string;
  postal_code: string; city: string; country: string; phone: string;
};
const EMPTY_FORM: AccountForm = { prenom: "", nom: "", line1: "", line2: "", postal_code: "", city: "", country: "FR", phone: "" };

/**
 * Étape 1 — Compte (Lot TUNNEL-V2). « Créer un compte » = inscription COMPLÈTE
 * (email, mot de passe, nom/prénom, adresse, pays, téléphone international) → profil
 * inséré + accountAddress dans le Context (pré-remplissage international ultérieur).
 * « Sans compte » = email seul. AUCUN téléphone partagé ici : il est collecté à la
 * Livraison pour la France, et par Stripe à l'international. Aucune session Stripe.
 */
export default function CheckoutComptePage() {
  const router = useRouter();
  const en = useLocale() === "en";
  const t  = useTranslations("auth");
  const { user, session } = useAuth();
  const { items } = useCart();
  const { hydrated, isCartEmpty, state, update } = useCheckout();

  const [email,    setEmail]    = useState("");   // création / connexion (local, non persisté)
  const [password, setPassword] = useState("");   // jamais persisté
  const [form,     setForm]     = useState<AccountForm>(EMPTY_FORM);
  const [showSignin, setShowSignin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const setF = (k: keyof AccountForm, v: string) => { setForm(f => ({ ...f, [k]: v })); setError(""); };

  const countryName = (code: string): string => {
    try { return new Intl.DisplayNames([en ? "en" : "fr"], { type: "region" }).of(code) ?? code; } catch { return code; }
  };
  const countryOptions = useMemo(
    () => ALL_COUNTRY_CODES.map(c => ({ code: c, name: countryName(c) })).sort((a, b) => a.name.localeCompare(b.name, en ? "en" : "fr")),
    [en],
  );

  // Garde : panier vide → /panier.
  useEffect(() => {
    if (hydrated && isCartEmpty) router.replace("/panier");
  }, [hydrated, isCartEmpty, router]);

  // Déjà connecté → email dans le Context + chargement du profil (nom/adresse/pays/
  // téléphone) dans accountAddress (pré-remplissage international à la Livraison).
  useEffect(() => {
    if (!hydrated || !user?.id) return;
    if (state.email !== user.email && user.email) update({ email: user.email });
    supabase.from("profiles")
      .select("first_name, last_name, prenom, nom, phone, telephone, shipping_address, adresse_livraison, code_postal, ville, pays")
      .eq("id", user.id).maybeSingle()
      .then(({ data: p }) => {
        if (!p) return;
        const sa: any = p.shipping_address ?? {};
        const rawCountry = String(sa.country ?? p.pays ?? "FR");
        update({ accountAddress: {
          first_name: String(p.first_name ?? p.prenom ?? ""),
          last_name:  String(p.last_name ?? p.nom ?? ""),
          line1:      String(sa.line1 ?? p.adresse_livraison ?? ""),
          line2:      String(sa.line2 ?? ""),
          postal_code:String(sa.postal_code ?? p.code_postal ?? ""),
          city:       String(sa.city ?? p.ville ?? ""),
          // ISO-2 uniquement (les vieux profils stockaient "France" en toutes lettres → FR).
          country:    /^[A-Za-z]{2}$/.test(rawCountry) ? rawCountry.toUpperCase() : "FR",
          phone:      String(p.phone ?? p.telephone ?? ""),
        }});
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user?.id]);

  // Connecté → charger les récompenses parrainage utilisables dans le Context.
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

  // Panier abandonné (fix régression BASCULE-1) : l'email invité étant collecté ICI
  // (plus au panier), on (ré)enregistre le panier dès que l'étape Compte est franchie.
  // Best-effort : fire-and-forget, ne bloque JAMAIS la navigation. Le nettoyage à
  // l'achat reste géré par le webhook (converted=true, clé = email). Total = sous-total
  // BRUT (produits + packs) — suffisant pour la relance.
  const saveAbandonedCart = (email: string, prenom: string) => {
    try {
      const em = String(email ?? "").trim();
      if (!em) return;
      // Produits (milk_cart_v2 via useCart) — même forme que /panier historiquement.
      const products = items.map(i => ({
        id: i.id, slug: i.slug, name: i.name, price: i.price, quantity: i.quantity,
        taille: i.taille, couleur: i.couleur, category_slug: i.category_slug,
        image_url: (i as { image_url?: string }).image_url ?? null,
      }));
      // Packs (milk_pack_cart) groupés par pack_id + taille → forme { name, price, quantity }
      // compatible avec le rendu de la relance (i.name / i.price × i.quantity).
      let packItems: Array<{ id: string; slug: string | null; name: string; price: number; quantity: number; image_url: string | null }> = [];
      try {
        const raw = JSON.parse(localStorage.getItem("milk_pack_cart") ?? "[]");
        const map = new Map<string, typeof packItems[number]>();
        for (const p of (Array.isArray(raw) ? raw : [])) {
          const key = `${p.pack_id}__${p.size ?? ""}`;
          const ex = map.get(key);
          if (ex) ex.quantity += 1;
          else map.set(key, { id: `pack:${p.pack_id}`, slug: p.slug ?? null, name: `🎁 ${p.title ?? "Coffret"}${p.size ? ` — ${p.size}` : ""}`, price: Number(p.price) || 0, quantity: 1, image_url: p.image_url ?? null });
        }
        packItems = [...map.values()];
      } catch {}
      const allItems = [...products, ...packItems];
      if (allItems.length === 0) return;
      const total = allItems.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
      fetch("/api/cart/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, prenom: prenom || "", items: allItems, total }),
      }).catch(() => {});
    } catch {}
  };

  const advance = (patch: Record<string, unknown>) => {
    // Enregistrement panier abandonné (best-effort, une fois par clic — pas un effet).
    const em = String((patch.email as string) ?? (patch.guestEmail as string) ?? state.email ?? state.guestEmail ?? "");
    const pr = ((patch.accountAddress as { first_name?: string } | undefined)?.first_name) ?? state.accountAddress?.first_name ?? "";
    saveAbandonedCart(em, pr);
    update({ ...patch, completedSteps: Math.max(state.completedSteps, 1) });
    router.push("/checkout/livraison");
  };

  const onCreateAccount = async () => {
    setError("");
    if (!EMAIL_RE.test(email.trim()))         { setError(t("err_invalid_email")); return; }
    if (password.length < 8)                  { setError(t("err_pwd_short"));      return; }
    if (!form.prenom.trim() || !form.nom.trim() || !form.line1.trim() || !form.postal_code.trim() || !form.city.trim() || !form.country) {
      setError(en ? "Please complete all required fields." : "Merci de compléter tous les champs obligatoires."); return;
    }
    if (!isValidPhoneIntl(form.phone)) {
      setError(en ? "Invalid phone number." : "Numéro de téléphone invalide."); return;
    }
    setLoading(true);
    const { data, error: e } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { prenom: form.prenom.trim(), nom: form.nom.trim() } },
    });
    if (e || !data.user) { setError(t(authErrorKey(e?.message))); setLoading(false); return; }
    // Profil COMPLET (upsert → trigger trg_set_parrain_code sur insert). Best-effort :
    // n'échoue pas le flux. Remplit FR (prenom/nom/telephone…) + canoniques EN
    // (first_name/last_name/phone/shipping_address) comme /inscription.
    const shipping_address = {
      name: `${form.prenom.trim()} ${form.nom.trim()}`.trim(),
      line1: form.line1.trim(), line2: form.line2.trim(),
      postal_code: form.postal_code.trim(), city: form.city.trim(), country: form.country,
    };
    const { error: pErr } = await supabase.from("profiles").upsert([{
      id:                data.user.id,
      email:             email.trim(),
      first_name:        form.prenom.trim(),
      last_name:         form.nom.trim(),
      prenom:            form.prenom.trim(),
      nom:               form.nom.trim(),
      phone:             form.phone.trim(),
      telephone:         form.phone.trim(),
      adresse_livraison: form.line1.trim(),
      code_postal:       form.postal_code.trim(),
      ville:             form.city.trim(),
      pays:              form.country,
      shipping_address,
      newsletter:        true,
    }], { onConflict: "id" });
    if (pErr) process.env.NODE_ENV !== "production" && console.error("[checkout/compte] profiles upsert:", pErr.message);
    fetch("/api/emails/welcome", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), prenom: form.prenom.trim() }) }).catch(() => {});
    setLoading(false);
    advance({
      email: email.trim(),
      accountAddress: {
        first_name: form.prenom.trim(), last_name: form.nom.trim(),
        line1: form.line1.trim(), line2: form.line2.trim(),
        postal_code: form.postal_code.trim(), city: form.city.trim(),
        country: form.country, phone: form.phone.trim(),
      },
    });
  };

  const onSignIn = async () => {
    setError("");
    if (!EMAIL_RE.test(email.trim())) { setError(t("err_invalid_email")); return; }
    setLoading(true);
    const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (e) { setError(t(authErrorKey(e?.message))); setLoading(false); return; }
    setLoading(false);
    // accountAddress sera hydraté par l'effet profil (user devient défini). On avance.
    advance({ email: email.trim() });
  };

  const onGuest = () => {
    setError("");
    const ge = state.guestEmail.trim();
    if (!EMAIL_RE.test(ge)) { setError(t("err_invalid_email")); return; }
    try { localStorage.setItem("milk_guest_email", ge.toLowerCase()); } catch {}
    advance({ guestEmail: ge });
  };

  const onLoggedInContinue = () => {
    if (!user?.email) return;
    advance({ email: user.email });
  };

  const errorBox = error && (
    <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#b91c1c", fontSize: 13, fontWeight: 700 }}>
      ❌ {error}
    </div>
  );

  const req = <span style={{ color: "#ef4444" }}>*</span>;
  const darkLabel: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(242,237,230,0.45)", marginBottom: 5 };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "100px 24px 80px" }}>
      <CheckoutProgress current="compte" />
      <h1 style={{ fontSize: 28, fontWeight: 950, letterSpacing: -1, color: "#1a1410", marginBottom: 20 }}>
        {en ? "Step 1 — Account" : "Étape 1 — Compte"}
      </h1>

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
          <button onClick={onLoggedInContinue}
            style={{ marginTop: 16, width: "100%", padding: "15px", borderRadius: 12, border: "none", background: "#1a1410", color: "#f2ede6", fontWeight: 900, fontSize: 16, cursor: "pointer" }}>
            {en ? "Continue" : "Continuer"}
          </button>
        </div>
      ) : (
        <>
          {/* ── CRÉER UN COMPTE — bloc PRINCIPAL (inscription complète) ── */}
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={darkLabel}>{en ? "First name" : "Prénom"} {req}</label>
                  <input value={form.prenom} onChange={e => setF("prenom", e.target.value)} style={INP} /></div>
                <div><label style={darkLabel}>{en ? "Last name" : "Nom"} {req}</label>
                  <input value={form.nom} onChange={e => setF("nom", e.target.value)} style={INP} /></div>
              </div>
              <div><label style={darkLabel}>{en ? "Email" : "Email"} {req}</label>
                <input type="email" inputMode="email" autoComplete="email" value={email}
                  onChange={e => { setEmail(e.target.value); setError(""); }} style={INP} /></div>
              <div><label style={darkLabel}>{en ? "Password (min. 8 characters)" : "Mot de passe (8 caractères min.)"} {req}</label>
                <input type="password" autoComplete="new-password" value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }} style={INP} /></div>
              <div><label style={darkLabel}>{en ? "Address" : "Adresse"} {req}</label>
                <input autoComplete="address-line1" value={form.line1} onChange={e => setF("line1", e.target.value)} style={INP} /></div>
              <div><label style={darkLabel}>{en ? "Address line 2 (optional)" : "Complément (optionnel)"}</label>
                <input autoComplete="address-line2" value={form.line2} onChange={e => setF("line2", e.target.value)} style={INP} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
                <div><label style={darkLabel}>{en ? "Postal code" : "Code postal"} {req}</label>
                  <input inputMode="numeric" value={form.postal_code} onChange={e => setF("postal_code", e.target.value)} style={INP} /></div>
                <div><label style={darkLabel}>{en ? "City" : "Ville"} {req}</label>
                  <input autoComplete="address-level2" value={form.city} onChange={e => setF("city", e.target.value)} style={INP} /></div>
              </div>
              <div><label style={darkLabel}>{en ? "Country" : "Pays"} {req}</label>
                <select value={form.country} onChange={e => setF("country", e.target.value)} style={INP_DARK_SELECT}>
                  {countryOptions.map(o => <option key={o.code} value={o.code}>{o.name}</option>)}
                </select></div>
              <div><label style={darkLabel}>{en ? "Phone number" : "Numéro de téléphone"} {req}</label>
                <input type="tel" inputMode="tel" autoComplete="tel" placeholder={en ? "e.g. +33 6 12 34 56 78" : "Ex : +33 6 12 34 56 78"}
                  value={form.phone} onChange={e => setF("phone", e.target.value)} style={INP} /></div>
            </div>

            {!showSignin && errorBox}
            <button onClick={onCreateAccount} disabled={loading}
              style={{ marginTop: 16, width: "100%", padding: "15px", borderRadius: 12, border: "none", background: "#c49a4a", color: "#1a1410", fontWeight: 950, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
              {loading ? (en ? "Creating…" : "Création…") : (en ? "Create my account" : "Créer mon compte")}
            </button>
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
              <button onClick={onSignIn} disabled={loading}
                style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: loading ? "#d1cdc8" : "#1a1410", color: "#f2ede6", fontWeight: 900, fontSize: 15, cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "…" : (en ? "Sign in" : "Se connecter")}
              </button>
            </div>
          )}

          {/* ── CONTINUER SANS COMPTE — EMAIL SEUL, option SECONDAIRE discrète ── */}
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(26,20,16,0.1)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(26,20,16,0.55)", marginBottom: 4 }}>
              {en ? "Or continue without an account" : "Ou continuer sans compte"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(26,20,16,0.5)", marginBottom: 10, lineHeight: 1.5 }}>
              {en ? "Just your email — address & phone are collected at the delivery/payment step."
                  : "Juste ton email — l'adresse et le téléphone sont demandés à l'étape livraison/paiement."}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input type="email" inputMode="email" autoComplete="email"
                placeholder={en ? "your@email.com" : "ton@email.fr"}
                value={state.guestEmail} onChange={e => { update({ guestEmail: e.target.value }); setError(""); }}
                style={{ ...INP_LIGHT, flex: "1 1 220px" }} />
              <button onClick={onGuest}
                style={{ padding: "12px 18px", borderRadius: 10, border: "1px solid rgba(26,20,16,0.25)", background: "#fff", color: "#1a1410", fontWeight: 800, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>
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
