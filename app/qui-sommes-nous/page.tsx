import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Qui sommes-nous ? | M!LK — Essentiels bébé en bambou premium",
  description: "M!LK est née d'une frustration de parent. Découvrez notre histoire, nos valeurs et notre engagement pour le confort des nourrissons.",
  openGraph: {
    title: "Qui sommes-nous ? | M!LK",
    description: "La marque qui réduit les galères du quotidien avec des essentiels bébé en bambou premium.",
    url: "https://milk-bebe.fr/qui-sommes-nous",
    siteName: "M!LK", locale: "fr_FR", type: "website",
  },
  alternates: { canonical: "https://milk-bebe.fr/qui-sommes-nous" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "M!LK",
  description: "Marque de vêtements bébé premium en bambou certifié OEKO-TEX",
  url: "https://milk-bebe.fr",
  foundingDate: "2024",
  address: { "@type": "PostalAddress", addressCountry: "FR" },
};

const VALEURS = [
  { titre: "L'honnêteté avant tout",  texte: "On ne prétend pas révolutionner la mode. On fait des essentiels qui tiennent leurs promesses — chaque jour, pour chaque bébé.",          icon: "🤝" },
  { titre: "Moins, mais mieux",        texte: "Pas de collections saisonnières à outrance. On perfectionne les pièces qui comptent vraiment : body, pyjama, gigoteuse.",               icon: "✦"  },
  { titre: "La matière d'abord",       texte: "Chaque produit commence par une question : est-ce que cette matière est vraiment meilleure pour la peau de bébé ? Si non, on recommence.", icon: "🌿" },
  { titre: "Pensé par des parents",    texte: "On a vécu les galères. Les body qui s'ouvrent pas facilement à 3h du matin. La surchauffe. Les irritations. On les a réglées.",         icon: "👶" },
];

export default function QuiSommesNousPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <style>{`
        /* ✅ FIX MOBILE — toutes les grilles 1fr 1fr → 1 colonne sur mobile */
        .qsn-intro-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
        }
        .qsn-oekotex-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
        }
        .qsn-valeurs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .qsn-section { padding: 80px 6vw; }
        .qsn-hero-title { font-size: clamp(36px, 6vw, 72px); }
        .qsn-h2 { font-size: clamp(26px, 3.5vw, 46px); }
        .qsn-body-text { font-size: 18px; line-height: 1.8; }
        .qsn-lifestyle-overlay { padding: 0 60px; }

        @media (max-width: 768px) {
          .qsn-intro-grid {
            grid-template-columns: 1fr !important;
            gap: 36px !important;
          }
          .qsn-oekotex-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          .qsn-valeurs-grid {
            grid-template-columns: 1fr !important;
          }
          .qsn-section { padding: 48px 20px !important; }
          .qsn-body-text { font-size: 16px !important; line-height: 1.7 !important; }
          .qsn-lifestyle-box { height: 320px !important; }
          .qsn-lifestyle-overlay { padding: 0 24px !important; max-width: 100% !important; }
          .qsn-lifestyle-overlay h2 { font-size: 22px !important; }
          .qsn-cta-buttons { flex-direction: column !important; align-items: stretch !important; }
          .qsn-cta-buttons a { text-align: center !important; }
        }
      `}</style>

      <div style={{ background: "#1a1410", minHeight: "100vh" }}>

        {/* ── HERO ── */}
        <section style={{ position: "relative", height: "55vh", minHeight: 360, overflow: "hidden" }}>
          <Image
            src="https://images.unsplash.com/photo-1566004100631-35d015d6a491?w=1600&q=85"
            alt="Parent et nourrisson — M!LK bambou"
            fill priority sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center 30%", filter: "brightness(0.55) saturate(0.7)" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(26,20,16,0.2) 0%, rgba(26,20,16,0.85) 100%)" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", padding: "0 0 48px" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px", width: "100%", boxSizing: "border-box" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 14 }}>Notre histoire</div>
              <h1 className="qsn-hero-title" style={{ color: "#f2ede6", margin: 0, fontWeight: 950, letterSpacing: -2, lineHeight: 1.05 }}>
                Qui sommes-nous ?
              </h1>
            </div>
          </div>
        </section>

        {/* ── INTRO ── */}
        <section className="qsn-section" style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="qsn-intro-grid">

            {/* Texte */}
            <div style={{ display: "grid", gap: 24 }}>
              <h2 className="qsn-h2" style={{ margin: 0, fontWeight: 950, letterSpacing: -1.5, lineHeight: 1.15, color: "#f2ede6" }}>
                Née d'une frustration de parent.
              </h2>
              <p className="qsn-body-text" style={{ margin: 0, color: "rgba(242,237,230,0.65)" }}>
                M!LK est née d'un constat simple : la vraie vie avec un nourrisson n'est pas toujours Instagram. Trop chaud. Trop serré. Trop fragile. Trop compliqué.
              </p>
              <p className="qsn-body-text" style={{ margin: 0, color: "rgba(242,237,230,0.65)" }}>
                On a cherché des vêtements qui <strong style={{ color: "#f2ede6" }}>tiennent vraiment leurs promesses</strong> — pas juste dans les photos, mais à 3h du matin quand bébé transpire, quand le body ne s'ouvre pas.
              </p>
              <p className="qsn-body-text" style={{ margin: 0, color: "rgba(242,237,230,0.65)" }}>
                On n'a pas trouvé. Alors on a créé <strong style={{ color: "#c49a4a" }}>M!LK</strong>.
              </p>
            </div>

            {/* ✅ Image pleine largeur sur mobile */}
            <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", aspectRatio: "4/5", width: "100%" }}>
              <Image
                src="/univers-maman-bebe.png"
                alt="Mère et nourrisson — M!LK bambou"
                fill sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: "cover", objectPosition: "center", filter: "brightness(0.85) saturate(0.8)" }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(26,20,16,0.4) 0%, transparent 60%)" }} />
            </div>
          </div>
        </section>

        {/* ── CHIFFRES ── */}
        <section style={{ background: "#2d2419", padding: "60px 20px", borderTop: "1px solid rgba(242,237,230,0.08)", borderBottom: "1px solid rgba(242,237,230,0.08)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 2 }}>
            {[
              { valeur: "100%", label: "Bambou certifié OEKO-TEX" },
              { valeur: "0",    label: "Substance nocive"          },
              { valeur: "3×",   label: "Plus doux que le coton"   },
              { valeur: "30j",  label: "Retour gratuit"            },
            ].map(c => (
              <div key={c.label} style={{ padding: "32px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 950, letterSpacing: -2, color: "#c49a4a", lineHeight: 1 }}>{c.valeur}</div>
                <div style={{ marginTop: 10, fontSize: 14, color: "rgba(242,237,230,0.45)", fontWeight: 600, lineHeight: 1.4 }}>{c.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── VALEURS ── */}
        <section className="qsn-section" style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 14 }}>Ce en quoi on croit</div>
            <h2 className="qsn-h2" style={{ margin: 0, fontWeight: 950, letterSpacing: -1.5, lineHeight: 1.1, color: "#f2ede6" }}>
              Nos valeurs, au concret
            </h2>
          </div>
          <div className="qsn-valeurs-grid">
            {VALEURS.map(v => (
              <div key={v.titre} style={{ background: "#2d2419", borderRadius: 20, border: "1px solid rgba(242,237,230,0.08)", padding: "32px 26px" }}>
                <div style={{ fontSize: 30, marginBottom: 16 }}>{v.icon}</div>
                <h3 style={{ margin: "0 0 14px", fontSize: 19, fontWeight: 950, letterSpacing: -0.3, color: "#f2ede6", lineHeight: 1.2 }}>{v.titre}</h3>
                <p style={{ margin: 0, lineHeight: 1.75, color: "rgba(242,237,230,0.55)", fontSize: 15 }}>{v.texte}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── PHOTO LIFESTYLE ── */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 60px" }}>
          <div className="qsn-lifestyle-box" style={{ position: "relative", borderRadius: 24, overflow: "hidden", height: 440 }}>
            <Image
              src="/univers-nuit-calme.png"
              alt="Nourrisson endormi paisiblement — M!LK bambou thermorégulateur"
              fill sizes="100vw"
              style={{ objectFit: "cover", objectPosition: "center", filter: "brightness(0.65) saturate(0.7)" }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(26,20,16,0.9) 0%, rgba(26,20,16,0.2) 70%)", display: "flex", alignItems: "center" }}>
              <div className="qsn-lifestyle-overlay" style={{ maxWidth: 520, color: "#f2ede6" }}>
                <h2 style={{ margin: "0 0 16px", fontSize: "clamp(22px, 3.5vw, 38px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.15 }}>
                  L'essentiel. Sans compromis.
                </h2>
                <p style={{ margin: "0 0 24px", fontSize: 16, lineHeight: 1.7, color: "rgba(242,237,230,0.65)" }}>
                  Nous ne multiplions pas les collections. Nous perfectionnons les pièces qui comptent vraiment.
                </p>
                <Link href="/produits" style={{ display: "inline-block", padding: "13px 26px", borderRadius: 12, background: "#c49a4a", color: "#fff", fontWeight: 900, fontSize: 14, textDecoration: "none" }}>
                  Découvrir la collection →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{ background: "#221c16", padding: "60px 20px", borderTop: "1px solid rgba(242,237,230,0.08)" }}>
          <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 950, letterSpacing: -1, color: "#f2ede6", lineHeight: 1.15 }}>
              Prêt à découvrir M!LK ?
            </h2>
            <p style={{ margin: "0 0 28px", fontSize: 16, color: "rgba(242,237,230,0.45)", lineHeight: 1.7 }}>
              Des essentiels conçus pour les 3 premiers mois. Bambou certifié OEKO-TEX.
            </p>
            <div className="qsn-cta-buttons" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/produits" style={{ padding: "14px 30px", borderRadius: 14, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 15, textDecoration: "none", display: "inline-block" }}>
                Voir les produits
              </Link>
              <Link href="/pourquoi-bambou" style={{ padding: "14px 30px", borderRadius: 14, border: "1px solid rgba(242,237,230,0.2)", color: "#f2ede6", fontWeight: 800, fontSize: 15, textDecoration: "none", display: "inline-block" }}>
                Pourquoi le bambou ?
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}