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
    siteName: "M!LK",
    locale: "fr_FR",
    type: "website",
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
  { titre: "L'honnêteté avant tout", texte: "On ne prétend pas révolutionner la mode. On fait des essentiels qui tiennent leurs promesses — chaque jour, pour chaque bébé.", emoji: "🤝" },
  { titre: "Moins, mais mieux", texte: "Pas de collections saisonnières à outrance. On perfectionne les pièces qui comptent vraiment : body, pyjama, gigoteuse.", emoji: "✦" },
  { titre: "La matière d'abord", texte: "Chaque produit commence par une question : est-ce que cette matière est vraiment meilleure pour la peau de bébé ? Si non, on recommence.", emoji: "🌿" },
  { titre: "Pensé par des parents", texte: "On a vécu les galères. Les body qui s'ouvrent pas facilement à 3h du matin. La surchauffe. Les irritations. On les a réglées.", emoji: "👶" },
];

export default function QuiSommesNousPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ background: "#1a1410", minHeight: "100vh" }}>

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section style={{ position: "relative", height: "65vh", minHeight: 480, overflow: "hidden" }}>
          <Image
            src="https://images.unsplash.com/photo-1566004100631-35d015d6a491?w=1600&q=85"
            alt="Parent consolant son nourrisson qui pleure la nuit — M!LK bambou"
            fill priority sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center 30%", filter: "brightness(0.55) saturate(0.7)" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(26,20,16,0.2) 0%, rgba(26,20,16,0.85) 100%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at bottom left, rgba(196,154,74,0.1), transparent 60%)" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", padding: "0 0 64px" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 6vw", width: "100%" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 16 }}>Notre histoire</div>
              <h1 style={{ color: "#f2ede6", margin: 0, fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 950, letterSpacing: -2, lineHeight: 1.05, maxWidth: 700 }}>
                Qui sommes-nous ?
              </h1>
            </div>
          </div>
        </section>

        {/* ── INTRO ────────────────────────────────────────────── */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 6vw" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>

            <div style={{ display: "grid", gap: 28 }}>
              <h2 style={{ margin: 0, fontSize: "clamp(30px, 3.5vw, 46px)", fontWeight: 950, letterSpacing: -1.5, lineHeight: 1.1, color: "#f2ede6" }}>
                Née d'une frustration de parent.
              </h2>
              <p style={{ margin: 0, fontSize: 18, lineHeight: 2, color: "rgba(242,237,230,0.65)" }}>
                M!LK est née d'un constat simple : la vraie vie avec un nourrisson n'est pas toujours Instagram. Trop chaud. Trop serré. Trop fragile. Trop compliqué.
              </p>
              <p style={{ margin: 0, fontSize: 18, lineHeight: 2, color: "rgba(242,237,230,0.65)" }}>
                On a cherché des vêtements qui <strong style={{ color: "#f2ede6" }}>tiennent vraiment leurs promesses</strong> — pas juste dans les photos, mais à 3h du matin quand bébé transpire, quand le body ne s'ouvre pas.
              </p>
              <p style={{ margin: 0, fontSize: 18, lineHeight: 2, color: "rgba(242,237,230,0.65)" }}>
                On n'a pas trouvé. Alors on a créé <strong style={{ color: "#c49a4a" }}>M!LK</strong>.
              </p>
            </div>

            {/* Photo locale — famille / univers naissance */}
            <div style={{ position: "relative", borderRadius: 28, overflow: "hidden", aspectRatio: "4/5" }}>
              <Image
                src="/univers-maman-bebe.png"
                alt="Moment intimiste mère et nourrisson — M!LK bambou"
                fill sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: "cover", objectPosition: "center", filter: "brightness(0.8) saturate(0.7)" }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(26,20,16,0.4) 0%, transparent 60%)" }} />
            </div>
          </div>
        </section>

        {/* ── CHIFFRES ─────────────────────────────────────────── */}
        <section style={{ background: "#2d2419", padding: "72px 6vw", borderTop: "1px solid rgba(242,237,230,0.08)", borderBottom: "1px solid rgba(242,237,230,0.08)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 2 }}>
            {[
              { valeur: "100%", label: "Bambou certifié OEKO-TEX" },
              { valeur: "0",    label: "Substance nocive" },
              { valeur: "3×",   label: "Plus doux que le coton" },
              { valeur: "30j",  label: "Retour gratuit" },
            ].map(c => (
              <div key={c.label} style={{ padding: "40px 32px", textAlign: "center" }}>
                <div style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 950, letterSpacing: -2, color: "#c49a4a", lineHeight: 1 }}>{c.valeur}</div>
                <div style={{ marginTop: 12, fontSize: 15, color: "rgba(242,237,230,0.45)", fontWeight: 600, lineHeight: 1.4 }}>{c.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── VALEURS ──────────────────────────────────────────── */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 6vw" }}>
          <div style={{ marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 16 }}>Ce en quoi on croit</div>
            <h2 style={{ margin: 0, fontSize: "clamp(30px, 3.5vw, 48px)", fontWeight: 950, letterSpacing: -1.5, lineHeight: 1.1, color: "#f2ede6" }}>
              Nos valeurs, au concret
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {VALEURS.map(v => (
              <div key={v.titre} style={{ background: "#2d2419", borderRadius: 24, border: "1px solid rgba(242,237,230,0.08)", padding: "36px 30px" }}>
                <div style={{ fontSize: 32, marginBottom: 18 }}>{v.emoji}</div>
                <h3 style={{ margin: "0 0 16px", fontSize: 21, fontWeight: 950, letterSpacing: -0.3, color: "#f2ede6" }}>{v.titre}</h3>
                <p style={{ margin: 0, lineHeight: 1.85, color: "rgba(242,237,230,0.55)", fontSize: 16 }}>{v.texte}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── PHOTO LIFESTYLE LARGE ────────────────────────────── */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 6vw 80px" }}>
          <div style={{ position: "relative", borderRadius: 28, overflow: "hidden", height: 480 }}>
            <Image
              src="/univers-nuit-calme.png"
              alt="Nourrisson endormi paisiblement — M!LK bambou thermorégulateur"
              fill sizes="100vw"
              style={{ objectFit: "cover", objectPosition: "center", filter: "brightness(0.65) saturate(0.7)" }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(26,20,16,0.88) 0%, rgba(26,20,16,0.1) 60%)", display: "flex", alignItems: "center" }}>
              <div style={{ padding: "0 60px", maxWidth: 520, color: "#f2ede6" }}>
                <h2 style={{ margin: "0 0 18px", fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.1 }}>
                  L'essentiel. Sans compromis.
                </h2>
                <p style={{ margin: "0 0 28px", fontSize: 17, lineHeight: 1.85, color: "rgba(242,237,230,0.65)" }}>
                  Nous ne multiplions pas les collections. Nous perfectionnons les pièces qui comptent vraiment.
                </p>
                <Link href="/produits" style={{ display: "inline-block", padding: "14px 28px", borderRadius: 12, background: "#c49a4a", color: "#fff", fontWeight: 900, fontSize: 14, textDecoration: "none" }}>
                  Découvrir la collection →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <section style={{ background: "#221c16", padding: "72px 6vw", borderTop: "1px solid rgba(242,237,230,0.08)" }}>
          <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ margin: "0 0 18px", fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 950, letterSpacing: -1, color: "#f2ede6" }}>
              Prêt à découvrir M!LK ?
            </h2>
            <p style={{ margin: "0 0 32px", fontSize: 17, color: "rgba(242,237,230,0.45)", lineHeight: 1.75 }}>
              Des essentiels conçus pour les 3 premiers mois. Bambou certifié OEKO-TEX.
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/produits" style={{ padding: "15px 32px", borderRadius: 14, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 15, textDecoration: "none" }}>
                Voir les produits
              </Link>
              <Link href="/pourquoi-bambou" style={{ padding: "15px 32px", borderRadius: 14, border: "1px solid rgba(242,237,230,0.2)", color: "#f2ede6", fontWeight: 800, fontSize: 15, textDecoration: "none" }}>
                Pourquoi le bambou ?
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}