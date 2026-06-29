import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Breadcrumb } from "@/components/seo/Breadcrumb";

export const revalidate = 3600;

const C = { dark: "#1a1410", amber: "#c49a4a", light: "#ede8df", cream: "#f2ede6", taupe: "#e9e1d4" };

const INTRO =
  "La peau d'un nouveau-né est jusqu'à 5 fois plus fine que la nôtre. Tout ce qui la touche en permanence compte : la matière, les coutures, les traitements chimiques du textile. Pour une peau fragile ou réactive, le choix du vêtement n'est pas un détail.";

const SECTIONS = [
  { h2: "Ce qui agresse une peau de bébé", p: "Les fibres rêches qui frottent. Les coutures dures contre le cou et les aisselles. Et surtout, les substances chimiques que beaucoup de textiles gardent après teinture et traitement." },
  { h2: "Pourquoi on a choisi le bambou OEKO-TEX", p: "Le bambou (viscose) est une fibre lisse et douce — elle glisse sur la peau au lieu de l'irriter. Elle est naturellement respirante et thermorégulatrice, donc bébé transpire moins (et la transpiration entretient les irritations). Et la certification OEKO-TEX Standard 100 garantit l'absence de substances nocives testées : c'est ce qui compte le plus pour une peau réactive." },
];

const DISCLAIMER =
  "Note : on parle de confort et de douceur pour peaux fragiles/réactives. On ne promet pas de traiter une pathologie — l'eczéma se gère avec un médecin.";

const DETAILS_H2 = "Nos détails pensés pour ça";
const DETAILS_P =
  "Coutures plates, encolure enveloppe (pas de pression sur le cou), moufles intégrées sur les bodies (bébé ne se griffe pas).";

const FAQ: { q: string; a: string; link?: { label: string; href: string } }[] = [
  { q: "Le bambou convient-il aux peaux à tendance eczéma ?", a: "C'est une matière douce et certifiée sans substances nocives, souvent bien tolérée par les peaux réactives. Pour un eczéma diagnostiqué, demande conseil à ton pédiatre." },
  { q: "OEKO-TEX, ça veut dire bio ?", a: "Non. Ça garantit l'absence de substances nocives, pas l'origine biologique.", link: { label: "Lire l'article OEKO-TEX", href: "/blog/oeko-tex-ce-que-ca-veut-dire-concretement" } },
];

const LINKS = [
  { label: "Voir les bodies", href: "/categorie/bodies" },
  { label: "Voir les pyjamas", href: "/categorie/pyjamas" },
];

export default async function PeauSensiblePage(
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div style={{ background: C.light, minHeight: "100vh", paddingTop: 92 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 4vw 80px" }}>
        <Breadcrumb variant="dark" padding="12px 0" items={[{ label: "Vêtements bébé peau sensible" }]} />

        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, margin: "8px 0 10px" }}>Peau sensible</div>
        <h1 style={{ margin: "0 0 16px", fontSize: "clamp(28px,4.5vw,46px)", fontWeight: 950, letterSpacing: -1.6, color: C.dark, lineHeight: 1.05 }}>
          Vêtements pour bébé à la peau sensible
        </h1>
        <p style={{ margin: "0 0 32px", fontSize: "clamp(16px,1.4vw,18px)", color: "rgba(26,20,16,0.7)", lineHeight: 1.75 }}>{INTRO}</p>

        {SECTIONS.map(s => (
          <section key={s.h2} style={{ marginBottom: 30 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "clamp(20px,2.4vw,28px)", fontWeight: 950, letterSpacing: -0.8, color: C.dark }}>{s.h2}</h2>
            <p style={{ margin: 0, fontSize: "clamp(15px,1.3vw,17px)", color: "rgba(26,20,16,0.78)", lineHeight: 1.8 }}>{s.p}</p>
          </section>
        ))}

        {/* Disclaimer (aucun claim médical) */}
        <div style={{ margin: "8px 0 32px", padding: "16px 20px", borderRadius: 12, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.3)", fontSize: 14, color: "rgba(26,20,16,0.7)", lineHeight: 1.7, fontStyle: "italic" }}>
          {DISCLAIMER}
        </div>

        <section style={{ marginBottom: 30 }}>
          <h2 style={{ margin: "0 0 12px", fontSize: "clamp(20px,2.4vw,28px)", fontWeight: 950, letterSpacing: -0.8, color: C.dark }}>{DETAILS_H2}</h2>
          <p style={{ margin: 0, fontSize: "clamp(15px,1.3vw,17px)", color: "rgba(26,20,16,0.78)", lineHeight: 1.8 }}>{DETAILS_P}</p>
        </section>

        {/* FAQ */}
        <h2 style={{ margin: "44px 0 18px", fontSize: "clamp(20px,2.4vw,28px)", fontWeight: 950, letterSpacing: -0.8, color: C.dark }}>Questions fréquentes</h2>
        <div style={{ display: "grid", gap: 14, marginBottom: 44 }}>
          {FAQ.map(f => (
            <div key={f.q} style={{ padding: "18px 20px", borderRadius: 14, background: C.cream, border: "1px solid rgba(26,20,16,0.1)" }}>
              <div style={{ fontWeight: 900, fontSize: 16, color: C.dark, marginBottom: 6 }}>{f.q}</div>
              <div style={{ fontSize: 15, color: "rgba(26,20,16,0.72)", lineHeight: 1.7 }}>
                {f.a}
                {f.link && (
                  <>{" "}<Link href={f.link.href} style={{ color: C.amber, fontWeight: 700, textDecoration: "none" }}>{f.link.label}</Link></>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Liens internes */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {LINKS.map(l => (
            <Link key={l.href} href={l.href} style={{ padding: "12px 22px", borderRadius: 12, background: C.amber, color: C.dark, fontWeight: 900, fontSize: 14, textDecoration: "none" }}>{l.label}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
