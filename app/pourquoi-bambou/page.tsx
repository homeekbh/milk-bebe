import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pourquoi le bambou ? | M!LK — Vêtements nourrisson en bambou OEKO-TEX",
  description: "Thermorégulation, douceur extrême, antibactérien naturel — le bambou est la matière idéale pour la peau fragile des nourrissons. Certifié OEKO-TEX.",
};

const PROPRIETES = [
  {
    titre: "Thermorégulation naturelle",
    texte: "La fibre de bambou absorbe et évacue l'humidité 3× plus vite que le coton. Votre nourrisson reste à la bonne température, été comme hiver. Moins de surchauffe, moins de sueurs, moins de réveils nocturnes.",
    stat: "3×", statLabel: "plus respirant que le coton",
    image: "https://images.unsplash.com/photo-1544126592-807ade215a0b?w=800&q=85",
    imageAlt: "Nourrisson emmailloté — thermorégulation bambou M!LK",
  },
  {
    titre: "Douceur extrême",
    texte: "Les microfibres de bambou sont naturellement rondes, sans aspérités. La sensation est comparable à la soie. Pour la peau d'un nourrisson — 5× plus fine que celle d'un adulte — chaque frottement compte.",
    stat: "5×", statLabel: "plus doux que le coton classique",
    image: "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800&q=85",
    imageAlt: "Nourrisson qui joue — douceur bambou M!LK",
  },
  {
    titre: "Antibactérien naturel",
    texte: "Le bambou contient une substance naturelle qui inhibe la croissance des bactéries. Moins de bactéries : moins d'odeurs, moins d'irritations cutanées, moins de risques pour la peau ultra-sensible de votre nourrisson.",
    stat: "70%", statLabel: "de bactéries en moins vs coton",
    image: "https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?w=800&q=85",
    imageAlt: "Nourrisson en body bambou M!LK — peau douce protégée",
  },
  {
    titre: "Certifié OEKO-TEX Standard 100",
    texte: "Chaque produit M!LK est certifié OEKO-TEX Standard 100. Plus de 100 substances nocives testées. Résultat : zéro compromis sur la sécurité de votre nourrisson.",
    stat: "0", statLabel: "substance nocive détectée",
    image: "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800&q=85",
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

// ✅ SVG check/cross — aucun emoji
function Check({ amber = false }: { amber?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M5 12l5 5L19 7" stroke={amber ? "#c49a4a" : "#6bcf7f"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function Cross() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6l12 12" stroke="rgba(242,237,230,0.18)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export default function PourquoiBambouPage() {
  return (
    <>
      <style>{`
        .pb-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; margin-bottom: 64px; }
        .pb-rev   { }
        .pb-img   { order: 0; }
        .pb-txt   { order: 1; }
        .pb-rev .pb-img { order: 1; }
        .pb-rev .pb-txt { order: 0; }
        .pb-otgrid{ display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
        .pb-pad   { padding: 56px 5vw; }
        .pb-cmp   { display: grid; grid-template-columns: 1fr repeat(3, 110px); }
        @media (max-width: 900px) {
          .pb-grid  { grid-template-columns: 1fr !important; gap: 28px !important; margin-bottom: 48px !important; }
          .pb-rev .pb-img { order: 0 !important; }
          .pb-rev .pb-txt { order: 1 !important; }
          .pb-otgrid{ grid-template-columns: 1fr !important; gap: 28px !important; }
          .pb-cmp   { grid-template-columns: 1fr repeat(3, 72px) !important; }
          .pb-pad   { padding: 40px 5vw !important; }
        }
      `}</style>

      {/* ✅ Fond aligné sur homepage */}
      <div style={{ background: "#3a2a1a", minHeight: "100vh" }}>

        {/* HERO */}
        <section style={{ position: "relative", height: "52vh", minHeight: 320, overflow: "hidden" }}>
          <Image src="/matiere/bambou-02.png" alt="Tissu bambou naturel M!LK" fill priority sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center", filter: "brightness(0.5) saturate(0.6)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(26,20,16,0.1) 0%, rgba(26,20,16,0.88) 100%)" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", padding: "0 0 44px" }}>
            <div style={{ padding: "0 5vw", width: "100%", boxSizing: "border-box", color: "#f2ede6" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 12 }}>La matière</div>
              <h1 style={{ margin: "0 0 12px", fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 950, letterSpacing: -2, lineHeight: 1.05 }}>Pourquoi le bambou ?</h1>
              <p style={{ margin: 0, fontSize: "clamp(14px, 1.8vw, 18px)", color: "rgba(242,237,230,0.6)", maxWidth: 480, lineHeight: 1.65 }}>
                La peau d'un nourrisson est 5× plus fine que celle d'un adulte. Chaque matière compte.
              </p>
            </div>
          </div>
        </section>

        {/* INTRO */}
        <section className="pb-pad" style={{ maxWidth: 780, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ margin: "0 0 20px", fontSize: "clamp(22px, 3.5vw, 38px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.2, color: "#f2ede6" }}>
            La peau de votre nourrisson mérite mieux que le coton ordinaire
          </h2>
          <p style={{ margin: 0, fontSize: "clamp(15px, 1.6vw, 17px)", lineHeight: 1.8, color: "rgba(242,237,230,0.55)" }}>
            Nous avons passé des mois à chercher la meilleure matière pour les nourrissons. Après avoir testé le coton bio, le modal, le tencel — nous sommes revenus au bambou. Chaque fois. Pour les mêmes raisons.
          </p>
        </section>

        {/* PROPRIÉTÉS */}
        <section className="pb-pad" style={{ maxWidth: 1200, margin: "0 auto", paddingTop: 20 }}>
          {PROPRIETES.map((p, i) => (
            <div key={p.titre} className={`pb-grid${i % 2 !== 0 ? " pb-rev" : ""}`}>
              <div className="pb-img" style={{ position: "relative", borderRadius: 20, overflow: "hidden", aspectRatio: "4/3" }}>
                <Image src={p.image} alt={p.imageAlt} fill sizes="(max-width:900px) 100vw, 50vw"
                  style={{ objectFit: "cover", filter: "brightness(0.85) saturate(0.8)" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(26,20,16,0.55) 0%, transparent 55%)" }} />
                <div style={{ position: "absolute", bottom: 14, left: 14, background: "#c49a4a", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: "clamp(18px, 2.5vw, 24px)", fontWeight: 950, color: "#fff", lineHeight: 1 }}>{p.stat}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginTop: 2, maxWidth: 80, lineHeight: 1.3 }}>{p.statLabel}</div>
                </div>
              </div>
              <div className="pb-txt">
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 14 }}>
                  Propriété {i + 1} / {PROPRIETES.length}
                </div>
                <h2 style={{ margin: "0 0 18px", fontSize: "clamp(22px, 2.8vw, 34px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.15, color: "#f2ede6" }}>
                  {p.titre}
                </h2>
                <p style={{ margin: 0, fontSize: "clamp(14px, 1.5vw, 17px)", lineHeight: 1.8, color: "rgba(242,237,230,0.55)" }}>
                  {p.texte}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* ✅ COMPARATIF — pleine largeur, textes grands, pas de vide */}
        <section style={{ background: "#2a1e12", borderTop: "1px solid rgba(242,237,230,0.08)", borderBottom: "1px solid rgba(242,237,230,0.08)" }}>
          <div className="pb-pad" style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 10 }}>Comparatif matières</div>
              <h2 style={{ margin: 0, fontSize: "clamp(24px, 4vw, 44px)", fontWeight: 950, letterSpacing: -1, color: "#f2ede6" }}>
                Bambou vs Coton vs Synthétique
              </h2>
            </div>
            <div style={{ borderRadius: 16, overflow: "hidden" }}>
              {/* En-tête */}
              <div className="pb-cmp" style={{ display: "grid", background: "rgba(242,237,230,0.07)", padding: "16px 24px" }}>
                <div style={{ fontSize: "clamp(13px, 1.3vw, 15px)", color: "rgba(242,237,230,0.35)", fontWeight: 700 }}>Critère</div>
                {["Bambou M!LK", "Coton", "Synthétique"].map((h, idx) => (
                  <div key={h} style={{ textAlign: "center", fontSize: "clamp(12px, 1.2vw, 15px)", fontWeight: 900, color: idx === 0 ? "#c49a4a" : "rgba(242,237,230,0.35)" }}>{h}</div>
                ))}
              </div>
              {COMPARATIF.map((row, i) => (
                <div key={row.critere} className="pb-cmp" style={{ display: "grid", padding: "14px 24px", background: i % 2 === 0 ? "rgba(242,237,230,0.03)" : "transparent", borderBottom: i < COMPARATIF.length - 1 ? "1px solid rgba(242,237,230,0.05)" : "none", alignItems: "center" }}>
                  <div style={{ fontSize: "clamp(14px, 1.4vw, 17px)", color: "rgba(242,237,230,0.75)", fontWeight: 700 }}>{row.critere}</div>
                  <div style={{ display: "flex", justifyContent: "center" }}><Check amber /></div>
                  <div style={{ display: "flex", justifyContent: "center" }}>{row.coton  ? <Check /> : <Cross />}</div>
                  <div style={{ display: "flex", justifyContent: "center" }}>{row.synth  ? <Check /> : <Cross />}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* OEKO-TEX */}
        <section className="pb-pad" style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="pb-otgrid">
            <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", aspectRatio: "1" }}>
              <Image src="/matiere/bambou-02.png" alt="Nourrisson en body bambou certifié OEKO-TEX M!LK" fill sizes="(max-width:900px) 100vw, 50vw"
                style={{ objectFit: "cover", filter: "brightness(0.85) saturate(0.8)" }} />
            </div>
            <div style={{ display: "grid", gap: 18 }}>
              <div style={{ display: "inline-block", padding: "7px 14px", borderRadius: 99, background: "rgba(196,154,74,0.12)", color: "#c49a4a", fontSize: 11, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase", width: "fit-content", border: "1px solid rgba(196,154,74,0.2)" }}>
                Certifié OEKO-TEX Standard 100
              </div>
              <h2 style={{ margin: 0, fontSize: "clamp(20px, 3vw, 34px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.15, color: "#f2ede6" }}>
                La certification la plus exigeante pour les textiles nourrisson
              </h2>
              <p style={{ margin: 0, fontSize: "clamp(14px, 1.5vw, 17px)", lineHeight: 1.8, color: "rgba(242,237,230,0.55)" }}>
                OEKO-TEX Standard 100 teste plus de <strong style={{ color: "#f2ede6" }}>100 substances nocives</strong>. C'est la référence mondiale pour les textiles en contact avec la peau des nourrissons.
              </p>
              <p style={{ margin: 0, fontSize: "clamp(14px, 1.5vw, 17px)", lineHeight: 1.8, color: "rgba(242,237,230,0.55)" }}>
                Chaque lot M!LK est certifié. Pas de compromis. Pas d'exceptions.
              </p>
              <Link href="/produits" style={{ display: "inline-block", padding: "13px 26px", borderRadius: 12, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 14, textDecoration: "none", width: "fit-content" }}>
                Voir les produits certifiés →
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ background: "#221610", borderTop: "1px solid rgba(242,237,230,0.08)" }}>
          <div className="pb-pad" style={{ maxWidth: 900, margin: "0 auto" }}>
            <h2 style={{ margin: "0 0 28px", fontSize: "clamp(22px, 3.5vw, 36px)", fontWeight: 950, letterSpacing: -1, color: "#f2ede6" }}>
              Questions fréquentes sur le bambou
            </h2>
            {[
              { q: "Le bambou est-il vraiment meilleur que le coton bio pour les nourrissons ?", r: "Oui. Le bambou est naturellement thermorégulateur, antibactérien et 3× plus doux. Le coton bio est sans pesticides mais n'a pas ces propriétés fonctionnelles — un avantage décisif pour la peau ultra-sensible des nourrissons." },
              { q: "Le bambou rétrécit-il au lavage ?",     r: "Nos produits M!LK sont pré-lavés pour éviter le rétrécissement. Un lavage à 30°C maximum, cycle délicat, préserve la forme et la douceur indéfiniment." },
              { q: "Le bambou est-il durable pour l'environnement ?", r: "Oui — le bambou pousse sans pesticides, se régénère naturellement en quelques mois et consomme 30% moins d'eau que le coton." },
              { q: "Puis-je mettre les vêtements M!LK en machine ?", r: "Oui, machine à 30°C, cycle délicat. Évitez l'adoucissant. Séchage à plat recommandé." },
            ].map((faq, i, arr) => (
              <div key={faq.q} style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(242,237,230,0.07)" : "none", padding: "18px 0" }}>
                <h3 style={{ margin: "0 0 10px", fontSize: "clamp(15px, 1.8vw, 18px)", fontWeight: 900, color: "#f2ede6", lineHeight: 1.35 }}>{faq.q}</h3>
                <p style={{ margin: 0, fontSize: "clamp(13px, 1.4vw, 16px)", lineHeight: 1.75, color: "rgba(242,237,230,0.5)" }}>{faq.r}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="pb-pad" style={{ textAlign: "center" }}>
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(22px, 3.5vw, 36px)", fontWeight: 950, letterSpacing: -1, color: "#f2ede6" }}>
              Prêt à essayer le bambou ?
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: "clamp(14px, 1.5vw, 16px)", color: "rgba(242,237,230,0.45)", lineHeight: 1.7 }}>
              Tous nos produits sont en bambou certifié OEKO-TEX. Livraison offerte dès 60€.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/produits" style={{ padding: "14px 30px", borderRadius: 14, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 15, textDecoration: "none" }}>
                Voir la collection
              </Link>
              <Link href="/qui-sommes-nous" style={{ padding: "14px 30px", borderRadius: 14, border: "1px solid rgba(242,237,230,0.2)", color: "#f2ede6", fontWeight: 800, fontSize: 15, textDecoration: "none" }}>
                Notre histoire
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}