"use client";

import Link from "next/link";

const C = {
  bg:    "#f2ede6",
  dark:  "#1a1410",
  brown: "#2d1a0e",
  amber: "#c49a4a",
  taupe: "#c4ae94",
  light: "#d8c8b0",
  card:  "#ede6db",
};

// ─── PROPRIÉTÉS BAMBOU ────────────────────────────────────────────────────────

const properties = [
  {
    number: "01",
    title: "Ultra doux",
    subtitle: "Plus doux que le coton",
    text: "Le bambou est naturellement l'une des fibres les plus douces qui existe. Sa structure micro-fibre arrondie ne griffe pas, n'irrite pas. Sur la peau d'un nouveau-né, c'est une différence que tu sens dès la première fois.",
    detail: null,
  },
  {
    number: "02",
    title: "Thermorégulateur",
    subtitle: "Chaud quand il faut. Frais quand nécessaire.",
    text: "Le bambou régule naturellement la température corporelle. Il garde la chaleur quand il fait froid, évacue la chaleur quand il fait chaud. Pas de surchauffe. Pas de sueur. Juste confort.",
    detail: null,
  },
  {
    number: "03",
    title: "Ultra respirant",
    subtitle: "La peau respire. Bébé aussi.",
    text: "La fibre de bambou laisse passer l'air et évacue l'humidité jusqu'à 3 fois mieux que le coton. Résultat : une peau sèche, une température stable, moins d'irritations.",
    detail: null,
  },
  {
    number: "04",
    title: "OEKO-TEX Standard 100",
    subtitle: "Testé pour les peaux les plus sensibles.",
    text: "Chaque produit M!LK est certifié OEKO-TEX Standard 100. Cela signifie qu'il a été testé pour l'absence de substances nocives — même pour un nouveau-né.",
    detail: "La certification OEKO-TEX Standard 100 est l'une des plus exigeantes au monde pour les textiles. Elle garantit que chaque composant du produit — tissu, fil, boutons, fermetures — a été analysé et ne contient aucune substance nocive pour la santé. Chez M!LK, on ne joue pas avec ça.",
  },
];

// ─── COMPOSANT ────────────────────────────────────────────────────────────────

export default function PourquoiBambouPage() {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", overflowX: "hidden" }}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding: "80px 5vw 60px",
        maxWidth: 800,
        margin: "0 auto",
        textAlign: "center",
      }}>
        <p style={{
          fontSize: "clamp(11px, 1.5vw, 13px)",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: C.taupe,
          marginBottom: 20,
        }}>
          Matière
        </p>
        <h1 style={{
          fontSize: "clamp(32px, 7vw, 64px)",
          fontWeight: 800,
          color: C.brown,
          lineHeight: 1.1,
          marginBottom: 24,
        }}>
          Pourquoi le bambou ?
        </h1>
        <p style={{
          fontSize: "clamp(15px, 2.5vw, 18px)",
          color: C.brown,
          opacity: 0.75,
          lineHeight: 1.7,
          maxWidth: 560,
          margin: "0 auto",
        }}>
          Pas par tendance. Parce que c'est objectivement la meilleure fibre pour les premiers mois de bébé.
        </p>
      </div>

      {/* ── SÉPARATEUR ───────────────────────────────────────────────────── */}
      <div style={{ width: "100%", height: 1, background: C.light }} />

      {/* ── PROPRIÉTÉS ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 5vw" }}>
        {properties.map((prop, i) => (
          <div key={i}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "clamp(24px, 5vw, 64px)",
              padding: "60px 0",
              alignItems: "start",
            }}>
              {/* Numéro */}
              <div style={{
                fontSize: "clamp(40px, 8vw, 80px)",
                fontWeight: 900,
                color: C.light,
                lineHeight: 0.9,
                letterSpacing: "-0.03em",
                userSelect: "none",
                paddingTop: 4,
              }}>
                {prop.number}
              </div>

              {/* Contenu */}
              <div>
                <p style={{
                  fontSize: "clamp(11px, 1.4vw, 12px)",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: C.taupe,
                  marginBottom: 8,
                }}>
                  {prop.subtitle}
                </p>
                <h2 style={{
                  fontSize: "clamp(22px, 4vw, 36px)",
                  fontWeight: 800,
                  color: C.brown,
                  marginBottom: 20,
                  lineHeight: 1.1,
                }}>
                  {prop.title}
                </h2>
                <p style={{
                  fontSize: "clamp(14px, 2vw, 16px)",
                  color: C.brown,
                  opacity: 0.8,
                  lineHeight: 1.8,
                  marginBottom: prop.detail ? 20 : 0,
                }}>
                  {prop.text}
                </p>

                {/* Détail OEKO-TEX — affiché uniquement pour la propriété 04 */}
                {prop.detail && (
                  <div style={{
                    background: C.card,
                    borderLeft: `3px solid ${C.amber}`,
                    borderRadius: "0 12px 12px 0",
                    padding: "20px 24px",
                    marginTop: 16,
                  }}>
                    <p style={{
                      fontSize: "clamp(13px, 1.8vw, 14px)",
                      color: C.brown,
                      opacity: 0.75,
                      lineHeight: 1.7,
                      margin: 0,
                    }}>
                      {prop.detail}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Séparateur entre propriétés (sauf après la dernière) */}
            {i < properties.length - 1 && (
              <div style={{ width: "100%", height: 1, background: C.light }} />
            )}
          </div>
        ))}
      </div>

      {/* ── CTA FINAL ────────────────────────────────────────────────────── */}
      <div style={{
        width: "100%",
        background: C.brown,
        padding: "64px 5vw",
        textAlign: "center",
        marginTop: 40,
      }}>
        <p style={{
          fontSize: "clamp(11px, 1.5vw, 13px)",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: C.taupe,
          marginBottom: 16,
        }}>
          Découvrir la collection
        </p>
        <h3 style={{
          fontSize: "clamp(24px, 5vw, 40px)",
          fontWeight: 800,
          color: C.bg,
          marginBottom: 32,
          lineHeight: 1.2,
        }}>
          Les essentiels M!LK
        </h3>
        <Link
          href="/produits"
          style={{
            display: "inline-block",
            padding: "16px 40px",
            background: C.amber,
            color: C.dark,
            borderRadius: 12,
            fontSize: "clamp(13px, 2vw, 15px)",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          Voir les produits
        </Link>
      </div>

    </div>
  );
}