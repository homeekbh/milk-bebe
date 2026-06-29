"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import PaymentMethods from "./PaymentMethods";

export default function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const year = new Date().getFullYear();

  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubscribe() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError(t("error_invalid")); return;
    }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), source: "footer" }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setError(t("error_generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <footer style={{ background: "#1a1210", borderTop: "1px solid rgba(242,237,230,0.07)", color: "#f0ede8" }}>

      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "60px 5vw 40px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "40px 48px" }}>
        <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: -1.5, color: "#f2ede6" }}>
            M<span style={{ color: "#c49a4a" }}>!</span>LK
          </div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#c49a4a", letterSpacing: -0.3 }}>
            {t("tagline")}
          </p>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: "rgba(242,237,230,0.4)", maxWidth: 280 }}>
            {t("desc")}
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="https://instagram.com/milkbebe.fr" target="_blank" rel="noopener noreferrer"
              style={{ padding: "8px 16px", borderRadius: 99, border: "1px solid rgba(242,237,230,0.12)", color: "rgba(242,237,230,0.5)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              Instagram
            </a>
            <a href="https://www.facebook.com/profile.php?id=61589971614795" target="_blank" rel="noopener noreferrer"
              style={{ padding: "8px 16px", borderRadius: 99, border: "1px solid rgba(242,237,230,0.12)", color: "rgba(242,237,230,0.5)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              Facebook
            </a>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", marginBottom: 2 }}>{t("col_collection")}</div>
          {[
            { label: t("link_all"),         href: "/produits" },
            { label: t("link_bodies"),      href: "/categorie/bodies" },
            { label: t("link_pyjamas"),     href: "/categorie/pyjamas" },
            { label: t("link_gigoteuses"),  href: "/categorie/gigoteuses" },
            { label: t("link_accessoires"), href: "/categorie/accessoires" },
          ].map(l => <Link key={l.href} href={l.href} style={{ fontSize: 14, color: "rgba(242,237,230,0.5)", textDecoration: "none", fontWeight: 500 }}>{l.label}</Link>)}
        </div>

        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", marginBottom: 2 }}>{t("col_brand")}</div>
          {[
            { label: t("link_story"),      href: "/qui-sommes-nous" },
            { label: t("link_bamboo"),     href: "/pourquoi-bambou" },
            { label: tNav("blog"),         href: "/blog" },
            { label: t("link_commitment"), href: "/qui-sommes-nous" },
          ].map(l => <Link key={l.href+l.label} href={l.href} style={{ fontSize: 14, color: "rgba(242,237,230,0.5)", textDecoration: "none", fontWeight: 500 }}>{l.label}</Link>)}
        </div>

        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", marginBottom: 2 }}>{t("col_support")}</div>
          {[
            { label: t("link_account"),  href: "/profil" },
            { label: t("link_shipping"), href: "/livraison" },
            { label: t("link_faq"),      href: "/faq" },
            { label: t("link_cgv"),      href: "/cgv" },
            { label: t("link_legal"),    href: "/mentions-legales" },
            { label: t("link_cookies"),  href: "/politique-confidentialite" },
          ].map(l => <Link key={l.href} href={l.href} style={{ fontSize: 14, color: "rgba(242,237,230,0.5)", textDecoration: "none", fontWeight: 500 }}>{l.label}</Link>)}
        </div>
      </div>

      {/* Newsletter */}
      <div style={{ borderTop: "1px solid rgba(242,237,230,0.07)", borderBottom: "1px solid rgba(242,237,230,0.07)" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", padding: "28px 5vw", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 3, color: "#f2ede6" }}>{t("newsletter_title")}</div>
            <div style={{ fontSize: 13, color: "rgba(242,237,230,0.4)" }}>{t("newsletter_desc")}</div>
          </div>
          {done ? (
            <div style={{ padding: "12px 24px", borderRadius: 12, background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", fontWeight: 800, fontSize: 14 }}>
              {t("newsletter_done")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
              <div style={{ display: "flex", background: "rgba(242,237,230,0.06)", borderRadius: 12, border: `1px solid ${error ? "rgba(239,68,68,0.5)" : "rgba(242,237,230,0.1)"}`, overflow: "hidden" }}>
                <input
                  type="email"
                  placeholder={t("newsletter_placeholder")}
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleSubscribe()}
                  style={{ padding: "12px 18px", background: "transparent", border: "none", outline: "none", color: "#f0ede8", fontSize: 14, minWidth: 220 }}
                />
                <button
                  onClick={handleSubscribe}
                  disabled={loading}
                  style={{ padding: "12px 20px", background: "#c49a4a", color: "#1a1410", fontWeight: 900, fontSize: 13, border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
                  {loading ? "..." : t("newsletter_cta")}
                </button>
              </div>
              {error && <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 700 }}>⚠ {error}</div>}
            </div>
          )}
        </div>
      </div>

      {/* Paiements sécurisés */}
      <PaymentMethods />

      {/* Bas */}
      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "20px 5vw", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 12, color: "rgba(242,237,230,0.28)", fontWeight: 500 }}>
          © {year} M!LK — {t("copyright_tag")}
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          {[
            { label: t("link_cgv"),     href: "/cgv" },
            { label: t("link_legal"),   href: "/mentions-legales" },
            { label: t("bottom_cookies"), href: "/politique-confidentialite" },
          ].map(l => <Link key={l.href} href={l.href} style={{ fontSize: 12, color: "rgba(242,237,230,0.28)", textDecoration: "none", fontWeight: 500 }}>{l.label}</Link>)}
        </div>
        <div style={{ fontSize: 12, color: "rgba(242,237,230,0.18)", fontWeight: 500 }}>
          {t("tagline")}
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(242,237,230,0.05)", padding: "12px 5vw", display: "flex", justifyContent: "center" }}>
        <span style={{ fontSize: 11, color: "rgba(242,237,230,0.16)", fontWeight: 500 }}>
          {t("credit")} <strong style={{ color: "rgba(242,237,230,0.28)" }}>BHK — Design & Graphisme</strong>
        </span>
      </div>

      <style>{`
        @media (max-width: 768px) { footer > div:first-child { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 480px) { footer > div:first-child { grid-template-columns: 1fr !important; } }
      `}</style>
    </footer>
  );
}