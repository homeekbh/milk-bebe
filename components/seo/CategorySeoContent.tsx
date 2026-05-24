/**
 * Bloc de contenu SEO 300+ mots par catégorie, affiché en bas de la page
 * /categorie/[slug]. Textes uniques par catégorie pour éviter le content
 * dupliqué entre catégories tout en injectant des mots-clés longue-traîne
 * pertinents (gigoteuse bambou, turbulette, grenouillère, lange bambou, etc.).
 *
 * Style aligné sur le thème site : fond #1a1410, texte crème #f2ede6,
 * accent #c49a4a.
 */

type SeoBlock = { title: string; paragraphs: string[] };

const CONTENT: Record<string, SeoBlock> = {
  gigoteuses: {
    title: "Gigoteuse bambou bébé — le secret d'une nuit apaisée",
    paragraphs: [
      "La gigoteuse bambou est devenue la pièce incontournable des premiers mois. Plus sûre que la couette — interdite avant 12 mois selon les recommandations pédiatriques — la gigoteuse à nouer M!LK enveloppe bébé sans risque d'étouffement tout en laissant ses bras libres et ses jambes à l'aise. La turbulette bambou remplace le drap et la couverture par un sac de couchage bébé unique, qui reste en place toute la nuit même quand votre nourrisson bouge.",
      "La fibre de bambou apporte une régulation thermique naturelle que le coton classique ne peut pas offrir. Le tissu absorbe l'humidité 3× plus vite, évacue la chaleur excédentaire et conserve la température corporelle stable, ce qui réduit considérablement les réveils liés à la surchauffe ou aux sueurs nocturnes. Cette gigoteuse OEKO-TEX convient aussi bien aux nuits d'été qu'aux saisons fraîches grâce à sa respirabilité exceptionnelle.",
      "Chaque gigoteuse M!LK est certifiée OEKO-TEX Standard 100, la norme textile la plus stricte au monde, qui teste plus de 100 substances nocives. Les peaux atopiques, sensibles ou sujettes à l'eczéma profitent pleinement du bambou hypoallergénique et naturellement antibactérien. Disponible en taille 0-3 mois et 3-6 mois, avec un système à nouer qui s'ouvre d'une main dans le noir — pensé pour les changes nocturnes silencieux.",
      "Nos motifs unisexes (Éclair, Smileys, Damier, Terracotta) ont été dessinés pour s'affranchir des codes genrés bleu-rose et accompagner bébé du quotidien à la sortie. La gigoteuse à nouer M!LK est aussi une idée cadeau naissance utile et durable — celle qui sera utilisée tous les soirs pendant 6 mois, pas oubliée au fond d'un tiroir.",
    ],
  },
  pyjamas: {
    title: "Pyjama bambou bébé — douceur et liberté de mouvement",
    paragraphs: [
      "Le pyjama bambou bébé combine deux exigences difficiles à concilier : une douceur extrême pour la peau ultra-fine du nourrisson, et une vraie tenue qui suit les mouvements sans tirer, comprimer ou bouloucher. Notre grenouillère bambou est conçue avec un stretch 4 directions qui s'adapte au corps en pleine croissance, et des coutures plates qui éliminent les frottements pendant le sommeil.",
      "Le bambou est 3× plus doux que le coton classique parce que ses microfibres sont naturellement rondes, sans aspérités. Pour un dors-bien bébé porté 10 à 14 heures par jour, cette différence de douceur transforme l'expérience tactile du nourrisson. Le tissu reste également plus frais en été et plus chaud en hiver, grâce à la thermorégulation passive du bambou, ce qui en fait un pyjama bébé 4 saisons.",
      "Notre grenouillère naissance intègre un double zip inversé pour le change nocturne — fini les boutons-pression à aligner à 3h du matin pendant que bébé pleure. Le change se fait par le bas pour conserver le buste au chaud, et le zip remonte sans réveiller le nourrisson. Des moufles pliables intégrées protègent les petites mains des griffures pendant les semaines sensibles, puis se replient quand bébé apprend à attraper.",
      "Tous nos pyjamas bébé nouveau-né sont certifiés OEKO-TEX Standard 100. Disponibles en tailles Naissance, 0-3 mois et 3-6 mois, avec des motifs modernes unisexes pensés pour les parents qui cherchent autre chose que des oursons pastel. Pyjama bébé pratique, durable, beau — sans compromis.",
    ],
  },
  bodies: {
    title: "Body bébé bambou — la base de toute garde-robe 0-6 mois",
    paragraphs: [
      "Le body bébé bambou est la première couche de la garde-robe nourrisson, celle qu'on enfile au réveil et qu'on retire au coucher — parfois plusieurs fois par jour à cause des fuites et régurgitations. C'est pour ça qu'on en a besoin de beaucoup, et qu'on veut qu'ils soient impeccables : doux pour la peau, faciles à enfiler, durables au lavage. Notre body OEKO-TEX répond à ces trois critères sans compromis.",
      "Le bambou est naturellement antibactérien, ce qui réduit les odeurs et les irritations sur la peau délicate du nouveau-né. Le tissu respire mieux que le coton et limite la transpiration, ce qui est crucial sur un body bébé porté en couche directe au contact de la peau, parfois pendant 12 heures d'affilée. La fibre est aussi 3× plus douce et plus extensible, donc le body suit les mouvements de bébé sans serrer aux entrejambes ni laisser de marques.",
      "Le col enveloppe élargi se passe sans forcer sur la tête, sans pression sur la fontanelle, et les pressions entre les jambes permettent un change rapide sans tout retirer. Le body bébé manches longues protège la nuit en complément de la gigoteuse, le body manches courtes habille le quotidien dès qu'il fait doux. Nos modèles existent en taille Naissance, 0-3 mois et 3-6 mois pour accompagner les six premiers mois.",
      "Nos motifs Éclair, Smileys et Damier sont unisexes et coordonnés au reste de la collection M!LK — un body bébé mixte qui ne ressemble pas à tous les autres. Idéal en cadeau naissance multiple ou en complément d'une liste de naissance, le body bambou certifié OEKO-TEX est l'investissement le plus rentable des premiers mois.",
    ],
  },
  langes: {
    title: "Lange bambou bébé — multifonction et ultra-absorbant",
    paragraphs: [
      "Le lange bambou bébé est l'accessoire le plus polyvalent de toute la garde-robe nourrisson. Une grande pièce de mousseline bambou (120×120 cm chez M!LK) sert tour à tour à emmailloter, couvrir bébé en poussette, faire un coussin d'allaitement improvisé, un bavoir XXL, un protège-matelas en déplacement, une cape de bain ou une couverture légère. Un seul tissu, des dizaines d'usages quotidiens.",
      "Le bambou possède une capacité d'absorption supérieure de 40% à celle du coton, ce qui en fait la matière idéale pour les langes bébé : un seul carré absorbe une régurgitation entière, sèche vite et reste doux au contact de la peau du nourrisson. La fibre tissée en mousseline bambou crée une trame légère, souple, qui s'assouplit encore à chaque lavage — au contraire de la gaze de coton qui se rigidifie.",
      "Pour l'emmaillotage, la taille XXL est essentielle : elle permet de reproduire la sensation enveloppante du ventre maternel sans glisser à la première agitation. Combinée à un grip texturé léger, notre mousseline bébé bambou reste en place même quand bébé se débat, ce qui apaise les pleurs du soir et facilite l'endormissement. Le tissu est OEKO-TEX Standard 100, lavable en machine à 30°C, et garde sa douceur pendant des années.",
      "Le carré de lange bébé M!LK existe en teinte Terracotta, neutre et chaleureuse, qui passe sur toutes les peaux et se coordonne avec le reste de la collection. C'est aussi le cadeau naissance le plus utile — celui qu'on s'arrache après l'avoir essayé une fois, à offrir en double ou en trio sur une liste de naissance.",
    ],
  },
  accessoires: {
    title: "Accessoires bébé bambou — les petits détails qui font tout",
    paragraphs: [
      "Les accessoires bébé bambou complètent la garde-robe nourrisson par ces détails qui changent vraiment le quotidien : un bonnet bébé bambou qui reste en place sans serrer, un nœud tête bébé qui ne tombe pas, des pièces unisexes qui se coordonnent avec la collection M!LK. Le bonnet naissance reste un essentiel pour les premières semaines : la tête représente environ 20 % de la surface corporelle d'un nouveau-né et constitue sa principale source de perte thermique.",
      "Notre bonnet en bambou est conçu pour épouser la forme du crâne sans pression sur la fontanelle, encore fragile pendant les six premiers mois. La fibre de bambou est naturellement thermorégulante : elle conserve la chaleur quand l'air est frais et reste respirante quand bébé surchauffe. Le tissu OEKO-TEX Standard 100 est garanti sans substance nocive, ce qui est crucial pour un accessoire en contact direct avec la peau du crâne, particulièrement sensible.",
      "Le nœud tête bébé apporte une touche graphique douce et moderne, sans effets compressifs. Plus polyvalent qu'un bandeau plastique, plus chic qu'un simple bonnet, c'est l'accessoire qui transforme une tenue du quotidien en sortie spéciale (baby shower, photo de naissance, premier rendez-vous bébé). Notre version Terracotta, dans la palette signature M!LK, se coordonne avec les bodies, pyjamas et gigoteuses pour des looks complets.",
      "Tous nos accessoires nouveau-né sont fabriqués dans la même fibre bambou certifiée OEKO-TEX que le reste de la collection. Lavables en machine à 30°C, ils conservent leur douceur et leur tenue pendant des mois. Idéal en cadeau de naissance complémentaire ou pour compléter une liste de naissance déjà bien fournie avec des pièces qui sortent du lot.",
    ],
  },
};

// Couleurs alignées sur le thème site (cf. components/shared/MilkDesign.tsx)
const C = {
  bg:    "#1a1410",
  amber: "#c49a4a",
  warm:  "#f2ede6",
  muted: "rgba(242,237,230,0.65)",
};

export function CategorySeoContent({ slug }: { slug: string }) {
  const block = CONTENT[slug];
  if (!block) return null;

  return (
    <section
      aria-label="À propos de la collection"
      style={{
        background: C.bg,
        padding:    "56px 5vw 72px",
        color:      C.warm,
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 14 }}>
          En savoir plus
        </div>
        <h2 style={{
          margin:        "0 0 24px",
          fontSize:      "clamp(22px,3vw,32px)",
          fontWeight:    950,
          letterSpacing: -0.8,
          lineHeight:    1.2,
          color:         C.warm,
        }}>
          {block.title}
        </h2>
        <div style={{ display: "grid", gap: 18 }}>
          {block.paragraphs.map((p, i) => (
            <p key={i} style={{
              margin:     0,
              fontSize:   "clamp(14px,1.4vw,16px)",
              lineHeight: 1.85,
              color:      C.muted,
            }}>
              {p}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
