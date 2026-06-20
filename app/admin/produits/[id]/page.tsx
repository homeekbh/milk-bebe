"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

// Helper inline — lit le token Supabase depuis localStorage
function adminFetch(url: string, options: RequestInit = {}) {
  let token = "";
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? "";
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const parsed = JSON.parse(localStorage.getItem(key) ?? "{}");
        token = parsed.access_token ?? "";
        if (token) break;
      }
    }
  } catch {}
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    },
  });
}

const CATEGORIES = ["bodies", "pyjamas", "gigoteuses", "accessoires"];

const TAILLES_SUGGESTIONS = [
  "Naissance", "0-3 mois", "3-6 mois", "6-12 mois",
  "0-6 mois", "Taille unique", "120×120 cm",
];

const HIGHLIGHTS = [
  { value: "",                label: "Aucune mise en avant"   },
  { value: "meilleure_vente", label: "Meilleure vente"        },
  { value: "selection",       label: "Sélection du moment"    },
  { value: "nouveaute",       label: "Nouveauté"              },
];
const LABELS = [
  { value: "",              label: "Aucun badge"          },
  { value: "nouveau",       label: "Nouveau"              },
  { value: "bestseller",    label: "Bestseller"           },
  { value: "exclusif",      label: "Exclusif"             },
  { value: "last",          label: "Dernières pièces"     },
  { value: "bientot",       label: "Bientôt disponible"   },
  { value: "promo",         label: "Promo"                },
  { value: "coup_de_coeur", label: "Coup de cœur"         },
];

const EMPTY: Record<string, string> = {
  name: "", slug: "", price_ttc: "", promo_price: "",
  promo_start: "", promo_end: "", stock: "0",
  category_slug: "bodies",
  image_url: "", image_url_2: "", image_url_3: "", image_url_4: "", image_url_5: "", image_url_6: "", image_url_7: "", image_url_8: "",
  description: "", main_image_index: "0",
  label: "", highlight: "",
  position: "0", weight_g: "",
  seo_title: "", seo_description: "",
  supplier_ref: "",
};


// ═══════════════════════════════════════════════════════════════════
// Contenu hardcodé par catégorie/slug — utilisé pour pré-remplir
// l'admin quand fiche_cards est vide en base
// ═══════════════════════════════════════════════════════════════════
function HC_subtitle(cat: string, slug: string): string {
  if (slug.includes("bonnet"))   return "La vraie alternative au bonnet d\'hôpital qu\'on oublie dès la sortie.";
  if (slug.includes("lange"))    return "Le sommeil avant le style.";
  if (cat === "pyjamas")         return "Double zip + moufles intégrées = fin des batailles quotidiennes.";
  if (cat === "bodies")          return "Habillage en deux gestes. Mains protégées. Sans accessoires.";
  if (cat === "gigoteuses")      return "Change express. Zéro boutons. Zéro galère à 3h du matin.";
  return "";
}
function HC_features(cat: string, slug: string): string[] {
  if (slug.includes("bonnet")) return ["Ultra doux dès le premier contact","Respirant : idéal pour réguler la température","Respectueux des peaux sensibles","Coupe minimaliste : maintien parfait sans comprimer","Tailles disponibles : Naissance à 6 mois"];
  if (slug.includes("lange"))  return ["Taille XXL (120×120 cm) : assez grand pour un emmaillotage qui tient vraiment","Bambou respirant : régule la température, pas de surchauffe","Reproduit la pression du ventre maternel : effet calmant immédiat","Tissu avec grip : reste en place même quand bébé se débat","Devient plus doux à chaque lavage","Multi-usage : swaddle, couverture, drap d\'allaitement, protection poussette"];
  if (cat === "bodies")       return ["Col enveloppe élargi : passe sur la tête sans forcer, zéro pression sur la fontanelle","3 pressions seulement : pas 7, pas 12. Juste 3.","Moufles pliables intégrées : tu replies, tu déplies. Toujours là.","Bambou hypoallergénique : zéro irritation, même sur peau atopique","Extensible 4 sens : suit tous les mouvements, ne comprime pas","Coutures plates : zéro frottement, zéro marques"];
  if (cat === "pyjamas")      return ["Double zip inversé : change par le bas, habille par le haut","Zéro bouton : rien à aligner, rien à rater. Jamais.","Pieds pliables : chauds quand il faut, libres quand c\'est mieux","Moufles pliables intégrées : tu replies, tu déplies. Fini les moufles perdues.","Bambou stretch 95% : suit tous les mouvements sans tirer","Silencieux : zéro scratch, zéro bruit qui réveille"];
  if (cat === "gigoteuses")   return ["Bas nouable : ouvre/ferme d\'une main, sans regarder, dans le noir","Zéro bouton, zéro zip : rien à aligner, rien à coincer","Moufles pliables intégrées : tu replies, tu déplies. Toujours là.","Bambou ultra-souple : glisse sans frotter, ne réveille pas","Coupe ample : bébé bouge librement, zéro compression","Thermorégulant : chaud sans surchauffer. Été comme hiver."];
  return [];
}
function HC_why(cat: string, slug: string): string {
  if (slug.includes("bonnet"))  return "Premier contact avec la tête fragile de votre nouveau-né, ce bonnet a été pensé pour être aussi doux que rassurant. Confectionné en bambou, il est naturellement respirant, souple et adapté aux peaux les plus sensibles. Il garde la chaleur sans jamais étouffer, exactement ce qu\'il faut dans les premières heures de vie.";
  if (slug.includes("lange"))   return "Ton bébé sursaute, se réveille, pleure. Le réflexe de Moro le tire du sommeil toutes les 20 minutes. Tu as essayé d\'emmailloter avec une couverture classique — ça se défait au premier mouvement. Les swaddles à velcro ? Bruyants. Trop serrés. Ou pas assez. Ce swaddle existe pour une seule raison : calmer ton bébé plus vite et lui permettre de dormir plus longtemps. Et toi avec.";
  if (cat === "bodies")         return "Habiller un nouveau-né, c\'est stressant. La tête est fragile, le cou ne tient pas, il pleure dès que tu approches un vêtement de son visage. Et une fois habillé ? Il se griffe le visage parce que t\'as oublié les moufles. Ce body existe pour simplifier : un col qui glisse sans forcer, des moufles pliables intégrées déjà là, trois pressions et c\'est fini.";
  if (cat === "pyjamas")        return "L\'habillage d\'un bébé peut virer au cauchemar. Il gigote, il pleure, tu t\'énerves. Les boutons-pression ? 15 à aligner pendant qu\'il se débat. Les moufles séparées ? Elles disparaissent toujours au mauvais moment. Résultat : friction, tension, tout le monde finit épuisé. On a conçu ce pyjama pour supprimer le combat : un double zip qui simplifie tout + des moufles pliables intégrées pour éviter les griffures sans jamais avoir à les chercher. Un zip. Deux gestes. C\'est fait.";
  if (cat === "gigoteuses")     return "Tu te lèves pour la 4e fois. Il est 3h du mat\'. T\'as les yeux à moitié fermés. Tu dois changer une couche dans la pénombre sans réveiller complètement le bébé — ni toi-même. Les boutons-pression ? Impossible à aligner. Le zip ? Trop bruyant. Les moufles séparées ? Perdues quelque part dans le lit. Cette gigoteuse à nouer existe pour ça : un vêtement qu\'on ouvre et ferme sans réfléchir, sans regarder, sans bataille.";
  return "";
}
function HC_result(cat: string, slug: string): string {
  if (slug.includes("bonnet"))  return "Sa coupe minimaliste assure un maintien parfait sans comprimer. Votre bébé est au chaud, à l\'aise, sans pression inutile — dès les premières minutes.";
  if (slug.includes("lange"))   return "Bébé calmé en quelques minutes. Réflexe de Moro contenu. Moins de réveils en sursaut. Des plages de sommeil plus longues — pour lui et pour toi. Tu récupères un peu.";
  if (cat === "bodies")         return "Habillage en moins de 30 secondes. Pas de cris. Pas de stress sur la tête fragile. Mains protégées H24 sans accessoire à perdre. Tu passes à autre chose.";
  if (cat === "pyjamas")        return "Habillage en moins d\'une minute. Change de couche sans déshabiller. Zéro friction entre toi et ton bébé. Pas de moufles à retrouver au fond du salon : elles sont intégrées au poignet, prêtes quand tu veux protéger son visage. Les routines deviennent fluides, pas stressantes.";
  if (cat === "gigoteuses")     return "Change de couche en 30 secondes. Bébé reste calme, à moitié endormi. Mains protégées sans accessoire à retrouver. Tu retournes te coucher plus vite. Les réveils sont écourtés. Les nuits deviennent un peu moins chaotiques.";
  return "";
}
function HC_philosophy(cat: string, slug: string): string {
  if (cat === "pyjamas")    return "Les pyjamas à boutons ? Combat garanti à chaque change. Les combinaisons sans zip inversé ? Tu dois tout défaire pour une couche. Les moufles séparées ? Elles se perdent, tombent, disparaissent quand bébé en a le plus besoin. Ici : double zip inversé + bambou stretch + moufles pliables intégrées = moins de gestes, moins de lutte, moins d\'objets à gérer.";
  if (cat === "bodies")     return "Les bodies à col rond ? Bataille pour passer la tête, bébé hurle. Les bodies à boutons sur l\'épaule ? 6 pressions à aligner. Les moufles séparées ? Perdues en 24h. Le body express combine col facile + pressions minimum + moufles pliables intégrées.";
  if (cat === "gigoteuses") return "Les grenouillères à boutons ? 12 pressions à aligner dans le noir — t\'abandonnes au 3e essai. Les pyjamas zip ? Le bruit réveille le bébé. Les gigoteuses classiques ? Pas d\'accès direct à la couche. Les moufles séparées ? Perdues dans le lit à 3h du mat\'. La gigoteuse à nouer résout tout : accès immédiat, fermeture silencieuse, zéro manipulation complexe.";
  if (slug.includes("lange"))   return "Les swaddles à velcro ? Le scratch réveille le bébé quand tu l\'ouvres. Les couvertures classiques ? Trop petites, se défont. Les gigoteuses ? Pas adaptées aux nouveau-nés qui ont besoin de contention. La mousseline grand format offre le meilleur compromis : maintien efficace, ouverture silencieuse, respiration optimale.";
  return "";
}
function HC_entretien(slug: string): string[] {
  if (slug.includes("bonnet")) return ["Lavage en cycle délicat avec des couleurs similaires","Séchage à plat ou sur cintre","Éviter le sèche-linge pour préserver la matière"];
  return ["Lavage 40°C, cycle délicat","Sans adoucissant ni javel","Séchage à l\'air libre recommandé","Sèche-linge basse température"];
}
function HC_faqs(cat: string, slug: string): Array<{question:string;reponse:string}> {
  const base = [
    { question: "Pourquoi le bambou plutôt que le coton ?", reponse: "Parce qu\'il est plus doux, plus respirant et thermorégulateur. Il absorbe mieux l\'humidité, reste confortable dans le temps et garde sa qualité lavage après lavage." },
    { question: "Ça taille comment ?", reponse: "Coupe ajustée avec tissu stretch qui accompagne les mouvements. Si tu hésites entre deux tailles, prends la plus grande pour prolonger l\'usage.\n\nLe bambou stretch est extrêmement extensible — pas de risque de trop petit ou trop grand. En cas de doute, prenez la taille au-dessus." },
    { question: "Jusqu\'à quel âge ?", reponse: "Les produits M!LK sont actuellement conçus pour les bébés de la naissance jusqu\'à 6 mois. La gamme évoluera progressivement pour accompagner les étapes suivantes." },
  ];
  if (cat === "pyjamas") return [
    { question: "C\'est quoi le double zip inversé ?", reponse: "Un système d\'ouverture à double sens : par le bas pour changer la couche sans déshabiller bébé, par le haut pour l\'habiller rapidement. Moins de manipulation, moins de stress, surtout la nuit." },
    { question: "Les moufles pliables, ça sert à quoi ?", reponse: "À éviter les griffures sans gérer des moufles séparées que tu perds en permanence. Elles sont intégrées : tu replies, tu déplies, elles sont toujours là." },
    { question: "Mon bébé déteste être habillé. Ça change quoi ?", reponse: "Moins de gestes, moins de contraintes. Pas de boutons à aligner, pas de lutte inutile. Résultat : un habillage plus rapide, plus fluide, et un bébé moins irrité." },
    ...base,
  ];
  if (cat === "bodies") return [
    { question: "Le col enveloppe, ça passe vraiment sans forcer ?", reponse: "Oui — et surtout, il ne se passe pas par la tête. Le col enveloppe est conçu pour enfiler le vêtement par le bas, en remontant doucement sur le corps de bébé." },
    { question: "Les moufles pliables, ça sert à quoi ?", reponse: "À éviter les griffures sans gérer des moufles séparées que tu perds en permanence. Elles sont intégrées : tu replies, tu déplies, elles sont toujours là." },
    ...base,
  ];
  if (cat === "gigoteuses") return [
    { question: "C\'est quoi une gigoteuse à nouer ?", reponse: "Une fermeture simple par nœud, sans zip ni boutons. Tu défais, tu changes, tu renoues. Rapide, même dans le noir." },
    { question: "Les moufles pliables, ça sert à quoi ?", reponse: "À éviter les griffures sans gérer des moufles séparées. Elles sont intégrées : tu replies, tu déplies, elles sont toujours là." },
    ...base,
  ];
  if (slug.includes("lange")) return [
    { question: "L\'emmaillotage, ça sert à quoi ?", reponse: "À calmer et sécuriser bébé en recréant une sensation proche du ventre maternel. Résultat : moins de sursauts, un endormissement plus facile, et un sommeil plus stable." },
    { question: "Ça aide vraiment à calmer bébé ?", reponse: "Oui. La pression douce reproduit la sensation du ventre maternel. Le bambou amplifie cet effet grâce à sa souplesse." },
    ...base,
  ];
  return base;
}

// Pré-remplit les cards depuis le contenu hardcodé
function buildDefaultCards(cat: string, slug: string, withId: () => string): FicheCard[] {
  const cards: any[] = [];
  const sub = HC_subtitle(cat, slug);
  if (sub) cards.push({ id: withId(), type: "subtitle", title: "Phrase d\'accroche", content: sub });
  const feats = HC_features(cat, slug);
  if (feats.length) cards.push({ id: withId(), type: "features", title: "Points forts", content: JSON.stringify(feats) });
  const why = HC_why(cat, slug);
  const res = HC_result(cat, slug);
  if (why) cards.push({ id: withId(), type: "whyresult", title: "Pourquoi / Résultat", content: JSON.stringify({ why, result: res }) });
  const philo = HC_philosophy(cat, slug);
  if (philo) cards.push({ id: withId(), type: "philosophy", title: "Philosophie M!LK", content: philo });
  const entr = HC_entretien(slug);
  cards.push({ id: withId(), type: "entretien", title: "Conseils d\'entretien", content: JSON.stringify(entr) });
  return cards;
}
function buildDefaultFaqs(cat: string, slug: string, withId: () => string) {
  return HC_faqs(cat, slug).map(f => ({ id: withId(), question: f.question, reponse: f.reponse }));
}

type ColorEntry = {
  name:       string;
  hex:        string;
  stock:      string;     // calculé automatiquement = somme des tailles
  image_url?: string;
  sizes:      string[];   // tailles valables pour ce motif
  sizes_stock: Record<string, string>; // stock par taille pour ce motif
  validated:  boolean;    // motif validé avant de saisir les tailles/stocks
};

// ── Nouvelles structures pour cards et FAQs éditables ──
type FicheCard = {
  id:       string;
  type:     "subtitle" | "description" | "coloris" | "features" | "whyresult" | "philosophy" | "entretien" | "motif";
  title:    string;
  content:  string; // JSON stringifié selon le type
};

type FaqItem = {
  id:      string;
  question: string;
  reponse:  string;
};

function newId() { return Math.random().toString(36).slice(2, 9); }

function slugify(s: string) {
  return s.trim().toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const IS: React.CSSProperties = {
  padding: "13px 16px", borderRadius: 10,
  border: "2px solid rgba(0,0,0,0.1)", fontSize: 16,
  fontWeight: 600, background: "#fff", width: "100%",
  boxSizing: "border-box", outline: "none",
};
const LS: React.CSSProperties = {
  fontSize: 13, fontWeight: 800, letterSpacing: 1,
  textTransform: "uppercase", color: "rgba(26,20,16,0.5)",
};
const SECTION: React.CSSProperties = {
  background: "#fff", borderRadius: 16,
  border: "1px solid rgba(0,0,0,0.08)", padding: 28, display: "grid", gap: 18,
};

// ── DateRangePicker avec calendrier visuel ────────────────────────────────────
function DateRangePicker({
  startDate, endDate, onChangeStart, onChangeEnd,
}: {
  startDate: string; endDate: string;
  onChangeStart: (d: string) => void;
  onChangeEnd:   (d: string) => void;
}) {
  const today = new Date();
  const [viewYear,  setViewYear]  = React.useState(today.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(today.getMonth());
  const [open, setOpen] = React.useState<"start"|"end"|null>(null);

  const MOIS  = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const JOURS = ["L","M","M","J","V","S","D"];

  const firstDay    = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  let startDay = firstDay.getDay() - 1; if (startDay < 0) startDay = 6;

  const cells: (number|null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function toStr(y: number, m: number, d: number) {
    return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }
  function handleDay(day: number) {
    const d = toStr(viewYear, viewMonth, day);
    if (open === "start") { onChangeStart(d); setOpen(null); }
    else if (open === "end") { onChangeEnd(d); setOpen(null); }
  }
  function isInRange(day: number) {
    if (!startDate || !endDate) return false;
    const d = toStr(viewYear, viewMonth, day);
    return d > startDate && d < endDate;
  }
  function isStart(day: number) { return startDate === toStr(viewYear, viewMonth, day); }
  function isEnd(day: number)   { return endDate   === toStr(viewYear, viewMonth, day); }
  function isToday(day: number) {
    return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
  }

  const AMBER = "#c49a4a";
  const DARK  = "#1a1410";

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Champs cliquables */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {([
          { label: "Date début", val: startDate, key: "start" as const },
          { label: "Date fin",   val: endDate,   key: "end"   as const },
        ]).map(({ label, val, key }) => (
          <div key={key} style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" as const, color: "rgba(26,20,16,0.5)" }}>{label}</label>
            <div style={{ position: "relative" }}>
              <input readOnly value={val}
                placeholder="Cliquer pour choisir"
                onClick={() => setOpen(open === key ? null : key)}
                style={{ padding: "13px 40px 13px 16px", borderRadius: 10, border: `2px solid ${open === key ? AMBER : "rgba(26,20,16,0.12)"}`, fontSize: 15, color: val ? DARK : "rgba(26,20,16,0.35)", background: "#faf8f4", outline: "none", width: "100%", boxSizing: "border-box" as const, cursor: "pointer" }} />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>📅</span>
            </div>
          </div>
        ))}
      </div>

      {/* Durée */}
      {startDate && endDate && (
        <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(196,154,74,0.08)", border: "1px solid rgba(196,154,74,0.25)", fontSize: 14, fontWeight: 700, color: "#92400e", display: "flex", alignItems: "center", gap: 8 }}>
          <span>⏱</span>
          <span>
            Durée : <strong>{Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)} jours</strong>
            &nbsp;·&nbsp;
            du {new Date(startDate).toLocaleDateString("fr-FR", { day:"2-digit", month:"long" })} au {new Date(endDate).toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" })}
          </span>
        </div>
      )}

      {/* Calendrier */}
      {open !== null && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.12)", padding: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
          {/* Label */}
          <div style={{ textAlign: "center", fontSize: 12, fontWeight: 800, color: AMBER, marginBottom: 12, letterSpacing: 1, textTransform: "uppercase" as const }}>
            {open === "start" ? "📅 Date de début de la promo" : "📅 Date de fin de la promo"}
          </div>
          {/* Navigation mois */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button type="button"
              onClick={() => { const d = new Date(viewYear, viewMonth-1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }}
              style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", cursor: "pointer", fontSize: 18, fontWeight: 900 }}>‹</button>
            <div style={{ fontWeight: 900, fontSize: 15, color: DARK }}>{MOIS[viewMonth]} {viewYear}</div>
            <button type="button"
              onClick={() => { const d = new Date(viewYear, viewMonth+1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }}
              style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", cursor: "pointer", fontSize: 18, fontWeight: 900 }}>›</button>
          </div>
          {/* Jours */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 6 }}>
            {JOURS.map((j, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "rgba(26,20,16,0.35)", paddingBottom: 4 }}>{j}</div>
            ))}
          </div>
          {/* Cellules */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const start   = isStart(day);
              const end     = isEnd(day);
              const inRange = isInRange(day);
              const todayD  = isToday(day);
              return (
                <div key={i} onClick={() => handleDay(day)}
                  style={{
                    aspectRatio: "1", borderRadius: start || end ? 10 : inRange ? 4 : 8,
                    display: "grid", placeItems: "center", cursor: "pointer",
                    background: start || end ? DARK : inRange ? "rgba(196,154,74,0.2)" : "transparent",
                    border: todayD && !start && !end ? `2px solid ${AMBER}` : "none",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (!start && !end) (e.currentTarget as HTMLElement).style.background = "rgba(26,20,16,0.08)"; }}
                  onMouseLeave={e => { if (!start && !end) (e.currentTarget as HTMLElement).style.background = inRange ? "rgba(196,154,74,0.2)" : "transparent"; }}>
                  <span style={{ fontSize: 13, fontWeight: start || end ? 900 : 600, color: start || end ? AMBER : DARK, lineHeight: 1 }}>{day}</span>
                  {(start || end) && (
                    <span style={{ position: "absolute", bottom: 2, fontSize: 8, color: AMBER, fontWeight: 900 }}>{start ? "début" : "fin"}</span>
                  )}
                </div>
              );
            })}
          </div>
          {/* Légende + fermer */}
          <div style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: DARK }} />
              <span style={{ fontSize: 11, color: "rgba(26,20,16,0.5)" }}>Début / Fin</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: "rgba(196,154,74,0.3)" }} />
              <span style={{ fontSize: 11, color: "rgba(26,20,16,0.5)" }}>Période promo</span>
            </div>
            <button type="button" onClick={() => setOpen(null)}
              style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 8, background: "rgba(26,20,16,0.06)", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: DARK }}>
              Fermer ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PhotosDragDrop ─────────────────────────────────────────────────────────────
function PhotosDragDrop({ photoKeys, form, set }: {
  photoKeys: readonly string[];
  form: any;
  set: (k: string, v: string) => void;
}) {
  const [dragIdx,   setDragIdx]   = React.useState<number | null>(null);
  const [dragOver,  setDragOver]  = React.useState<number | null>(null);
  const [uploading, setUploading] = React.useState<number | null>(null);
  const [msgs, setMsgs] = React.useState<Record<number,{ok:boolean;txt:string}>>({});
  const photos = photoKeys.map(k => form[k] ?? "");
  function reorder(from: number, to: number) {
    const arr = [...photos]; const [moved] = arr.splice(from, 1); arr.splice(to, 0, moved);
    photoKeys.forEach((k, i) => set(k as string, arr[i] ?? ""));
  }
  async function handleUpload(idx: number, file: File) {
    setUploading(idx); setMsgs(m => ({ ...m, [idx]: {ok:false,txt:""} }));
    try {
      const fd = new FormData(); fd.append("file", file);
      let token = "";
      try { for (let i=0;i<localStorage.length;i++){const k=localStorage.key(i)??"";if(k.startsWith("sb-")&&k.endsWith("-auth-token")){const p=JSON.parse(localStorage.getItem(k)??"{}");token=p.access_token??"";if(token)break;}} } catch {}
      const res = await fetch("/api/admin/upload",{method:"POST",body:fd,headers:token?{Authorization:"Bearer "+token}:{}});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error??"Erreur");
      set(photoKeys[idx] as string, data.url);
      setMsgs(m => ({ ...m, [idx]: {ok:true,txt:"OK"} }));
    } catch(e:any){ setMsgs(m => ({ ...m, [idx]: {ok:false,txt:e.message} })); }
    finally { setUploading(null); }
  }
  return (
    <div style={{ display:"grid", gap:10 }}>
      {photoKeys.map((k,i) => {
        const url=photos[i]; const isMain=i===0;
        return (
          <div key={String(k)} draggable
            onDragStart={()=>setDragIdx(i)} onDragEnd={()=>{setDragIdx(null);setDragOver(null);}}
            onDragOver={e=>{e.preventDefault();setDragOver(i);}}
            onDrop={e=>{e.preventDefault();if(dragIdx!==null&&dragIdx!==i)reorder(dragIdx,i);setDragOver(null);setDragIdx(null);}}
            style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:12,
              border:dragOver===i?"2px solid #c49a4a":isMain?"2px solid rgba(196,154,74,0.4)":"1.5px solid rgba(26,20,16,0.08)",
              background:isMain?"rgba(196,154,74,0.04)":"#faf8f4",cursor:"grab",opacity:dragIdx===i?0.5:1}}>
            <span style={{fontSize:20,color:"rgba(26,20,16,0.2)",flexShrink:0}}>&#8801;</span>
            <div style={{flexShrink:0,width:36,textAlign:"center"}}>
              {isMain?<span style={{fontSize:10,fontWeight:900,color:"#c49a4a",background:"rgba(196,154,74,0.12)",padding:"2px 6px",borderRadius:5}}>MAIN</span>
                     :<span style={{fontSize:14,fontWeight:700,color:"rgba(26,20,16,0.3)"}}>{i+1}</span>}
            </div>
            <div style={{width:60,height:60,borderRadius:8,overflow:"hidden",background:"#ede8df",flexShrink:0}}>
              {url?<img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  :<div style={{width:"100%",height:"100%",display:"grid",placeItems:"center",fontSize:9,color:"rgba(26,20,16,0.15)",fontWeight:900}}>M!LK</div>}
            </div>
            <input value={url} onChange={e=>set(k as string,e.target.value)}
              placeholder={isMain?"URL photo principale...":`URL photo ${i+1}...`}
              style={{...IS,flex:1,fontSize:14}}/>
            <label style={{flexShrink:0,cursor:"pointer"}}>
              <input type="file" accept="image/*" style={{display:"none"}}
                onChange={e=>{const f=e.target.files?.[0];if(f)handleUpload(i,f);e.target.value="";}}/>
              <div style={{padding:"10px 16px",borderRadius:8,background:uploading===i?"#e5e7eb":"#1a1410",color:uploading===i?"#9ca3af":"#f2ede6",fontWeight:800,fontSize:14,whiteSpace:"nowrap"}}>
                {uploading===i?"...":"⬆ Upload"}
              </div>
            </label>
            {url&&<button type="button" onClick={()=>set(k as string,"")}
              style={{width:32,height:32,borderRadius:6,border:"1px solid rgba(220,38,38,0.2)",background:"rgba(220,38,38,0.05)",cursor:"pointer",color:"#dc2626",fontSize:16,fontWeight:900,flexShrink:0}}>×</button>}
            {msgs[i]?.txt&&<span style={{fontSize:11,fontWeight:700,color:msgs[i].ok?"#166534":"#b91c1c",flexShrink:0}}>{msgs[i].ok?"✅":"❌ "+msgs[i].txt}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── PhotoField ────────────────────────────────────────────────────────────────
function PhotoField({ label, fieldKey, value, isMain, onSetMain, onChange }: {
  label: string; fieldKey: string; value: string;
  isMain: boolean; onSetMain: () => void;
  onChange: (k: string, v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [ok,  setOk]  = useState(false);
  const [err, setErr] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setErr(""); setOk(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await adminFetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur upload");
      onChange(fieldKey, data.url);
      setOk(true);
    } catch (e: any) { setErr(e.message); }
    finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
        <label style={LS}>{label}</label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, fontWeight: 800, color: isMain ? "#c49a4a" : "rgba(0,0,0,0.4)" }}>
          <input type="radio" name="main_photo" checked={isMain} onChange={onSetMain} style={{ accentColor: "#c49a4a" }} />
          ⭐ Photo principale
        </label>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input value={value} onChange={e => onChange(fieldKey, e.target.value)}
          placeholder="URL de l'image..." style={{ ...IS, flex: 1 }} />
        <input ref={ref} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
          style={{ padding: "11px 14px", borderRadius: 10, background: uploading ? "#f3f4f6" : "#1a1410", color: uploading ? "#9ca3af" : "#f2ede6", fontWeight: 800, fontSize: 13, border: "none", cursor: uploading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
          {uploading ? "Upload..." : "⬆ Uploader"}
        </button>
        {value && (
          <div style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", flexShrink: 0, border: "1px solid rgba(0,0,0,0.1)" }}>
            <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          </div>
        )}
      </div>
      {err && <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700 }}>❌ {err}</div>}
      {ok  && <div style={{ fontSize: 12, color: "#166534", fontWeight: 700 }}>✅ Uploadée</div>}
    </div>
  );
}

// ── Field générique ───────────────────────────────────────────────────────────
function Field({ label, fieldKey, value, onChange, placeholder, type = "text", hint }: {
  label: string; fieldKey: string; value: string;
  onChange: (k: string, v: string) => void;
  placeholder?: string; type?: string; hint?: string;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={LS}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(fieldKey, e.target.value)}
        placeholder={placeholder} style={IS} />
      {hint && <div style={{ fontSize: 11, color: "rgba(26,20,16,0.4)", lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

// ── ColorEntryRow ─────────────────────────────────────────────────────────────
function ColorEntryRow({ color, index, onUpdate, onRemove }: {
  color: ColorEntry; index: number;
  onUpdate: (i: number, k: keyof ColorEntry, v: string) => void;
  onRemove: (i: number) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploadErr, setUploadErr] = useState("");
  const hasImage = !!color.image_url;

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadErr("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const res  = await adminFetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      onUpdate(index, "image_url", data.url);
    } catch (e: any) { setUploadErr(e.message); }
    finally { if (ref.current) ref.current.value = ""; }
  }

  return (
    <div style={{ display: "grid", gap: 14, padding: "18px 20px", borderRadius: 14, background: "#ede8df", border: "2px solid #1a1410" }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 14, alignItems: "start" }}>
        {/* Pastille */}
        <div>
          <input ref={ref} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
          <button type="button" onClick={() => ref.current?.click()} title="Uploader une image de motif"
            style={{ position: "relative", width: 56, height: 56, borderRadius: 14, border: `2px solid ${hasImage ? "#c49a4a" : "rgba(0,0,0,0.12)"}`, overflow: "hidden", background: color.hex, cursor: "pointer" }}
          >
            {color.image_url && (
              <img src={color.image_url} alt={color.name}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.5)", padding: "3px 0", textAlign: "center" }}>
              <span style={{ color: "#fff", fontSize: 18, lineHeight: 1 }}>⬆</span>
            </div>
            <div style={{ position: "absolute", bottom: 2, right: 2, fontSize: 9, fontWeight: 900, background: hasImage ? "#c49a4a" : "#1a1410", color: "#fff", padding: "1px 4px", borderRadius: 4, lineHeight: 1.4 }}>
              {hasImage ? "IMG" : "HEX"}
            </div>
          </button>
        </div>

        {/* Nom */}
        <div style={{ display: "grid", gap: 6 }}>
          <label style={LS}>Nom du coloris / motif</label>
          <input type="text" value={color.name}
            onChange={e => onUpdate(index, "name", e.target.value)}
            placeholder="Ex : Noir damier, Caramel uni..." style={IS} />
        </div>

        {/* Stock */}
        <div style={{ display: "grid", gap: 6 }}>
          <label style={LS}>Stock</label>
          <input type="number" value={color.stock} min="0"
            onChange={e => onUpdate(index, "stock", e.target.value)}
            style={{ ...IS, width: 80, textAlign: "center" }} />
        </div>

        {/* Supprimer */}
        <button type="button" onClick={() => onRemove(index)}
          style={{ padding: "12px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer", alignSelf: "end", marginBottom: 0 }}>
          ✕
        </button>
      </div>

      {/* Hex + image URL */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr auto", gap: 10, alignItems: "end" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={LS}>
            Couleur hex {hasImage && <span style={{ color: "#c49a4a" }}>(image chargée ✓)</span>}
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="color" value={color.hex}
              onChange={e => onUpdate(index, "hex", e.target.value)}
              style={{ width: 44, height: 44, borderRadius: 8, border: "2px solid rgba(0,0,0,0.1)", padding: 2, cursor: "pointer" }} />
            <input type="text" value={color.hex}
              onChange={e => onUpdate(index, "hex", e.target.value)}
              style={{ ...IS, width: 110 }} />
          </div>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={LS}>URL image motif (optionnel)</label>
          <input type="text" value={color.image_url ?? ""}
            onChange={e => onUpdate(index, "image_url", e.target.value)}
            placeholder="https://..." style={IS} />
        </div>
        {color.image_url && (
          <button type="button" onClick={() => onUpdate(index, "image_url", "")}
            style={{ padding: "10px 12px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 12, border: "none", cursor: "pointer", flexShrink: 0 }}>
            Retirer l'image
          </button>
        )}
      </div>

      {uploadErr && <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700 }}>❌ {uploadErr}</div>}

      {color.name && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "#fff", border: "1px solid rgba(0,0,0,0.07)" }}>
          <div style={{ width: 26, height: 26, borderRadius: 99, overflow: "hidden", border: "1px solid rgba(0,0,0,0.12)", background: color.hex, flexShrink: 0 }}>
            {hasImage && <img src={color.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
          </div>
          <span style={{ fontWeight: 800, fontSize: 13, color: "#1a1410" }}>{color.name}</span>
          <span style={{ fontSize: 13, color: "rgba(26,20,16,0.45)" }}>— {color.stock} unité{parseInt(color.stock) !== 1 ? "s" : ""}</span>
          {hasImage && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800, color: "#c49a4a", background: "rgba(196,154,74,0.1)", padding: "3px 8px", borderRadius: 99 }}>Motif image ✓</span>}
        </div>
      )}
    </div>
  );
}

// ── CARDS FICHE PRODUIT ÉDITABLES ─────────────────────────────────────────────

const CARD_TYPES: { value: FicheCard["type"]; label: string; desc: string; icon: string; preview: string }[] = [
  { value: "subtitle",    label: "Phrase d'accroche",       icon: "💬", desc: "La phrase en gras sous le nom du produit",                  preview: "Double zip + moufles intégrées = fin des batailles quotidiennes." },
  { value: "features",    label: "Points forts ✓",          icon: "✅", desc: "La card avec les checkmarks ambrés",                        preview: "Double zip inversé : change par le bas \nZéro bouton : rien à aligner…" },
  { value: "motif",       label: "Info motif / coloris",    icon: "🎨", desc: "La ligne 'Motif Flash — éclairs blancs…' sous les points forts", preview: "Motif Flash — éclairs blancs minimalistes sur fond gris anthracite." },
  { value: "whyresult",   label: "Pourquoi + Résultat",     icon: "💡", desc: "2 cards : 'La vraie raison' + 'Ce que tu obtiens'",          preview: "Pourquoi : L'habillage d'un bébé peut virer… / Résultat : Habillage en moins d'une minute…" },
  { value: "philosophy",  label: "Philosophie M!LK",        icon: "🧠", desc: "La grande card sombre avec les Q/R et la conclusion en gras", preview: "Les pyjamas à boutons ? Combat garanti… / Ici : double zip…" },
  { value: "description", label: "Description libre",       icon: "📝", desc: "Paragraphe de texte libre (bonnet, lange, etc.)",             preview: "Premier contact avec la tête fragile de votre nouveau-né…" },
  { value: "coloris",     label: "Info coloris texte",      icon: "🌈", desc: "Texte coloris pour produits sans variante de motif",         preview: "Terre cuite — brun chaud aux nuances naturelles, à la fois doux et affirmé." },
  { value: "entretien",   label: "Conseils d'entretien",    icon: "🧺", desc: "Instructions de lavage affichées sous le bouton panier",     preview: "Lavage 40°C, cycle délicat \nSans adoucissant ni javel…" },
];

function CardPreviewPopover({ card }: { card: FicheCard }) {
  let featuresArr: string[] = [];
  if (card.type === "features") { try { featuresArr = JSON.parse(card.content); } catch { featuresArr = []; } }
  let wrObj = { why: "", result: "" };
  if (card.type === "whyresult") { try { wrObj = JSON.parse(card.content); } catch {} }
  let entretienArr: string[] = [];
  if (card.type === "entretien") { try { entretienArr = JSON.parse(card.content); } catch { entretienArr = []; } }

  return (
    <div style={{ padding: "14px 16px", background: "#ede8df", borderRadius: 14, display: "flex", flexDirection: "column", gap: 10, minWidth: 280, maxWidth: 340 }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" as const, color: "rgba(26,20,16,0.4)", marginBottom: 2 }}>👁 Aperçu live</div>

      {card.type === "subtitle" && card.content && (
        <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(26,20,16,0.8)", lineHeight: 1.5 }}>{card.content}</div>
      )}
      {(card.type === "description") && card.content && (
        <div style={{ fontSize: 12, color: "rgba(26,20,16,0.6)", lineHeight: 1.75 }}>{card.content}</div>
      )}
      {(card.type === "coloris" || card.type === "motif") && card.content && (
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1410" }}>
          <span style={{ color: "#c49a4a", fontWeight: 900 }}>{card.type === "motif" ? "Motif" : "Coloris"}</span> — {card.content}
        </div>
      )}
      {card.type === "features" && featuresArr.filter(Boolean).length > 0 && (
        <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(26,20,16,0.06)", border: "1px solid rgba(26,20,16,0.1)", display: "grid", gap: 7 }}>
          {featuresArr.filter(Boolean).map((feat, i) => {
            const ci = feat.indexOf(" : ");
            const lbl = ci > -1 ? feat.slice(0, ci) : feat;
            const dsc = ci > -1 ? feat.slice(ci + 3) : "";
            return (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                  <circle cx="7" cy="7" r="6.5" fill="rgba(196,154,74,0.15)" stroke="rgba(196,154,74,0.4)"/>
                  <path d="M4 7l2 2 4-4" stroke="#c49a4a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div style={{ fontSize: 11, lineHeight: 1.4, color: "#1a1410" }}>
                  <strong>{lbl}</strong>{dsc && <span style={{ fontWeight: 400, color: "rgba(26,20,16,0.5)" }}> : {dsc}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {card.type === "whyresult" && (wrObj.why || wrObj.result) && (
        <div style={{ display: "grid", gap: 7 }}>
          {wrObj.why && (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(26,20,16,0.07)", border: "1px solid rgba(26,20,16,0.1)" }}>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" as const, color: "#c49a4a", marginBottom: 4 }}>La vraie raison</div>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(26,20,16,0.65)", lineHeight: 1.7 }}>{wrObj.why}</p>
            </div>
          )}
          {wrObj.result && (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.2)" }}>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" as const, color: "#c49a4a", marginBottom: 4 }}>Ce que tu obtiens</div>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(26,20,16,0.65)", lineHeight: 1.7, fontWeight: 600 }}>{wrObj.result}</p>
            </div>
          )}
        </div>
      )}
      {card.type === "philosophy" && card.content && (
        <div style={{ padding: "10px 12px", borderRadius: 10, background: "#2d1a0e" }}>
          <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" as const, color: "#c49a4a", marginBottom: 6 }}>Philosophie M!LK</div>
          <div style={{ fontSize: 11, color: "rgba(242,237,230,0.7)", lineHeight: 1.7 }}>{card.content}</div>
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(242,237,230,0.08)", fontSize: 10, fontWeight: 900, color: "#f2ede6", lineHeight: 1.5 }}>
            Chaque produit M!LK répond à un problème réel. Pas de design pour le design.
          </div>
        </div>
      )}
      {card.type === "entretien" && entretienArr.filter(Boolean).length > 0 && (
        <div style={{ display: "grid", gap: 5 }}>
          {entretienArr.filter(Boolean).map((line, i) => (
            <div key={i} style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 11, color: "#1a1410" }}>
              <span style={{ color: "#c49a4a", fontSize: 10 }}>⬤</span>{line}
            </div>
          ))}
        </div>
      )}
      {(!card.content || card.content === "[]" || card.content === '{"why":"","result":""}') && (
        <div style={{ fontSize: 11, color: "rgba(26,20,16,0.3)", fontStyle: "italic" }}>Écris du contenu pour voir l'aperçu</div>
      )}
    </div>
  );
}

function FicheCardEditor({ card, onUpdate, onRemove, onMoveUp, onMoveDown, isFirst, isLast, colIdx = 0 }: {
  card: FicheCard;
  onUpdate: (id: string, field: keyof FicheCard, value: string) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isFirst: boolean; isLast: boolean;
  colIdx?: number; // 0 = colonne gauche → popover à droite | 1 = colonne droite → popover à gauche
}) {
  const [open,        setOpen]        = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const typeDef = CARD_TYPES.find(t => t.value === card.type);

  let featuresArr: string[] = [];
  if (card.type === "features") { try { featuresArr = JSON.parse(card.content); } catch { featuresArr = []; } }
  let wrObj = { why: "", result: "" };
  if (card.type === "whyresult") { try { wrObj = JSON.parse(card.content); } catch {} }
  let entretienArr: string[] = [];
  if (card.type === "entretien") { try { entretienArr = JSON.parse(card.content); } catch { entretienArr = []; } }

  function updateFeature(idx: number, val: string) { const a = [...featuresArr]; a[idx] = val; onUpdate(card.id, "content", JSON.stringify(a)); }
  function addFeature() { onUpdate(card.id, "content", JSON.stringify([...featuresArr, ""])); }
  function removeFeature(idx: number) { onUpdate(card.id, "content", JSON.stringify(featuresArr.filter((_, i) => i !== idx))); }
  function updateWR(field: "why"|"result", val: string) { onUpdate(card.id, "content", JSON.stringify({ ...wrObj, [field]: val })); }
  function updateEntretienLine(idx: number, val: string) { const a = [...entretienArr]; a[idx] = val; onUpdate(card.id, "content", JSON.stringify(a)); }
  function addEntretienLine() { onUpdate(card.id, "content", JSON.stringify([...entretienArr, ""])); }
  function removeEntretienLine(idx: number) { onUpdate(card.id, "content", JSON.stringify(entretienArr.filter((_, i) => i !== idx))); }

  // Style textarea pleine largeur
  const TA: React.CSSProperties = { ...IS, resize: "vertical", fontFamily: "inherit", lineHeight: 1.65, width: "100%", boxSizing: "border-box" };

  return (
    <div ref={cardRef} style={{ borderRadius: 16, border: `2px solid ${open ? "#c49a4a" : "rgba(196,154,74,0.25)"}`, overflow: "visible", background: "#fffdf9", position: "relative" }}>

      {/* ── Header ── */}
      <div onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: open ? "rgba(196,154,74,0.1)" : "#faf8f4", cursor: "pointer", userSelect: "none", borderRadius: open ? "14px 14px 0 0" : 14 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: open ? "#c49a4a" : "rgba(196,154,74,0.15)", display: "grid", placeItems: "center", flexShrink: 0, transition: "all 0.2s" }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
            <path d="M2 4l4 4 4-4" stroke={open ? "#fff" : "#c49a4a"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 14, color: "#1a1410", display: "flex", alignItems: "center", gap: 6 }}>
            <span>{typeDef?.icon}</span>
            <span>{typeDef?.label ?? card.type}</span>
            {card.content && card.content !== "[]" && card.content !== '{"why":"","result":""}' && (
              <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 99, background: "rgba(22,163,74,0.12)", color: "#16a34a" }}>✓ rempli</span>
            )}
          </div>
          {!open && card.content && card.type === "subtitle" && (
            <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.content}</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
          {/* Bouton aperçu live */}
          <button type="button"
            onClick={e => { e.stopPropagation(); setShowPreview(v => !v); }}
            title="Aperçu live"
            style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: showPreview ? "#c49a4a" : "rgba(196,154,74,0.15)", color: showPreview ? "#1a1410" : "#c49a4a", cursor: "pointer", fontSize: 13, fontWeight: 900 }}>
            👁
          </button>
          <button type="button" onClick={() => onMoveUp(card.id)} disabled={isFirst}
            style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", cursor: isFirst ? "not-allowed" : "pointer", opacity: isFirst ? 0.3 : 1, fontSize: 12 }}>↑</button>
          <button type="button" onClick={() => onMoveDown(card.id)} disabled={isLast}
            style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", cursor: isLast ? "not-allowed" : "pointer", opacity: isLast ? 0.3 : 1, fontSize: 12 }}>↓</button>
          <button type="button" onClick={() => onRemove(card.id)}
            style={{ padding: "5px 8px", borderRadius: 6, border: "none", background: "#fee2e2", color: "#b91c1c", cursor: "pointer", fontSize: 12, fontWeight: 800 }}>✕</button>
        </div>
      </div>

      {/* ── Popover aperçu live ── */}
      {showPreview && (
        <div style={{
          position: "absolute", top: 0,
          ...(colIdx % 2 === 0
            ? { left: "calc(100% + 12px)" }   // colonne gauche → popover à droite
            : { right: "calc(100% + 12px)" }   // colonne droite → popover à gauche
          ),
          zIndex: 200,
          width: 340, boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          borderRadius: 16, border: "2px solid rgba(196,154,74,0.35)",
          background: "#ede8df", overflow: "hidden",
        }}>
          <div style={{ padding: "10px 14px", background: "rgba(196,154,74,0.15)", borderBottom: "1px solid rgba(196,154,74,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#c49a4a", letterSpacing: 1 }}>APERÇU LIVE</span>
            <button onClick={() => setShowPreview(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "rgba(26,20,16,0.4)", fontWeight: 900 }}>✕</button>
          </div>
          <div style={{ padding: 14, maxHeight: 500, overflowY: "auto" }}>
            <CardPreviewPopover card={card} />
          </div>
        </div>
      )}

      {/* ── Corps ── */}
      {open && (
        <div style={{ padding: "18px 20px 22px", display: "grid", gap: 14, borderTop: "1px solid rgba(196,154,74,0.15)" }}>

          {/* Hint */}
          {card.type === "subtitle"   && <div style={{ fontSize: 11, color: "rgba(26,20,16,0.5)", background: "#ede8df", padding: "6px 10px", borderRadius: 8 }}>Phrase en gras juste sous le nom du produit</div>}
          {card.type === "motif"      && <div style={{ fontSize: 11, color: "rgba(26,20,16,0.5)", background: "#ede8df", padding: "6px 10px", borderRadius: 8 }}>Format : Motif [Nom] — [description]</div>}
          {card.type === "coloris"    && <div style={{ fontSize: 11, color: "rgba(26,20,16,0.5)", background: "#ede8df", padding: "6px 10px", borderRadius: 8 }}>Ex : Terre cuite — brun chaud aux nuances naturelles</div>}
          {card.type === "philosophy" && <div style={{ fontSize: 11, color: "rgba(26,20,16,0.5)", background: "#ede8df", padding: "6px 10px", borderRadius: 8, lineHeight: 1.5 }}>Phrases avec "?" = mises en valeur · "Ici :" = bloc encadré · La conclusion finale s'affiche auto.</div>}
          {card.type === "features"   && <div style={{ fontSize: 11, color: "rgba(26,20,16,0.5)", background: "#ede8df", padding: "6px 10px", borderRadius: 8 }}>Format : <strong>Titre</strong> : description</div>}

          {/* ── Subtitle / Description / Coloris / Motif / Philosophie ── */}
          {(card.type === "subtitle" || card.type === "description" || card.type === "coloris" || card.type === "motif" || card.type === "philosophy") && (
            <>
              <label style={LS}>{typeDef?.label}</label>
              <textarea
                value={card.content}
                onChange={e => onUpdate(card.id, "content", e.target.value)}
                onFocus={() => setShowPreview(true)}
                rows={card.type === "philosophy" ? 6 : card.type === "description" ? 4 : 3}
                style={TA}
                placeholder={card.type === "subtitle" ? "Double zip + moufles intégrées = fin des batailles quotidiennes." : ""}
              />
            </>
          )}

          {/* ── Features ── */}
          {card.type === "features" && (
            <>
              <label style={LS}>Points forts ({featuresArr.length})</label>
              {featuresArr.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#c49a4a", flexShrink: 0, width: 20, textAlign: "right", paddingTop: 13 }}>{i+1}</span>
                  <textarea
                    value={f}
                    onChange={e => updateFeature(i, e.target.value)}
                    onFocus={() => setShowPreview(true)}
                    rows={2}
                    placeholder="Double zip inversé : change par le bas, habille par le haut"
                    style={{ ...TA, flex: 1 }}
                  />
                  <button type="button" onClick={() => removeFeature(i)}
                    style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 8, background: "#fee2e2", color: "#b91c1c", border: "none", cursor: "pointer", fontWeight: 800, marginTop: 6 }}>✕</button>
                </div>
              ))}
              <button type="button" onClick={addFeature}
                style={{ padding: "9px", borderRadius: 8, border: "2px dashed rgba(196,154,74,0.4)", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "#c49a4a" }}>
                + Ajouter un point
              </button>
            </>
          )}

          {/* ── WhyResult ── */}
          {card.type === "whyresult" && (
            <>
              <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(26,20,16,0.06)", borderLeft: "3px solid #c49a4a" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#c49a4a" }}>Card 1 — "La vraie raison / Pourquoi ce produit existe"</div>
              </div>
              <label style={LS}>Le problème du parent</label>
              <textarea value={wrObj.why} onChange={e => updateWR("why", e.target.value)}
                onFocus={() => setShowPreview(true)}
                rows={4} style={TA} placeholder="Tu te lèves pour la 4e fois…" />
              <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(196,154,74,0.08)", borderLeft: "3px solid #c49a4a" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#c49a4a" }}>Card 2 — "Ce que tu obtiens / Le résultat"</div>
              </div>
              <label style={LS}>Le résultat concret</label>
              <textarea value={wrObj.result} onChange={e => updateWR("result", e.target.value)}
                onFocus={() => setShowPreview(true)}
                rows={4} style={TA} placeholder="Habillage en moins d'une minute…" />
            </>
          )}

          {/* ── Entretien ── */}
          {card.type === "entretien" && (
            <>
              <label style={LS}>Instructions — une par ligne</label>
              {entretienArr.map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <textarea value={line} onChange={e => updateEntretienLine(i, e.target.value)}
                    onFocus={() => setShowPreview(true)}
                    rows={2}
                    placeholder="Ex : Lavage 40°C, cycle délicat"
                    style={{ ...TA, flex: 1 }} />
                  <button type="button" onClick={() => removeEntretienLine(i)}
                    style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 8, background: "#fee2e2", color: "#b91c1c", border: "none", cursor: "pointer", fontWeight: 800, marginTop: 6 }}>✕</button>
                </div>
              ))}
              <button type="button" onClick={addEntretienLine}
                style={{ padding: "9px", borderRadius: 8, border: "2px dashed rgba(196,154,74,0.4)", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "#c49a4a" }}>
                + Ajouter
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}


// ── FAQ ÉDITABLES ──────────────────────────────────────────────────────────────
function FaqEditor({ faq, onUpdate, onRemove, onMoveUp, onMoveDown, isFirst, isLast }: {
  faq: FaqItem;
  onUpdate: (id: string, field: keyof FaqItem, value: string) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isFirst: boolean; isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)", overflow: "hidden", background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer", background: "#f9f6f1" }} onClick={() => setOpen(v => !v)}>
        <span style={{ fontSize: 18, color: "#c49a4a", fontWeight: 300, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "none", flexShrink: 0 }}>+</span>
        <div style={{ flex: 1, fontWeight: 700, fontSize: 14, color: "#1a1410" }}>
          {faq.question || <span style={{ color: "rgba(26,20,16,0.35)" }}>Question non renseignée…</span>}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button type="button" onClick={e => { e.stopPropagation(); onMoveUp(faq.id); }} disabled={isFirst}
            style={{ padding: "4px 7px", borderRadius: 5, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", cursor: isFirst ? "not-allowed" : "pointer", opacity: isFirst ? 0.3 : 1, fontSize: 11 }}>↑</button>
          <button type="button" onClick={e => { e.stopPropagation(); onMoveDown(faq.id); }} disabled={isLast}
            style={{ padding: "4px 7px", borderRadius: 5, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", cursor: isLast ? "not-allowed" : "pointer", opacity: isLast ? 0.3 : 1, fontSize: 11 }}>↓</button>
          <button type="button" onClick={e => { e.stopPropagation(); onRemove(faq.id); }}
            style={{ padding: "4px 7px", borderRadius: 5, border: "none", background: "#fee2e2", color: "#b91c1c", cursor: "pointer", fontSize: 11, fontWeight: 800 }}>✕</button>
        </div>
      </div>
      {open && (
        <div style={{ padding: "14px 14px 16px", display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>Question</label>
            <input value={faq.question} onChange={e => onUpdate(faq.id, "question", e.target.value)}
              placeholder="Ex : C'est quoi le double zip inversé ?" style={IS} />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>Réponse (\\n pour sauter une ligne)</label>
            <textarea value={faq.reponse} onChange={e => onUpdate(faq.id, "reponse", e.target.value)}
              rows={4} placeholder="Ex : Un système d'ouverture à double sens..."
              style={{ ...IS, resize: "vertical", fontFamily: "inherit", lineHeight: 1.7 }} />
          </div>
          {faq.reponse && (
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "#ede8df", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-line" }}>
              {faq.reponse}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

// ── Logger d'activité ──────────────────────────────────────────────────────────
async function logActivity(type: string, message: string, opts?: { entity_name?: string; entity_id?: string; meta?: Record<string, unknown> }) {
  try {
    let token = "";
    try { for (let i=0;i<localStorage.length;i++){const k=localStorage.key(i)??"";if(k.startsWith("sb-")&&k.endsWith("-auth-token")){const p=JSON.parse(localStorage.getItem(k)??"{}");token=p.access_token??"";if(token)break;}} } catch {}
    await fetch("/api/admin/activity", { method: "POST", headers: { "Content-Type": "application/json", ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify({ type, message, entity_name: opts?.entity_name, entity_id: opts?.entity_id, meta: opts?.meta }) });
  } catch {}
}

export default function AdminProductForm() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const isNew    = id === "new";
  const draftKey = `milk_draft_product_${id}`;

  const [form,         setForm]         = useState<Record<string, string>>(EMPTY);
  const [published,    setPublished]    = useState(true);
  const [sizes,        setSizes]        = useState<string[]>([]);
  const [sizesStock,   setSizesStock]   = useState<Record<string, string>>({});
  const [colors,       setColors]       = useState<ColorEntry[]>([]);
  const [customTaille, setCustomTaille] = useState("");
  const [loading,      setLoading]      = useState(!isNew);
  const [saving,       setSaving]       = useState(false);
  const [publishing,   setPublishing]   = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState("");
  const [autoSaved,    setAutoSaved]    = useState(false);
  const [lastSaved,    setLastSaved]    = useState<Date | null>(null);

  // ── Nouvelles states : cards fiche + FAQs ──
  const [ficheCards,   setFicheCards]   = useState<FicheCard[]>([]);
  const [faqs,         setFaqs]         = useState<FaqItem[]>([]);
  const [showPreview,  setShowPreview]  = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [allProducts,  setAllProducts]  = useState<any[]>([]);
  const [loadingProds, setLoadingProds] = useState(false);
  const [activeTab,    setActiveTab]    = useState("general");
  const [dynCategories, setDynCategories] = useState<{slug:string;label:string}[]>([
    { slug: "bodies",     label: "Bodies"     },
    { slug: "pyjamas",    label: "Pyjamas"    },
    { slug: "gigoteuses", label: "Gigoteuses" },
    { slug: "accessoires",label: "Accessoires"},
  ]);

  const TABS = [
    { id: "general",  label: "Infos générales" },
    { id: "photos",   label: "Photos" },
    { id: "stock",    label: "Tailles · Couleurs · Stock" },
    { id: "promo",    label: "Tarif & Promos" },
    { id: "contenu",  label: "Contenu fiche" },
    { id: "faq",      label: "FAQ" },
    { id: "seo",      label: "SEO" },
  ];

  // Chargement produit existant
  useEffect(() => {
    // Charger les catégories dynamiques
    adminFetch("/api/admin/categories")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const cats = data.map((c: any) =>
            typeof c === "string"
              ? { slug: c, label: c }
              : { slug: c.slug, label: c.label || c.slug }
          );
          setDynCategories(cats);
        }
      })
      .catch(() => {}); // garde les défauts si l'API échoue

    if (isNew) {
      try { const s = localStorage.getItem(draftKey); if (s) setForm(f => ({ ...f, ...JSON.parse(s) })); } catch {}
      return;
    }
    adminFetch(`/api/admin/products?id=${id}`)
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setForm({
            name:             data.name              ?? "",
            slug:             data.slug              ?? "",
            price_ttc:        String(data.price_ttc  ?? ""),
            promo_price:      data.promo_price  ? String(data.promo_price)       : "",
            promo_start:      data.promo_start  ? data.promo_start.slice(0, 10)  : "",
            promo_end:        data.promo_end    ? data.promo_end.slice(0, 10)    : "",
            stock:            String(data.stock      ?? 0),
            category_slug:    data.category_slug     ?? "bodies",
            image_url:        data.image_url         ?? "",
            image_url_2:      data.image_url_2       ?? "",
            image_url_3:      data.image_url_3       ?? "",
            image_url_4:      data.image_url_4       ?? "",
            image_url_5:      data.image_url_5       ?? "",
            image_url_6:      data.image_url_6       ?? "",
            image_url_7:      data.image_url_7       ?? "",
            image_url_8:      data.image_url_8       ?? "",
            description:      data.description       ?? "",
            main_image_index: String(data.main_image_index ?? 0),
            label:            data.label             ?? "",
            highlight:        data.highlight         ?? "",
            position:         String(data.position   ?? 0),
            weight_g:         data.weight_g ? String(data.weight_g) : "",
            seo_title:        data.seo_title         ?? "",
            seo_description:  data.seo_description   ?? "",
            supplier_ref:     data.supplier_ref       ?? "",
          });
          setPublished(data.published !== false);
          setSizes(Array.isArray(data.sizes) ? data.sizes : []);
          setSizesStock(
            data.sizes_stock && typeof data.sizes_stock === "object"
              ? Object.fromEntries(Object.entries(data.sizes_stock).map(([k, v]) => [k, String(v)]))
              : {}
          );
          setColors(
            Array.isArray(data.colors)
              ? data.colors.map((c: any) => ({
                  sizes: Array.isArray(c.sizes) ? c.sizes : [],
                  sizes_stock: (c.sizes_stock && typeof c.sizes_stock === "object") ? Object.fromEntries(Object.entries(c.sizes_stock).map(([k,v]) => [k, String(v)])) : {},
                  validated: true,
                  name:      c.name      ?? "",
                  hex:       c.hex       ?? "#f2ede6",
                  stock:     String(c.stock ?? 0),
                  image_url: c.image_url ?? "",
                }))
              : []
          );
          // Charger cards et faqs — ou pré-remplir depuis contenu hardcodé
          const cat  = data.category_slug ?? "";
          const slg  = data.slug          ?? "";
          if (Array.isArray(data.fiche_cards) && data.fiche_cards.length > 0) {
            setFicheCards(data.fiche_cards);
          } else {
            // Pré-remplissage automatique depuis le contenu existant codé en dur
            setFicheCards(buildDefaultCards(cat, slg, newId));
          }
          if (Array.isArray(data.fiche_faqs) && data.fiche_faqs.length > 0) {
            setFaqs(data.fiche_faqs);
          } else {
            setFaqs(buildDefaultFaqs(cat, slg, newId));
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, isNew]);

  // Auto-save brouillon
  useEffect(() => {
    if (!form.name && !form.price_ttc) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(form));
        setAutoSaved(true); setLastSaved(new Date());
        setTimeout(() => setAutoSaved(false), 2000);
      } catch {}
    }, 10000);
    return () => clearTimeout(t);
  }, [form, draftKey]);

  // Charger tous les produits pour la duplication
  async function loadAllProducts() {
    setLoadingProds(true);
    const res = await adminFetch("/api/admin/products");
    const data = await res.json();
    setAllProducts(Array.isArray(data) ? data : []);
    setLoadingProds(false);
  }

  // Dupliquer les cards + FAQs d'un produit source vers ce produit
  function duplicateFromProduct(source: any) {
    const cat = source.category_slug ?? "";
    const slg = source.slug ?? "";
    if (Array.isArray(source.fiche_cards) && source.fiche_cards.length > 0) {
      setFicheCards(source.fiche_cards.map((c: any) => ({ ...c, id: newId() })));
    } else {
      // Générer depuis le contenu hardcodé de ce produit
      setFicheCards(buildDefaultCards(cat, slg, newId));
    }
    if (Array.isArray(source.fiche_faqs) && source.fiche_faqs.length > 0) {
      setFaqs(source.fiche_faqs.map((f: any) => ({ ...f, id: newId() })));
    } else {
      setFaqs(buildDefaultFaqs(cat, slg, newId));
    }
    setShowDuplicateModal(false);
  }

  function set(k: string, v: string) {
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === "name" && isNew) next.slug = slugify(v);
      return next;
    });
  }

  function toggleSize(t: string) {
    setSizes(prev => {
      if (prev.includes(t)) {
        setSizesStock(s => { const n = { ...s }; delete n[t]; return n; });
        return prev.filter(s => s !== t);
      }
      setSizesStock(s => ({ ...s, [t]: s[t] ?? "0" }));
      return [...prev, t];
    });
  }
  function addCustomTaille() {
    const t = customTaille.trim(); if (!t) return;
    if (!sizes.includes(t)) { setSizes(prev => [...prev, t]); setSizesStock(prev => ({ ...prev, [t]: "0" })); }
    setCustomTaille("");
  }
  function removeSize(t: string) {
    setSizes(prev => prev.filter(s => s !== t));
    setSizesStock(prev => { const n = { ...prev }; delete n[t]; return n; });
  }
  function setSizeStock(t: string, v: string) { setSizesStock(prev => ({ ...prev, [t]: v })); }

  const totalFromSizes  = sizes.length > 0 ? sizes.reduce((s, t) => s + (parseInt(sizesStock[t] ?? "0") || 0), 0) : null;
  const totalFromColors = colors.length > 0 ? colors.reduce((s, c) => s + (parseInt(c.stock) || 0), 0) : null;
  const computedStock   = totalFromSizes ?? totalFromColors;

  function addColor() { setColors(p => [...p, { name: "", hex: "#f2ede6", stock: "0", image_url: "", sizes: [], sizes_stock: {}, validated: false }]); }
  function removeColor(i: number) { setColors(p => p.filter((_, idx) => idx !== i)); }
  function updateColor(i: number, k: keyof ColorEntry, v: string | string[] | Record<string,string> | boolean) {
    setColors(p => p.map((c, idx) => {
      if (idx !== i) return c;
      const updated = { ...c, [k]: v };
      // Recalculer stock auto depuis sizes_stock
      if (k === "sizes_stock" || k === "sizes") {
        const ss = k === "sizes_stock" ? (v as Record<string,string>) : updated.sizes_stock;
        const total = Object.values(ss).reduce((sum, q) => sum + (parseInt(q) || 0), 0);
        updated.stock = String(total);
      }
      return updated;
    }));
  }
  function validateColor(i: number) {
    setColors(p => p.map((c, idx) => idx === i ? { ...c, validated: true } : c));
  }
  function toggleColorSize(colorIdx: number, taille: string) {
    setColors(p => p.map((c, idx) => {
      if (idx !== colorIdx) return c;
      const newSizes = c.sizes.includes(taille)
        ? c.sizes.filter(s => s !== taille)
        : [...c.sizes, taille];
      const newSizesStock = { ...c.sizes_stock };
      if (!newSizes.includes(taille)) delete newSizesStock[taille];
      else if (!newSizesStock[taille]) newSizesStock[taille] = "0";
      const total = Object.values(newSizesStock).reduce((sum, q) => sum + (parseInt(q) || 0), 0);
      return { ...c, sizes: newSizes, sizes_stock: newSizesStock, stock: String(total) };
    }));
  }
  function updateColorSizeStock(colorIdx: number, taille: string, qty: string) {
    setColors(p => p.map((c, idx) => {
      if (idx !== colorIdx) return c;
      const newSizesStock = { ...c.sizes_stock, [taille]: qty };
      const total = Object.values(newSizesStock).reduce((sum, q) => sum + (parseInt(q) || 0), 0);
      return { ...c, sizes_stock: newSizesStock, stock: String(total) };
    }));
  }

  // ── Cards fiche produit ──
  function addCard(type: FicheCard["type"]) {
    const typeDef = CARD_TYPES.find(t => t.value === type);
    let defaultContent = "";
    if (type === "features")  defaultContent = JSON.stringify([""]);
    if (type === "whyresult") defaultContent = JSON.stringify({ why: "", result: "" });
    if (type === "entretien") defaultContent = JSON.stringify(["Lavage 40°C, cycle délicat", "Sans adoucissant ni javel", "Séchage à l'air libre recommandé", "Sèche-linge basse température"]);
    setFicheCards(prev => [...prev, { id: newId(), type, title: typeDef?.label ?? type, content: defaultContent }]);
  }
  function updateCard(id: string, field: keyof FicheCard, value: string) {
    setFicheCards(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  }
  function removeCard(id: string) { setFicheCards(prev => prev.filter(c => c.id !== id)); }
  function moveCard(id: string, dir: "up"|"down") {
    setFicheCards(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  // ── FAQs ──
  function addFaq() { setFaqs(prev => [...prev, { id: newId(), question: "", reponse: "" }]); }
  function updateFaq(id: string, field: keyof FaqItem, value: string) {
    setFaqs(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  }
  function removeFaq(id: string) { setFaqs(prev => prev.filter(f => f.id !== id)); }
  function moveFaq(id: string, dir: "up"|"down") {
    setFaqs(prev => {
      const idx = prev.findIndex(f => f.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  async function togglePublish() {
    if (isNew) return;
    setPublishing(true);
    const newPub = !published;
    const res = await adminFetch("/api/admin/products", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, published: newPub }),
    });
    if (res.ok) {
      setPublished(newPub);
      setSuccess(newPub ? "✅ Produit publié !" : "⏸ Produit dépublié");
      await logActivity("product_publish", `Produit ${published ? "dépublié" : "publié"} : ${form.name}`, { entity_name: form.name, entity_id: id });
      setTimeout(() => setSuccess(""), 3000);
    }
    setPublishing(false);
  }

  async function handleSave() {
    setSaving(true); setError(""); setSuccess("");
    try {
      if (!form.name.trim()) throw new Error("Le nom est obligatoire");
      if (!form.price_ttc)   throw new Error("Le prix est obligatoire — va dans l'onglet Tarif & Promos");

      const body = {
        ...form,
        published,
        price_ttc:        parseFloat(form.price_ttc),
        promo_price:      form.promo_price ? parseFloat(form.promo_price) : null,
        promo_start:      form.promo_start  || null,
        promo_end:        form.promo_end    || null,
        stock:            computedStock !== null ? computedStock : (parseInt(form.stock) || 0),
        main_image_index: parseInt(form.main_image_index) || 0,
        label:            form.label      || null,
        highlight:        form.highlight  || null,
        position:         parseInt(form.position) || 0,
        weight_g:         form.weight_g ? parseInt(form.weight_g) : null,
        seo_title:        form.seo_title        || null,
        seo_description:  form.seo_description  || null,
        supplier_ref:     form.supplier_ref      || null,
        sizes,
        sizes_stock: Object.fromEntries(sizes.map(t => [t, parseInt(sizesStock[t] ?? "0") || 0])),
        colors: colors.map(c => ({
          name:        c.name,
          hex:         c.hex,
          stock:       parseInt(c.stock) || 0,
          image_url:   c.image_url || null,
          sizes:       c.sizes ?? [],
          sizes_stock: Object.fromEntries(Object.entries(c.sizes_stock ?? {}).map(([k,v]) => [k, parseInt(v)||0])),
        })),
        // Nouvelles données fiche produit
        fiche_cards: ficheCards,
        fiche_faqs:  faqs,
      };

      const res  = await adminFetch("/api/admin/products", {
        method:  isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(isNew ? body : { id, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");

      try { localStorage.removeItem(draftKey); } catch {}
      setSuccess(isNew ? "✅ Produit créé !" : "✅ Enregistré !");
      setLastSaved(new Date());
      // Log activité
      await logActivity(
        isNew ? "product_create" : "product_update",
        isNew ? `Produit créé : ${form.name}` : `Produit modifié : ${form.name}`,
        {
          entity_name: form.name,
          entity_id:   isNew ? undefined : id,
          meta: {
            price_ttc:   parseFloat(form.price_ttc),
            promo_price: form.promo_price ? parseFloat(form.promo_price) : null,
            description: form.description ? form.description.slice(0, 200) : null,
            stock:       computedStock !== null ? computedStock : (parseInt(form.stock) || 0),
            published,
          },
        }
      );
      if (isNew) router.push("/admin/produits");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer "${form.name}" définitivement ?`)) return;
    const deletedName = form.name;
    await adminFetch("/api/admin/products", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    try { localStorage.removeItem(draftKey); } catch {}
    await logActivity("product_delete", `Produit supprimé : ${deletedName}`, { entity_name: deletedName, entity_id: id });
    router.push("/admin/produits");
  }

  const photoKeys   = ["image_url", "image_url_2", "image_url_3", "image_url_4", "image_url_5", "image_url_6", "image_url_7", "image_url_8"] as const;
  const photoLabels = ["Photo 1", "Photo 2", "Photo 3", "Photo 4", "Photo 5", "Photo 6", "Photo 7", "Photo 8"];
  const hasPromo    = !!form.promo_price;

  if (loading) return <div style={{ padding: 60, opacity: 0.4, fontSize: 16 }}>Chargement...</div>;

  // ── Données aperçu calculées en live ──
  const previewSubtitle  = ficheCards.find(c => c.type === "subtitle")?.content ?? "";
  const previewFeatures: string[] = (() => { try { return JSON.parse(ficheCards.find(c => c.type === "features")?.content ?? "[]"); } catch { return []; } })();
  const previewWR: { why: string; result: string } | null = (() => { try { const wr = JSON.parse(ficheCards.find(c => c.type === "whyresult")?.content ?? "null"); return wr?.why ? wr : null; } catch { return null; } })();
  const previewColoris   = ficheCards.find(c => c.type === "coloris")?.content ?? "";
  const previewDesc      = ficheCards.find(c => c.type === "description")?.content ?? "";
  const previewPhilo     = ficheCards.find(c => c.type === "philosophy")?.content ?? "";
  const priceDisplay     = form.promo_price ? Number(form.promo_price) : Number(form.price_ttc || 0);
  const hasPreviewContent = form.name || previewSubtitle || previewFeatures.length > 0 || previewWR || ficheCards.length > 0;

  return (
  <div style={{ minHeight: "100vh", background: "#f5f0e8" }}>

    {/* ── ONGLETS FIXES EN HAUT ── */}
    <div style={{ position: "sticky", top: 60, zIndex: 90, background: "#fff", borderBottom: "2px solid rgba(26,20,16,0.1)", display: "flex", alignItems: "stretch", overflowX: "auto", scrollbarWidth: "none" }}>
      {/* Header avec nom produit */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px", borderRight: "1px solid rgba(26,20,16,0.08)", flexShrink: 0 }}>
        <button onClick={() => router.push("/admin/produits")}
          style={{ padding: "8px 14px", borderRadius: 8, border: "2px solid rgba(0,0,0,0.1)", background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 800, whiteSpace: "nowrap" }}>
          ← Retour
        </button>
        <div style={{ fontSize: 15, fontWeight: 900, color: "#1a1410", whiteSpace: "nowrap", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
          {isNew ? "Nouveau produit" : (form.name || "...")}
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", flex: 1 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: "16px 20px", border: "none", borderBottom: activeTab === tab.id ? "3px solid #c49a4a" : "3px solid transparent", background: "transparent", cursor: "pointer", fontWeight: activeTab === tab.id ? 900 : 600, fontSize: 14, color: activeTab === tab.id ? "#1a1410" : "rgba(26,20,16,0.45)", whiteSpace: "nowrap", transition: "all 0.15s", marginBottom: -2 }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Statut publié */}
      {!isNew && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 20px", borderLeft: "1px solid rgba(26,20,16,0.08)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 99, background: published ? "rgba(22,163,74,0.1)" : "rgba(107,114,128,0.1)" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: published ? "#16a34a" : "#9ca3af" }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: published ? "#16a34a" : "#9ca3af" }}>{published ? "En ligne" : "Hors ligne"}</span>
          </div>
          <button onClick={togglePublish} disabled={publishing}
            style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontWeight: 900, fontSize: 13, cursor: "pointer", background: published ? "#fee2e2" : "#1a1410", color: published ? "#b91c1c" : "#c49a4a", whiteSpace: "nowrap" }}>
            {publishing ? "..." : published ? "⏸ Dépublier" : "🚀 Publier"}
          </button>
        </div>
      )}
    </div>

    {/* ── CONTENU ONGLET ── */}
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 40px 120px" }}>

      {/* Erreur / succès */}
      {error   && <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 12, background: "#fee2e2", color: "#b91c1c", fontSize: 15, fontWeight: 700 }}>❌ {error}</div>}
      {success && <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 12, background: "#dcfce7", color: "#166534", fontSize: 15, fontWeight: 700 }}>{success}</div>}

      {/* ═══ ONGLET 1 : INFOS GÉNÉRALES ═══ */}
      {activeTab === "general" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: 24, alignItems: "start" }}>

          {/* Colonne gauche */}
          <div style={{ display: "grid", gap: 20 }}>
            <div style={SECTION}>
              <div style={{ fontWeight: 900, fontSize: 20, color: "#1a1410" }}>Identité du produit</div>
              <Field label="Nom du produit *" fieldKey="name" placeholder="Ex : Pyjama Bambou — Éclair" value={form.name} onChange={set} />
              <Field label="Slug (URL)" fieldKey="slug" placeholder="pyjama-bambou-eclair" value={form.slug} onChange={set} hint="Généré depuis le nom" />
              <div style={{ display: "grid", gap: 6 }}>
                <label style={LS}>Catégorie</label>
                <select value={form.category_slug} onChange={e => set("category_slug", e.target.value)} style={IS}>
                  {dynCategories.map(c => (
                    <option key={c.slug} value={c.slug}>{c.label}</option>
                  ))}
                  {/* Option de secours si la catégorie du produit n'est pas dans la liste */}
                  {form.category_slug && !dynCategories.find(c => c.slug === form.category_slug) && (
                    <option value={form.category_slug}>{form.category_slug}</option>
                  )}
                </select>
                {!isNew && (
                  <div style={{ fontSize: 11, color: "rgba(196,154,74,0.8)", marginTop: 2 }}>
                    ⚠️ Changer la catégorie déplace le produit. Les contenus par défaut de l'onglet "Contenu fiche" s'adapteront à la nouvelle catégorie.
                  </div>
                )}
              </div>
              <Field label="Référence fournisseur" fieldKey="supplier_ref" placeholder="ES-001" value={form.supplier_ref} onChange={set} />
            </div>

            <div style={SECTION}>
              <div style={{ fontWeight: 900, fontSize: 20, color: "#1a1410" }}>Logistique</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 16 }}>
                <Field label="Position" fieldKey="position" type="number" placeholder="0" value={form.position} onChange={set} hint="0 = premier" />
                <Field label="Poids (g)" fieldKey="weight_g" type="number" placeholder="120" value={form.weight_g} onChange={set} />
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={LS}>Stock total</label>
                <Field label="" fieldKey="stock" type="number" placeholder="0"
                  value={computedStock !== null ? String(computedStock) : form.stock} onChange={set}
                  hint={computedStock !== null ? `Calculé depuis motifs : ${computedStock} u.` : "Saisi manuellement si pas de motifs"} />
              </div>
            </div>
          </div>

          {/* Colonne droite */}
          <div style={{ display: "grid", gap: 20 }}>
            <div style={SECTION}>
              <div style={{ fontWeight: 900, fontSize: 20, color: "#1a1410" }}>Badge & Mise en avant</div>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={LS}>Badge produit</label>
                <select value={form.label} onChange={e => set("label", e.target.value)} style={IS}>
                  {LABELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={LS}>Mise en avant</label>
                <select value={form.highlight} onChange={e => set("highlight", e.target.value)} style={IS}>
                  {HIGHLIGHTS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                </select>
              </div>
            </div>

            <div style={SECTION}>
              <div style={{ fontWeight: 900, fontSize: 20, color: "#1a1410" }}>Description interne</div>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={LS}>Description courte (fallback SEO)</label>
                <textarea value={form.description} onChange={e => set("description", e.target.value)}
                  placeholder="Description courte interne..." rows={5}
                  style={{ ...IS, resize: "vertical", fontFamily: "inherit", lineHeight: 1.7 }} />
              </div>
            </div>

            <div style={SECTION}>
              <div style={{ fontWeight: 900, fontSize: 20, color: "#1a1410" }}>Duplication</div>
              <div style={{ fontSize: 14, color: "rgba(26,20,16,0.5)" }}>Copier les blocs de contenu et FAQs depuis un autre produit</div>
              <button onClick={() => { setShowDuplicateModal(true); loadAllProducts(); }}
                style={{ padding: "12px 20px", borderRadius: 10, border: "2px solid rgba(0,0,0,0.12)", background: "#fff", color: "#1a1410", cursor: "pointer", fontSize: 15, fontWeight: 800 }}>
                📋 Copier depuis un autre produit…
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ONGLET 2 : PHOTOS ═══ */}
      {activeTab === "photos" && (
        <div style={{ maxWidth: 700 }}>
          <div style={SECTION}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 20, color: "#1a1410", marginBottom: 6 }}>Photos produit (8 max)</div>
              <div style={{ fontSize: 14, color: "rgba(26,20,16,0.5)" }}>Glisse pour réordonner — la 1re ligne est toujours la photo principale</div>
            </div>
            <PhotosDragDrop photoKeys={photoKeys} form={form} set={set} />
          </div>
        </div>
      )}

      {/* ═══ ONGLET 3 : MOTIFS / TAILLES / STOCK ═══ */}
      {activeTab === "stock" && (
        <div style={{ display: "grid", gap: 24 }}>

          {/* Header + bouton ajouter */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 22, color: "#1a1410", marginBottom: 4 }}>Motifs & Stock</div>
              <div style={{ fontSize: 14, color: "rgba(26,20,16,0.5)" }}>
                Pour chaque motif : 1️⃣ Valider le motif → 2️⃣ Sélectionner les tailles → 3️⃣ Saisir les quantités
              </div>
            </div>
            <button onClick={addColor}
              style={{ padding: "12px 20px", borderRadius: 12, background: "#1a1410", color: "#c49a4a", fontWeight: 900, fontSize: 15, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
              + Ajouter un motif
            </button>
          </div>

          {/* Stock total */}
          {colors.length > 0 && (
            <div style={{ padding: "14px 20px", borderRadius: 12, background: "#dcfce7", border: "1px solid #86efac", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#166534" }}>
                Stock total calculé sur tous les motifs
              </span>
              <span style={{ fontSize: 22, fontWeight: 950, color: "#166534" }}>
                {colors.reduce((sum, col) => sum + (parseInt(col.stock) || 0), 0)} unités
              </span>
            </div>
          )}

          {colors.length === 0 && (
            <div style={{ padding: "40px 32px", borderRadius: 16, background: "#fff", border: "1.5px dashed rgba(26,20,16,0.15)", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎨</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1410", marginBottom: 8 }}>Aucun motif pour l'instant</div>
              <div style={{ fontSize: 14, color: "rgba(26,20,16,0.5)" }}>Clique sur "+ Ajouter un motif" pour commencer</div>
            </div>
          )}

          {/* Liste des motifs */}
          {colors.map((motif, colorIdx) => (
            <div key={colorIdx} style={{ background: "#fff", borderRadius: 20, border: `2px solid ${motif.validated ? "rgba(26,20,16,0.1)" : "#c49a4a"}`, overflow: "hidden" }}>

              {/* ── Étape 1 : Identité du motif ── */}
              <div style={{ padding: "20px 24px", borderBottom: motif.validated ? "1px solid rgba(26,20,16,0.08)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 99, background: motif.validated ? "#16a34a" : "#c49a4a", color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
                    {motif.validated ? "✓" : "1"}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1410" }}>
                    {motif.validated ? `Motif : ${motif.name || "—"}` : "Définir le motif"}
                  </div>
                  <button onClick={() => removeColor(colorIdx)}
                    style={{ marginLeft: "auto", width: 32, height: 32, borderRadius: 8, background: "#fee2e2", border: "none", color: "#dc2626", cursor: "pointer", fontWeight: 900, fontSize: 16 }}>×</button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "end" }}>
                  {/* Pastille image */}
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" as const, color: "rgba(26,20,16,0.5)" }}>Image</label>
                    <label style={{ cursor: "pointer" }}>
                      <input type="file" accept="image/*" style={{ display: "none" }}
                        onChange={async e => {
                          const file = e.target.files?.[0]; if (!file) return;
                          const fd = new FormData(); fd.append("file", file);
                          const res = await adminFetch("/api/admin/upload", { method: "POST", body: fd });
                          const data = await res.json();
                          if (res.ok) updateColor(colorIdx, "image_url", data.url);
                          e.target.value = "";
                        }} />
                      <div style={{ width: 64, height: 64, borderRadius: 14, border: "2px solid rgba(196,154,74,0.4)", overflow: "hidden", background: motif.hex, cursor: "pointer", position: "relative" }}>
                        {motif.image_url && <img src={motif.image_url} alt={motif.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", display: "grid", placeItems: "center", fontSize: 20 }}>⬆</div>
                      </div>
                    </label>
                  </div>

                  {/* Nom */}
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" as const, color: "rgba(26,20,16,0.5)" }}>Nom du motif *</label>
                    <input type="text" value={motif.name}
                      onChange={e => updateColor(colorIdx, "name", e.target.value)}
                      placeholder="Ex : Éclair, Smileys, Damier, Uni..."
                      disabled={motif.validated}
                      style={{ padding: "13px 16px", borderRadius: 10, border: "1px solid rgba(26,20,16,0.12)", fontSize: 16, color: "#1a1410", background: motif.validated ? "#f5f5f5" : "#faf8f4", outline: "none", width: "100%", boxSizing: "border-box" as const }} />
                  </div>

                  {/* Bouton valider / modifier */}
                  {!motif.validated ? (
                    <button onClick={() => { if (motif.name.trim()) validateColor(colorIdx); }}
                      disabled={!motif.name.trim()}
                      style={{ padding: "13px 20px", borderRadius: 10, background: motif.name.trim() ? "#1a1410" : "#e5e7eb", color: motif.name.trim() ? "#c49a4a" : "#9ca3af", fontWeight: 900, fontSize: 14, border: "none", cursor: motif.name.trim() ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>
                      ✓ Valider le motif
                    </button>
                  ) : (
                    <button onClick={() => updateColor(colorIdx, "validated", false)}
                      style={{ padding: "13px 20px", borderRadius: 10, background: "rgba(26,20,16,0.06)", color: "rgba(26,20,16,0.5)", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                      ✎ Modifier
                    </button>
                  )}
                </div>
              </div>

              {/* ── Étapes 2 & 3 : Tailles + Stock (seulement si motif validé) ── */}
              {motif.validated && (
                <div style={{ padding: "20px 24px", display: "grid", gap: 20 }}>

                  {/* Étape 2 : Sélection des tailles */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 99, background: motif.sizes.length > 0 ? "#16a34a" : "#f59e0b", color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 900 }}>
                        {motif.sizes.length > 0 ? "✓" : "2"}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1410" }}>Tailles disponibles pour ce motif</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {TAILLES_SUGGESTIONS.map(t => {
                        const checked = motif.sizes.includes(t);
                        return (
                          <button key={t} onClick={() => toggleColorSize(colorIdx, t)}
                            style={{ padding: "9px 16px", borderRadius: 99, border: `2px solid ${checked ? "#1a1410" : "rgba(0,0,0,0.12)"}`, background: checked ? "#1a1410" : "#fff", color: checked ? "#c49a4a" : "rgba(26,20,16,0.5)", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                            {checked ? "✓ " : ""}{t}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Étape 3 : Quantités par taille */}
                  {motif.sizes.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 99, background: "#c49a4a", color: "#1a1410", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 900 }}>3</div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1410" }}>Stock par taille — {motif.name}</div>
                      </div>
                      <div style={{ display: "grid", gap: 10 }}>
                        {motif.sizes.map(t => (
                          <div key={t} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 12, background: "#faf8f4", border: "1px solid rgba(26,20,16,0.08)" }}>
                            <div style={{ flex: 1, fontWeight: 700, fontSize: 15, color: "#1a1410" }}>{t}</div>
                            <input type="number" min="0"
                              value={motif.sizes_stock[t] ?? "0"}
                              onChange={e => updateColorSizeStock(colorIdx, t, e.target.value)}
                              style={{ width: 100, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(26,20,16,0.12)", fontSize: 16, fontWeight: 700, textAlign: "center", background: "#fff" }} />
                            <span style={{ fontSize: 13, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>unités</span>
                          </div>
                        ))}
                        <div style={{ padding: "10px 16px", borderRadius: 10, background: "#dcfce7", border: "1px solid #86efac", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#166534" }}>Sous-total {motif.name}</span>
                          <span style={{ fontSize: 18, fontWeight: 950, color: "#166534" }}>{motif.stock || 0} u.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Aperçu pastille */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, background: "rgba(196,154,74,0.06)", border: "1px solid rgba(196,154,74,0.2)" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 99, overflow: "hidden", border: "2px solid rgba(196,154,74,0.4)", background: motif.hex, flexShrink: 0 }}>
                      {motif.image_url && <img src={motif.image_url} alt={motif.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1410" }}>{motif.name}</div>
                    <div style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "rgba(26,20,16,0.5)" }}>
                      {motif.sizes.length} taille{motif.sizes.length !== 1 ? "s" : ""} · {motif.stock || 0} unités
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══ ONGLET 4 : TARIF & PROMOS ═══ */}
      {activeTab === "promo" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: 24, alignItems: "start", maxWidth: 900, overflow: "visible" }}>

          {/* Colonne gauche : Prix de vente */}
          <div style={{ display: "grid", gap: 20 }}>
            <div style={{ ...SECTION, border: "2px solid rgba(26,20,16,0.15)" }}>
              <div style={{ fontWeight: 900, fontSize: 20, color: "#1a1410", marginBottom: 4 }}>💶 Prix de vente</div>
              <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)", marginBottom: 8 }}>Prix affiché sur la fiche produit</div>

              <Field label="Prix TTC (€) *" fieldKey="price_ttc" type="number" placeholder="29.90" value={form.price_ttc} onChange={set} />

              {/* Aperçu prix */}
              {form.price_ttc && (
                <div style={{ padding: "14px 18px", borderRadius: 12, background: "#f5f0e8", border: "1px solid rgba(26,20,16,0.1)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(26,20,16,0.5)", marginBottom: 6 }}>Aperçu affiché</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                    {hasPromo ? (
                      <>
                        <span style={{ fontSize: 28, fontWeight: 950, color: "#dc2626" }}>{parseFloat(form.promo_price).toFixed(2)} €</span>
                        <span style={{ fontSize: 18, color: "rgba(26,20,16,0.35)", textDecoration: "line-through" }}>{parseFloat(form.price_ttc).toFixed(2)} €</span>
                        <span style={{ fontSize: 13, fontWeight: 800, background: "#dc2626", color: "#fff", padding: "2px 8px", borderRadius: 6 }}>
                          -{Math.round((1 - parseFloat(form.promo_price) / parseFloat(form.price_ttc)) * 100)}%
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: 28, fontWeight: 950, color: "#1a1410" }}>{parseFloat(form.price_ttc).toFixed(2)} €</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", marginTop: 4 }}>Prix TTC — TVA incluse</div>
                </div>
              )}
            </div>
          </div>

          {/* Colonne droite : Prix promotionnel */}
          <div style={{ display: "grid", gap: 20 }}>
            <div style={{ padding: 28, borderRadius: 16, background: "#fffbeb", border: `2px solid ${hasPromo ? "#f59e0b" : "#fde68a"}`, display: "grid", gap: 20, overflow: "visible" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 20, color: "#1a1410" }}>
                    🏷 Prix promotionnel
                    {hasPromo && <span style={{ marginLeft: 10, padding: "3px 10px", borderRadius: 99, background: "#f59e0b", color: "#fff", fontSize: 12, fontWeight: 800 }}>ACTIVE</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)", marginTop: 4 }}>
                    S'applique automatiquement entre les dates choisies
                  </div>
                </div>
                {hasPromo && (
                  <button onClick={() => setForm(f => ({ ...f, promo_price: "", promo_start: "", promo_end: "" }))}
                    style={{ padding: "8px 16px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer" }}>
                    ✕ Supprimer
                  </button>
                )}
              </div>

              <Field label="Prix promo (€)" fieldKey="promo_price" type="number" placeholder="24.90" value={form.promo_price} onChange={set} />

              <DateRangePicker
                startDate={form.promo_start}
                endDate={form.promo_end}
                onChangeStart={d => set("promo_start", d)}
                onChangeEnd={d => set("promo_end", d)}
              />

              {/* Récap économie */}
              {hasPromo && form.price_ttc && (
                <div style={{ padding: "14px 18px", borderRadius: 12, background: "#fff", border: "1px solid #fde68a" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>Résumé de la promotion</div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                      <span style={{ color: "rgba(26,20,16,0.6)" }}>Prix normal</span>
                      <span style={{ fontWeight: 700 }}>{parseFloat(form.price_ttc).toFixed(2)} €</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                      <span style={{ color: "rgba(26,20,16,0.6)" }}>Prix promo</span>
                      <span style={{ fontWeight: 900, color: "#dc2626" }}>{parseFloat(form.promo_price).toFixed(2)} €</span>
                    </div>
                    <div style={{ height: 1, background: "rgba(0,0,0,0.08)", margin: "4px 0" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                      <span style={{ color: "rgba(26,20,16,0.6)" }}>Économie client</span>
                      <span style={{ fontWeight: 900, color: "#16a34a" }}>
                        -{(parseFloat(form.price_ttc) - parseFloat(form.promo_price)).toFixed(2)} €
                        ({Math.round((1 - parseFloat(form.promo_price) / parseFloat(form.price_ttc)) * 100)}%)
                      </span>
                    </div>
                    {form.promo_start && form.promo_end && (
                      <div style={{ fontSize: 12, color: "rgba(26,20,16,0.45)", marginTop: 4 }}>
                        📅 Du {new Date(form.promo_start).toLocaleDateString("fr-FR", { day:"2-digit", month:"long" })} au {new Date(form.promo_end).toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!hasPromo && (
                <div style={{ textAlign: "center", padding: "8px 0", fontSize: 13, color: "rgba(26,20,16,0.35)" }}>
                  Renseigne un prix promo pour activer la promotion
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ ONGLET 5 : CONTENU FICHE ═══ */}
      {activeTab === "contenu" && (
        <div style={{ display: "grid", gap: 24, width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 22, color: "#1a1410", marginBottom: 4 }}>🎨 Contenu de la fiche produit</div>
              <div style={{ fontSize: 14, color: "rgba(26,20,16,0.55)" }}>Crée et ordonne les blocs affichés sur la fiche produit</div>
            </div>
            {ficheCards.length > 0 && (
              <button onClick={() => { setShowDuplicateModal(true); loadAllProducts(); }}
                style={{ padding: "10px 18px", borderRadius: 10, border: "1.5px solid rgba(196,154,74,0.4)", background: "rgba(196,154,74,0.06)", color: "#1a1410", cursor: "pointer", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
                📋 Copier depuis un autre produit
              </button>
            )}
          </div>

          {/* Aucun bloc — sélecteur en premier plan */}
          {ficheCards.length === 0 && (
            <div style={{ padding: "32px 28px", borderRadius: 20, background: "#fff", border: "2px dashed rgba(196,154,74,0.35)", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center" }}>
              <div style={{ fontSize: 40 }}>📋</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18, color: "#1a1410", marginBottom: 6 }}>Aucun bloc de contenu</div>
                <div style={{ fontSize: 14, color: "rgba(26,20,16,0.5)", lineHeight: 1.6, maxWidth: 460 }}>
                  Copie les blocs depuis un produit existant pour avoir une base à modifier,
                  ou crée tes blocs manuellement ci-dessous.
                </div>
              </div>
              <button
                onClick={() => { setShowDuplicateModal(true); loadAllProducts(); }}
                style={{ padding: "14px 28px", borderRadius: 12, background: "#1a1410", color: "#c49a4a", fontWeight: 900, fontSize: 16, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
                📋 Choisir un produit source
              </button>
              <div style={{ fontSize: 12, color: "rgba(26,20,16,0.35)" }}>ou ajoute des blocs individuellement ci-dessous ↓</div>
            </div>
          )}

          {/* Cards en 2 colonnes */}
          {ficheCards.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 480px), 1fr))", gap: 16, width: "100%" }}>
              {ficheCards.map((card, idx) => (
                <FicheCardEditor key={card.id} card={card} onUpdate={updateCard} onRemove={removeCard}
                  onMoveUp={(id) => moveCard(id, "up")} onMoveDown={(id) => moveCard(id, "down")}
                  isFirst={idx === 0} isLast={idx === ficheCards.length - 1}
                  colIdx={idx % 2} />
              ))}
            </div>
          )}

          {/* Ajout de blocs */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid rgba(0,0,0,0.08)" }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: "#1a1410", marginBottom: 14 }}>Ajouter un bloc</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))", gap: 10 }}>
              {CARD_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => addCard(t.value)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, border: "1.5px dashed rgba(196,154,74,0.4)", background: "rgba(196,154,74,0.04)", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 20 }}>{t.icon}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#1a1410" }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: "rgba(26,20,16,0.45)" }}>{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ ONGLET 6 : FAQ ═══ */}
      {activeTab === "faq" && (
        <div style={{ maxWidth: 800 }}>
          <div style={{ ...SECTION, border: "2px solid rgba(26,20,16,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 22, color: "#1a1410", marginBottom: 4 }}>❓ FAQ — Questions fréquentes</div>
                <div style={{ fontSize: 14, color: "rgba(26,20,16,0.5)" }}>Ces questions s'afficheront dans l'accordéon FAQ de la fiche produit</div>
              </div>
              <button type="button" onClick={addFaq}
                style={{ padding: "12px 22px", borderRadius: 10, background: "#1a1410", color: "#f2ede6", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer" }}>
                + Ajouter une question
              </button>
            </div>
            {faqs.length === 0 ? (
              <div style={{ padding: "32px", borderRadius: 12, background: "#ede8df", textAlign: "center", fontSize: 15, color: "rgba(26,20,16,0.5)" }}>
                Aucune FAQ — les questions par défaut selon la catégorie seront utilisées
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {faqs.map((faq, idx) => (
                  <FaqEditor key={faq.id} faq={faq} onUpdate={updateFaq} onRemove={removeFaq}
                    onMoveUp={(id) => moveFaq(id, "up")} onMoveDown={(id) => moveFaq(id, "down")}
                    isFirst={idx === 0} isLast={idx === faqs.length - 1} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ ONGLET 7 : SEO ═══ */}
      {activeTab === "seo" && (
        <div style={{ maxWidth: 700 }}>
          <div style={SECTION}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 22, color: "#1a1410", marginBottom: 4 }}>SEO — Référencement Google</div>
              <div style={{ fontSize: 14, color: "rgba(26,20,16,0.5)" }}>Optionnel — si vide, le nom et la description du produit sont utilisés</div>
            </div>
            <Field label="Titre SEO" fieldKey="seo_title"
              placeholder="Ex : Pyjama bambou nourrisson motif éclair — M!LK"
              value={form.seo_title} onChange={set}
              hint={`${form.seo_title.length}/60 caractères`} />
            <div style={{ display: "grid", gap: 6 }}>
              <label style={LS}>Description SEO</label>
              <textarea value={form.seo_description} onChange={e => set("seo_description", e.target.value)}
                placeholder="Ex : Pyjama nourrisson en bambou certifié OEKO-TEX..."
                rows={3} style={{ ...IS, resize: "vertical", fontFamily: "inherit", lineHeight: 1.7 }} />
              <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)" }}>{form.seo_description.length}/155 caractères</div>
            </div>
            {(form.seo_title || form.name) && (
              <div style={{ padding: 20, borderRadius: 12, background: "#f8f9fa", border: "1px solid rgba(0,0,0,0.08)" }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(0,0,0,0.35)", marginBottom: 10 }}>Aperçu Google</div>
                <div style={{ fontSize: 15, color: "#1a0dab", fontWeight: 600, marginBottom: 3 }}>{form.seo_title || form.name} | M!LK</div>
                <div style={{ fontSize: 13, color: "#006621", marginBottom: 5 }}>milkbebe.fr › produits › {form.slug || "..."}</div>
                <div style={{ fontSize: 14, color: "#545454", lineHeight: 1.6 }}>{form.seo_description || form.description || "Aucune description."}</div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>{/* fin contenu onglet */}

    {/* ── BARRE FIXE BAS ── */}
    <div style={{ position: "fixed", bottom: 0, left: 240, right: 0, zIndex: 100, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", borderTop: "2px solid rgba(26,20,16,0.1)", padding: "14px 32px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 -4px 20px rgba(0,0,0,0.1)" }}>
      <button onClick={handleSave} disabled={saving}
        style={{ padding: "15px 40px", borderRadius: 12, background: saving ? "#e5e7eb" : "#1a1410", color: saving ? "#9ca3af" : "#c49a4a", fontWeight: 900, fontSize: 18, border: "none", cursor: saving ? "not-allowed" : "pointer", boxShadow: saving ? "none" : "0 4px 16px rgba(0,0,0,0.25)", transition: "all 0.15s" }}>
        {saving ? "⏳ Enregistrement..." : isNew ? "✅ Créer le produit" : "✅ Enregistrer"}
      </button>
      <button onClick={() => setShowPreview(v => !v)}
        style={{ padding: "15px 28px", borderRadius: 12, background: showPreview ? "#c49a4a" : "rgba(26,20,16,0.08)", color: "#1a1410", fontWeight: 800, fontSize: 16, border: "2px solid rgba(26,20,16,0.12)", cursor: "pointer", transition: "all 0.15s" }}>
        👁 Aperçu
      </button>
      {!isNew && (
        <button onClick={handleDelete}
          style={{ padding: "15px 24px", borderRadius: 12, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer" }}>
          🗑 Supprimer
        </button>
      )}
      <div style={{ marginLeft: "auto", fontSize: 13, color: "rgba(26,20,16,0.35)", fontWeight: 600 }}>
        {autoSaved ? "✓ Brouillon sauvegardé" : lastSaved ? `Enregistré à ${lastSaved.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "Pense à enregistrer"}
      </div>
    </div>

    {/* ── MODALE DUPLICATION ── */}
    {showDuplicateModal && (
      <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        onClick={e => { if (e.target === e.currentTarget) setShowDuplicateModal(false); }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 560, width: "100%", maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1410" }}>Copier les cards depuis…</div>
              <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)", marginTop: 3 }}>Les blocs de contenu et FAQs seront copiés. Les photos et prix ne changent pas.</div>
            </div>
            <button onClick={() => setShowDuplicateModal(false)}
              style={{ width: 32, height: 32, borderRadius: 99, background: "#ede8df", border: "none", cursor: "pointer", fontSize: 16, display: "grid", placeItems: "center" }}>✕</button>
          </div>
          {loadingProds ? (
            <div style={{ padding: "30px", textAlign: "center", color: "rgba(26,20,16,0.4)" }}>Chargement…</div>
          ) : (
            <div style={{ overflowY: "auto", display: "grid", gap: 8 }}>
              {allProducts.filter(p => p.id !== id).length === 0 && (
                <div style={{ padding: 20, textAlign: "center", color: "rgba(26,20,16,0.4)", fontSize: 14 }}>
                  Aucun produit avec des blocs définis pour l'instant.
                </div>
              )}
              {allProducts
                .filter(p => p.id !== id)
                .map(p => (
                  <button key={p.id} onClick={() => duplicateFromProduct(p)}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14, border: "2px solid rgba(0,0,0,0.08)", background: "#fff", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#c49a4a"; (e.currentTarget as HTMLButtonElement).style.background = "#fffdf8"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,0,0,0.08)"; (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}>
                    {p.image_url && (
                      <div style={{ width: 52, height: 52, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
                        <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, fontSize: 15, color: "#1a1410", marginBottom: 3 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "rgba(26,20,16,0.45)" }}>
                        {Array.isArray(p.fiche_cards) && p.fiche_cards.length > 0
                          ? `${p.fiche_cards.length} bloc${p.fiche_cards.length > 1 ? "s" : ""} sauvegardés`
                          : "Contenu auto (catégorie)"}
                        {p.fiche_faqs?.length > 0 ? ` · ${p.fiche_faqs.length} FAQ` : ""}
                        {" · "}{p.category_slug}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#c49a4a", whiteSpace: "nowrap" }}>Copier →</div>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    )}

    {/* ── PANNEAU APERÇU STICKY ── */}
    {showPreview && (
      <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", background: "#ede8df", borderLeft: "2px solid rgba(26,20,16,0.12)", boxSizing: "border-box", scrollbarWidth: "none" }}>
        {/* Header aperçu */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 14px", borderBottom: "1px solid rgba(26,20,16,0.12)", background: "#c4ae94", position: "sticky", top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#1a1410", marginBottom: 1 }}>Aperçu fiche produit</div>
            <div style={{ fontSize: 11, color: "rgba(26,20,16,0.5)", fontWeight: 600 }}>Temps réel — panneau droit</div>
          </div>
          <button onClick={() => setShowPreview(false)}
            style={{ width: 28, height: 28, borderRadius: 99, background: "rgba(26,20,16,0.1)", border: "none", cursor: "pointer", color: "#1a1410", fontSize: 14, display: "grid", placeItems: "center" }}>
            ✕
          </button>
        </div>

        {!hasPreviewContent ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "rgba(26,20,16,0.3)", fontSize: 13 }}>
            Remplis les champs pour voir l'aperçu
          </div>
        ) : (
          <div style={{ padding: "20px 16px", display: "grid", gap: 16 }}>

            {/* ── Image principale ── */}
            {form.image_url && (
              <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", aspectRatio: "3/4", background: "#c4ae94" }}>
                <img src={form.image_url} alt={form.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}

            {/* ── Catégorie + Nom + Prix ── */}
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#c49a4a" }}>
                {form.category_slug || "catégorie"} · Bambou OEKO-TEX
              </div>
              <div style={{ fontSize: 20, fontWeight: 950, letterSpacing: -0.5, lineHeight: 1.15, color: "#1a1410" }}>
                {form.name || <span style={{ opacity: 0.3 }}>Nom du produit</span>}
              </div>
              {Number(form.price_ttc) > 0 && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontSize: 22, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>{priceDisplay.toFixed(2)} €</span>
                  {form.promo_price && <span style={{ fontSize: 14, textDecoration: "line-through", color: "rgba(26,20,16,0.35)", fontWeight: 700 }}>{Number(form.price_ttc).toFixed(2)} €</span>}
                </div>
              )}
            </div>

            {/* ── PHRASE D'ACCROCHE (subtitle) ── */}
            {previewSubtitle && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 4 }}>💬 Phrase d'accroche</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(26,20,16,0.75)", lineHeight: 1.5 }}>{previewSubtitle}</div>
              </div>
            )}

            {/* ── DESCRIPTION ── */}
            {previewDesc && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 4 }}>📝 Description</div>
                <div style={{ fontSize: 12, color: "rgba(26,20,16,0.6)", lineHeight: 1.75 }}>{previewDesc}</div>
              </div>
            )}

            {/* ── POINTS FORTS (features) — card exacte ── */}
            {previewFeatures.filter(Boolean).length > 0 && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 6 }}>✅ Points forts</div>
                <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(26,20,16,0.06)", border: "1px solid rgba(26,20,16,0.1)", display: "grid", gap: 10 }}>
                  {previewFeatures.filter(Boolean).map((feat: string, i: number) => {
                    const colonIdx = feat.indexOf(" : ");
                    const label = colonIdx > -1 ? feat.slice(0, colonIdx) : feat;
                    const desc  = colonIdx > -1 ? feat.slice(colonIdx + 3) : "";
                    return (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(196,154,74,0.15)", border: "1px solid rgba(196,154,74,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                          <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <div style={{ fontSize: 12, lineHeight: 1.45, color: "#1a1410" }}>
                          <span style={{ fontWeight: 800 }}>{label}</span>
                          {desc && <span style={{ fontWeight: 400, color: "rgba(26,20,16,0.5)" }}> : {desc}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── COLORIS / MOTIF ── */}
            {previewColoris && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 4 }}>🌈 Coloris</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1410" }}><span style={{ color: "#c49a4a", fontWeight: 900 }}>Coloris</span> — {previewColoris}</div>
              </div>
            )}
            {ficheCards.find((c: any) => c.type === "motif")?.content && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 4 }}>🎨 Motif</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1410" }}>{ficheCards.find((c: any) => c.type === "motif")?.content}</div>
              </div>
            )}

            {/* ── TAILLES ── */}
            {sizes.length > 0 && (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(26,20,16,0.4)" }}>Taille</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {sizes.map(t => (
                    <div key={t} style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(26,20,16,0.08)", fontSize: 13, fontWeight: 800, color: "#1a1410" }}>{t}</div>
                  ))}
                </div>
              </div>
            )}

            {/* ── COULEURS ── */}
            {colors.length > 0 && (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(26,20,16,0.4)" }}>Couleur</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {colors.map((c, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 99, border: "2px solid rgba(26,20,16,0.15)", background: c.hex, overflow: "hidden" }}>
                        {c.image_url && <img src={c.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                      </div>
                      <span style={{ fontSize: 10, color: "rgba(26,20,16,0.5)", fontWeight: 700 }}>{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── POURQUOI — card exacte ── */}
            {previewWR?.why && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 6 }}>💡 "La vraie raison"</div>
                <div style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(26,20,16,0.06)", border: "1px solid rgba(26,20,16,0.1)" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 3 }}>La vraie raison</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(26,20,16,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Pourquoi ce produit existe</div>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(26,20,16,0.7)", lineHeight: 1.8 }}>{previewWR.why}</p>
                </div>
              </div>
            )}

            {/* ── RÉSULTAT — card exacte ── */}
            {previewWR?.result && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 6 }}>💡 "Ce que tu obtiens"</div>
                <div style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.2)" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 3 }}>Ce que tu obtiens</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(26,20,16,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Le résultat</div>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(26,20,16,0.7)", lineHeight: 1.8, fontWeight: 600 }}>{previewWR.result}</p>
                </div>
              </div>
            )}

            {/* ── PHILOSOPHIE — card exacte sombre ── */}
            {previewPhilo && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 6 }}>🧠 Philosophie M!LK</div>
                <div style={{ padding: "18px 18px", borderRadius: 18, background: "#2d1a0e", border: "1px solid rgba(196,154,74,0.15)" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 3 }}>Philosophie M!LK</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(242,237,230,0.3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Comment ça réduit ta charge mentale</div>
                  <div style={{ fontSize: 12, color: "rgba(242,237,230,0.7)", lineHeight: 1.7, whiteSpace: "pre-line" }}>{previewPhilo}</div>
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(242,237,230,0.08)", fontSize: 12, fontWeight: 900, color: "#f2ede6", lineHeight: 1.5 }}>
                    Chaque produit M!LK répond à un problème réel. Pas de design pour le design. Pas de fonctionnalité inutile. Juste ce qui compte quand t'es épuisé.
                  </div>
                </div>
              </div>
            )}

            {/* ── FAQ ── */}
            {faqs.filter(f => f.question).length > 0 && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 6 }}>❓ FAQ ({faqs.filter(f => f.question).length} questions)</div>
                <div style={{ padding: "14px 16px", borderRadius: 14, background: "#c4ae94", border: "1px solid rgba(26,20,16,0.1)", display: "grid", gap: 0 }}>
                  {faqs.filter(f => f.question).map((faq, i) => (
                    <div key={i} style={{ borderTop: i > 0 ? "1px solid rgba(26,20,16,0.1)" : "none", padding: "10px 0" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#1a1410", marginBottom: 4 }}>{faq.question}</div>
                      <div style={{ fontSize: 11, color: "rgba(26,20,16,0.55)", lineHeight: 1.6 }}>{faq.reponse.slice(0, 100)}{faq.reponse.length > 100 ? "…" : ""}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── CTA simulé ── */}
            <div style={{ padding: "15px", borderRadius: 14, background: "#1a1410", textAlign: "center", fontWeight: 900, fontSize: 14, color: "#f2ede6", marginTop: 4 }}>
              Ajouter — {priceDisplay > 0 ? `${priceDisplay.toFixed(2)} €` : "—"}
            </div>
            <div style={{ padding: "8px", borderRadius: 10, border: "2px solid #1a1410", textAlign: "center", fontWeight: 800, fontSize: 13, color: "#1a1410" }}>
              Voir le panier
            </div>

          </div>
        )}
      </div>
    )}
  </div>

  );
}