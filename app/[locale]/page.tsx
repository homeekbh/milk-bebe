import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LangSwitcher } from "@/components/i18n/LangSwitcher";

// Page pilote 1 — démontre la chaîne i18n (messages FR/EN + switch + Link
// localisé). Ce N'EST PAS la home finale localisée : la home live reste
// app/page.tsx, intacte. Accessible en /fr et /en.
export default async function LocaleHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

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
        <p
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#c49a4a",
            marginTop: 24,
          }}
        >
          Pilote i18n · locale active : {locale.toUpperCase()}
        </p>
        <h1
          style={{
            fontSize: "clamp(32px,6vw,64px)",
            fontWeight: 950,
            letterSpacing: -2,
            lineHeight: 1,
            margin: "8px 0 16px",
          }}
        >
          {t("hero_title")}{" "}
          <span style={{ color: "#c49a4a" }}>{t("hero_title_accent")}</span>
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: "rgba(26,20,16,0.7)", maxWidth: 520 }}>
          {t("hero_desc")}
        </p>
        <p style={{ marginTop: 28 }}>
          <Link href="/cgv" style={{ fontWeight: 800, color: "#c49a4a", textDecoration: "underline" }}>
            → Page pilote 2 (/{locale}/cgv)
          </Link>
        </p>
      </div>
    </main>
  );
}
