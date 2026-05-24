"use client";

import Image from "next/image";
import Link  from "next/link";
import { C, Divider, Reveal, BigTextScroll, Ticker, MILK_STYLES } from "@/components/shared/MilkDesign";
import { Breadcrumb } from "@/components/seo/Breadcrumb";

const VALEURS = [
  { titre: "Chaque produit répond à un problème réel.", texte: "Pas de design pour le design. Pas de fonctionnalité inutile. On part d'un problème concret — l'habillage qui tourne au combat, la surchauffe, les moufles perdues — et on cherche la solution la plus simple." },
  { titre: "Moins, mais mieux.", texte: "Pas de collections saisonnières à outrance. On perfectionne les pièces qui comptent vraiment : body, pyjama, gigoteuse. Celles qu'on utilise tous les jours, plusieurs fois par jour." },
  { titre: "La matière d'abord.", texte: "Chaque produit commence par une question : est-ce que cette matière est vraiment meilleure pour la peau de bébé ? Le bambou n'est pas une tendance. C'est la réponse la plus fonctionnelle qu'on a trouvée." },
  { titre: "Pensé par des parents, pour des parents épuisés.", texte: "On a vécu les galères. Les body qui s'ouvrent pas facilement à 3h du matin. La surchauffe. Les irritations. Les 15 boutons-pression à aligner pendant que bébé se débat. On les a réglées." },
];

function IconHands()   { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M8 12V7.5a1.5 1.5 0 0 1 3 0V12m0 0V6.5a1.5 1.5 0 0 1 3 0V12m0 0V8.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6v-1a1.5 1.5 0 0 1 3 0" stroke={C.amber} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IconDiamond() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2l3 6h5l-4 5 2 7-6-4-6 4 2-7L4 8h5l3-6z" stroke={C.amber} strokeWidth="1.6" strokeLinejoin="round"/></svg>; }
function IconLeafV()   { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 22C12 22 4 16 4 9a8 8 0 0 1 16 0c0 7-8 13-8 13z" stroke={C.amber} strokeWidth="1.6" strokeLinejoin="round"/><path d="M12 22V9" stroke={C.amber} strokeWidth="1.6" strokeLinecap="round"/></svg>; }
function IconBaby()    { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="6" r="3" stroke={C.amber} strokeWidth="1.6"/><path d="M5 20a7 7 0 0 1 14 0" stroke={C.amber} strokeWidth="1.6" strokeLinecap="round"/><path d="M9 13c0 1.5.5 3 3 3s3-1.5 3-3" stroke={C.amber} strokeWidth="1.6" strokeLinecap="round"/></svg>; }
const ICONS = [IconHands, IconDiamond, IconLeafV, IconBaby];

export default function QuiSommesNousPage() {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.warm }}>
      <style>{`
        ${MILK_STYLES}
        .qsn-kpis { display:grid; grid-template-columns:repeat(4,1fr); }
        .qsn-val  { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
        .qsn-grid { display:grid; grid-template-columns:1fr 1fr; gap:64px; align-items:center; }
        @media(max-width:900px){
          .qsn-kpis { grid-template-columns:repeat(2,1fr)!important; }
          .qsn-val  { grid-template-columns:1fr!important; }
          .qsn-grid { grid-template-columns:1fr!important; gap:32px!important; }
        }
      `}</style>

      <div style={{ background: C.bg }}>
        <Breadcrumb
          variant="light"
          items={[{ label: "Accueil", href: "/" }, { label: "Qui sommes-nous" }]}
        />
      </div>

      {/* HERO */}
      <section style={{ position: "relative", height: "clamp(52vh,60vh,70vh)", minHeight: 300, overflow: "hidden" }}>
        <Image src="/images/qui-sommes-nous/milk_qui_sommes_nous_hero.jpg" alt="Collection M!LK — bodies, pyjamas et bonnet bambou sur table sombre" fill priority sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center 40%", filter: "brightness(0.45) saturate(0.7)" }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, rgba(45,26,14,0.1), rgba(45,26,14,0.92))` }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", padding: "0 0 44px" }}>
          <div style={{ padding: "0 clamp(12px,4vw,5vw)", width: "100%", boxSizing: "border-box" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 12 }}>Notre histoire</div>
            <h1 style={{ color: C.warm, margin: 0, fontWeight: 950, letterSpacing: -2, lineHeight: 1.05, fontSize: "clamp(36px,6vw,72px)" }}>
              Moins de galères.<br />Plus de moments.
            </h1>
          </div>
        </div>
      </section>

      <Ticker />
      <Divider from={C.bg} to={C.bg} />

      {/* INTRO — Mot de la fondatrice + portrait Erika */}
      <div style={{ background: C.bg, padding: "64px 5vw 72px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <Reveal>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 24 }}>
              Mot de la fondatrice
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div style={{
              position:     "relative",
              width:        "100%",
              maxWidth:     360,
              margin:       "0 auto 40px",
              aspectRatio:  "4/5",
              borderRadius: 24,
              overflow:     "hidden",
              boxShadow:    "0 24px 56px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.35)",
              border:       `1px solid rgba(196,154,74,0.18)`,
            }}>
              <Image
                src="https://ntkqmnenczltlwplswka.supabase.co/storage/v1/object/public/product-images/erika-et-ses-enfants.jpg"
                alt="Erika et ses garçons — fondatrice de M!LK"
                fill
                sizes="(max-width: 700px) 80vw, 360px"
                style={{ objectFit: "cover", objectPosition: "center" }}
                priority
              />
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 style={{
              margin:        "0 0 24px",
              fontWeight:    950,
              letterSpacing: -1.5,
              lineHeight:    1.15,
              color:         C.warm,
              fontSize:      "clamp(28px,4vw,48px)",
            }}>
              Qui sommes-nous
            </h2>
          </Reveal>

          <Reveal delay={0.15}>
            <div style={{
              display:    "grid",
              gap:        18,
              textAlign:  "left",
              maxWidth:   600,
              margin:     "0 auto",
              fontSize:   "clamp(15px,1.5vw,17px)",
              lineHeight: 1.85,
              color:      C.muted,
            }}>
              <p style={{ margin: 0, fontSize: "clamp(18px,2vw,22px)", fontWeight: 900, color: C.warm, lineHeight: 1.4 }}>
                Je suis maman. Deux fois.
              </p>
              <p style={{ margin: 0 }}>
                Et je me souviens encore de ces matins en pyjama — les deux collés contre moi, chauds, souriants, le monde encore un peu flou. Ces moments où rien d'autre n'existe.
              </p>
              <p style={{ margin: 0, fontWeight: 800, color: C.amber }}>
                C'est là qu'est né M!LK.
              </p>
              <p style={{ margin: 0 }}>
                Dans ce quotidien intense et doux à la fois — où tout va vite, où tout est nouveau, où on cherche juste des choses simples. Une pièce qu'on attrape sans réfléchir, qu'on enfile en deux secondes, et qui est juste... parfaite. Pour eux. Pour nous.
              </p>
              <p style={{ margin: 0 }}>
                Pas de surcharge. Pas de superflu. Des essentiels avec du caractère — modernes, unisexes, différents — pour les tout-petits qui méritent déjà quelque chose d'un peu atypique.
              </p>
              <p style={{ margin: 0 }}>
                Mes garçons ont grandi. Et avec eux, j'ai appris. J'ai appris ce que j'aurais aimé trouver dès le premier jour. M!LK, c'est ça — des années de rêves, de regards, d'envies, mis enfin en pratique.
              </p>
              <p style={{ margin: 0 }}>
                On commence par les 0–6 mois. Mais la vision est bien plus grande.
              </p>
              <p style={{ margin: "8px 0 0", fontWeight: 800, color: C.warm, fontSize: "clamp(16px,1.7vw,19px)" }}>
                Soutenez-nous — les plus beaux projets arrivent.
              </p>
              <p style={{ margin: 0, fontWeight: 900, color: C.amber, fontSize: "clamp(17px,1.9vw,21px)", letterSpacing: -0.3 }}>
                Bienvenue chez M!LK.
              </p>
            </div>
          </Reveal>
        </div>
      </div>

      <Divider from={C.bg} to={C.bg} />

      {/* KPIs */}
      <div style={{ background: C.bg }}>
        <div className="qsn-kpis" style={{ padding: "0 clamp(12px,4vw,5vw)" }}>
          {[
            { val: "100%", label: "Bambou certifié OEKO-TEX" },
            { val: "0",    label: "Substance nocive"          },
            { val: "3×",   label: "Plus doux que le coton"   },
            { val: "15j",  label: "Retour gratuit"            },
          ].map((k, i) => (
            <Reveal key={k.label} delay={i * 0.08}>
              <div style={{ padding: "40px 12px", textAlign: "center", borderRight: i < 3 ? `1px solid ${C.faint}` : "none" }}>
                <div style={{ fontSize: "clamp(36px,5vw,60px)", fontWeight: 950, letterSpacing: -2, color: C.amber, lineHeight: 1 }}>{k.val}</div>
                <div style={{ marginTop: 8, fontSize: "clamp(11px,1.1vw,14px)", color: C.muted, fontWeight: 700 }}>{k.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <Divider from={C.bg} to={C.taupe} />

      {/* VALEURS */}
      <div style={{ background: C.taupe, padding: "56px 5vw" }}>
        <Reveal>
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 12 }}>Ce en quoi on croit</div>
            <h2 style={{ margin: 0, fontWeight: 950, letterSpacing: -1.5, lineHeight: 1.1, color: C.dark, fontSize: "clamp(26px,3.5vw,46px)" }}>Pas de design pour le design.</h2>
            <p style={{ margin: "12px 0 0", fontSize: "clamp(15px,1.5vw,18px)", color: "rgba(26,20,16,0.6)", lineHeight: 1.6 }}>Juste ce qui compte quand t'es épuisé.</p>
          </div>
        </Reveal>
        <div className="qsn-val">
          {VALEURS.map((v, i) => {
            const Icon = ICONS[i];
            return (
              <Reveal key={v.titre} delay={i * 0.08}>
                <div style={{ background: C.light, borderRadius: 20, border: "1px solid rgba(26,20,16,0.1)", padding: "28px 24px", boxShadow: "0 6px 24px rgba(0,0,0,0.1)", transform: "translateY(-2px)" }}>
                  <div style={{ marginBottom: 14 }}><Icon /></div>
                  <h3 style={{ margin: "0 0 12px", fontSize: "clamp(15px,1.5vw,18px)", fontWeight: 950, color: C.dark, lineHeight: 1.2 }}>{v.titre}</h3>
                  <p style={{ margin: 0, lineHeight: 1.75, color: "rgba(26,20,16,0.6)", fontSize: "clamp(13px,1.2vw,15px)" }}>{v.texte}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>

      <Divider from={C.taupe} to={C.light} />

      {/* PHILOSOPHIE */}
      <div style={{ background: C.light, padding: "56px 5vw" }}>
        <Reveal>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 16 }}>Philosophie M!LK</div>
            <blockquote style={{ margin: 0, borderLeft: `3px solid ${C.amber}`, paddingLeft: 24 }}>
              <p style={{ margin: "0 0 16px", fontSize: "clamp(16px,2vw,22px)", fontWeight: 800, color: C.dark, lineHeight: 1.5, letterSpacing: -0.3 }}>
                "Les pyjamas à boutons ? Combat garanti à chaque change.<br />Les moufles séparées ? Elles se perdent, tombent, disparaissent quand bébé en a le plus besoin."
              </p>
              <p style={{ margin: "0 0 16px", fontSize: "clamp(14px,1.5vw,17px)", color: "rgba(26,20,16,0.65)", lineHeight: 1.75 }}>
                Ici, chaque produit M!LK répond à un problème réel. Moins de gestes, moins de lutte, moins d'objets à gérer. La routine du soir devient fluide, pas stressante.
              </p>
              <p style={{ margin: 0, fontSize: "clamp(14px,1.5vw,17px)", color: C.amber, fontWeight: 800, lineHeight: 1.5 }}>
                Pas de fonctionnalité inutile. Juste ce qui compte quand t'es épuisé.
              </p>
            </blockquote>
          </div>
        </Reveal>
      </div>

      <BigTextScroll text="MOINS DE GALÈRES. PLUS DE MOMENTS." speed={30} bg={C.light} />

      <Divider from={C.light} to={C.bg} />

      {/* CTA */}
      <section style={{ background: C.bg, padding: "56px 5vw", textAlign: "center" }}>
        <Reveal>
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: "clamp(24px,3.5vw,38px)", fontWeight: 950, letterSpacing: -1, color: C.warm, lineHeight: 1.15 }}>Moins de galères. Plus de moments.</h2>
            <p style={{ margin: "0 0 28px", fontSize: "clamp(14px,1.5vw,16px)", color: C.muted, lineHeight: 1.7 }}>Des essentiels conçus pour les 6 premiers mois. Bambou certifié OEKO-TEX.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/produits" style={{ padding: "14px 30px", borderRadius: 14, background: C.warm, color: C.dark, fontWeight: 900, fontSize: 15, textDecoration: "none", display: "inline-block" }}>Voir les produits</Link>
              <Link href="/pourquoi-bambou" style={{ padding: "14px 30px", borderRadius: 14, border: `1px solid ${C.faint}`, color: C.warm, fontWeight: 800, fontSize: 15, textDecoration: "none", display: "inline-block" }}>Pourquoi le bambou ?</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}