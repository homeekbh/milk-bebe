-- ═══════════════════════════════════════════════════════════════════════════
-- M!LK — Descriptions SEO différenciées des 14 produits publiés  (Lot SEO-Contenu, 17/08/2026)
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️  NON EXÉCUTÉ — script versionné, lancé À LA MAIN dans Supabase Studio par Bou
--     (convention dépôt, cf. migrations 025/026/027). Claude Code n'exécute jamais de SQL.
--     Composition 95 % viscose de bambou / 5 % élasthanne confirmée par Bou pour les 14 (17/08).
-- ⚠️  Supabase Studio n'affiche que le résultat de la DERNIÈRE instruction d'un lot :
--     lancez la SECTION 1 seule (constat avant), puis la SECTION 2 (les 14 UPDATE),
--     puis la SECTION 3 seule (vérification après). Une requête = un onglet pour les SELECT.
-- Règles appliquées : 60-90 mots/desc FR, aucune phrase partagée, 95 % viscose de bambou
--     + 5 % élasthanne, certifié OEKO-TEX Standard 100 ; interdits (« 100 % bambou », « bio »,
--     « naturel » seul, « fabriqué en France »…) exclus ; typo « bamboo » corrigée sur le
--     bandeau ; description_en de « gigoteuse » (Terracotta) remplie (était NULL).
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── SECTION 1 — CONSTAT AVANT (lecture seule) ───────────────────────────────
SELECT id, slug, name, description, description_en, seo_title, seo_description
FROM products
WHERE published = true
ORDER BY position;


-- ─── SECTION 2 — ÉCRITURE : un UPDATE par produit (14) ───────────────────────

UPDATE products SET
  description     = $md$Le change de 3 heures du matin ne devrait réveiller personne. Ce pyjama bébé bambou s'ouvre grâce à un double zip inversé : on atteint la couche sans dévêtir le nourrisson ni lutter avec des pressions. La maille 95 % viscose de bambou et 5 % élasthanne glisse sur les peaux qui marquent vite et garde sa souplesse au fil des lavages. Le motif éclair, franc et graphique, tranche avec les imprimés attendus. Certifié OEKO-TEX Standard 100, taillé pour les nuits des 0-6 mois.$md$,
  description_en  = $md$The 3 a.m. change shouldn't wake anyone. This bamboo baby pyjama opens with a double reverse zip, so you reach the nappy without undressing your newborn or fighting with snaps. The 95% bamboo viscose and 5% elastane knit glides over skin that marks easily and keeps its softness wash after wash. The bold, graphic lightning-bolt print breaks from the expected prints. Certified OEKO-TEX Standard 100, cut for 0-6 month nights.$md$,
  seo_title       = $md$Pyjama bébé bambou Éclair — OEKO-TEX 0-6 mois$md$,
  seo_description = $md$Pyjama bébé en bambou certifié OEKO-TEX, motif éclair. Double zip inversé pour changer bébé la nuit sans le réveiller. 95 % viscose de bambou, 0-6 mois.$md$
WHERE slug = 'pyjama-bambou-eclair';

UPDATE products SET
  description     = $md$Certains tissus grattent et bébé le fait savoir vite. Ici, la maille 95 % viscose de bambou et 5 % élasthanne reste fluide contre la peau, du cou jusqu'aux pieds. Ce pyjama bébé bambou accompagne la sieste comme la nuit, et se superpose sous une gigoteuse quand la chambre fraîchit. Les petits smileys, discrets et joyeux, plaisent autant aux parents qu'aux visiteurs penchés sur le berceau. Certifié OEKO-TEX Standard 100, coupe pensée pour gigoter sans entrave, de la naissance à 6 mois.$md$,
  description_en  = $md$Some fabrics scratch, and babies say so fast. Here the 95% bamboo viscose and 5% elastane knit stays fluid against the skin, from neck to toes. This bamboo baby pyjama carries you through naps and nights, and layers under a sleep bag when the room cools. The small, cheerful smiley print wins over parents and visitors leaning over the crib alike. Certified OEKO-TEX Standard 100, cut to wriggle freely, from birth to 6 months.$md$,
  seo_title       = $md$Pyjama bébé bambou Smileys — OEKO-TEX 0-6 mois$md$,
  seo_description = $md$Pyjama bébé bambou certifié OEKO-TEX, motif smileys. Maille fluide du cou aux pieds pour la sieste et la nuit. 95 % viscose de bambou, naissance à 6 mois.$md$
WHERE slug = 'pyjama-bambou-smileys';

UPDATE products SET
  description     = $md$Trouver un pyjama qui ne verse ni dans le rose ni dans le bleu tient parfois du parcours. Le damier graphique règle la question : franchement mixte, il habille une chambre sobre comme une photo de naissance. Sous la douceur, une maille respirante 95 % viscose de bambou et 5 % élasthanne qui suit les gigotements sans se déformer. Ce pyjama bébé bambou s'enfile vite le soir et s'ouvre entièrement pour le change. Certifié OEKO-TEX Standard 100, un cadeau qui ne se trompe jamais de destinataire, 0-6 mois.$md$,
  description_en  = $md$Finding a pyjama that leans neither pink nor blue can be a quest. The graphic checkerboard settles it: firmly unisex, at home in a calm nursery or a birth photo. Beneath the softness, a breathable 95% bamboo viscose and 5% elastane knit that follows every wriggle without losing shape. This bamboo pyjama slips on quickly at night and opens fully for changes. Certified OEKO-TEX Standard 100, a gift that never picks the wrong baby, 0-6 months.$md$,
  seo_title       = $md$Pyjama bébé bambou Damier mixte — OEKO-TEX 0-6 mois$md$,
  seo_description = $md$Pyjama bébé bambou certifié OEKO-TEX, damier graphique mixte. S'ouvre entièrement pour le change. 95 % viscose de bambou, respirant, idée cadeau 0-6 mois.$md$
WHERE slug = 'pyjama-bambou-damier';

UPDATE products SET
  description     = $md$Une garde-robe de nourrisson qui s'accorde d'elle-même, voilà ce que promet ce pyjama uni côtelé. Le terracotta chaud se marie avec les motifs comme avec les unis, et traverse les saisons sans lasser. La côte fine, en 95 % viscose de bambou et 5 % élasthanne, retient un peu de tiédeur tout en laissant la peau respirer. Ce pyjama bébé bambou devient vite celui qu'on réclame quand les autres sèchent encore. Certifié OEKO-TEX Standard 100, une base intemporelle pour les 0-6 mois.$md$,
  description_en  = $md$A newborn wardrobe that coordinates on its own — that's the promise of this ribbed solid pyjama. Warm terracotta pairs with prints and plains alike and carries through the seasons without tiring. The fine rib, in 95% bamboo viscose and 5% elastane, holds a little warmth while letting skin breathe. This bamboo baby pyjama soon becomes the one you reach for while the others are still drying. Certified OEKO-TEX Standard 100, a timeless base for 0-6 months.$md$,
  seo_title       = $md$Pyjama bébé bambou Terracotta côtelé — OEKO-TEX$md$,
  seo_description = $md$Pyjama bébé bambou certifié OEKO-TEX, uni côtelé terracotta. Base intemporelle qui s'accorde à tout, 95 % viscose de bambou. Respirant, 0-6 mois naissance.$md$
WHERE slug = 'pyjama-bambou-uni';

UPDATE products SET
  description     = $md$Le body, on l'enfile et on le retire dix fois par jour : autant qu'il soit doux et vite mis. Ce body bambou ouvre une encolure enveloppe qui passe par les épaules plutôt que de forcer sur la tête. La maille 95 % viscose de bambou et 5 % élasthanne se porte à même la peau, sous un pyjama ou seule les jours doux. Le motif éclair réveille la pile de bodies unis du tiroir. Certifié OEKO-TEX Standard 100, l'essentiel du quotidien des 0-6 mois.$md$,
  description_en  = $md$You pull a bodysuit on and off ten times a day, so it had better be soft and quick. This bamboo bodysuit has an envelope neckline that slides over the shoulders instead of forcing over the head. The 95% bamboo viscose and 5% elastane knit sits right against the skin, under a pyjama or alone on mild days. The lightning-bolt print wakes up the drawer of plain bodysuits. Certified OEKO-TEX Standard 100, the everyday essential for 0-6 months.$md$,
  seo_title       = $md$Body bébé bambou Éclair — encolure enveloppe OEKO-TEX$md$,
  seo_description = $md$Body bambou certifié OEKO-TEX, motif éclair. Encolure enveloppe qui passe par les épaules, sans forcer la tête. 95 % viscose de bambou, quotidien 0-6 mois.$md$
WHERE slug = 'body-bambou-eclair';

UPDATE products SET
  description     = $md$Entre deux changes, un body qui claque vite fait gagner de précieuses minutes. Les pressions alignées de ce body bambou se ferment d'une main, même à moitié réveillé. Sa maille 95 % viscose de bambou et 5 % élasthanne laisse la peau respirer sous les couches d'hiver et suffit seule quand il fait doux. Les smileys sèment de la bonne humeur sur le tapis d'éveil. Certifié OEKO-TEX Standard 100, taillé large aux cuisses pour la couche, de la naissance à 6 mois.$md$,
  description_en  = $md$Between changes, a bodysuit that snaps shut fast buys back precious minutes. The aligned press-studs on this bamboo bodysuit close one-handed, even half awake. Its 95% bamboo viscose and 5% elastane knit lets skin breathe under winter layers and stands alone when it's mild. The smiley print scatters good cheer across the play mat. Certified OEKO-TEX Standard 100, cut roomy at the thighs for the nappy, from birth to 6 months.$md$,
  seo_title       = $md$Body bébé bambou Smileys — pressions OEKO-TEX 0-6 mois$md$,
  seo_description = $md$Body bambou certifié OEKO-TEX, motif smileys. Pressions qui se ferment d'une main, coupe large pour la couche. 95 % viscose de bambou, naissance à 6 mois.$md$
WHERE slug = 'body-bambou-smileys';

UPDATE products SET
  description     = $md$Offrir un body sans connaître le rose ou le bleu attendu ? Le damier tranche : graphique, mixte, il va à tous les berceaux. Ce body bambou se glisse sous une salopette l'hiver et se porte seul aux beaux jours, toujours en contact direct avec la peau. Sa maille 95 % viscose de bambou et 5 % élasthanne suit les roulades sans remonter sur le ventre. Certifié OEKO-TEX Standard 100, un cadeau de naissance sûr pour les 0-6 mois, avec un motif qui sort du lot.$md$,
  description_en  = $md$Giving a bodysuit without knowing the expected pink or blue? The checkerboard decides: graphic, unisex, right for any crib. This bamboo bodysuit slides under dungarees in winter and stands alone in fine weather, always in direct contact with the skin. Its 95% bamboo viscose and 5% elastane knit follows every roll without riding up over the tummy. Certified OEKO-TEX Standard 100, a safe newborn gift for 0-6 months, with a print that stands out.$md$,
  seo_title       = $md$Body bébé bambou Damier mixte — OEKO-TEX 0-6 mois$md$,
  seo_description = $md$Body bambou certifié OEKO-TEX, damier mixte. Reste en place sans remonter sur le ventre. 95 % viscose de bambou, cadeau naissance mixte 0-6 mois.$md$
WHERE slug = 'body-bambou-damier';

UPDATE products SET
  description     = $md$Fini les pressions qu'on rate à tâtons dans le noir. Cette gigoteuse à nouer se ferme par deux liens sur le côté : on ajuste l'ouverture au tour de bébé, puis on la desserre au fil des mois sans racheter. La maille 95 % viscose de bambou et 5 % élasthanne enveloppe sans étouffer, pour un sommeil au frais. Le motif éclair habille le lit d'un trait graphique. Certifiée OEKO-TEX Standard 100, pensée pour accompagner les nuits des 0-6 mois.$md$,
  description_en  = $md$No more press-studs you fumble for in the dark. This tie-up baby sleep bag closes with two side ties: set the opening to your baby's girth, then loosen it over the months without buying another. The 95% bamboo viscose and 5% elastane knit wraps without stifling, for cool, settled sleep. The lightning-bolt print dresses the cot with a graphic line. Certified OEKO-TEX Standard 100, made to see 0-6 month nights through.$md$,
  seo_title       = $md$Gigoteuse à nouer bébé bambou Éclair — OEKO-TEX$md$,
  seo_description = $md$Gigoteuse à nouer en bambou certifié OEKO-TEX, motif éclair. Deux liens réglables qui suivent le tour de bébé. 95 % viscose de bambou, nuits 0-6 mois.$md$
WHERE slug = 'gigoteuse-eclair';

UPDATE products SET
  description     = $md$Une gigoteuse à nouer se règle là où une taille fixe coince : les liens latéraux s'ajustent au tour de bébé et suivent ses semaines de croissance. Celle-ci enveloppe dans une maille 95 % viscose de bambou et 5 % élasthanne qui évacue l'humidité et évite la surchauffe des petits dormeurs agités. Les smileys veillent, discrets, sur le tour de lit. Sans capuche ni cordon superflu, elle laisse les bras libres de bouger. Certifiée OEKO-TEX Standard 100, pour les 0-6 mois.$md$,
  description_en  = $md$A tie-up baby sleep bag adjusts where a fixed size fails: the side ties set to your baby's girth and keep up with the growing weeks. This one wraps in a 95% bamboo viscose and 5% elastane knit that wicks moisture and spares restless little sleepers from overheating. The smiley print keeps quiet watch around the cot. With no hood or spare cord, it leaves the arms free to move. Certified OEKO-TEX Standard 100, for 0-6 months.$md$,
  seo_title       = $md$Gigoteuse à nouer bébé bambou Smileys — OEKO-TEX$md$,
  seo_description = $md$Gigoteuse à nouer en bambou certifié OEKO-TEX, motif smileys. Liens latéraux réglables, maille qui évacue l'humidité. 95 % viscose de bambou, 0-6 mois.$md$
WHERE slug = 'gigoteuse-smileys';

UPDATE products SET
  description     = $md$Le premier cadeau qui compte vraiment, c'est souvent celui du sommeil. Cette gigoteuse à nouer s'ajuste par deux liens plutôt que par des pressions qu'on rate la nuit, et grandit avec bébé sans se remplacer. Son damier graphique, franchement mixte, va à tous les berceaux. La maille 95 % viscose de bambou et 5 % élasthanne garde une tiédeur douce sans peser sur les jambes. Certifiée OEKO-TEX Standard 100, elle installe le rituel du coucher de la naissance à 6 mois.$md$,
  description_en  = $md$The first gift that truly counts is often the gift of sleep. This tie-up baby sleep bag sets with two ties rather than press-studs you miss at night, and grows with your baby instead of being replaced. Its graphic checkerboard, firmly unisex, suits any crib. The 95% bamboo viscose and 5% elastane knit keeps a gentle warmth without weighing on the legs. Certified OEKO-TEX Standard 100, a bedtime ritual from birth to 6 months.$md$,
  seo_title       = $md$Gigoteuse à nouer bébé bambou Damier — OEKO-TEX$md$,
  seo_description = $md$Gigoteuse à nouer en bambou certifié OEKO-TEX, damier mixte. Deux liens réglables qui grandissent avec bébé. 95 % viscose de bambou, cadeau 0-6 mois.$md$
WHERE slug = 'gigoteuse-damier';

UPDATE products SET
  description     = $md$Le terracotta réchauffe la chambre sans crier fort : une teinte qui traverse les modes et s'accorde aux draps comme aux murs. Cette gigoteuse à nouer terracotta se règle par deux liens latéraux, ajustables aux semaines de bébé, là où une taille unique finirait trop grande puis trop juste. La côte 95 % viscose de bambou et 5 % élasthanne enveloppe dans une tiédeur respirante, sans surchauffe. Ni capuche, ni pression à trouver dans le noir. Certifiée OEKO-TEX Standard 100, pour le sommeil des 0-6 mois.$md$,
  description_en  = $md$Terracotta warms the nursery without shouting: a shade that outlasts trends and sits well with sheets and walls alike. This tie-up terracotta baby sleep bag sets with two side ties, adjustable to your baby's weeks, where a single size would run too big then too tight. The 95% bamboo viscose and 5% elastane rib wraps in a breathable warmth, with no overheating. No hood, no press-stud to find in the dark. Certified OEKO-TEX Standard 100, for 0-6 month sleep.$md$,
  seo_title       = $md$Gigoteuse à nouer bébé bambou Terracotta — OEKO-TEX$md$,
  seo_description = $md$Gigoteuse à nouer terracotta en bambou certifié OEKO-TEX. Deux liens réglables, côte respirante sans surchauffe. 95 % viscose de bambou, sommeil 0-6 mois.$md$
WHERE slug = 'gigoteuse';

UPDATE products SET
  description     = $md$Un carré, dix usages, et il ne quitte plus le sac à langer. Ce lange bambou de 120 × 120 cm emmaillote un nouveau-né, protège l'épaule d'un rot, tamise la lumière au-dessus de la poussette ou sert de tapis d'appoint au sol. La mousseline 95 % viscose de bambou et 5 % élasthanne s'assouplit à chaque lavage et gagne en absorption. Le terracotta uni reste sobre en toutes circonstances. Certifié OEKO-TEX Standard 100, un basique qui suit bébé bien au-delà des 6 mois.$md$,
  description_en  = $md$One square, ten uses, and it never leaves the changing bag. This 120 × 120 cm bamboo muslin swaddles a newborn, guards a shoulder from spit-up, softens the light above the pram or doubles as a spare floor mat. The 95% bamboo viscose and 5% elastane muslin softens with every wash and grows more absorbent. The solid terracotta stays understated in any setting. Certified OEKO-TEX Standard 100, a staple that follows baby well past 6 months.$md$,
  seo_title       = $md$Lange bambou 120x120 Terracotta — mousseline OEKO-TEX$md$,
  seo_description = $md$Lange bambou 120 × 120 cm certifié OEKO-TEX, terracotta. Emmaillotage, rot, ombre poussette : dix usages. 95 % viscose de bambou, mousseline multi-usage.$md$
WHERE slug = 'lange-bambou-terracotta';

UPDATE products SET
  description     = $md$Les premiers jours, la tête d'un nouveau-né perd vite sa chaleur : un bonnet doux change le confort de la maternité au retour à la maison. Celui-ci épouse le crâne d'une coupe anatomique, sans point qui serre le front. La côte 95 % viscose de bambou et 5 % élasthanne s'étire juste ce qu'il faut pour tenir sans marquer. Le terracotta se glisse dans la valise de naissance et s'accorde aux tenues comme aux langes. Certifié OEKO-TEX Standard 100, pour les tout premiers mois, 0-6 mois.$md$,
  description_en  = $md$In the first days, a newborn's head loses warmth quickly: a soft hat changes the comfort from the maternity ward to the trip home. This one hugs the head in an anatomical cut, with nothing tight across the forehead. The 95% bamboo viscose and 5% elastane rib stretches just enough to stay put without leaving a mark. The terracotta tucks into the birth bag and pairs with outfits and swaddles. Certified OEKO-TEX Standard 100, for the very first months, 0-6 months.$md$,
  seo_title       = $md$Bonnet naissance bambou Terracotta — OEKO-TEX 0-6 mois$md$,
  seo_description = $md$Bonnet naissance en bambou certifié OEKO-TEX, terracotta. Coupe anatomique qui tient sans marquer le front. 95 % viscose de bambou, premiers mois 0-6 mois.$md$
WHERE slug = 'bonnet-bambou-terracotta';

UPDATE products SET
  description     = $md$Enfin un bandeau qui reste en place au lieu de glisser sur les yeux au premier mouvement. Le sien tient par la souplesse de la maille, sans élastique serré qui creuse le front. Noué d'un petit nœud sur le côté, il finit une tenue de naissance en une seconde. La côte 95 % viscose de bambou et 5 % élasthanne épouse la tête sans la comprimer et garde sa forme au lavage. Le terracotta se marie aux bonnets comme aux langes. Certifié OEKO-TEX Standard 100, pour les 0-6 mois.$md$,
  description_en  = $md$At last, a headband that stays put instead of sliding over the eyes at the first wriggle. This one holds through the give of the knit, with no tight elastic digging into the forehead. Tied with a small knot at the side, it finishes a newborn outfit in a second. The 95% bamboo viscose and 5% elastane rib hugs the head without pressing and keeps its shape in the wash. The terracotta pairs with hats and swaddles. Certified OEKO-TEX Standard 100, for 0-6 months.$md$,
  seo_title       = $md$Bandeau nœud bébé bambou Terracotta — OEKO-TEX$md$,
  seo_description = $md$Bandeau nœud en bambou certifié OEKO-TEX, terracotta. Tient sans glisser ni comprimer le front, côte souple. 95 % viscose de bambou, accessoire naissance.$md$
WHERE slug = 'bandeau-noeud-terracotta';


-- ─── SECTION 3 — VÉRIFICATION APRÈS (identique à la Section 1) ────────────────
SELECT id, slug, name, description, description_en, seo_title, seo_description
FROM products
WHERE published = true
ORDER BY position;
