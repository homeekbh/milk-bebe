"use client";

import { useEffect, useRef, useState } from "react";
import { useParams }                   from "next/navigation";
import Image                           from "next/image";
import Link                            from "next/link";
import { useCart }                     from "@/context/CartContext";

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

function getProductFeatures(category: string): string[] {
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
  if (category === "accessoires") return [
    "Taille XXL (120×120 cm) : assez grand pour un emmaillotage qui tient vraiment",
    "Mousseline respirante : régule la température, zéro surchauffe",
    "Reproduit la pression du ventre maternel : effet calmant immédiat",
    "Grip intégré : reste en place même quand bébé se débat",
    "Devient plus doux à chaque lavage",
    "Multi-usage : swaddle, couverture, drap d'allaitement, protection poussette",
  ];
  return [];
}

function getWhyResult(category: string): { why: string; result: string } | null {
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
  if (category === "accessoires") return {
    why: "Ton bébé sursaute, se réveille, pleure. Le réflexe de Moro le tire du sommeil toutes les 20 minutes. Tu as essayé d'emmailloter avec une couverture classique — ça se défait au premier mouvement. Les swaddles à velcro ? Bruyants. Trop serrés. Ou pas assez. Ce swaddle existe pour une seule raison : calmer ton bébé plus vite et lui permettre de dormir plus longtemps. Et toi avec.",
    result: "Bébé calmé en quelques minutes. Réflexe de Moro contenu. Moins de réveils en sursaut. Des plages de sommeil plus longues — pour lui et pour toi. Tu récupères un peu.",
  };
  return null;
}

function getProductFAQ(category: string): { q: string; r: string }[] {
  if (category === "bodies") return [
    { q: "Le col enveloppe, ça passe vraiment sans forcer ?",   r: "Oui. Conçu pour glisser sur la tête sans appuyer sur la fontanelle. Même sur un nouveau-né de quelques jours." },
    { q: "Les moufles pliables, ça sert à quoi ?",              r: "À éviter les griffures sans les moufles perdues partout. Elles sont intégrées au poignet : tu replies, tu déplies, elles sont toujours là quand tu en as besoin." },
    { q: "Est-ce que les moufles sont incluses ?",              r: "Oui, elles sont intégrées directement au poignet. Tu ne les perds jamais. Tu les replies quand tu veux, tu les déplies quand bébé a besoin de protection." },
    { q: "3 pressions c'est assez pour tenir ?",                r: "Largement. Bien positionnées à l'entrejambe, elles maintiennent parfaitement. Plus de pressions = plus de galère." },
    { q: "C'est adapté aux peaux sensibles ?",                  r: "Bambou hypoallergénique + coutures plates. Zéro frottement, zéro irritation. Même sur peau atopique." },
    { q: "Jusqu'à quel âge ?",                                  r: "De la naissance à 12 mois. 5 tailles disponibles. Le stretch permet une bonne marge dans chaque taille." },
    { q: "Les moufles c'est pas trop chaud en été ?",           r: "Tu peux les laisser dépliées quand il fait chaud. Le bambou régule la température de toute façon." },
  ];
  if (category === "pyjamas") return [
    { q: "C'est quoi le double zip inversé ?",                  r: "Un zip qui s'ouvre par le bas pour changer la couche sans tout enlever, et par le haut pour habiller facilement." },
    { q: "Les moufles pliables, ça sert à quoi ?",              r: "À éviter les griffures sans les moufles perdues partout. Elles sont intégrées au poignet : tu replies, tu déplies, elles sont toujours là quand tu en as besoin." },
    { q: "Mon bébé déteste être habillé. Ça change quoi ?",     r: "Moins de gestes, moins de manipulations, pas de boutons à gérer : l'habillage est plus rapide, donc moins de cris et moins de tension." },
    { q: "Le zip ne risque pas de le blesser ?",                r: "Non. Le zip est protégé, il ne touche pas directement la peau de bébé." },
    { q: "Pourquoi le bambou plutôt que le coton ?",            r: "Parce qu'il est ultra doux, stretch, respirant et agréable sur la peau, surtout quand bébé bouge beaucoup." },
    { q: "Ça taille comment ?",                                 r: "Le pyjama taille normalement, avec un tissu stretch qui suit bien les mouvements. Si tu hésites entre deux tailles, prends la plus grande pour prolonger l'usage." },
  ];
  if (category === "gigoteuses") return [
    { q: "C'est quoi une gigoteuse à nouer exactement ?",       r: "Une gigoteuse nouée en bas. Pas de boutons, pas de zip. Tu défais le nœud, tu changes, tu renoues. 30 secondes. Même dans le noir." },
    { q: "Les moufles pliables, ça sert à quoi ?",              r: "À éviter les griffures sans les moufles perdues partout. Elles sont intégrées au poignet : tu replies, tu déplies, elles sont toujours là — même à 3h du mat'." },
    { q: "Le nœud ne se défait pas tout seul ?",                r: "Non. Le tissu bambou a du grip. Une fois noué, ça tient toute la nuit. Et ça se défait facilement quand tu le veux." },
    { q: "Jusqu'à quel âge ça fonctionne ?",                    r: "De la naissance à 6 mois environ. Après, bébé bouge trop et on passe au pyjama zip." },
    { q: "C'est vraiment mieux que les boutons-pression ?",     r: "La nuit, à moitié endormi, aligner 12 pressions dans le noir ? Non. Le nœud se fait d'une main, sans regarder." },
    { q: "Le tissu est assez chaud ?",                          r: "Bambou thermorégulant. Chaud en hiver, respirant en été. Pas de surchauffe, pas de sueur." },
    { q: "Machine lavable ?",                                   r: "Oui. 40°C, cycle délicat. Devient plus doux à chaque lavage." },
  ];
  if (category === "accessoires") return [
    { q: "Ça marche vraiment pour calmer un bébé ?",            r: "Oui. L'emmaillotage exerce une pression douce qui rappelle les sensations in utero. Le bambou, naturellement souple et fluide, accentue cet effet enveloppant. Résultat : un bébé plus apaisé, surtout chez les nouveau-nés." },
    { q: "Mon bébé se débat beaucoup. Ça va tenir ?",           r: "Oui, si c'est bien fait. Le tissu en bambou est à la fois doux et légèrement extensible, ce qui permet un bon maintien sans rigidité. La taille généreuse (XL/XXL) facilite un emmaillotage sûr, même avec un bébé agité." },
    { q: "C'est pas dangereux la surchauffe ?",                 r: "Non. Le bambou est thermorégulateur et très respirant. Il aide à évacuer l'humidité et à maintenir une température corporelle stable. Aucun risque de surchauffe tant que le bébé n'est pas sur-couvert." },
    { q: "Jusqu'à quel âge on emmaillote ?",                    r: "En général jusqu'à 3–4 mois, ou dès que bébé commence à se retourner. Ensuite, le lange en bambou reste parfaitement utilisable comme couverture légère, drap d'appoint ou protection pour les sorties." },
    { q: "C'est compliqué la technique d'emmaillotage ?",       r: "Non. Pli en diamant, bras le long du corps, deux rabats bien ajustés. Le bambou est souple et indulgent, donc plus facile à manipuler. Compte 30 secondes une fois le geste acquis." },
    { q: "Pourquoi pas un swaddle à velcro ?",                  r: "Parce que ça fait du bruit, ça s'use, et ça réveille un bébé endormi au mauvais moment. Un lange en bambou est silencieux, durable et s'adapte à la morphologie du bébé, pas l'inverse." },
  ];
  return [
    { q: "Comment entretenir ce vêtement ?",  r: "Lavage machine 40°C, cycle délicat. Lessive douce, sans javel ni adoucissant. Séchage à l'air libre ou machine basse température." },
    { q: "Ça taille comment ?",               r: "Le bambou est naturellement très extensible. En cas de doute entre deux tailles, prenez la plus grande." },
    { q: "Retour possible ?",                 r: "Oui, 15 jours après réception. Retour entièrement gratuit pour les articles non utilisés. contact@milkbebe.fr" },
  ];
}

function getPhilosophy(category: string): string {
  if (category === "bodies")      return "Les bodies à col rond ? Bataille pour passer la tête, bébé hurle. Les bodies à boutons sur l'épaule ? 6 pressions à aligner. Les moufles séparées ? Perdues en 24h. Le body express combine col facile + pressions minimum + moufles pliables intégrées.\n\nChaque produit M!LK répond à un problème réel. Pas de design pour le design. Pas de fonctionnalité inutile. Juste ce qui compte quand t'es épuisé.";
  if (category === "pyjamas")     return "Les pyjamas à boutons ? Combat garanti à chaque change. Les combinaisons sans zip inversé ? Tu dois tout défaire pour une couche. Les moufles séparées ? Elles se perdent, tombent, disparaissent quand bébé en a le plus besoin. Ici : double zip inversé + bambou stretch + moufles pliables intégrées = moins de gestes, moins de lutte, moins d'objets à gérer.\n\nChaque produit M!LK répond à un problème réel. Pas de design pour le design. Pas de fonctionnalité inutile. Juste ce qui compte quand t'es épuisé.";
  if (category === "gigoteuses")  return "Les grenouillères à boutons ? 12 pressions à aligner dans le noir — t'abandonnes au 3e essai. Les pyjamas zip ? Le bruit réveille le bébé. Les gigoteuses classiques ? Pas d'accès direct à la couche. Les moufles séparées ? Perdues dans le lit à 3h du mat'. La gigoteuse à nouer résout tout : accès immédiat, fermeture silencieuse, zéro manipulation complexe.\n\nChaque produit M!LK répond à un problème réel. Pas de design pour le design. Pas de fonctionnalité inutile. Juste ce qui compte quand t'es épuisé.";
  if (category === "accessoires") return "Les swaddles à velcro ? Le scratch réveille le bébé quand tu l'ouvres. Les couvertures classiques ? Trop petites, se défont. Les gigoteuses ? Pas adaptées aux nouveau-nés qui ont besoin de contention. La mousseline grand format offre le meilleur compromis : maintien efficace, ouverture silencieuse, respiration optimale.\n\nChaque produit M!LK répond à un problème réel. Pas de design pour le design. Pas de fonctionnalité inutile. Juste ce qui compte quand t'es épuisé.";
  return "";
}

const TAILLES_ORDER = ["Nouveau-né","0-3 mois","3-6 mois","6-12 mois","0-6 mois","Taille unique","120×120 cm"];

const GUIDE_TAILLES = [
  { taille: "Nouveau-né", poids: "2,5 – 4 kg", poitrine: "21 cm", longueur: "50 cm" },
  { taille: "0-3 mois",   poids: "3,5 – 6 kg", poitrine: "22 cm", longueur: "54 cm" },
  { taille: "3-6 mois",   poids: "6 – 8 kg",   poitrine: "24 cm", longueur: "57 cm" },
  { taille: "6-12 mois",  poids: "8 – 11 kg",  poitrine: "26 cm", longueur: "62 cm" },
];

const IconThermometer = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2v10m0 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/><path d="M12 6h2M12 9h1" stroke="#c49a4a" strokeWidth="1.5" strokeLinecap="round"/></svg>;
const IconBan         = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#c49a4a" strokeWidth="1.8"/><path d="M6 6l12 12" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const IconFlat        = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 12h16M4 8h8M4 16h8" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const IconHeat        = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M8 6c0 2 2 2 2 4s-2 2-2 4M12 4c0 2 2 2 2 4s-2 2-2 4M16 6c0 2 2 2 2 4s-2 2-2 4" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/><path d="M5 19h14" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const IconLeaf        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 22C12 22 4 16 4 9a8 8 0 0 1 16 0c0 7-8 13-8 13z" stroke="#c49a4a" strokeWidth="1.8"/><path d="M12 22V9" stroke="#c49a4a" strokeWidth="1.8"/></svg>;
const IconTruck       = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M1 3h13v13H1z" stroke="#c49a4a" strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 8h4l3 3v5h-7V8z" stroke="#c49a4a" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="5.5" cy="18.5" r="2.5" stroke="#c49a4a" strokeWidth="1.8"/><circle cx="18.5" cy="18.5" r="2.5" stroke="#c49a4a" strokeWidth="1.8"/></svg>;
const IconReturn      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 14H4V9" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 14a9 9 0 1 0 1.5-5" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round"/></svg>;
const IconLock        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#c49a4a" strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#c49a4a" strokeWidth="1.8"/></svg>;
const IconSize        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h10M3 18h6" stroke="#c49a4a" strokeWidth="2" strokeLinecap="round"/></svg>;

function IconBandeau() {
  const C = "#c49a4a";
  const items = [
    { label: "Toutes\nSaisons", svg: (<svg width="52" height="52" viewBox="0 0 64 64" fill="none"><line x1="32" y1="6" x2="32" y2="58" stroke={C} strokeWidth="1.8" strokeLinecap="round"/><line x1="6" y1="32" x2="32" y2="32" stroke={C} strokeWidth="1.8" strokeLinecap="round"/><line x1="11" y1="11" x2="32" y2="32" stroke={C} strokeWidth="1.8" strokeLinecap="round"/><line x1="11" y1="53" x2="32" y2="32" stroke={C} strokeWidth="1.8" strokeLinecap="round"/><line x1="32" y1="12" x2="27" y2="17" stroke={C} strokeWidth="1.4" strokeLinecap="round"/><line x1="32" y1="12" x2="37" y2="17" stroke={C} strokeWidth="1.4" strokeLinecap="round"/><line x1="32" y1="52" x2="27" y2="47" stroke={C} strokeWidth="1.4" strokeLinecap="round"/><line x1="32" y1="52" x2="37" y2="47" stroke={C} strokeWidth="1.4" strokeLinecap="round"/><line x1="10" y1="32" x2="15" y2="27" stroke={C} strokeWidth="1.4" strokeLinecap="round"/><line x1="10" y1="32" x2="15" y2="37" stroke={C} strokeWidth="1.4" strokeLinecap="round"/><line x1="14" y1="14" x2="19" y2="14" stroke={C} strokeWidth="1.4" strokeLinecap="round"/><line x1="14" y1="14" x2="14" y2="19" stroke={C} strokeWidth="1.4" strokeLinecap="round"/><line x1="14" y1="50" x2="19" y2="50" stroke={C} strokeWidth="1.4" strokeLinecap="round"/><line x1="14" y1="50" x2="14" y2="45" stroke={C} strokeWidth="1.4" strokeLinecap="round"/>{[0,45,90,135,180].map((deg,i)=>{const r=(deg*Math.PI)/180;return <line key={i} x1={32+14*Math.cos(r)} y1={32+14*Math.sin(r)} x2={32+22*Math.cos(r)} y2={32+22*Math.sin(r)} stroke={C} strokeWidth="2" strokeLinecap="round"/>;})}<path d="M32 18 A14 14 0 0 1 32 46 Z" stroke={C} strokeWidth="1.6" fill="none"/></svg>) },
    { label: "Anti-\nbactérien", svg: (<svg width="52" height="52" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="27" stroke={C} strokeWidth="1.8"/><line x1="12" y1="12" x2="52" y2="52" stroke={C} strokeWidth="1.8" strokeLinecap="round"/><ellipse cx="32" cy="32" rx="10" ry="13" stroke={C} strokeWidth="1.8"/>{[-7,-2,4,9].map((y,i)=>(<g key={i}><line x1="22" y1={32+y} x2="16" y2={30+y} stroke={C} strokeWidth="1.4" strokeLinecap="round"/><line x1="42" y1={32+y} x2="48" y2={30+y} stroke={C} strokeWidth="1.4" strokeLinecap="round"/></g>))}<circle cx="29" cy="27" r="1.8" fill={C}/><circle cx="36" cy="32" r="1.8" fill={C}/><circle cx="28" cy="37" r="1.8" fill={C}/></svg>) },
    { label: "Hypo-\nallergénique", svg: (<svg width="52" height="52" viewBox="0 0 64 64" fill="none"><path d="M22 54 C22 54 8 42 10 26 C10 26 22 30 22 42" stroke={C} strokeWidth="1.8" strokeLinecap="round" fill="none"/><path d="M22 54 C22 54 36 42 34 26 C34 26 22 30 22 42" stroke={C} strokeWidth="1.8" strokeLinecap="round" fill="none"/><line x1="22" y1="16" x2="22" y2="54" stroke={C} strokeWidth="1.8" strokeLinecap="round"/><path d="M30 16 C36 8 46 12 42 22 C40 26 30 22 30 16Z" stroke={C} strokeWidth="1.5" fill="none"/><line x1="30" y1="16" x2="40" y2="22" stroke={C} strokeWidth="1.2" strokeLinecap="round"/><path d="M48 40 C48 40 43 32 43 28 C43 25 45 23 48 23 C51 23 53 25 53 28 C53 32 48 40 48 40Z" stroke={C} strokeWidth="1.6" fill="none"/><path d="M6 34 L14 44 L28 24" stroke={C} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
    { label: "Bambou\nBio", svg: (<svg width="52" height="52" viewBox="0 0 64 64" fill="none"><line x1="18" y1="58" x2="18" y2="10" stroke={C} strokeWidth="2.2" strokeLinecap="round"/>{[48,36,24,14].map((y,i)=><line key={i} x1="15" y1={y} x2="21" y2={y} stroke={C} strokeWidth="2" strokeLinecap="round"/>)}<path d="M18 28 C8 22 4 12 10 10 C14 9 18 18 18 28Z" stroke={C} strokeWidth="1.5" fill="none"/><path d="M18 40 C8 46 4 54 10 56 C14 57 18 46 18 40Z" stroke={C} strokeWidth="1.5" fill="none"/><line x1="32" y1="58" x2="32" y2="8" stroke={C} strokeWidth="2.2" strokeLinecap="round"/>{[50,38,26,14].map((y,i)=><line key={i} x1="29" y1={y} x2="35" y2={y} stroke={C} strokeWidth="2" strokeLinecap="round"/>)}<line x1="46" y1="58" x2="46" y2="10" stroke={C} strokeWidth="2.2" strokeLinecap="round"/>{[48,36,24,14].map((y,i)=><line key={i} x1="43" y1={y} x2="49" y2={y} stroke={C} strokeWidth="2" strokeLinecap="round"/>)}<path d="M46 22 C56 16 60 8 54 6 C50 5 46 14 46 22Z" stroke={C} strokeWidth="1.5" fill="none"/><path d="M46 44 C56 50 60 58 54 60 C50 61 46 50 46 44Z" stroke={C} strokeWidth="1.5" fill="none"/></svg>) },
    { label: "Ultra\nDoux", svg: (<svg width="52" height="52" viewBox="0 0 64 64" fill="none"><path d="M10 44 C10 44 8 40 10 36 C12 32 16 36 16 36 L24 27 C24 27 27 24 30 26 C30 26 32 21 35 22 C35 22 37 18 40 19 C40 19 42 16 45 18 L51 25 C53 28 51 33 48 33 L38 42" stroke={C} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M10 44 L38 44 C38 44 45 46 45 54 L10 54 C10 54 8 50 10 44Z" stroke={C} strokeWidth="1.8" strokeLinecap="round" fill="none"/><path d="M14 49 Q26 47 38 49" stroke={C} strokeWidth="1.1" strokeLinecap="round" fill="none"/><ellipse cx="54" cy="14" rx="2.5" ry="5" stroke={C} strokeWidth="1.5" transform="rotate(-20 54 14)"/><circle cx="54" cy="9" r="2" fill={C}/><path d="M52 12 C44 6 38 8 40 14" stroke={C} strokeWidth="1.3" strokeLinecap="round" fill="none"/><path d="M56 12 C62 5 68 8 66 14" stroke={C} strokeWidth="1.3" strokeLinecap="round" fill="none"/><path d="M52 16 C44 22 40 28 44 30" stroke={C} strokeWidth="1.3" strokeLinecap="round" fill="none"/><path d="M56 16 C62 22 66 26 62 30" stroke={C} strokeWidth="1.3" strokeLinecap="round" fill="none"/></svg>) },
  ];
  return (
    <div style={{ marginTop: 14, background: "#2a2018", borderRadius: 16, padding: "20px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
        {items.map(item => (
          <div key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, minWidth: 60, flex: "1 1 60px", maxWidth: 90 }}>
            {item.svg}
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", color: "rgba(242,237,230,0.65)", textAlign: "center", lineHeight: 1.4, whiteSpace: "pre-line" }}>{item.label}</div>
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
      <div style={{ position: "absolute", top: 28, right: -34, background: "#c49a4a", color: "#1a1410", fontSize: 11, fontWeight: 900, padding: "9px 48px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{text}</div>
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
    <div style={{ borderTop: "1px solid rgba(242,237,230,0.07)" }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: "100%", padding: "13px 0", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, textAlign: "left" }}>
        <span style={{ fontWeight: 800, fontSize: "clamp(13px,1.3vw,15px)", color: "#f2ede6", lineHeight: 1.3 }}>{q}</span>
        <span style={{ fontSize: 20, color: "#c49a4a", flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "none", lineHeight: 1 }}>+</span>
      </button>
      {open && <div style={{ padding: "0 0 13px", fontSize: "clamp(13px,1.2vw,14px)", lineHeight: 1.75, color: "rgba(242,237,230,0.55)", whiteSpace: "pre-line" }}>{r}</div>}
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
    const name = [product.name, taille, couleur].filter(Boolean).join(" — ");
    for (let i = 0; i < qty; i++) addToCart({ id: String(product.id), slug: product.slug, name, price: promo ? product.promo_price : product.price_ttc, quantity: 1 });
    setAdded(true); setTimeout(() => setAdded(false), 2500);
  }

  if (loading) return <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: "#f5f0e8" }}><div style={{ opacity: 0.4 }}>Chargement...</div></div>;
  if (!product) return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: "#f5f0e8", padding: 40, textAlign: "center" }}>
      <div><div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12, color: "#1a1410" }}>Produit introuvable</div>
      <Link href="/produits" style={{ padding: "12px 24px", borderRadius: 12, background: "#1a1410", color: "#f2ede6", fontWeight: 800, textDecoration: "none" }}>← Retour</Link></div>
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
  const cartCount      = items.reduce((s, i) => s + i.quantity, 0);
  const features       = getProductFeatures(product.category_slug ?? "");
  const whyResult      = getWhyResult(product.category_slug ?? "");
  const philosophy     = getPhilosophy(product.category_slug ?? "");
  const FAQ            = getProductFAQ(product.category_slug ?? "");
  const motif          = getMotifDetails(product.slug ?? "");

  const photoRows: string[][] = [];
  if (allImages.length === 0) { photoRows.push(["placeholder"]); }
  else { for (let i = 0; i < allImages.length; i += 2) photoRows.push(allImages.slice(i, i + 2)); }

  return (
    <div style={{ background: "#f5f0e8", minHeight: "100vh" }}>
      {lightboxIdx !== null && allImages.length > 0 && (
        <Lightbox images={allImages} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      <style>{`
        .pl-outer { display: grid; grid-template-columns: 1fr 1fr; gap: 0; align-items: start; max-width: 1800px; margin: 0 auto; }
        .pl-left  { padding: 16px 24px 80px 4vw; }
        .pl-right { position: sticky; top: 84px; padding: 16px 4vw 80px 24px; display: grid; gap: 18px; max-height: calc(100vh - 84px); overflow-y: auto; scrollbar-width: none; }
        .pl-right::-webkit-scrollbar { display: none; }
        .photo-row  { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .photo-item { position: relative; aspect-ratio: 3/4; border-radius: 14px; overflow: hidden; background: #ede8df; cursor: zoom-in; }
        .photo-item.single { grid-column: 1 / -1; aspect-ratio: 4/5; }
        .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
        @media (max-width: 900px) {
          .pl-outer { grid-template-columns: 1fr !important; }
          .pl-left  { padding: 12px 4vw 24px !important; }
          .pl-right { position: static !important; max-height: none !important; padding: 0 4vw 120px !important; overflow: visible !important; }
          .photo-row { gap: 6px; margin-bottom: 6px; }
          .bottom-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Breadcrumb */}
      <div style={{ maxWidth: 1800, margin: "0 auto", padding: "84px 4vw 0" }}>
        <div style={{ display: "flex", gap: 8, fontSize: 13, color: "rgba(26,20,16,0.4)", flexWrap: "wrap", paddingBottom: 8 }}>
          <Link href="/"         style={{ textDecoration: "none", color: "inherit" }}>Accueil</Link>
          <span>/</span>
          <Link href="/produits" style={{ textDecoration: "none", color: "inherit" }}>Produits</Link>
          <span>/</span>
          <span style={{ color: "#1a1410", fontWeight: 600 }}>{product.name}</span>
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
                        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 28, fontWeight: 950, color: "#c8bfb2" }}>M!LK</div>
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

          {/* Catégorie */}
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: "#c49a4a" }}>
            {product.category_slug ?? "M!LK"} · Bambou OEKO-TEX
          </div>

          {/* Titre */}
          <h1 style={{ margin: 0, fontSize: "clamp(22px,2vw,30px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.1, color: "#1a1410" }}>
            {product.name}
          </h1>

          {/* Prix */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontSize: "clamp(24px,2.2vw,30px)", fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>{Number(displayPrice).toFixed(2)} €</span>
            {promo && <span style={{ fontSize: 17, textDecoration: "line-through", color: "rgba(26,20,16,0.35)", fontWeight: 700 }}>{Number(product.price_ttc).toFixed(2)} €</span>}
            <span style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>TTC</span>
          </div>

          {/* ── FEATURES (coches) sous titre/prix ── */}
          {features.length > 0 && (
            <div style={{ padding: "18px 20px", borderRadius: 16, background: "#fff", border: "1px solid rgba(26,20,16,0.07)", display: "flex", flexDirection: "column", gap: 11 }}>
              {features.map((feat, i) => {
                const colonIdx = feat.indexOf(" : ");
                const label = colonIdx > -1 ? feat.slice(0, colonIdx) : feat;
                const desc  = colonIdx > -1 ? feat.slice(colonIdx + 3) : "";
                return (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(196,154,74,0.12)", border: "1px solid rgba(196,154,74,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: "clamp(13px,1.1vw,14px)", color: "#1a1410" }}>{label}</span>
                      {desc && <span style={{ fontWeight: 400, fontSize: "clamp(12px,1vw,13px)", color: "rgba(26,20,16,0.5)" }}> : {desc}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── MOTIF — plus gros ── */}
          {motif && (
            <div style={{ fontSize: "clamp(14px,1.2vw,16px)", fontWeight: 700, color: "#1a1410", lineHeight: 1.5 }}>
              <span style={{ color: "#c49a4a", fontWeight: 900 }}>Motif {motif.motif}</span> — {motif.desc}.
            </div>
          )}

          {/* Couleurs */}
          {couleursDispos.length > 0 && (
            <div style={{ display: "grid", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>
                Couleur {couleur && <span style={{ color: "#1a1410" }}>— {couleur}</span>}
              </span>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {couleursDispos.map((c: any) => {
                  const epuise = Number(c.stock ?? 0) <= 0;
                  const selected = couleur === c.name;
                  return (
                    <button key={c.name} onClick={() => { if (!epuise) setCouleur(c.name); }} title={c.name}
                      style={{ position: "relative", width: 40, height: 40, borderRadius: 99, border: selected ? "3px solid #1a1410" : "2px solid rgba(0,0,0,0.15)", overflow: "hidden", background: c.hex, cursor: epuise ? "not-allowed" : "pointer", opacity: epuise ? 0.5 : 1, boxShadow: selected ? "0 0 0 3px #f5f0e8, 0 0 0 5px #1a1410" : "none" }}>
                      {c.image_url && <img src={c.image_url} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                      {epuise && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: "130%", height: 2, background: "#c49a4a", transform: "rotate(45deg)" }} /></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tailles */}
          {taillesDispos.length > 0 && (
            <div style={{ display: "grid", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>
                Taille {taille && <span style={{ color: "#1a1410" }}>— {taille}</span>}
              </span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[...TAILLES_ORDER, ...taillesDispos.filter(t => !TAILLES_ORDER.includes(t))].filter(t => taillesDispos.includes(t)).map(t => {
                  const stockT = Number(sizesStock[t] ?? product.stock ?? 0);
                  const epuise = stockT <= 0;
                  const selected = taille === t;
                  return (
                    <button key={t} onClick={() => { if (!epuise) setTaille(t); }}
                      style={{ position: "relative", padding: "10px 18px", borderRadius: 10, border: "none", fontWeight: 800, fontSize: "clamp(12px,1vw,14px)", cursor: epuise ? "not-allowed" : "pointer", background: selected ? "#1a1410" : "#fff", color: selected ? "#f2ede6" : epuise ? "rgba(26,20,16,0.3)" : "#1a1410", boxShadow: selected ? "none" : "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {t}
                      {epuise && <div style={{ position: "absolute", top: "50%", left: "5%", width: "90%", height: 2, background: "#c49a4a", transform: "translateY(-50%) rotate(-6deg)", borderRadius: 2 }} />}
                      {!epuise && stockT <= 3 && <span style={{ marginLeft: 5, fontSize: 10, color: "#c49a4a", fontWeight: 700 }}>({stockT})</span>}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 12px", borderRadius: 10, background: "rgba(196,154,74,0.08)", border: "1px solid rgba(196,154,74,0.18)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="9" stroke="#c49a4a" strokeWidth="1.8"/><path d="M12 8v4M12 16h.01" stroke="#c49a4a" strokeWidth="2" strokeLinecap="round"/></svg>
                <span style={{ fontSize: 12, color: "rgba(26,20,16,0.6)", lineHeight: 1.5, fontWeight: 600 }}>Le bambou stretch est extrêmement extensible — pas de risque de trop petit ou trop grand. En cas de doute, prenez la taille au-dessus.</span>
              </div>
            </div>
          )}

          {/* Guide des tailles */}
          {taillesDispos.length > 0 && (
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(26,20,16,0.1)" }}>
              <button onClick={() => setGuideOpen(v => !v)} style={{ width: "100%", padding: "11px 14px", background: guideOpen ? "#1a1410" : "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <IconSize />
                  <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase", color: guideOpen ? "#c49a4a" : "#1a1410" }}>Guide des tailles</span>
                </div>
                <span style={{ fontSize: 18, color: guideOpen ? "#c49a4a" : "#1a1410", transition: "transform 0.2s", transform: guideOpen ? "rotate(45deg)" : "none", fontWeight: 300 }}>+</span>
              </button>
              {guideOpen && (
                <div style={{ background: "#fff", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 280 }}>
                    <thead>
                      <tr style={{ background: "#f9f6f2" }}>
                        {["Taille","Poids","Poitrine","Longueur"].map(h => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "center", fontSize: 9, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {GUIDE_TAILLES.map((row, i) => (
                        <tr key={row.taille} style={{ borderTop: "1px solid rgba(26,20,16,0.05)", background: i % 2 === 0 ? "#fff" : "#faf7f4" }}>
                          <td style={{ padding: "9px 10px", fontWeight: 900, color: "#c49a4a", fontSize: 13, textAlign: "left" }}>{row.taille}</td>
                          <td style={{ padding: "9px 10px", color: "rgba(26,20,16,0.6)", fontSize: 12, textAlign: "center" }}>{row.poids}</td>
                          <td style={{ padding: "9px 10px", color: "rgba(26,20,16,0.6)", fontSize: 13, fontWeight: 700, textAlign: "center" }}>{row.poitrine}</td>
                          <td style={{ padding: "9px 10px", color: "rgba(26,20,16,0.6)", fontSize: 13, fontWeight: 700, textAlign: "center" }}>{row.longueur}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: "7px 12px", fontSize: 11, color: "rgba(26,20,16,0.4)", background: "#f9f6f2" }}>En cas de doute, prenez la taille supérieure.</div>
                </div>
              )}
            </div>
          )}

          {/* Quantité */}
          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>Quantité</span>
            <div style={{ display: "flex", alignItems: "center", background: "#fff", borderRadius: 12, padding: 4, width: "fit-content", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 20, display: "grid", placeItems: "center", color: "#1a1410" }}>−</button>
              <span style={{ width: 40, textAlign: "center", fontWeight: 900, fontSize: 16, color: "#1a1410" }}>{qty}</span>
              <button onClick={() => setQty(Math.min(Number(product.stock ?? 10), qty + 1))} style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 20, display: "grid", placeItems: "center", color: "#1a1410" }}>+</button>
            </div>
          </div>

          {/* CTA */}
          <div style={{ display: "grid", gap: 10 }}>
            <button onClick={handleAddToCart} disabled={outTaille}
              style={{ padding: "17px 24px", borderRadius: 16, border: "none", fontWeight: 900, fontSize: "clamp(14px,1.3vw,17px)", cursor: outTaille ? "not-allowed" : "pointer", background: added ? "#2d6a2d" : outTaille ? "#d1cdc8" : "#1a1410", color: added ? "#fff" : outTaille ? "#9ca3af" : "#f2ede6", transition: "all 0.2s" }}>
              {added ? "✓ Ajouté au panier !" : outTaille ? "Épuisé" : `Ajouter — ${(Number(displayPrice) * qty).toFixed(2)} €`}
            </button>
            {cartCount > 0 && (
              <Link href="/panier" style={{ padding: "13px 24px", borderRadius: 16, border: "2px solid #1a1410", fontWeight: 800, fontSize: 14, textDecoration: "none", color: "#1a1410", textAlign: "center", display: "block" }}>
                Voir le panier ({cartCount})
              </Link>
            )}
          </div>

          {/* Réassurance */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { Icon: IconLeaf,   label: "100% Bambou OEKO-TEX"     },
              { Icon: IconTruck,  label: "Livraison offerte dès 60€" },
              { Icon: IconReturn, label: "Retour gratuit 15 jours"   },
              { Icon: IconLock,   label: "Paiement sécurisé Stripe"  },
            ].map(r => (
              <div key={r.label} style={{ padding: "9px 11px", borderRadius: 10, background: "#fff", display: "flex", alignItems: "center", gap: 7, fontSize: "clamp(10px,0.9vw,12px)", fontWeight: 700, color: "rgba(26,20,16,0.65)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", whiteSpace: "nowrap" }}>
                <r.Icon />{r.label}
              </div>
            ))}
          </div>

          {/* ── LA VRAIE RAISON ── */}
          {whyResult && (
            <div style={{ padding: "20px 22px", borderRadius: 16, background: "#fff", border: "1px solid rgba(26,20,16,0.07)" }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 4 }}>La vraie raison</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,20,16,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Pourquoi ce produit existe</div>
              <p style={{ margin: 0, fontSize: "clamp(13px,1.1vw,14px)", color: "rgba(26,20,16,0.7)", lineHeight: 1.8 }}>{whyResult.why}</p>
            </div>
          )}

          {/* ── CE QUE TU OBTIENS ── */}
          {whyResult && (
            <div style={{ padding: "20px 22px", borderRadius: 16, background: "rgba(196,154,74,0.07)", border: "1px solid rgba(196,154,74,0.18)" }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 4 }}>Ce que tu obtiens</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,20,16,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Le résultat</div>
              <p style={{ margin: 0, fontSize: "clamp(13px,1.1vw,14px)", color: "rgba(26,20,16,0.7)", lineHeight: 1.8, fontWeight: 600 }}>{whyResult.result}</p>
            </div>
          )}

          {/* ── CONSEILS D'ENTRETIEN ── */}
          <div style={{ padding: "18px 20px", borderRadius: 16, background: "#fff", border: "1px solid rgba(26,20,16,0.07)" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "clamp(13px,1.2vw,15px)", fontWeight: 950, color: "#1a1410" }}>Conseils d'entretien</h3>
            <div style={{ marginBottom: 10, fontSize: 12, color: "rgba(26,20,16,0.45)", fontWeight: 600 }}>95 % viscose de bambou · 5 % élasthanne · OEKO-TEX Standard 100</div>
            {[
              { Icon: IconThermometer, text: "Lavage 40°C, cycle délicat"       },
              { Icon: IconBan,         text: "Sans adoucissant ni javel"         },
              { Icon: IconFlat,        text: "Séchage à l'air libre recommandé" },
              { Icon: IconHeat,        text: "Sèche-linge basse température"     },
            ].map(item => (
              <div key={item.text} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <div style={{ flexShrink: 0 }}><item.Icon /></div>
                <span style={{ fontSize: "clamp(12px,1vw,13px)", color: "rgba(26,20,16,0.65)", lineHeight: 1.4 }}>{item.text}</span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── BAS DE PAGE ── */}
      <div style={{ maxWidth: 1800, margin: "0 auto", padding: "0 4vw 80px" }}>

        {/* ── CLIENTS + PHILOSOPHIE côte à côte ── */}
        <div className="bottom-grid" style={{ marginBottom: 24 }}>

          {/* Clients ont aussi acheté */}
          {related.length > 0 && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 8 }}>Complétez votre collection</div>
                <h2 style={{ margin: 0, fontSize: "clamp(18px,2vw,24px)", fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>Les clients ont aussi acheté</h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
                {related.map((p: any) => (
                  <Link key={p.id} href={`/produits/${p.slug}`}
                    style={{ textDecoration: "none", color: "inherit", borderRadius: 14, overflow: "hidden", background: "#fff", border: "1px solid rgba(26,20,16,0.07)", display: "block", transition: "transform 0.2s, box-shadow 0.2s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 12px 32px rgba(0,0,0,0.1)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ""; (e.currentTarget as HTMLAnchorElement).style.boxShadow = ""; }}>
                    <div style={{ position: "relative", aspectRatio: "3/4", background: "#ede8df" }}>
                      {p.image_url ? <Image src={p.image_url} alt={p.name} fill sizes="200px" style={{ objectFit: "cover" }} /> : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 20, fontWeight: 950, color: "#c8bfb2" }}>M!LK</div>}
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4, color: "#1a1410", lineHeight: 1.3 }}>{p.name}</div>
                      <div style={{ fontWeight: 950, fontSize: 15, color: "#1a1410" }}>{Number(p.price_ttc).toFixed(2)} €</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Philosophie M!LK */}
          {philosophy && (
            <div style={{ padding: "24px 26px", borderRadius: 20, background: "#2a2018", height: "fit-content" }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 6 }}>Philosophie M!LK</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(242,237,230,0.3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Comment ça réduit ta charge mentale</div>
              <p style={{ margin: 0, fontSize: "clamp(13px,1.1vw,14px)", color: "rgba(242,237,230,0.7)", lineHeight: 1.85, whiteSpace: "pre-line" }}>{philosophy}</p>
            </div>
          )}

        </div>

        {/* ── FAQ ── */}
        <div style={{ padding: "24px 28px", borderRadius: 20, background: "#2a2018" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: "clamp(16px,1.8vw,20px)", fontWeight: 950, color: "#f2ede6" }}>Questions fréquentes</h3>
          {FAQ.map(item => <FaqItem key={item.q} q={item.q} r={item.r} />)}
        </div>

      </div>

      {/* Mobile CTA fixe */}
      <div className="mobile-cta-bar" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, padding: "12px 16px", background: "rgba(245,240,232,0.97)", backdropFilter: "blur(8px)", borderTop: "1px solid rgba(26,20,16,0.1)" }}>
        <button onClick={handleAddToCart} disabled={outTaille}
          style={{ width: "100%", padding: "17px", borderRadius: 14, border: "none", fontWeight: 900, fontSize: 17, cursor: outTaille ? "not-allowed" : "pointer", background: added ? "#2d6a2d" : outTaille ? "#d1cdc8" : "#1a1410", color: "#f2ede6" }}>
          {added ? "✓ Ajouté !" : outTaille ? "Épuisé" : `Ajouter — ${(Number(displayPrice) * qty).toFixed(2)} €`}
        </button>
      </div>
      <style>{`.mobile-cta-bar{display:none!important}@media(max-width:900px){.mobile-cta-bar{display:block!important}}`}</style>
    </div>
  );
}