"use client";

/**
 * ReassuranceBlock — affiché sous la grille recos en colonne droite de la fiche
 * produit. Remplit l'espace si la philosophie (colonne gauche) est plus longue.
 *
 * Valeurs alignées sur les CGV en prod (app/cgv/page.tsx + app/livraison/page.tsx) :
 *   - "Sous 24h ouvrées"  : commandes avant 14h expédiées le jour même (cf. /livraison)
 *   - "OEKO-TEX Standard 100" : certification mentionnée partout dans le site
 *   - "Sous 14 jours" : droit de rétractation L221-18 (CGV section retours)
 *   - "Paiement sécurisé" : Stripe LIVE
 *
 * Couleurs M!LK :
 *   - fond  #1a1410 (brun chaud sombre)
 *   - accent #c49a4a (ambre doré)
 *   - texte #f2ede6 (crème)
 */

const C = {
  dark:  "#1a1410",
  amber: "#c49a4a",
  warm:  "#f2ede6",
  muted: "rgba(242,237,230,0.55)",
};

function IconTruck() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M1 5h13v10H1z" stroke={C.amber} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M14 8h4l3 3v4h-7V8z" stroke={C.amber} strokeWidth="1.8" strokeLinejoin="round"/>
      <circle cx="5.5" cy="18" r="2" stroke={C.amber} strokeWidth="1.8"/>
      <circle cx="17.5" cy="18" r="2" stroke={C.amber} strokeWidth="1.8"/>
    </svg>
  );
}
function IconLeaf() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21C12 21 5 16 5 10a7 7 0 0 1 14 0c0 6-7 11-7 11z" stroke={C.amber} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M12 21V10" stroke={C.amber} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function IconReturn() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7" stroke={C.amber} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M3 4v5h5" stroke={C.amber} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" stroke={C.amber} strokeWidth="1.8"/>
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={C.amber} strokeWidth="1.8"/>
    </svg>
  );
}

const ITEMS = [
  { Icon: IconTruck,  title: "Expédition rapide",     text: "Sous 24h ouvrées"     },
  { Icon: IconLeaf,   title: "Bambou certifié",        text: "OEKO-TEX Standard 100" },
  { Icon: IconReturn, title: "Retours",                text: "Sous 14 jours"         },
  { Icon: IconLock,   title: "Paiement sécurisé",      text: "Stripe LIVE"           },
];

export default function ReassuranceBlock() {
  return (
    <aside
      aria-label="Engagements M!LK"
      style={{
        background:    C.dark,
        borderRadius:  16,
        padding:       "22px 20px",
        border:        "1px solid rgba(196,154,74,0.18)",
        boxShadow:     "0 6px 20px rgba(0,0,0,0.18)",
        // hauteur NATURELLE — pas de min-height, pas de stretch.
        // L'élément ne se gonfle pas pour combler un vide si la philo
        // est très longue. Demande user explicite.
        alignSelf:     "start",
      }}
    >
      <div style={{
        fontSize:       11,
        fontWeight:     800,
        letterSpacing:  3,
        textTransform:  "uppercase",
        color:          C.amber,
        marginBottom:   14,
      }}>
        Nos engagements
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
        {ITEMS.map(({ Icon, title, text }) => (
          <div key={title} style={{
            display:     "flex",
            alignItems:  "center",
            gap:         12,
          }}>
            <div style={{
              flexShrink:    0,
              width:         36,
              height:        36,
              borderRadius:  10,
              background:    "rgba(196,154,74,0.12)",
              display:       "grid",
              placeItems:    "center",
            }}>
              <Icon />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize:   13,
                fontWeight: 900,
                color:      C.warm,
                lineHeight: 1.25,
              }}>
                {title}
              </div>
              <div style={{
                fontSize:   12,
                fontWeight: 600,
                color:      C.muted,
                lineHeight: 1.4,
                marginTop:  2,
              }}>
                {text}
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
