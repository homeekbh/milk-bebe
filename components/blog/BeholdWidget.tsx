"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

// Custom element Behold — typé `any` pour éviter le bruit JSX.IntrinsicElements.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BeholdTag: any = "behold-widget";
const FEED_ID    = "L5sbTy39w0wM7e51VIqs";
const SCRIPT_SRC = "https://w.behold.so/widget.js";

/**
 * Widget Instagram Behold — injecte le script <module> une seule fois (idempotent)
 * puis rend le custom element. Réutilisable (liste blog + fiche article).
 */
export default function BeholdWidget() {
  const t = useTranslations("blog");

  useEffect(() => {
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return;
    const s = document.createElement("script");
    s.type  = "module";
    s.src   = SCRIPT_SRC;
    s.async = true;
    document.body.appendChild(s);
  }, []);

  return (
    <section style={{ padding: "48px 4vw 72px", maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 10 }}>Instagram</div>
      <h2 style={{ margin: "0 0 6px", fontSize: "clamp(22px,3vw,32px)", fontWeight: 950, letterSpacing: -1, color: "#1a1410", lineHeight: 1.1 }}>
        {t("ig_title")}
      </h2>
      <a href="https://www.instagram.com/milkbebe.fr" target="_blank" rel="noopener noreferrer"
        style={{ display: "inline-block", marginBottom: 28, color: "#c49a4a", fontWeight: 800, fontSize: 15, textDecoration: "none" }}>
        {t("ig_handle")}
      </a>
      <BeholdTag feed-id={FEED_ID}></BeholdTag>
    </section>
  );
}
