"use client";

import { useEffect, useRef, useState } from "react";
import { useParams }                   from "next/navigation";
import Image                           from "next/image";
import Link                            from "next/link";
import { useCart }                     from "@/context/CartContext";

// ── Palette unifiée ──
const BG    = "#d8c8b0"; // taupe clair = fond principal fiche
const TAUPE = "#c4ae94"; // taupe moyen
const AMBER = "#c49a4a";
const DARK  = "#1a1410";
const WARM  = "#f2ede6";
const MARON = "#2d1a0e";

function isPromoActive(p: any) {
  if (!p?.promo_price || !p?.promo_start || !p?.promo_end) return false;
  const now = new Date();
  return new Date(p.promo_start) <= now && new Date(p.promo_end) >= now;
}

function getMotifDetails(slug: string) {
  if (slug.includes("eclair"))  return { motif: "Flash",  desc: "éclairs blancs minimalistes sur fond gris anthracite"      };
  if (slug.includes("smileys")) return { motif: "Smile",  desc: "petits visages souriants, ton beige chaud sur fond caramel" };
  if (slug.includes("damier"))  return { motif: "Check",  desc: "damier noir et écru, graphique et intemporel"              };
  if (slug.includes("uni"))     return { motif: "Uni",    desc: "côtelé intemporel, minimaliste et doux"                    };
  return null;
}

function getProductSubtitle(category: string, slug: string): string {
  if (slug.includes("bonnet"))    return "La vraie alternative au bonnet d'hôpital qu'on oublie dès la sortie.";
  if (slug.includes("lange"))     return "Le sommeil avant le style.";
  if (category === "pyjamas")     return "Double zip + moufles intégrées = fin des batailles quotidiennes.";
  if (category === "bodies")      return "Habillage en deux gestes. Mains protégées. Sans accessoires.";
  if (category === "gigoteuses")  return "Change express. Zéro boutons. Zéro galère à 3h du matin.";
  return "";
}

function getProductDesc(slug: string): string {
  if (slug.includes("bonnet")) return "Premier contact avec la tête fragile de votre nouveau-né, ce bonnet a été pensé pour être aussi doux que rassurant. Confectionné en bambou, il est naturellement respirant, souple et adapté aux peaux les plus sensibles. Il garde la chaleur sans jamais étouffer — exactement ce qu'il faut dans les premières heures de vie.";
  return "";
}

function getColoris(slug: string): string | null {
  if (slug.includes("bonnet")) return "Terre cuite — brun chaud aux nuances naturelles, à la fois doux et affirmé.";
  return null;
}

function getProductFeatures(category: string, slug: string): string[] {
  if (slug.includes("bonnet")) return [
    "Ultra doux dès le premier contact",
    "Respirant : idéal pour réguler la température",
    "Respectueux des peaux sensibles",
    "Coupe minimaliste : maintien parfait sans comprimer",
    "Tailles disponibles : Naissance à 6 mois",
  ];
  if (slug.includes("lange")) return [
    "Taille XXL (120×120 cm) : assez grand pour un emmaillotage qui tient vraiment",
    "Bambou respirant : régule la température, pas de surchauffe",
    "Reproduit la pression du ventre maternel : effet calmant immédiat",
    "Tissu avec grip : reste en place même quand bébé se débat",
    "Devient plus doux à chaque lavage",
    "Multi-usage : swaddle, couverture, drap d'allaitement, protection poussette",
  ];
  if (category === "bodies") return [
    "Col enveloppe élargi : passe sur la tête sans forcer, zéro pression sur la fontanelle",
    "3 pressions seulement : pas 7, pas 12. Juste 3.",
    "Moufles pliables intégrées : tu replies, tu déplies. Toujours là.",
    "Bambou hypoallergénique : zéro irritation, même sur peau atopique",
    "Extensible 4 sens : suit tous les mouvements, ne comprime pas",
    "Coutures plates : zéro frottement, zéro marques",
  ];
  if (category === "pyjamas") return [
    "Double zip inversé : change par le bas, habille par le haut",
    "Zéro bouton : rien à aligner, rien à rater. Jamais.",
    "Pieds pliables : chauds quand il faut, libres quand c'est mieux",
    "Moufles pliables intégrées : tu replies, tu déplies. Fini les moufles perdues.",
    "Bambou stretch 95% : suit tous les mouvements sans tirer",
    "Silencieux : zéro scratch, zéro bruit qui réveille",
  ];
  if (category === "gigoteuses") return [
    "Bas nouable : ouvre/ferme d'une main, sans regarder, dans le noir",
    "Zéro bouton, zéro zip : rien à aligner, rien à coincer",
    "Moufles pliables intégrées : tu replies, tu déplies. Toujours là.",
    "Bambou ultra-souple : glisse sans frotter, ne réveille pas",
    "Coupe ample : bébé bouge librement, zéro compression",
    "Thermorégulant : chaud sans surchauffer. Été comme hiver.",
  ];
  return [];
}

function getWhyResult(category: string, slug: string): { why: string; result: string } | null {
  if (slug.includes("bonnet")) return {
    why: "Premier contact avec la tête fragile de votre nouveau-né, ce bonnet a été pensé pour être aussi doux que rassurant. Confectionné en bambou, il est naturellement respirant, souple et adapté aux peaux les plus sensibles. Il garde la chaleur sans jamais étouffer, exactement ce qu'il faut dans les premières heures de vie.",
    result: "Sa coupe minimaliste assure un maintien parfait sans comprimer. Votre bébé est au chaud, à l'aise, sans pression inutile — dès les premières minutes.",
  };
  if (slug.includes("lange")) return {
    why: "Ton bébé sursaute, se réveille, pleure. Le réflexe de Moro le tire du sommeil toutes les 20 minutes. Tu as essayé d'emmailloter avec une couverture classique — ça se défait au premier mouvement. Les swaddles à velcro ? Bruyants. Trop serrés. Ou pas assez. Ce swaddle existe pour une seule raison : calmer ton bébé plus vite et lui permettre de dormir plus longtemps. Et toi avec.",
    result: "Bébé calmé en quelques minutes. Réflexe de Moro contenu. Moins de réveils en sursaut. Des plages de sommeil plus longues — pour lui et pour toi. Tu récupères un peu.",
  };
  if (category === "bodies") return {
    why: "Habiller un nouveau-né, c'est stressant. La tête est fragile, le cou ne tient pas, il pleure dès que tu approches un vêtement de son visage. Et une fois habillé ? Il se griffe le visage parce que t'as oublié les moufles. Ce body existe pour simplifier : un col qui glisse sans forcer, des moufles pliables intégrées déjà là, trois pressions et c'est fini.",
    result: "Habillage en moins de 30 secondes. Pas de cris. Pas de stress sur la tête fragile. Mains protégées H24 sans accessoire à perdre. Tu passes à autre chose.",
  };
  if (category === "pyjamas") return {
    why: "L'habillage d'un bébé peut virer au cauchemar. Il gigote, il pleure, tu t'énerves. Les boutons-pression ? 15 à aligner pendant qu'il se débat. Les moufles séparées ? Elles disparaissent toujours au mauvais moment. Résultat : friction, tension, tout le monde finit épuisé. On a conçu ce pyjama pour supprimer le combat : un double zip qui simplifie tout + des moufles pliables intégrées pour éviter les griffures sans jamais avoir à les chercher. Un zip. Deux gestes. C'est fait.",
    result: "Habillage en moins d'une minute. Change de couche sans déshabiller. Zéro friction entre toi et ton bébé. Pas de moufles à retrouver au fond du salon : elles sont intégrées au poignet, prêtes quand tu veux protéger son visage. Les routines deviennent fluides, pas stressantes.",
  };
  if (category === "gigoteuses") return {
    why: "Tu te lèves pour la 4e fois. Il est 3h du mat'. T'as les yeux à moitié fermés. Tu dois changer une couche dans la pénombre sans réveiller complètement le bébé — ni toi-même. Les boutons-pression ? Impossible à aligner. Le zip ? Trop bruyant. Les moufles séparées ? Perdues quelque part dans le lit. Cette gigoteuse à nouer existe pour ça : un vêtement qu'on ouvre et ferme sans réfléchir, sans regarder, sans bataille.",
    result: "Change de couche en 30 secondes. Bébé reste calme, à moitié endormi. Mains protégées sans accessoire à retrouver. Tu retournes te coucher plus vite. Les réveils sont écourtés. Les nuits deviennent un peu moins chaotiques.",
  };
  return null;
}

function getPhilosophy(category: string, slug: string): string {
  if (slug.includes("bonnet"))    return "Chaque produit M!LK répond à un problème réel. Pas de design pour le design. Pas de fonctionnalité inutile. Juste ce qui compte quand t'es épuisé.\n\nLe bonnet en bambou, c'est exactement ça : ni trop, ni pas assez. Juste la bonne matière, la bonne coupe, pour les premières heures qui comptent vraiment.";
  if (slug.includes("lange"))     return "Les swaddles à velcro ? Le scratch réveille le bébé quand tu l'ouvres. Les couvertures classiques ? Trop petites, se défont. Les gigoteuses ? Pas adaptées aux nouveau-nés qui ont besoin de contention. La mousseline grand format offre le meilleur compromis : maintien efficace, ouverture silencieuse, respiration optimale.\n\nChaque produit M!LK répond à un problème réel. Pas de design pour le design. Pas de fonctionnalité inutile. Juste ce qui compte quand t'es épuisé.";
  if (category === "bodies")      return "Les bodies à col rond ? Bataille pour passer la tête, bébé hurle. Les bodies à boutons sur l'épaule ? 6 pressions à aligner. Les moufles séparées ? Perdues en 24h. Le body express combine col facile + pressions minimum + moufles pliables intégrées.\n\nChaque produit M!LK répond à un problème réel. Pas de design pour le design. Pas de fonctionnalité inutile. Juste ce qui compte quand t'es épuisé.";
  if (category === "pyjamas")     return "Les pyjamas à boutons ? Combat garanti à chaque change. Les combinaisons sans zip inversé ? Tu dois tout défaire pour une couche. Les moufles séparées ? Elles se perdent, tombent, disparaissent quand bébé en a le plus besoin. Ici : double zip inversé + bambou stretch + moufles pliables intégrées = moins de gestes, moins de lutte, moins d'objets à gérer.\n\nChaque produit M!LK répond à un problème réel. Pas de design pour le design. Pas de fonctionnalité inutile. Juste ce qui compte quand t'es épuisé.";
  if (category === "gigoteuses")  return "Les grenouillères à boutons ? 12 pressions à aligner dans le noir — t'abandonnes au 3e essai. Les pyjamas zip ? Le bruit réveille le bébé. Les gigoteuses classiques ? Pas d'accès direct à la couche. Les moufles séparées ? Perdues dans le lit à 3h du mat'. La gigoteuse à nouer résout tout : accès immédiat, fermeture silencieuse, zéro manipulation complexe.\n\nChaque produit M!LK répond à un problème réel. Pas de design pour le design. Pas de fonctionnalité inutile. Juste ce qui compte quand t'es épuisé.";
  return "";
}

function getProductFAQ(category: string, slug: string): { q: string; r: string }[] {
  // Bonnet : pas de FAQ
  if (slug.includes("bonnet")) return [];

  // Pyjama
  if (category === "pyjamas" || slug.includes("pyjama")) return [
    { q: "C'est quoi le double zip inversé ?",                  r: "Un système d'ouverture à double sens : par le bas pour changer la couche sans déshabiller bébé, par le haut pour l'habiller rapidement.\nMoins de manipulation, moins de stress, surtout la nuit." },
    { q: "Les moufles pliables, ça sert à quoi ?",              r: "À éviter les griffures sans gérer des moufles séparées que tu perds en permanence.\nElles sont intégrées : tu replies, tu déplies, elles sont toujours là.\n\nTu peux les laisser ouvertes quand il fait chaud. Le tissu en bambou régule naturellement la température." },
    { q: "Mon bébé déteste être habillé. Ça change quoi ?",     r: "Moins de gestes, moins de contraintes. Pas de boutons à aligner, pas de lutte inutile.\nRésultat : un habillage plus rapide, plus fluide, et un bébé moins irrité." },
    { q: "Le zip ne risque pas de blesser bébé ?",                r: "Non. Il est entièrement protégé par une patte de tissu. Aucun contact direct avec la peau." },
    { q: "Pourquoi le bambou plutôt que le coton ?",            r: "Parce qu'il est plus doux, plus respirant et thermoRégulateur.\nIl absorbe mieux l'humidité, reste confortable dans le temps et garde sa qualité lavage après lavage." },
    { q: "Le tissu est assez chaud ?",                          r: "Oui. Le bambou régule la température :\nchaud quand il faut, respirant quand nécessaire." },
    { q: "Ça taille comment ?",                                 r: "Coupe ajustée avec tissu stretch qui accompagne les mouvements.\nSi tu hésites entre deux tailles, prends la plus grande pour prolonger l'usage.\n\nLe bambou stretch est extrêmement extensible — pas de risque de trop petit ou trop grand. En cas de doute, prenez la taille au-dessus." },
    { q: "Jusqu'à quel âge ?",                                  r: "Les produits M!LK sont actuellement conçus pour les bébés de la naissance jusqu'à 6 mois.\nLa gamme évoluera progressivement pour accompagner les étapes suivantes." },
  ];

  // Body
  if (category === "bodies" || slug.includes("body")) return [
    { q: "Le col enveloppe, ça passe vraiment sans forcer ?",   r: "Oui — et surtout, il ne se passe pas par la tête.\n\nLe col enveloppe est conçu pour enfiler le vêtement par le bas, en remontant doucement sur le corps de bébé.\nCela évite toute pression sur la tête et la fontanelle, et rend l'habillage beaucoup plus simple, surtout avec un nouveau-né." },
    { q: "Les moufles pliables, ça sert à quoi ?",              r: "À éviter les griffures sans gérer des moufles séparées que tu perds en permanence.\nElles sont intégrées : tu replies, tu déplies, elles sont toujours là.\n\nTu peux les laisser ouvertes quand il fait chaud. Le tissu en bambou régule naturellement la température." },
    { q: "Mon bébé déteste être habillé. Ça change quoi ?",     r: "Moins de gestes, moins de contraintes. Pas de boutons à aligner, pas de lutte inutile.\nRésultat : un habillage plus rapide, plus fluide, et un bébé moins irrité." },
    { q: "Pourquoi le bambou plutôt que le coton ?",            r: "Parce qu'il est plus doux, plus respirant et thermorégulateur.\nIl absorbe mieux l'humidité, reste confortable dans le temps et garde sa qualité lavage après lavage." },
    { q: "Le tissu est assez chaud ?",                          r: "Oui. Le bambou régule la température :\nchaud quand il faut, respirant quand nécessaire." },
    { q: "Ça taille comment ?",                                 r: "Coupe ajustée avec tissu stretch qui accompagne les mouvements.\nSi tu hésites entre deux tailles, prends la plus grande pour prolonger l'usage.\n\nLe bambou stretch est extrêmement extensible — pas de risque de trop petit ou trop grand. En cas de doute, prenez la taille au-dessus." },
    { q: "Jusqu'à quel âge ?",                                  r: "Les produits M!LK sont actuellement conçus pour les bébés de la naissance jusqu'à 6 mois.\nLa gamme évoluera progressivement pour accompagner les étapes suivantes." },
  ];

  // Gigoteuse
  if (category === "gigoteuses" || slug.includes("gigoteuse")) return [
    { q: "C'est quoi une gigoteuse à nouer ?",                   r: "Une fermeture simple par nœud, sans zip ni boutons.\nTu défais, tu changes, tu renoues. Rapide, même dans le noir." },
    { q: "Le col enveloppe, ça passe vraiment sans forcer ?",   r: "Oui — et surtout, il ne se passe pas par la tête.\n\nLe col enveloppe est conçu pour enfiler le vêtement par le bas, en remontant doucement sur le corps de bébé.\nCela évite toute pression sur la tête et la fontanelle, et rend l'habillage beaucoup plus simple, surtout avec un nouveau-né." },
    { q: "Les moufles pliables, ça sert à quoi ?",              r: "À éviter les griffures sans gérer des moufles séparées que tu perds en permanence.\nElles sont intégrées : tu replies, tu déplies, elles sont toujours là.\n\nTu peux les laisser ouvertes quand il fait chaud. Le tissu en bambou régule naturellement la température." },
    { q: "Mon bébé déteste être habillé. Ça change quoi ?",     r: "Moins de gestes, moins de contraintes. Pas de boutons à aligner, pas de lutte inutile.\nRésultat : un habillage plus rapide, plus fluide, et un bébé moins irrité." },
    { q: "Pourquoi le bambou plutôt que le coton ?",            r: "Parce qu'il est plus doux, plus respirant et thermorégulateur.\nIl absorbe mieux l'humidité, reste confortable dans le temps et garde sa qualité lavage après lavage." },
    { q: "Le tissu est assez chaud ?",                          r: "Oui. Le bambou régule la température :\nchaud quand il faut, respirant quand nécessaire." },
    { q: "Ça taille comment ?",                                 r: "Coupe ajustée avec tissu stretch qui accompagne les mouvements.\nSi tu hésites entre deux tailles, prends la plus grande pour prolonger l'usage.\n\nLe bambou stretch est extrêmement extensible — pas de risque de trop petit ou trop grand. En cas de doute, prenez la taille au-dessus." },
    { q: "Jusqu'à quel âge ?",                                  r: "Les produits M!LK sont actuellement conçus pour les bébés de la naissance jusqu'à 6 mois.\nLa gamme évoluera progressivement pour accompagner les étapes suivantes." },
  ];

  // Lange / emmaillotage
  if (slug.includes("lange")) return [
    { q: "L'emmaillotage, ça sert à quoi ?",                    r: "À calmer et sécuriser bébé en recréant une sensation proche du ventre maternel.\nRésultat : moins de sursauts, un endormissement plus facile, et un sommeil plus stable." },
    { q: "Ça aide vraiment à calmer bébé ?",                    r: "Oui. La pression douce reproduit la sensation du ventre maternel.\nLe bambou amplifie cet effet grâce à sa souplesse." },
    { q: "Risque de surchauffe ?",                              r: "Non, tant que bébé n'est pas trop couvert.\nLe bambou évacue l'humidité et stabilise la température." },
    { q: "Jusqu'à quel âge ?",                                  r: "En général jusqu'à 3–4 mois, ou dès que bébé se retourne.\nEnsuite, le lange reste utile au quotidien." },
    { q: "Pourquoi pas un modèle à scratch ?",                  r: "Parce que ça fait du bruit, s'use vite et manque d'adaptabilité.\nLe lange est silencieux, durable et universel." },
    { q: "Pourquoi le bambou plutôt que le coton ?",            r: "Parce qu'il est plus doux, plus respirant et thermorégulateur.\nIl absorbe mieux l'humidité, reste confortable dans le temps et garde sa qualité lavage après lavage." },
    { q: "Le tissu est assez chaud ?",                          r: "Oui. Le bambou régule la température :\nchaud quand il faut, respirant quand nécessaire." },
  ];

   return [];
}

function getProductEntretien(slug: string) {
  if (slug.includes("bonnet")) return [
    { Icon: IconBan,  text: "Lavage en cycle délicat avec des couleurs similaires" },
    { Icon: IconFlat, text: "Séchage à plat ou sur cintre"                         },
    { Icon: IconHeat, text: "Éviter le sèche-linge pour préserver la matière"      },
  ];
  return [
    { Icon: IconThermometer, text: "Lavage 40°C, cycle délicat"       },
    { Icon: IconBan,         text: "Sans adoucissant ni javel"         },
    { Icon: IconFlat,        text: "Séchage à l'air libre recommandé" },
    { Icon: IconHeat,        text: "Sèche-linge basse température"     },
  ];
}

function PhilosophyCard({ text }: { text: string }) {
  // Normalise les sauts de ligne : \\n\\n (depuis admin) → \n\n réel
  const norm = text.split("\\n\\n").join("\n\n").split("\\n").join("\n");
  const sepIdx = norm.indexOf("\n\n");
  const main       = sepIdx > -1 ? norm.slice(0, sepIdx) : norm;
  const conclusion = sepIdx > -1 ? norm.slice(sepIdx + 2) : "";
    const sentences: string[] = [];
  let buf = "";
  for (let i = 0; i < main.length; i++) {
    buf += main[i];
    if (main[i] === "." && (i + 1 >= main.length || main[i + 1] === " ")) {
      sentences.push(buf.trim()); buf = "";
    }
  }
  if (buf.trim()) sentences.push(buf.trim());
  const blocks: Array<{ q?: string; a: string; hero?: boolean }> = [];
  sentences.forEach(s => {
    const qi = s.indexOf("?");
    if (qi > -1) { blocks.push({ q: s.slice(0, qi + 1).trim(), a: s.slice(qi + 1).trim() }); }
    else if (s.startsWith("Ici") || s.startsWith("La ") || s.startsWith("Le ")) { blocks.push({ a: s, hero: true }); }
    else { blocks.push({ a: s }); }
  });
  const cLines: string[] = conclusion ? conclusion.replace(/\\. /g, ".|").split("|").map((s: string) => s.trim()).filter(Boolean) : [];
  return (
    <div style={{ padding: "26px 26px", borderRadius: 20, background: MARON, height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: AMBER, marginBottom: 5 }}>Philosophie M!LK</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(242,237,230,0.3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 22 }}>Comment ça réduit ta charge mentale</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        {blocks.map((block, i) =>
          block.hero ? (
            <div key={i} style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.22)" }}>
              <div style={{ fontSize: "clamp(13px,1.1vw,15px)", color: WARM, fontWeight: 800, lineHeight: 1.5 }}>{block.a}</div>
            </div>
          ) : (
            <div key={i} style={{ borderLeft: "2px solid rgba(196,154,74,0.25)", paddingLeft: 14 }}>
              {block.q && <div style={{ fontSize: "clamp(11px,0.9vw,12px)", color: AMBER, fontWeight: 800, letterSpacing: 0.4, marginBottom: 3 }}>{block.q}</div>}
              <div style={{ fontSize: "clamp(13px,1.1vw,14px)", color: "rgba(242,237,230,0.8)", fontWeight: 700, lineHeight: 1.45 }}>{block.a}</div>
            </div>
          )
        )}
      </div>
      {cLines.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(242,237,230,0.08)", display: "flex", flexDirection: "column", gap: 4 }}>
          {cLines.map((line: string, i: number) => (
            <div key={i} style={{ fontSize: i === cLines.length - 1 ? "clamp(14px,1.2vw,16px)" : "clamp(11px,0.9vw,12px)", fontWeight: i === cLines.length - 1 ? 900 : 500, color: i === cLines.length - 1 ? WARM : "rgba(242,237,230,0.35)", lineHeight: 1.5 }}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TAILLES_ORDER = ["Nouveau-né","0-3 mois","3-6 mois","6-12 mois","0-6 mois","Taille unique","120×120 cm"];
const GUIDE_TAILLES = [
  { taille: "Nouveau-né", poids: "2,5 – 4 kg", poitrine: "21 cm", longueur: "50 cm" },
  { taille: "0-3 mois",   poids: "3,5 – 6 kg", poitrine: "22 cm", longueur: "54 cm" },
  { taille: "3-6 mois",   poids: "6 – 8 kg",   poitrine: "24 cm", longueur: "57 cm" },
  { taille: "6-12 mois",  poids: "8 – 11 kg",  poitrine: "26 cm", longueur: "62 cm" },
];

const IconThermometer = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2v10m0 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" stroke={AMBER} strokeWidth="1.8" strokeLinecap="round"/><path d="M12 6h2M12 9h1" stroke={AMBER} strokeWidth="1.5" strokeLinecap="round"/></svg>;
const IconBan         = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={AMBER} strokeWidth="1.8"/><path d="M6 6l12 12" stroke={AMBER} strokeWidth="1.8" strokeLinecap="round"/></svg>;
const IconFlat        = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 12h16M4 8h8M4 16h8" stroke={AMBER} strokeWidth="1.8" strokeLinecap="round"/></svg>;
const IconHeat        = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M8 6c0 2 2 2 2 4s-2 2-2 4M12 4c0 2 2 2 2 4s-2 2-2 4M16 6c0 2 2 2 2 4s-2 2-2 4" stroke={AMBER} strokeWidth="1.8" strokeLinecap="round"/><path d="M5 19h14" stroke={AMBER} strokeWidth="1.8" strokeLinecap="round"/></svg>;
const IconLeaf        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 22C12 22 4 16 4 9a8 8 0 0 1 16 0c0 7-8 13-8 13z" stroke={AMBER} strokeWidth="1.8"/><path d="M12 22V9" stroke={AMBER} strokeWidth="1.8"/></svg>;
const IconTruck       = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M1 3h13v13H1z" stroke={AMBER} strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 8h4l3 3v5h-7V8z" stroke={AMBER} strokeWidth="1.8" strokeLinejoin="round"/><circle cx="5.5" cy="18.5" r="2.5" stroke={AMBER} strokeWidth="1.8"/><circle cx="18.5" cy="18.5" r="2.5" stroke={AMBER} strokeWidth="1.8"/></svg>;
const IconReturn      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 14H4V9" stroke={AMBER} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 14a9 9 0 1 0 1.5-5" stroke={AMBER} strokeWidth="1.8" strokeLinecap="round"/></svg>;
const IconLock        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke={AMBER} strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={AMBER} strokeWidth="1.8"/></svg>;
const IconSize        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h10M3 18h6" stroke={AMBER} strokeWidth="2" strokeLinecap="round"/></svg>;

// ── 7 icônes exactes de la capture — une seule ligne, toutes visibles ──
function IconBandeau() {
  // Filtre CSS pour convertir le noir (#000) des SVG en marron foncé (#2d1a0e)
  const svgFilter = "brightness(0) saturate(100%) invert(10%) sepia(40%) saturate(700%) hue-rotate(340deg) brightness(55%)";
  const items = [
    { src: "/icons/01_bambou.svg",          label: "Bambou\nBio"            },
    { src: "/icons/02_anti_bacterien.svg",  label: "Anti-\nbactérien"       },
    { src: "/icons/04_thermoregulation.svg",label: "Thermo-\nrégulateur"    },
    { src: "/icons/05_goutte_validation.svg",label: "Hypo-\nallergénique"   },
    { src: "/icons/06_respiration_air.svg", label: "Ultra\nRespirant"        },
    { src: "/icons/07_plume_douceur.svg",   label: "Ultra\nDoux"            },
    { src: "/icons/super_extensible.svg",   label: "Super\nExtensible"      },
  ];
  return (
    <div style={{ marginTop: 14, background: TAUPE, borderRadius: 14, padding: "16px 12px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", overflowX: "auto", gap: 0, scrollbarWidth: "none" }}>
        {items.map(item => (
          <div key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: "1 1 0", minWidth: 56, padding: "0 4px" }}>
            <img
              src={item.src}
              alt={item.label.replace("\n", " ")}
              style={{
                filter: svgFilter,
                objectFit: "contain",
                width: item.src.includes("thermoregulation") ? 42 : 36,
                height: item.src.includes("thermoregulation") ? 42 : 36,
              }}
            />
            <div style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "rgba(26,20,16,0.65)", textAlign: "center", lineHeight: 1.3, whiteSpace: "pre-line" }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function DiagonalBadge({ label, out }: { label?: string; out: boolean }) {
  if (out) return (
    <div style={{ position: "absolute", top: 0, right: 0, width: 110, height: 110, overflow: "hidden", zIndex: 30, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 26, right: -30, background: "#6b7280", color: "#fff", fontSize: 11, fontWeight: 900, padding: "8px 44px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>Épuisé</div>
    </div>
  );
  const cfg: Record<string,string> = { nouveau:"Nouveau", bestseller:"Best seller", exclusif:"Exclusif", last:"Dernières pièces", promo:"Promo", coup_de_coeur:"Coup de cœur" };
  const text = label ? cfg[label] : null;
  if (!text) return null;
  return (
    <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, overflow: "hidden", zIndex: 30, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 28, right: -34, background: AMBER, color: DARK, fontSize: 11, fontWeight: 900, padding: "9px 48px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{text}</div>
    </div>
  );
}

function Lightbox({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = document.getElementById(`lb-img-${startIndex}`);
    if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [startIndex, onClose]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.94)", display: "flex", flexDirection: "column" }}>
      <div style={{ flexShrink: 0, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{images.length} photo{images.length > 1 ? "s" : ""}</div>
        <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: 99, background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: "#fff", fontSize: 18, display: "grid", placeItems: "center" }}>✕</button>
      </div>
      <div ref={containerRef} style={{ flex: 1, overflowY: "auto", padding: "0 20px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        {images.map((img, i) => (
          <div key={i} id={`lb-img-${i}`} style={{ width: "min(92vw, 680px)", flexShrink: 0 }}>
            <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", borderRadius: 14, overflow: "hidden" }}>
              <Image src={img} alt={`Photo ${i+1}`} fill style={{ objectFit: "cover" }} sizes="680px"/>
            </div>
            <div style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{i+1} / {images.length}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqItem({ q, r }: { q: string; r: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: `1px solid rgba(26,20,16,0.1)` }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: "100%", padding: "13px 0", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, textAlign: "left" }}>
        <span style={{ fontWeight: 800, fontSize: "clamp(13px,1.3vw,15px)", color: DARK, lineHeight: 1.3 }}>{q}</span>
        <span style={{ fontSize: 20, color: AMBER, flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "none", lineHeight: 1 }}>+</span>
      </button>
      {open && <div style={{ padding: "0 0 13px", fontSize: "clamp(13px,1.2vw,14px)", lineHeight: 1.75, color: "rgba(26,20,16,0.6)", whiteSpace: "pre-line" }}>{r}</div>}
    </div>
  );
}

export default function ProductPage() {
  const { slug }             = useParams<{ slug: string }>();
  const { addToCart, items } = useCart();

  const [product,     setProduct]     = useState<any>(null);
  const [related,     setRelated]     = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [taille,      setTaille]      = useState("");
  const [couleur,     setCouleur]     = useState("");
  const [qty,         setQty]         = useState(1);
  const [added,       setAdded]       = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [guideOpen,   setGuideOpen]   = useState(false);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      fetch(`/api/produits?slug=${encodeURIComponent(slug)}`).then(r => r.json()),
      fetch("/api/produits").then(r => r.json()),
    ]).then(([found, all]) => {
      if (found && !found.error) {
        setProduct(found);
        setRelated((Array.isArray(all) ? all : []).filter((p: any) => p.id !== found.id && p.category_slug === found.category_slug).slice(0, 4));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug]);

  function handleAddToCart() {
    if (!product) return;
    if (taillesDispos.length > 0 && !taille) {
      alert("Merci de sélectionner une taille avant d'ajouter au panier.");
      return;
    }
    const name = [product.name, taille, couleur].filter(Boolean).join(" — ");
    addToCart({ id: String(product.id), slug: product.slug, name, price: promo ? product.promo_price : product.price_ttc, quantity: qty });
    setAdded(true); setTimeout(() => setAdded(false), 2500);
  }

  if (loading) return <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: BG }}><div style={{ opacity: 0.4, color: DARK }}>Chargement...</div></div>;
  if (!product) return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: BG, padding: 40, textAlign: "center" }}>
      <div><div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12, color: DARK }}>Produit introuvable</div>
      <Link href="/produits" style={{ padding: "12px 24px", borderRadius: 12, background: DARK, color: WARM, fontWeight: 800, textDecoration: "none" }}>← Retour</Link></div>
    </div>
  );

  const promo          = isPromoActive(product);
  const out            = Number(product.stock ?? 0) <= 0;
  const lowStock       = !out && Number(product.stock ?? 0) <= 5;
  const displayPrice   = promo ? product.promo_price : product.price_ttc;
  const badgeLabel     = out ? undefined : (product.label || (promo ? "promo" : undefined));
  const allImages      = [product.image_url, product.image_url_2, product.image_url_3, product.image_url_4].filter(Boolean) as string[];
  const taillesDispos  : string[]              = Array.isArray(product.sizes)  ? product.sizes  : [];
  const sizesStock     : Record<string,number> = product.sizes_stock ?? {};
  const couleursDispos : any[]                 = Array.isArray(product.colors) ? product.colors : [];
  const outTaille      = taille ? Number(sizesStock[taille] ?? product.stock ?? 0) <= 0 : out;
  const needsTaille     = taillesDispos.length > 0 && !taille;
  const cartCount      = items.reduce((s, i) => s + i.quantity, 0);

  const productSlug   = product.slug ?? "";
  const productCat    = product.category_slug ?? "";

  // ── Priorité : données custom admin (fiche_cards/fiche_faqs) sinon fallback auto ──
  const ficheCards: any[]  = Array.isArray(product.fiche_cards) ? product.fiche_cards : [];
  const ficheFaqs:  any[]  = Array.isArray(product.fiche_faqs)  ? product.fiche_faqs  : [];
  const hasCustomCards     = ficheCards.length > 0;
  const hasCustomFaqs      = ficheFaqs.length > 0;

  // Helpers fallback (utilisés si pas de custom)
  const subtitle      = hasCustomCards ? (ficheCards.find((c: any) => c.type === "subtitle")?.content ?? "") : getProductSubtitle(productCat, productSlug);
  const extraDesc     = hasCustomCards ? (ficheCards.find((c: any) => c.type === "description")?.content ?? "") : getProductDesc(productSlug);
  const coloris       = hasCustomCards ? (ficheCards.find((c: any) => c.type === "coloris")?.content ?? null) : getColoris(productSlug);
  const motif         = hasCustomCards ? (() => { const m = ficheCards.find((c: any) => c.type === "motif"); if (!m?.content) return null; const parts = m.content.split(" — "); return parts.length >= 2 ? { motif: parts[0].replace("Motif ", ""), desc: parts.slice(1).join(" — ") } : null; })() : getMotifDetails(productSlug);
  const features      = hasCustomCards ? (() => { try { return JSON.parse(ficheCards.find((c: any) => c.type === "features")?.content ?? "[]"); } catch { return []; } })() : getProductFeatures(productCat, productSlug);
  const whyResult     = hasCustomCards ? (() => { try { const wr = JSON.parse(ficheCards.find((c: any) => c.type === "whyresult")?.content ?? "null"); return wr?.why ? wr : null; } catch { return null; } })() : getWhyResult(productCat, productSlug);
  const philosophy    = hasCustomCards ? (ficheCards.find((c: any) => c.type === "philosophy")?.content ?? "") : getPhilosophy(productCat, productSlug);
  const entretien     = hasCustomCards ? (() => { try { const arr = JSON.parse(ficheCards.find((c: any) => c.type === "entretien")?.content ?? "null"); return Array.isArray(arr) ? arr.map((text: string, i: number) => ({ Icon: [IconThermometer,IconBan,IconFlat,IconHeat][i%4], text })) : getProductEntretien(productSlug); } catch { return getProductEntretien(productSlug); } })() : getProductEntretien(productSlug);
  const FAQ           = hasCustomFaqs ? ficheFaqs.map((f: any) => ({ q: f.question, r: f.reponse })) : getProductFAQ(productCat, productSlug);

  const photoRows: string[][] = [];
  if (allImages.length === 0) { photoRows.push(["placeholder"]); }
  else { for (let i = 0; i < allImages.length; i += 2) photoRows.push(allImages.slice(i, i + 2)); }

  return (
    <div style={{ background: BG, minHeight: "100vh" }}>
      {lightboxIdx !== null && allImages.length > 0 && (
        <Lightbox images={allImages} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        .pl-outer { max-width:100vw; overflow:hidden; }
        .pl-outer { display:grid; grid-template-columns:1fr 1fr; gap:0; align-items:start; max-width:1800px; margin:0 auto; }
        .pl-left  { padding:16px 24px 80px 4vw; }
        .pl-right { position:sticky; top:84px; padding:16px 4vw 80px 24px; display:flex; flex-direction:column; gap:18px; max-height:calc(100vh - 84px); overflow-y:auto; scrollbar-width:none; }
        .pl-right::-webkit-scrollbar { display:none; }
        .photo-row  { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px; }
        .photo-item { position:relative; aspect-ratio:3/4; border-radius:14px; overflow:hidden; background:${TAUPE}; cursor:zoom-in; }
        .photo-item.single { grid-column:1/-1; aspect-ratio:4/5; }
        .bottom-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:stretch; }
        @media(max-width:900px){
          .pl-outer { grid-template-columns:1fr!important; overflow:hidden!important; width:100%!important; }
          .pl-left  { padding:12px 16px 0!important; overflow:hidden!important; width:100%!important; }
          .pl-right { position:static!important; max-height:none!important; padding:0 16px 100px!important; overflow:hidden!important; display:flex!important; flex-direction:column!important; width:100%!important; }
          /* photos gardent 2 colonnes même sur mobile (format 3/4 acceptable) */
          .bottom-grid { grid-template-columns:1fr!important; gap:16px!important; }
          .milk-logo-zone,.milk-logo-sticky,.milk-logo-philo { display:none!important; }
        }
          .pl-left  { padding:12px 4vw 0!important; }
          .pl-right { position:static!important; max-height:none!important; padding:0 4vw 100px!important; overflow:hidden!important; display:flex!important; flex-direction:column!important; width:100%!important; box-sizing:border-box!important; }
          /* photos 2 colonnes maintenues */
          .bottom-grid { grid-template-columns:1fr!important; gap:16px!important; }
        }
      `}</style>

      {/* Breadcrumb */}
      <div style={{ maxWidth: 1800, margin: "0 auto", padding: "84px 4vw 0" }}>
        <div style={{ display: "flex", gap: 8, fontSize: 13, color: "rgba(26,20,16,0.4)", flexWrap: "wrap", paddingBottom: 8 }}>
          <Link href="/"         style={{ textDecoration: "none", color: "inherit" }}>Accueil</Link>
          <span>/</span>
          <Link href="/produits" style={{ textDecoration: "none", color: "inherit" }}>Produits</Link>
          <span>/</span>
          <Link href={`/produits?categorie=${productCat}`} style={{ textDecoration: "none", color: "inherit" }}>
            {({ bodies: "Bodies", pyjamas: "Pyjamas", gigoteuses: "Gigoteuses", accessoires: "Accessoires", bonnets: "Bonnets", langes: "Langes" } as Record<string,string>)[productCat] || productCat}
          </Link>
          <span>/</span>
          <span style={{ color: DARK, fontWeight: 600 }}>{product.name}</span>
        </div>
      </div>

      <div className="pl-outer">

        {/* ─── GAUCHE : photos ─── */}
        <div className="pl-left">
          <div style={{ position: "relative" }}>
            <DiagonalBadge label={badgeLabel} out={out} />
            {photoRows.map((row, ri) => (
              <div key={ri} className="photo-row">
                {row.map((img, ci) => {
                  const idx = ri * 2 + ci;
                  const isPlaceholder = img === "placeholder";
                  const isSingle = row.length === 1;
                  return (
                    <div key={ci} className={`photo-item${isSingle ? " single" : ""}`} onClick={() => { if (!isPlaceholder) setLightboxIdx(idx); }}>
                      {isPlaceholder ? (
                        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 28, fontWeight: 950, color: "rgba(26,20,16,0.2)" }}>M!LK</div>
                      ) : (
                        <>
                          <Image src={img} alt={`${product.name} ${idx+1}`} fill sizes="(max-width:900px) 50vw, 25vw" style={{ objectFit: "cover" }}/>
                          {ri === 0 && ci === 0 && lowStock && (
                            <div style={{ position: "absolute", top: 10, left: 10, zIndex: 5 }}>
                              <span style={{ padding: "5px 11px", borderRadius: 99, background: "rgba(180,80,60,0.85)", color: "#fff", fontSize: 11, fontWeight: 800 }}>Plus que {product.stock} !</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <IconBandeau />


        </div>

        {/* ─── DROITE : panneau achat ─── */}
        <div className="pl-right">

          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: AMBER }}>
            {productCat || "M!LK"} · Bambou OEKO-TEX
          </div>

          <h1 style={{ margin: 0, fontSize: "clamp(22px,2vw,30px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.1, color: DARK }}>
            {product.name}
          </h1>

          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontSize: "clamp(24px,2.2vw,30px)", fontWeight: 950, letterSpacing: -1, color: DARK }}>{Number(displayPrice).toFixed(2)} €</span>
            {promo && <span style={{ fontSize: 17, textDecoration: "line-through", color: "rgba(26,20,16,0.35)", fontWeight: 700 }}>{Number(product.price_ttc).toFixed(2)} €</span>}
            <span style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>TTC</span>
          </div>

          {subtitle && <p style={{ margin: 0, fontSize: "clamp(14px,1.3vw,16px)", fontWeight: 700, color: "rgba(26,20,16,0.7)", lineHeight: 1.5 }}>{subtitle}</p>}
          {extraDesc && <p style={{ margin: 0, fontSize: "clamp(13px,1.1vw,14px)", color: "rgba(26,20,16,0.6)", lineHeight: 1.8 }}>{extraDesc}</p>}

          {features.length > 0 && (
            <div style={{ padding: "18px 20px", borderRadius: 16, background: "rgba(26,20,16,0.06)", border: `1px solid rgba(26,20,16,0.1)`, display: "flex", flexDirection: "column", gap: 11 }}>
              {features.map((feat: string, i: number) => {
                const colonIdx = feat.indexOf(" : ");
                const label = colonIdx > -1 ? feat.slice(0, colonIdx) : feat;
                const desc  = colonIdx > -1 ? feat.slice(colonIdx + 3) : "";
                return (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(196,154,74,0.15)", border: "1px solid rgba(196,154,74,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke={AMBER} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: "clamp(13px,1.1vw,14px)", color: DARK }}>{label}</span>
                      {desc && <span style={{ fontWeight: 400, fontSize: "clamp(12px,1vw,13px)", color: "rgba(26,20,16,0.5)" }}> : {desc}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {coloris && (
            <div style={{ fontSize: "clamp(14px,1.2vw,16px)", fontWeight: 700, color: DARK, lineHeight: 1.5 }}>
              <span style={{ color: AMBER, fontWeight: 900 }}>Coloris</span> — {coloris}
            </div>
          )}

          {!coloris && motif && (
            <div style={{ fontSize: "clamp(14px,1.2vw,16px)", fontWeight: 700, color: DARK, lineHeight: 1.5 }}>
              <span style={{ color: AMBER, fontWeight: 900 }}>Motif {motif.motif}</span> — {motif.desc}.
            </div>
          )}

          {couleursDispos.length > 0 && (
            <div style={{ display: "grid", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>
                Couleur {couleur && <span style={{ color: DARK }}>— {couleur}</span>}
              </span>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {couleursDispos.map((c: any) => {
                  const epuise = Number(c.stock ?? 0) <= 0;
                  const selected = couleur === c.name;
                  return (
                    <button key={c.name} onClick={() => { if (!epuise) setCouleur(c.name); }} title={c.name}
                      style={{ position: "relative", width: 40, height: 40, borderRadius: 99, border: selected ? `3px solid ${DARK}` : "2px solid rgba(0,0,0,0.15)", overflow: "hidden", background: c.hex, cursor: epuise ? "not-allowed" : "pointer", opacity: epuise ? 0.5 : 1, boxShadow: selected ? `0 0 0 3px ${BG}, 0 0 0 5px ${DARK}` : "none" }}>
                      {c.image_url && <img src={c.image_url} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                      {epuise && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: "130%", height: 2, background: AMBER, transform: "rotate(45deg)" }} /></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {taillesDispos.length > 0 && (
            <div style={{ display: "grid", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>
                Taille {taille && <span style={{ color: DARK }}>— {taille}</span>}
              </span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[...TAILLES_ORDER, ...taillesDispos.filter(t => !TAILLES_ORDER.includes(t))].filter(t => taillesDispos.includes(t)).map(t => {
                  const stockT = Number(sizesStock[t] ?? product.stock ?? 0);
                  const epuise = stockT <= 0;
                  const selected = taille === t;
                  return (
                    <button key={t} onClick={() => { if (!epuise) setTaille(t); }}
                      style={{ position: "relative", padding: "10px 18px", borderRadius: 10, border: "none", fontWeight: 800, fontSize: "clamp(12px,1vw,14px)", cursor: epuise ? "not-allowed" : "pointer", background: selected ? DARK : "rgba(26,20,16,0.08)", color: selected ? WARM : epuise ? "rgba(26,20,16,0.3)" : DARK, boxShadow: selected ? "none" : "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {t}
                      {epuise && <div style={{ position: "absolute", top: "50%", left: "5%", width: "90%", height: 2, background: AMBER, transform: "translateY(-50%) rotate(-6deg)", borderRadius: 2 }} />}
                      {!epuise && stockT <= 3 && <span style={{ marginLeft: 5, fontSize: 10, color: AMBER, fontWeight: 700 }}>({stockT})</span>}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 12px", borderRadius: 10, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.2)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="9" stroke={AMBER} strokeWidth="1.8"/><path d="M12 8v4M12 16h.01" stroke={AMBER} strokeWidth="2" strokeLinecap="round"/></svg>
                <span style={{ fontSize: 12, color: "rgba(26,20,16,0.6)", lineHeight: 1.5, fontWeight: 600 }}>Le bambou stretch est extrêmement extensible — pas de risque de trop petit ou trop grand. En cas de doute, prenez la taille au-dessus.</span>
              </div>
            </div>
          )}

          {taillesDispos.length > 0 && !productSlug.includes("bonnet") && (
            <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(26,20,16,0.12)` }}>
              <button onClick={() => setGuideOpen(v => !v)} style={{ width: "100%", padding: "11px 14px", background: guideOpen ? DARK : "rgba(26,20,16,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <IconSize />
                  <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase", color: guideOpen ? AMBER : DARK }}>Guide des tailles</span>
                </div>
                <span style={{ fontSize: 18, color: guideOpen ? AMBER : DARK, transition: "transform 0.2s", transform: guideOpen ? "rotate(45deg)" : "none", fontWeight: 300 }}>+</span>
              </button>
              {guideOpen && (
                <div style={{ background: "rgba(26,20,16,0.04)", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 280 }}>
                    <thead>
                      <tr style={{ background: "rgba(26,20,16,0.06)" }}>
                        {["Taille","Poids","Poitrine","Longueur"].map(h => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "center", fontSize: 9, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {GUIDE_TAILLES.map((row, i) => (
                        <tr key={row.taille} style={{ borderTop: "1px solid rgba(26,20,16,0.06)", background: i % 2 === 0 ? "transparent" : "rgba(26,20,16,0.03)" }}>
                          <td style={{ padding: "9px 10px", fontWeight: 900, color: AMBER, fontSize: 13, textAlign: "left" }}>{row.taille}</td>
                          <td style={{ padding: "9px 10px", color: "rgba(26,20,16,0.55)", fontSize: 12, textAlign: "center" }}>{row.poids}</td>
                          <td style={{ padding: "9px 10px", color: "rgba(26,20,16,0.55)", fontSize: 13, fontWeight: 700, textAlign: "center" }}>{row.poitrine}</td>
                          <td style={{ padding: "9px 10px", color: "rgba(26,20,16,0.55)", fontSize: 13, fontWeight: 700, textAlign: "center" }}>{row.longueur}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: "7px 12px", fontSize: 11, color: "rgba(26,20,16,0.4)", background: "rgba(26,20,16,0.04)" }}>En cas de doute, prenez la taille supérieure.</div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>Quantité</span>
            <div style={{ display: "flex", alignItems: "center", background: "rgba(26,20,16,0.06)", borderRadius: 12, padding: 4, width: "fit-content" }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 20, display: "grid", placeItems: "center", color: DARK }}>−</button>
              <span style={{ width: 40, textAlign: "center", fontWeight: 900, fontSize: 16, color: DARK }}>{qty}</span>
              <button onClick={() => setQty(Math.min(Number(product.stock ?? 10), qty + 1))} style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 20, display: "grid", placeItems: "center", color: DARK }}>+</button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <button onClick={handleAddToCart} disabled={outTaille}
              style={{ padding: "17px 24px", borderRadius: 16, border: "none", fontWeight: 900, fontSize: "clamp(14px,1.3vw,17px)", cursor: outTaille ? "not-allowed" : "pointer", background: added ? "#2d6a2d" : outTaille ? "rgba(26,20,16,0.2)" : DARK, color: added ? "#fff" : outTaille ? "rgba(26,20,16,0.4)" : WARM, transition: "all 0.2s", position: "relative" }}>
              {added ? "✓ Ajouté au panier !" : outTaille ? "Épuisé" : needsTaille ? "Choisir une taille ↑" : `Ajouter — ${(Number(displayPrice) * qty).toFixed(2)} €`}
            </button>
            {cartCount > 0 && (
              <Link href="/panier" style={{ padding: "13px 24px", borderRadius: 16, border: `2px solid ${DARK}`, fontWeight: 800, fontSize: 14, textDecoration: "none", color: DARK, textAlign: "center", display: "block" }}>
                Voir le panier ({cartCount})
              </Link>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { Icon: IconLeaf,   label: "100% Bambou OEKO-TEX"     },
              { Icon: IconTruck,  label: "Livraison offerte dès 60€" },
              { Icon: IconReturn, label: "Retour gratuit 15 jours"   },
              { Icon: IconLock,   label: "Paiement sécurisé Stripe"  },
            ].map(r => (
              <div key={r.label} style={{ padding: "9px 11px", borderRadius: 10, background: "rgba(26,20,16,0.07)", display: "flex", alignItems: "center", gap: 7, fontSize: "clamp(10px,0.9vw,12px)", fontWeight: 700, color: "rgba(26,20,16,0.65)", whiteSpace: "nowrap" }}>
                <r.Icon />{r.label}
              </div>
            ))}
          </div>

          {whyResult && (
            <div style={{ padding: "20px 22px", borderRadius: 16, background: "rgba(26,20,16,0.06)", border: `1px solid rgba(26,20,16,0.1)` }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: AMBER, marginBottom: 4 }}>La vraie raison</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,20,16,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Pourquoi ce produit existe</div>
              <p style={{ margin: 0, fontSize: "clamp(13px,1.1vw,14px)", color: "rgba(26,20,16,0.7)", lineHeight: 1.8 }}>{whyResult.why}</p>
            </div>
          )}

          {whyResult && (
            <div style={{ padding: "20px 22px", borderRadius: 16, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.2)" }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: AMBER, marginBottom: 4 }}>Ce que tu obtiens</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,20,16,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Le résultat</div>
              <p style={{ margin: 0, fontSize: "clamp(13px,1.1vw,14px)", color: "rgba(26,20,16,0.7)", lineHeight: 1.8, fontWeight: 600 }}>{whyResult.result}</p>
            </div>
          )}

          <div style={{ padding: "18px 20px", borderRadius: 16, background: "rgba(26,20,16,0.06)", border: `1px solid rgba(26,20,16,0.1)` }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "clamp(13px,1.2vw,15px)", fontWeight: 950, color: DARK }}>Conseils d'entretien</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { svg: <svg viewBox="0 0 32 32" fill="none" width={28} height={28}><circle cx="16" cy="16" r="12" stroke={AMBER} strokeWidth="1.6"/><text x="16" y="20" textAnchor="middle" fontSize="9" fontWeight="700" fill={AMBER}>30°</text></svg>, text: "30°C, cycle délicat" },
                { svg: <svg viewBox="0 0 32 32" fill="none" width={28} height={28}><circle cx="16" cy="16" r="12" stroke={AMBER} strokeWidth="1.6"/><line x1="10" y1="10" x2="22" y2="22" stroke={AMBER} strokeWidth="1.8" strokeLinecap="round"/></svg>, text: "Sans adoucissant" },
                { svg: <svg viewBox="0 0 32 32" fill="none" width={28} height={28}><line x1="4" y1="10" x2="28" y2="10" stroke={AMBER} strokeWidth="1.6" strokeLinecap="round"/><path d="M12 10 L10 22 L22 22 L20 10" stroke={AMBER} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="12" cy="10" r="1.8" fill={AMBER}/><circle cx="20" cy="10" r="1.8" fill={AMBER}/></svg>, text: "Séchage à l'air libre recommandé" },
                { svg: <svg viewBox="0 0 32 32" fill="none" width={28} height={28}><path d="M16 6 C16 6 8 13 8 19 a8 8 0 0 0 16 0 C24 13 16 6 16 6Z" stroke={AMBER} strokeWidth="1.6" fill="none"/><path d="M13 18 Q16 15 19 18" stroke={AMBER} strokeWidth="1.3" strokeLinecap="round" fill="none"/></svg>, text: "Conserve sa forme et devient plus doux lavage après lavage" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ flexShrink: 0, marginTop: 2 }}>{item.svg}</div>
                  <span style={{ fontSize: "clamp(11px,1vw,12px)", color: "rgba(26,20,16,0.7)", lineHeight: 1.4, fontWeight: 600 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ─── BAS DE PAGE ─── */}
      <div style={{ maxWidth: 1800, margin: "0 auto", padding: "0 4vw 80px" }}>
        <div className="bottom-grid" style={{ marginBottom: 24 }}>
          {related.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: AMBER, marginBottom: 8 }}>Complétez votre collection</div>
                <h2 style={{ margin: 0, fontSize: "clamp(18px,2vw,24px)", fontWeight: 950, letterSpacing: -1, color: DARK }}>Les clients ont aussi acheté</h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, flex: 1 }}>
                {related.map((p: any) => (
                  <Link key={p.id} href={`/produits/${p.slug}`}
                    style={{ textDecoration: "none", color: "inherit", borderRadius: 14, overflow: "hidden", background: TAUPE, border: `1px solid rgba(26,20,16,0.08)`, display: "block", transition: "transform 0.2s, box-shadow 0.2s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 12px 32px rgba(0,0,0,0.1)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ""; (e.currentTarget as HTMLAnchorElement).style.boxShadow = ""; }}>
                    <div style={{ position: "relative", aspectRatio: "3/4", background: BG }}>
                      {p.image_url ? <Image src={p.image_url} alt={p.name} fill sizes="200px" style={{ objectFit: "cover" }} /> : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 20, fontWeight: 950, color: "rgba(26,20,16,0.2)" }}>M!LK</div>}
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4, color: DARK, lineHeight: 1.3 }}>{p.name}</div>
                      <div style={{ fontWeight: 950, fontSize: 15, color: DARK }}>{Number(p.price_ttc).toFixed(2)} €</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : <div />}

          {philosophy && <PhilosophyCard text={philosophy} />}
        </div>

        {/* FAQ */}
        <div style={{ padding: "24px 28px", borderRadius: 20, background: TAUPE, border: `1px solid rgba(26,20,16,0.1)` }}>
          <h3 style={{ margin: "0 0 8px", fontSize: "clamp(16px,1.8vw,20px)", fontWeight: 950, color: DARK }}>Questions fréquentes</h3>
          {FAQ.map(item => <FaqItem key={item.q} q={item.q} r={item.r} />)}
        </div>
      </div>

      {/* CTA mobile */}
      <div className="mobile-cta-bar" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, padding: "12px 16px", background: `rgba(216,200,176,0.97)`, backdropFilter: "blur(8px)", borderTop: `1px solid rgba(26,20,16,0.1)` }}>
        <button onClick={handleAddToCart} disabled={outTaille}
          style={{ width: "100%", padding: "17px", borderRadius: 14, border: "none", fontWeight: 900, fontSize: 17, cursor: outTaille ? "not-allowed" : "pointer", background: added ? "#2d6a2d" : outTaille ? "rgba(26,20,16,0.2)" : DARK, color: WARM }}>
          {added ? "✓ Ajouté !" : outTaille ? "Épuisé" : needsTaille ? "Choisir une taille ↑" : `Ajouter — ${(Number(displayPrice) * qty).toFixed(2)} €`}
        </button>
      </div>
      <style>{`.mobile-cta-bar{display:none!important}@media(max-width:900px){.mobile-cta-bar{display:block!important}}`}</style>
    </div>
  );
}