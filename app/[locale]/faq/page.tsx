"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Breadcrumb } from "@/components/seo/Breadcrumb";

type FaqSection = { section: string; questions: { q: string; r: string }[] };

const C = {
  bg:    "#2d1a0e",
  amber: "#c49a4a",
  warm:  "#f2ede6",
  muted: "rgba(242,237,230,0.55)",
  dark:  "#1a1410",
  light: "#ede8df",
  taupe: "#c4ae94",
  faint: "rgba(242,237,230,0.08)",
};

function FAQItem({ q, r }: { q: string; r: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen(!open)}
      style={{
        borderBottom: `1px solid rgba(26,20,16,0.1)`,
        cursor: "pointer",
        padding: "18px 0",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <h3 style={{ margin: 0, fontSize: "clamp(14px,1.6vw,17px)", fontWeight: 800, color: C.dark, lineHeight: 1.4, flex: 1 }}>
          {q}
        </h3>
        <div style={{
          flexShrink: 0, width: 28, height: 28, borderRadius: "50%",
          background: open ? C.dark : "rgba(26,20,16,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s", marginTop: 2,
        }}>
          <span style={{ fontSize: 18, color: open ? C.amber : C.dark, lineHeight: 1, transform: open ? "rotate(45deg)" : "none", display: "inline-block", transition: "transform 0.2s" }}>+</span>
        </div>
      </div>
      <div style={{
        maxHeight: open ? 400 : 0,
        overflow: "hidden",
        transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <p style={{ margin: "12px 0 0", fontSize: "clamp(13px,1.4vw,16px)", lineHeight: 1.75, color: "rgba(26,20,16,0.65)" }}>
          {r}
        </p>
      </div>
    </div>
  );
}

export default function FAQPage() {
  const t = useTranslations("faq");
  const FAQ_DATA = t.raw("data") as FaqSection[];
  return (
    <div style={{ background: C.light, minHeight: "100vh" }}>

      {/* Hero */}
      <div style={{ background: C.dark, padding: "80px 5vw 56px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <Breadcrumb variant="light" items={[{ label: t("breadcrumb_home"), href: "/" }, { label: "FAQ" }]} />
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginTop: 8, marginBottom: 12 }}>
            {t("hero_eyebrow")}
          </div>
          <h1 style={{ margin: "0 0 16px", fontSize: "clamp(32px,5vw,60px)", fontWeight: 950, letterSpacing: -2, lineHeight: 1.05, color: C.warm }}>
            {t("hero_title")}
          </h1>
          <p style={{ margin: 0, fontSize: "clamp(14px,1.6vw,18px)", color: C.muted, lineHeight: 1.65 }}>
            {t("hero_desc")}
          </p>
        </div>
      </div>

      {/* Contenu */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "56px 5vw 80px" }}>
        {FAQ_DATA.map((section) => (
          <div key={section.section} style={{ marginBottom: 48 }}>
            <div style={{
              fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase",
              color: C.amber, marginBottom: 8, paddingBottom: 10,
              borderBottom: `2px solid rgba(196,154,74,0.2)`,
            }}>
              {section.section}
            </div>
            {section.questions.map((item) => (
              <FAQItem key={item.q} q={item.q} r={item.r} />
            ))}
          </div>
        ))}

        {/* Contact */}
        <div style={{
          marginTop: 48, padding: "28px 32px", borderRadius: 16,
          background: C.dark, textAlign: "center",
        }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: C.warm, marginBottom: 8 }}>
            {t("contact_title")}
          </div>
          <p style={{ margin: "0 0 18px", fontSize: 14, color: C.muted }}>
            {t("contact_desc")}
          </p>
          <Link href="/contact" style={{
            display: "inline-block", padding: "12px 28px", borderRadius: 12,
            background: C.amber, color: C.dark, fontWeight: 900, fontSize: 14,
            textDecoration: "none",
          }}>
            {t("contact_cta")}
          </Link>
        </div>
      </div>
    </div>
  );
}