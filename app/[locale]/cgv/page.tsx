import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LangSwitcher } from "@/components/i18n/LangSwitcher";

// Page pilote 2 — prouve que le routing i18n fonctionne sur une 2e route et que
// le switch de langue conserve le chemin (/fr/cgv ↔ /en/cgv). Démonstrateur :
// la vraie page CGV reste app/cgv/page.tsx, intacte.
export default async function LocaleCgv({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main
      style={{
        minHeight: "60vh",
        padding: "64px 24px",
        background: "#ede8df",
        color: "#1a1410",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <LangSwitcher />
        <h1 style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 950, letterSpacing: -1, margin: "24px 0 12px" }}>
          {locale === "fr" ? "Conditions générales de vente" : "Terms & Conditions"}
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: "rgba(26,20,16,0.7)", maxWidth: 520 }}>
          {locale === "fr"
            ? "Page pilote — démonstration du routing multilingue /fr & /en. Le switch ci-dessus conserve le chemin courant."
            : "Pilot page — multilingual routing demo for /fr & /en. The switch above keeps the current path."}
        </p>
        <p style={{ marginTop: 28 }}>
          <Link href="/" style={{ fontWeight: 800, color: "#c49a4a", textDecoration: "underline" }}>
            ← /{locale}
          </Link>
        </p>
      </div>
    </main>
  );
}
