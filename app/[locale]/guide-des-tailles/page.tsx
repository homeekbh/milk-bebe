import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Breadcrumb } from "@/components/seo/Breadcrumb";

export const revalidate = 3600;

const C = { dark: "#1a1410", amber: "#c49a4a", light: "#ede8df", cream: "#f2ede6", taupe: "#e9e1d4" };

// Contenu entièrement i18n (namespace "sizeguide", fr + en). Les VALEURS du tableau
// (longueur/poids, validées par Erika) sont identiques dans les deux locales ; seuls
// les libellés (taille, âge, en-têtes) sont traduits et la virgule décimale devient un
// point sur /en (déjà écrite ainsi dans en.json → aucun reformatage au rendu).
export default async function GuideTaillesPage(
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sizeguide");

  const rows     = t.raw("rows")     as { age: string; length: string; weight: string; clothing: string; sleepbag: string }[];
  const sections = t.raw("sections") as { h2: string; p: string }[];
  const faq      = t.raw("faq")      as { q: string; a: string }[];
  const links    = t.raw("links")    as { label: string; href: string }[];

  return (
    <div style={{ background: C.light, minHeight: "100vh", paddingTop: 92 }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 4vw 80px" }}>
        <Breadcrumb variant="dark" padding="12px 0" items={[{ label: t("breadcrumb") }]} />

        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, margin: "8px 0 10px" }}>{t("eyebrow")}</div>
        <h1 style={{ margin: "0 0 16px", fontSize: "clamp(28px,4.5vw,46px)", fontWeight: 950, letterSpacing: -1.6, color: C.dark, lineHeight: 1.05 }}>
          {t("h1")}
        </h1>
        <p style={{ margin: "0 0 36px", fontSize: "clamp(16px,1.4vw,18px)", color: "rgba(26,20,16,0.7)", lineHeight: 1.75, maxWidth: 680 }}>{t("intro")}</p>

        {/* Tableau des tailles — mois par mois (cible le featured snippet âge→cm).
            Vrai <table> sémantique : thead/tbody + th. 5 colonnes : Âge · Taille bébé ·
            Poids · Pyjamas & bodies · Gigoteuse (les tailles diffèrent selon la catégorie). */}
        <div style={{ overflowX: "auto", borderRadius: 16, border: "1px solid rgba(26,20,16,0.1)", background: C.cream, marginBottom: 14 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620, fontSize: 15 }}>
            <thead>
              <tr style={{ background: C.dark, color: C.cream }}>
                <th style={{ textAlign: "left", padding: "14px 18px", fontWeight: 800 }}>{t("col_age")}</th>
                <th style={{ textAlign: "left", padding: "14px 18px", fontWeight: 800 }}>{t("col_length")}</th>
                <th style={{ textAlign: "left", padding: "14px 18px", fontWeight: 800 }}>{t("col_weight")}</th>
                <th style={{ textAlign: "left", padding: "14px 18px", fontWeight: 800 }}>{t("col_clothing")}</th>
                <th style={{ textAlign: "left", padding: "14px 18px", fontWeight: 800 }}>{t("col_sleepbag")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => (
                <tr key={s.age} style={{ borderTop: "1px solid rgba(26,20,16,0.08)", background: i % 2 ? "rgba(26,20,16,0.02)" : "transparent" }}>
                  <td style={{ padding: "14px 18px", fontWeight: 900, color: C.dark }}>{s.age}</td>
                  <td style={{ padding: "14px 18px", color: "rgba(26,20,16,0.7)" }}>{s.length}</td>
                  <td style={{ padding: "14px 18px", color: "rgba(26,20,16,0.7)" }}>{s.weight}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 800, color: C.amber }}>{s.clothing}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 800, color: C.amber }}>{s.sleepbag}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ margin: "0 0 44px", fontSize: 13, color: "rgba(26,20,16,0.55)", lineHeight: 1.65, fontStyle: "italic" }}>{t("table_note")}</p>

        {/* Sections */}
        {sections.map(s => (
          <section key={s.h2} style={{ marginBottom: 32 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "clamp(20px,2.4vw,28px)", fontWeight: 950, letterSpacing: -0.8, color: C.dark }}>{s.h2}</h2>
            <p style={{ margin: 0, fontSize: "clamp(15px,1.3vw,17px)", color: "rgba(26,20,16,0.78)", lineHeight: 1.8 }}>{s.p}</p>
          </section>
        ))}

        {/* FAQ */}
        <h2 style={{ margin: "44px 0 18px", fontSize: "clamp(20px,2.4vw,28px)", fontWeight: 950, letterSpacing: -0.8, color: C.dark }}>{t("faq_title")}</h2>
        <div style={{ display: "grid", gap: 14, marginBottom: 44 }}>
          {faq.map(f => (
            <div key={f.q} style={{ padding: "18px 20px", borderRadius: 14, background: C.cream, border: "1px solid rgba(26,20,16,0.1)" }}>
              <div style={{ fontWeight: 900, fontSize: 16, color: C.dark, marginBottom: 6 }}>{f.q}</div>
              <div style={{ fontSize: 15, color: "rgba(26,20,16,0.72)", lineHeight: 1.7 }}>{f.a}</div>
            </div>
          ))}
        </div>

        {/* Liens internes */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {links.map(l => (
            <Link key={l.href} href={l.href} style={{ padding: "12px 22px", borderRadius: 12, background: C.amber, color: C.dark, fontWeight: 900, fontSize: 14, textDecoration: "none" }}>{l.label}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
