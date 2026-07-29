import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Breadcrumb } from "@/components/seo/Breadcrumb";

export const revalidate = 3600;

const C = { dark: "#1a1410", amber: "#c49a4a", light: "#ede8df", cream: "#f2ede6", taupe: "#e9e1d4" };

// Liens fixes (routes) — les libellés sont i18n (peauSensible.link_*).
const LINKS = [
  { key: "link_bodies",  href: "/categorie/bodies" },
  { key: "link_pyjamas", href: "/categorie/pyjamas" },
] as const;

// Article OEKO-TEX rattaché à la 2e question de la FAQ (index 1).
const OEKO_ARTICLE_HREF = "/blog/oeko-tex-ce-que-ca-veut-dire-concretement";

export default async function PeauSensiblePage(
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("peauSensible");

  const sections = t.raw("sections") as { h2: string; p: string }[];
  const faq      = t.raw("faq") as { q: string; a: string }[];

  return (
    <div style={{ background: C.light, minHeight: "100vh", paddingTop: 92 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 4vw 80px" }}>
        <Breadcrumb variant="dark" padding="12px 0" items={[{ label: t("crumb_self") }]} />

        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, margin: "8px 0 10px" }}>{t("eyebrow")}</div>
        <h1 style={{ margin: "0 0 16px", fontSize: "clamp(28px,4.5vw,46px)", fontWeight: 950, letterSpacing: -1.6, color: C.dark, lineHeight: 1.05 }}>
          {t("title")}
        </h1>
        <p style={{ margin: "0 0 32px", fontSize: "clamp(16px,1.4vw,18px)", color: "rgba(26,20,16,0.7)", lineHeight: 1.75 }}>{t("intro")}</p>

        {sections.map(s => (
          <section key={s.h2} style={{ marginBottom: 30 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "clamp(20px,2.4vw,28px)", fontWeight: 950, letterSpacing: -0.8, color: C.dark }}>{s.h2}</h2>
            <p style={{ margin: 0, fontSize: "clamp(15px,1.3vw,17px)", color: "rgba(26,20,16,0.78)", lineHeight: 1.8 }}>{s.p}</p>
          </section>
        ))}

        {/* Disclaimer (aucun claim médical) */}
        <div style={{ margin: "8px 0 32px", padding: "16px 20px", borderRadius: 12, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.3)", fontSize: 14, color: "rgba(26,20,16,0.7)", lineHeight: 1.7, fontStyle: "italic" }}>
          {t("disclaimer")}
        </div>

        <section style={{ marginBottom: 30 }}>
          <h2 style={{ margin: "0 0 12px", fontSize: "clamp(20px,2.4vw,28px)", fontWeight: 950, letterSpacing: -0.8, color: C.dark }}>{t("details_h2")}</h2>
          <p style={{ margin: 0, fontSize: "clamp(15px,1.3vw,17px)", color: "rgba(26,20,16,0.78)", lineHeight: 1.8 }}>{t("details_p")}</p>
        </section>

        {/* FAQ */}
        <h2 style={{ margin: "44px 0 18px", fontSize: "clamp(20px,2.4vw,28px)", fontWeight: 950, letterSpacing: -0.8, color: C.dark }}>{t("faq_title")}</h2>
        <div style={{ display: "grid", gap: 14, marginBottom: 44 }}>
          {faq.map((f, i) => (
            <div key={f.q} style={{ padding: "18px 20px", borderRadius: 14, background: C.cream, border: "1px solid rgba(26,20,16,0.1)" }}>
              <div style={{ fontWeight: 900, fontSize: 16, color: C.dark, marginBottom: 6 }}>{f.q}</div>
              <div style={{ fontSize: 15, color: "rgba(26,20,16,0.72)", lineHeight: 1.7 }}>
                {f.a}
                {i === 1 && (
                  <>{" "}<Link href={OEKO_ARTICLE_HREF} style={{ color: C.amber, fontWeight: 700, textDecoration: "none" }}>{t("oeko_link")}</Link></>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Liens internes */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {LINKS.map(l => (
            <Link key={l.href} href={l.href} style={{ padding: "12px 22px", borderRadius: 12, background: C.amber, color: C.dark, fontWeight: 900, fontSize: 14, textDecoration: "none" }}>{t(l.key)}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
