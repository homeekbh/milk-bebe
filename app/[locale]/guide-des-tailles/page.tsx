import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Breadcrumb } from "@/components/seo/Breadcrumb";

export const revalidate = 3600;

const C = { dark: "#1a1410", amber: "#c49a4a", light: "#ede8df", cream: "#f2ede6", taupe: "#e9e1d4" };

const INTRO =
  "Choisir la bonne taille, c'est éviter deux galères : le vêtement trop grand qui flotte, et celui qu'on ne met jamais parce qu'il est déjà trop petit. Voici comment viser juste, de la maternité aux 6 mois.";

// Valeurs VALIDÉES PAR ERIKA — ne pas modifier.
const SIZES = [
  { taille: "Nouveau-né", age: "Naissance–1 mois", longueur: "~50 cm",    poids: "~2,5–4 kg" },
  { taille: "0-3 mois",   age: "0–3 mois",          longueur: "~50–60 cm", poids: "~4–6 kg"   },
  { taille: "3-6 mois",   age: "3–6 mois",          longueur: "~60–67 cm", poids: "~6–8 kg"   },
];

const SECTIONS = [
  { h2: "Comment mesurer bébé", p: "La taille en vêtement se base sur la taille (longueur), pas l'âge. Deux bébés de 2 mois peuvent avoir un écart de gabarit. Mesure bébé allongé, de la tête aux talons, jambes tendues. C'est cette valeur qui compte." },
  { h2: "Quelle taille à la naissance ?", p: "Si tu prépares la valise de maternité sans connaître le poids : prends du Nouveau-né ET du 0-3 mois. Les bébés grandissent vite — le 0-3 sert souvent dès les premières semaines. Pour un bébé annoncé costaud ou un terme dépassé, mise direct sur le 0-3." },
  { h2: "Et pour un cadeau ?", p: "Évite le Nouveau-né (trop vite trop petit). Le 3-6 mois est le choix malin : bébé le portera plus longtemps, et c'est rarement ce que les parents achètent en premier." },
];

const FAQ = [
  { q: "Bébé est entre deux tailles, je prends laquelle ?", a: "La plus grande. Un peu d'aisance vaut mieux qu'un vêtement qui serre." },
  { q: "Le bambou rétrécit-il au lavage ?", a: "Lavé à 30°, non." },
  { q: "Quelle différence entre Nouveau-né et 0-3 mois ?", a: "Environ 10 cm et un bon kilo. Le Nouveau-né est taillé pour les premières semaines, le 0-3 prend le relais vite." },
];

const LINKS = [
  { label: "Voir les bodies", href: "/categorie/bodies" },
  { label: "Voir les pyjamas", href: "/categorie/pyjamas" },
  { label: "Voir les gigoteuses", href: "/categorie/gigoteuses" },
];

export default async function GuideTaillesPage(
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div style={{ background: C.light, minHeight: "100vh", paddingTop: 92 }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 4vw 80px" }}>
        <Breadcrumb variant="dark" padding="12px 0" items={[{ label: "Guide des tailles" }]} />

        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, margin: "8px 0 10px" }}>Tailles M!LK</div>
        <h1 style={{ margin: "0 0 16px", fontSize: "clamp(28px,4.5vw,46px)", fontWeight: 950, letterSpacing: -1.6, color: C.dark, lineHeight: 1.05 }}>
          Guide des tailles bébé : de la naissance à 6 mois
        </h1>
        <p style={{ margin: "0 0 36px", fontSize: "clamp(16px,1.4vw,18px)", color: "rgba(26,20,16,0.7)", lineHeight: 1.75, maxWidth: 680 }}>{INTRO}</p>

        {/* Tableau des tailles */}
        <div style={{ overflowX: "auto", borderRadius: 16, border: "1px solid rgba(26,20,16,0.1)", background: C.cream, marginBottom: 44 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520, fontSize: 15 }}>
            <thead>
              <tr style={{ background: C.dark, color: C.cream }}>
                <th style={{ textAlign: "left", padding: "14px 18px", fontWeight: 800 }}>Taille M!LK</th>
                <th style={{ textAlign: "left", padding: "14px 18px", fontWeight: 800 }}>Âge indicatif</th>
                <th style={{ textAlign: "left", padding: "14px 18px", fontWeight: 800 }}>Taille de bébé</th>
                <th style={{ textAlign: "left", padding: "14px 18px", fontWeight: 800 }}>Poids indicatif</th>
              </tr>
            </thead>
            <tbody>
              {SIZES.map((s, i) => (
                <tr key={s.taille} style={{ borderTop: "1px solid rgba(26,20,16,0.08)", background: i % 2 ? "rgba(26,20,16,0.02)" : "transparent" }}>
                  <td style={{ padding: "14px 18px", fontWeight: 900, color: C.dark }}>{s.taille}</td>
                  <td style={{ padding: "14px 18px", color: "rgba(26,20,16,0.7)" }}>{s.age}</td>
                  <td style={{ padding: "14px 18px", color: "rgba(26,20,16,0.7)" }}>{s.longueur}</td>
                  <td style={{ padding: "14px 18px", color: "rgba(26,20,16,0.7)" }}>{s.poids}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sections */}
        {SECTIONS.map(s => (
          <section key={s.h2} style={{ marginBottom: 32 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "clamp(20px,2.4vw,28px)", fontWeight: 950, letterSpacing: -0.8, color: C.dark }}>{s.h2}</h2>
            <p style={{ margin: 0, fontSize: "clamp(15px,1.3vw,17px)", color: "rgba(26,20,16,0.78)", lineHeight: 1.8 }}>{s.p}</p>
          </section>
        ))}

        {/* FAQ */}
        <h2 style={{ margin: "44px 0 18px", fontSize: "clamp(20px,2.4vw,28px)", fontWeight: 950, letterSpacing: -0.8, color: C.dark }}>Questions fréquentes</h2>
        <div style={{ display: "grid", gap: 14, marginBottom: 44 }}>
          {FAQ.map(f => (
            <div key={f.q} style={{ padding: "18px 20px", borderRadius: 14, background: C.cream, border: "1px solid rgba(26,20,16,0.1)" }}>
              <div style={{ fontWeight: 900, fontSize: 16, color: C.dark, marginBottom: 6 }}>{f.q}</div>
              <div style={{ fontSize: 15, color: "rgba(26,20,16,0.72)", lineHeight: 1.7 }}>{f.a}</div>
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
