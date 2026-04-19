import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Qui sommes-nous ? | M!LK — Essentiels bébé en bambou premium",
  description: "M!LK est née d'une frustration de parent. Découvrez notre histoire, nos valeurs et notre engagement pour le confort des nourrissons.",
};

const VALEURS = [
  { titre: "L'honnêteté avant tout",  texte: "On ne prétend pas révolutionner la mode. On fait des essentiels qui tiennent leurs promesses — chaque jour, pour chaque bébé." },
  { titre: "Moins, mais mieux",        texte: "Pas de collections saisonnières à outrance. On perfectionne les pièces qui comptent vraiment : body, pyjama, gigoteuse."        },
  { titre: "La matière d'abord",       texte: "Chaque produit commence par une question : est-ce que cette matière est vraiment meilleure pour la peau de bébé ?"              },
  { titre: "Pensé par des parents",    texte: "On a vécu les galères. Les body qui s'ouvrent pas à 3h du matin. La surchauffe. Les irritations. On les a réglées."             },
];

// ✅ SVG icons au trait — couleurs site uniquement
function IconHands() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M8 12V7.5a1.5 1.5 0 0 1 3 0V12m0 0V6.5a1.5 1.5 0 0 1 3 0V12m0 0V8.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6v-1a1.5 1.5 0 0 1 3 0" stroke="#c49a4a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconDiamond() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2l3 6h5l-4 5 2 7-6-4-6 4 2-7L4 8h5l3-6z" stroke="#c49a4a" strokeWidth="1.6" strokeLinejoin="round"/></svg>;
}
function IconLeaf() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 22C12 22 4 16 4 9a8 8 0 0 1 16 0c0 7-8 13-8 13z" stroke="#c49a4a" strokeWidth="1.6" strokeLinejoin="round"/><path d="M12 22V9" stroke="#c49a4a" strokeWidth="1.6" strokeLinecap="round"/></svg>;
}
function IconBaby() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="6" r="3" stroke="#c49a4a" strokeWidth="1.6"/><path d="M5 20a7 7 0 0 1 14 0" stroke="#c49a4a" strokeWidth="1.6" strokeLinecap="round"/><path d="M9 13c0 1.5.5 3 3 3s3-1.5 3-3" stroke="#c49a4a" strokeWidth="1.6" strokeLinecap="round"/></svg>;
}

const VALEUR_ICONS = [IconHands, IconDiamond, IconLeaf, IconBaby];

export default function QuiSommesNousPage() {
  return (
    <>
      <style>{`
        .qsn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
        .qsn-val  { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .qsn-kpis { display: grid; grid-template-columns: repeat(4, 1fr); }
        .qsn-pad  { padding: 64px 5vw; }
        @media (max-width: 900px) {
          .qsn-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .qsn-val  { grid-template-columns: 1fr !important; }
          .qsn-kpis { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .qsn-pad { padding: 40px 5vw !important; }
        }
      `}</style>

      <div style={{ background: "#3a2a1a", minHeight: "100vh" }}>

        {/* ── HERO ✅ nouvelle image joyeuse */}
        <section style={{ position: "relative", height: "56vh", minHeight: 340, overflow: "hidden" }}>
          <Image
            src="https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=1600&q=85"
            alt="Nourrisson souriant et parent heureux — M!LK bambou"
            fill priority sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center 40%", filter: "brightness(0.55) saturate(0.75)" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(26,20,16,0.1) 0%, rgba(26,20,16,0.85) 100%)" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", padding: "0 0 44px" }}>
            <div style={{ padding: "0 5vw", width: "100%", boxSizing: "border-box" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 12 }}>Notre histoire</div>
              <h1 style={{ color: "#f2ede6", margin: 0, fontWeight: 950, letterSpacing: -2, lineHeight: 1.05, fontSize: "clamp(36px, 6vw, 72px)" }}>
                Qui sommes-nous ?
              </h1>
            </div>
          </div>
        </section>

        {/* ── INTRO ── */}
        <section className="qsn-pad">
          <div className="qsn-grid">
            <div style={{ display: "grid", gap: 22 }}>
              <h2 style={{ margin: 0, fontWeight: 950, letterSpacing: -1.5, lineHeight: 1.15, color: "#f2ede6", fontSize: "clamp(26px, 3.5vw, 46px)" }}>
                Née d'une frustration de parent.
              </h2>
              <p style={{ margin: 0, color: "rgba(242,237,230,0.65)", fontSize: "clamp(15px, 1.5vw, 18px)", lineHeight: 1.8 }}>
                M!LK est née d'un constat simple : la vraie vie avec un nourrisson n'est pas toujours Instagram. Trop chaud. Trop serré. Trop fragile.
              </p>
              <p style={{ margin: 0, color: "rgba(242,237,230,0.65)", fontSize: "clamp(15px, 1.5vw, 18px)", lineHeight: 1.8 }}>
                On a cherché des vêtements qui <strong style={{ color: "#f2ede6" }}>tiennent vraiment leurs promesses</strong> — pas juste dans les photos, mais à 3h du matin quand bébé transpire.
              </p>
              <p style={{ margin: 0, color: "rgba(242,237,230,0.65)", fontSize: "clamp(15px, 1.5vw, 18px)", lineHeight: 1.8 }}>
                On n'a pas trouvé. Alors on a créé <strong style={{ color: "#c49a4a" }}>M!LK</strong>.
              </p>
            </div>
            <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", aspectRatio: "4/5" }}>
              <Image src="/univers-maman-bebe.png" alt="Parent et nourrisson" fill sizes="(max-width:900px) 100vw, 50vw"
                style={{ objectFit: "cover", filter: "brightness(0.9) saturate(0.85)" }} />
            </div>
          </div>
        </section>

        {/* ✅ KPIs — grands, sans vide, sans emoji */}
        <section style={{ background: "#2a1e12", borderTop: "1px solid rgba(242,237,230,0.08)", borderBottom: "1px solid rgba(242,237,230,0.08)" }}>
          <div className="qsn-kpis" style={{ padding: "0 5vw" }}>
            {[
              { valeur: "100%", label: "Bambou certifié OEKO-TEX" },
              { valeur: "0",    label: "Substance nocive"          },
              { valeur: "3×",   label: "Plus doux que le coton"   },
              { valeur: "30j",  label: "Retour gratuit"            },
            ].map((c, i) => (
              <div key={c.label} style={{ padding: "36px 12px", textAlign: "center", borderRight: i < 3 ? "1px solid rgba(242,237,230,0.08)" : "none" }}>
                <div style={{ fontSize: "clamp(40px, 5vw, 64px)", fontWeight: 950, letterSpacing: -2, color: "#c49a4a", lineHeight: 1 }}>{c.valeur}</div>
                <div style={{ marginTop: 8, fontSize: "clamp(12px, 1.2vw, 15px)", color: "rgba(242,237,230,0.5)", fontWeight: 700, lineHeight: 1.3 }}>{c.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ✅ VALEURS — SVG icons, sans emoji coloré */}
        <section className="qsn-pad">
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 12 }}>Ce en quoi on croit</div>
            <h2 style={{ margin: 0, fontWeight: 950, letterSpacing: -1.5, lineHeight: 1.1, color: "#f2ede6", fontSize: "clamp(26px, 3.5vw, 46px)" }}>
              Nos valeurs, au concret
            </h2>
          </div>
          <div className="qsn-val">
            {VALEURS.map((v, i) => {
              const Icon = VALEUR_ICONS[i];
              return (
                <div key={v.titre} style={{ background: "#2a2018", borderRadius: 20, border: "1px solid rgba(242,237,230,0.08)", padding: "28px 24px" }}>
                  <div style={{ marginBottom: 14 }}><Icon /></div>
                  <h3 style={{ margin: "0 0 12px", fontSize: "clamp(16px, 1.6vw, 19px)", fontWeight: 950, color: "#f2ede6", lineHeight: 1.2 }}>{v.titre}</h3>
                  <p style={{ margin: 0, lineHeight: 1.75, color: "rgba(242,237,230,0.55)", fontSize: "clamp(13px, 1.2vw, 15px)" }}>{v.texte}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── PHOTO LIFESTYLE ── */}
        <section style={{ padding: "0 5vw 56px" }}>
          <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", height: "clamp(300px, 40vh, 480px)" }}>
            <Image src="/univers-nuit-calme.png" alt="Nourrisson M!LK" fill sizes="100vw"
              style={{ objectFit: "cover", filter: "brightness(0.6) saturate(0.7)" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(26,20,16,0.9) 0%, rgba(26,20,16,0.15) 70%)", display: "flex", alignItems: "center" }}>
              <div style={{ padding: "0 6vw", maxWidth: 520, color: "#f2ede6" }}>
                <h2 style={{ margin: "0 0 14px", fontSize: "clamp(22px, 3vw, 38px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.15 }}>
                  L'essentiel. Sans compromis.
                </h2>
                <p style={{ margin: "0 0 22px", fontSize: "clamp(14px, 1.4vw, 16px)", lineHeight: 1.7, color: "rgba(242,237,230,0.65)" }}>
                  Nous ne multiplions pas les collections. Nous perfectionnons les pièces qui comptent vraiment.
                </p>
                <Link href="/produits" style={{ display: "inline-block", padding: "13px 26px", borderRadius: 12, background: "#c49a4a", color: "#1a1410", fontWeight: 900, fontSize: 14, textDecoration: "none" }}>
                  Découvrir la collection →
                </Link>
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}