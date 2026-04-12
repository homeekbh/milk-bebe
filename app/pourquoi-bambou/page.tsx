import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pourquoi le bambou ? | M!LK — Vêtements nourrisson en bambou OEKO-TEX",
  description: "Thermorégulation, douceur extrême, antibactérien naturel — le bambou est la matière idéale pour la peau fragile des nourrissons. Certifié OEKO-TEX.",
  keywords: ["bambou nourrisson", "vêtements bébé bambou", "OEKO-TEX bébé", "thermorégulation nourrisson"],
  openGraph: {
    title: "Pourquoi le bambou pour habiller votre nourrisson ? | M!LK",
    description: "Thermorégulation, douceur, antibactérien naturel — le bambou est la matière idéale pour la peau fragile des nourrissons.",
    url: "https://milk-bebe.fr/pourquoi-bambou",
    siteName: "M!LK", locale: "fr_FR", type: "article",
  },
  alternates: { canonical: "https://milk-bebe.fr/pourquoi-bambou" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Pourquoi le bambou est la meilleure matière pour habiller votre nourrisson",
  author: { "@type": "Organization", name: "M!LK" },
  publisher: { "@type": "Organization", name: "M!LK" },
};

const PROPRIETES = [
  {
    titre: "Thermorégulation naturelle",
    texte: "La fibre de bambou absorbe et évacue l'humidité 3 fois plus vite que le coton. Résultat : votre nourrisson reste à la bonne température, été comme hiver. Moins de surchauffe, moins de sueurs, moins de réveils nocturnes.",
    stat: "3×", statLabel: "plus respirant que le coton",
    image: "https://images.unsplash.com/photo-1544126592-807ade215a0b?w=800&q=85",
    imageAlt: "Nourrisson emmailloté — thermorégulation bambou M!LK",
  },
  {
    titre: "Douceur extrême",
    texte: "Les microfibres de bambou sont naturellement rondes, sans aspérités. La sensation est comparable à la soie. Pour la peau d'un nourrisson — 5 fois plus fine que celle d'un adulte — chaque frottement compte.",
    stat: "5×", statLabel: "plus doux que le coton classique",
    image: "/images/products/body-damier-noir-blanc/milk-body-damier-fin-noir-blanc-bebe-fille-jeu-jouet-bois-lifestyle-02.png",
    imageAlt: "Nourrisson qui joue — douceur bambou M!LK",
  },
  {
    titre: "Antibactérien naturel",
    texte: "Le bambou contient une substance naturelle qui inhibe la croissance des bactéries. Moins de bactéries signifie moins d'odeurs, moins d'irritations cutanées, et moins de risques pour la peau ultra-sensible de votre nourrisson.",
    stat: "70%", statLabel: "de bactéries en moins vs coton",
    image: "/images/products/body-smiley-camel/milk-body-smiley-camel-nouveau-ne-3-mois-allonge-lifestyle-01.png",
    imageAlt: "Nourrisson en body bambou M!LK — peau douce protégée",
  },
  {
    titre: "Certifié OEKO-TEX Standard 100",
    texte: "Chaque produit M!LK est certifié OEKO-TEX Standard 100, la certification la plus exigeante pour les textiles bébé. Plus de 100 substances nocives testées. Résultat : zéro compromis sur la sécurité de votre nourrisson.",
    stat: "0", statLabel: "substance nocive détectée",
    image: "/images/products/pyjama-terracotta/milk-pyjama-zip-bambou-terracotta-nouveau-ne-endormi-lifestyle-01.png",
    imageAlt: "Nourrisson endormi en pyjama bambou certifié OEKO-TEX M!LK",
  },
];

const COMPARATIF = [
  { critere: "Thermorégulation",      bambou: true,  coton: false, synth: false },
  { critere: "Antibactérien naturel", bambou: true,  coton: false, synth: false },
  { critere: "Certifié OEKO-TEX",     bambou: true,  coton: false, synth: false },
  { critere: "Douceur extrême",       bambou: true,  coton: false, synth: false },
  { critere: "Sans pesticides",       bambou: true,  coton: false, synth: true  },
  { critere: "Biodégradable",         bambou: true,  coton: true,  synth: false },
  { critere: "Durable au lavage",     bambou: true,  coton: true,  synth: true  },
];

export default function PourquoiBambouPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <style>{`
        /* ✅ FIX MOBILE — plus de direction:rtl, grilles responsives */
        .pb-prop-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
          margin-bottom: 80px;
        }
        .pb-prop-img  { order: 0; }
        .pb-prop-text { order: 1; }
        .pb-prop-grid.reverse .pb-prop-img  { order: 1; }
        .pb-prop-grid.reverse .pb-prop-text { order: 0; }

        .pb-oekotex-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
        }
        .pb-section { padding: 60px 20px; }
        .pb-body { font-size: 17px; line-height: 1.8; }
        .pb-comparatif-grid { grid-template-columns: 1fr repeat(3, 100px); }
        .pb-cta-btns { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }

        @media (max-width: 768px) {
          .pb-prop-grid {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
            margin-bottom: 56px !important;
          }
          /* Toujours image en premier sur mobile */
          .pb-prop-grid .pb-prop-img  { order: 0 !important; }
          .pb-prop-grid .pb-prop-text { order: 1 !important; }
          .pb-prop-grid.reverse .pb-prop-img  { order: 0 !important; }
          .pb-prop-grid.reverse .pb-prop-text { order: 1 !important; }

          .pb-oekotex-grid {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }
          .pb-section { padding: 40px 20px !important; }
          .pb-body { font-size: 15px !important; line-height: 1.7 !important; }
          .pb-comparatif-grid { grid-template-columns: 1fr repeat(3, 72px) !important; }
          .pb-cta-btns { flex-direction: column !important; align-items: stretch !important; }
          .pb-cta-btns a { text-align: center !important; }
          .pb-intro-text { font-size: 16px !important; line-height: 1.7 !important; }
        }
      `}</style>

      <div style={{ background: "#1a1410", minHeight: "100vh" }}>

        {/* ── HERO ── */}
        <section style={{ position: "relative", height: "55vh", minHeight: 340, overflow: "hidden" }}>
          <Image
            src="/matiere/bambou-02.png"
            alt="Tissu bambou naturel — matière première vêtements nourrisson M!LK"
            fill priority sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center", filter: "brightness(0.55) saturate(0.6)" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(26,20,16,0.1) 0%, rgba(26,20,16,0.85) 100%)" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", padding: "0 0 48px" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px", width: "100%", boxSizing: "border-box", color: "#f2ede6" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 14 }}>La matière</div>
              <h1 style={{ margin: "0 0 14px", fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 950, letterSpacing: -2, lineHeight: 1.05 }}>
                Pourquoi le bambou ?
              </h1>
              <p style={{ margin: 0, fontSize: "clamp(14px, 2vw, 18px)", color: "rgba(242,237,230,0.65)", maxWidth: 480, lineHeight: 1.65 }}>
                La peau d'un nourrisson est 5 fois plus fine que celle d'un adulte. Chaque matière compte.
              </p>
            </div>
          </div>
        </section>

        {/* ── INTRO ── */}
        <section className="pb-section" style={{ maxWidth: 780, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ margin: "0 0 24px", fontSize: "clamp(22px, 3.5vw, 38px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.2, color: "#f2ede6" }}>
            La peau de votre nourrisson mérite mieux que le coton ordinaire
          </h2>
          <p className="pb-intro-text" style={{ margin: 0, fontSize: 17, lineHeight: 1.8, color: "rgba(242,237,230,0.55)" }}>
            Nous avons passé des mois à chercher la meilleure matière pour les nourrissons. Après avoir testé le coton bio, le modal, le tencel — nous sommes revenus au bambou. Chaque fois. Pour les mêmes raisons.
          </p>
        </section>

        {/* ── PROPRIÉTÉS ── */}
        <section className="pb-section" style={{ maxWidth: 1100, margin: "0 auto", paddingTop: 20 }}>
          {PROPRIETES.map((p, i) => (
            <div key={p.titre} className={`pb-prop-grid${i % 2 !== 0 ? " reverse" : ""}`}>

              {/* Image — toujours en premier sur mobile */}
              <div className="pb-prop-img" style={{ position: "relative", borderRadius: 20, overflow: "hidden", aspectRatio: "4/3", width: "100%" }}>
                <Image
                  src={p.image}
                  alt={p.imageAlt}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{ objectFit: "cover", filter: "brightness(0.85) saturate(0.8)" }}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(26,20,16,0.55) 0%, transparent 55%)" }} />
                {/* Badge stat */}
                <div style={{ position: "absolute", bottom: 16, left: 16, background: "#c49a4a", borderRadius: 12, padding: "12px 16px", textAlign: "center", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
                  <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: -1, color: "#fff", lineHeight: 1 }}>{p.stat}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginTop: 3, maxWidth: 80, lineHeight: 1.3 }}>{p.statLabel}</div>
                </div>
              </div>

              {/* Texte */}
              <div className="pb-prop-text">
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 16 }}>
                  Propriété {i + 1} / {PROPRIETES.length}
                </div>
                <h2 style={{ margin: "0 0 20px", fontSize: "clamp(22px, 2.8vw, 34px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.15, color: "#f2ede6" }}>
                  {p.titre}
                </h2>
                <p className="pb-body" style={{ margin: 0, color: "rgba(242,237,230,0.55)" }}>
                  {p.texte}
                </p>
              </div>

            </div>
          ))}
        </section>

        {/* ── COMPARATIF ── */}
        <section style={{ background: "#2d2419", padding: "60px 20px", borderTop: "1px solid rgba(242,237,230,0.08)", borderBottom: "1px solid rgba(242,237,230,0.08)" }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 12 }}>Comparatif matières</div>
              <h2 style={{ margin: 0, fontSize: "clamp(22px, 3.5vw, 38px)", fontWeight: 950, letterSpacing: -1, color: "#f2ede6" }}>
                Bambou vs Coton vs Synthétique
              </h2>
            </div>
            <div style={{ borderRadius: 16, overflow: "hidden" }}>
              <div className="pb-comparatif-grid" style={{ display: "grid", background: "rgba(242,237,230,0.05)", padding: "14px 20px" }}>
                <div style={{ fontSize: 12, color: "rgba(242,237,230,0.35)", fontWeight: 700 }}>Critère</div>
                {["Bambou M!LK", "Coton", "Synthétique"].map((h, idx) => (
                  <div key={h} style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: idx === 0 ? "#c49a4a" : "rgba(242,237,230,0.35)" }}>{h}</div>
                ))}
              </div>
              {COMPARATIF.map((row, i) => (
                <div key={row.critere} className="pb-comparatif-grid" style={{ display: "grid", padding: "12px 20px", background: i % 2 === 0 ? "rgba(242,237,230,0.03)" : "transparent", borderBottom: i < COMPARATIF.length - 1 ? "1px solid rgba(242,237,230,0.05)" : "none", alignItems: "center" }}>
                  <div style={{ fontSize: 14, color: "rgba(242,237,230,0.7)", fontWeight: 600 }}>{row.critere}</div>
                  {[row.bambou, row.coton, row.synth].map((val, j) => (
                    <div key={j} style={{ textAlign: "center", fontSize: 16 }}>
                      {val
                        ? <span style={{ color: j === 0 ? "#c49a4a" : "#6bcf7f" }}>✓</span>
                        : <span style={{ color: "rgba(242,237,230,0.15)" }}>✕</span>
                      }
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── OEKO-TEX ── */}
        <section className="pb-section" style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="pb-oekotex-grid">
            <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", aspectRatio: "1", width: "100%" }}>
              <Image
                src="/images/products/body-eclair-gris/milk-body-eclair-gris-bebe-rampant-lifestyle-01.png"
                alt="Nourrisson en body bambou certifié OEKO-TEX M!LK"
                fill sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: "cover", filter: "brightness(0.85) saturate(0.8)" }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(26,20,16,0.5) 0%, transparent 60%)" }} />
            </div>
            <div style={{ display: "grid", gap: 20 }}>
              <div style={{ display: "inline-block", padding: "7px 14px", borderRadius: 99, background: "rgba(196,154,74,0.12)", color: "#c49a4a", fontSize: 11, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase", width: "fit-content", border: "1px solid rgba(196,154,74,0.2)" }}>
                Certifié OEKO-TEX Standard 100
              </div>
              <h2 style={{ margin: 0, fontSize: "clamp(20px, 3vw, 34px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.15, color: "#f2ede6" }}>
                La certification la plus exigeante pour les textiles nourrisson
              </h2>
              <p className="pb-body" style={{ margin: 0, color: "rgba(242,237,230,0.55)" }}>
                OEKO-TEX Standard 100 teste plus de <strong style={{ color: "#f2ede6" }}>100 substances nocives</strong>. C'est la référence mondiale pour les textiles en contact avec la peau des nourrissons.
              </p>
              <p className="pb-body" style={{ margin: 0, color: "rgba(242,237,230,0.55)" }}>
                Chaque lot M!LK est certifié. Pas de compromis. Pas d'exceptions.
              </p>
              <Link href="/produits" style={{ display: "inline-block", padding: "13px 26px", borderRadius: 12, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 14, textDecoration: "none", width: "fit-content" }}>
                Voir les produits certifiés →
              </Link>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ background: "#221c16", padding: "60px 20px", borderTop: "1px solid rgba(242,237,230,0.08)" }}>
          <div style={{ maxWidth: 740, margin: "0 auto" }}>
            <h2 style={{ margin: "0 0 40px", fontSize: "clamp(22px, 3.5vw, 36px)", fontWeight: 950, letterSpacing: -1, color: "#f2ede6" }}>
              Questions fréquentes sur le bambou
            </h2>
            {[
              { q: "Le bambou est-il vraiment meilleur que le coton bio pour les nourrissons ?", r: "Oui. Le bambou est naturellement thermorégulateur, antibactérien et 3× plus doux. Le coton bio est sans pesticides mais n'a pas ces propriétés fonctionnelles — un avantage décisif pour la peau ultra-sensible des nourrissons." },
              { q: "Le bambou rétrécit-il au lavage ?",     r: "Nos produits M!LK sont pré-lavés pour éviter le rétrécissement. Un lavage à 30°C maximum, cycle délicat, préserve la forme et la douceur indéfiniment." },
              { q: "Le bambou est-il durable pour l'environnement ?", r: "Oui — le bambou pousse sans pesticides, se régénère naturellement en quelques mois et consomme 30% moins d'eau que le coton. C'est l'une des plantes les plus durables au monde." },
              { q: "Puis-je mettre les vêtements M!LK en machine ?", r: "Oui, machine à 30°C, cycle délicat. Évitez l'adoucissant qui réduit les propriétés respirantes du bambou. Séchage à plat recommandé." },
            ].map((faq, i, arr) => (
              <div key={faq.q} style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(242,237,230,0.08)" : "none", padding: "24px 0" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: "clamp(15px, 2vw, 18px)", fontWeight: 900, color: "#f2ede6", lineHeight: 1.4 }}>{faq.q}</h3>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: "rgba(242,237,230,0.5)" }}>{faq.r}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{ padding: "60px 20px" }}>
          <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: "clamp(22px, 3.5vw, 36px)", fontWeight: 950, letterSpacing: -1, color: "#f2ede6" }}>
              Prêt à essayer le bambou ?
            </h2>
            <p style={{ margin: "0 0 28px", fontSize: 16, color: "rgba(242,237,230,0.45)", lineHeight: 1.7 }}>
              Tous nos produits sont en bambou certifié OEKO-TEX. Livraison offerte dès 60€.
            </p>
            <div className="pb-cta-btns">
              <Link href="/produits" style={{ padding: "14px 30px", borderRadius: 14, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 15, textDecoration: "none", display: "inline-block" }}>
                Voir la collection
              </Link>
              <Link href="/qui-sommes-nous" style={{ padding: "14px 30px", borderRadius: 14, border: "1px solid rgba(242,237,230,0.2)", color: "#f2ede6", fontWeight: 800, fontSize: 15, textDecoration: "none", display: "inline-block" }}>
                Notre histoire
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}