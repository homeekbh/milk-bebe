-- ════════════════════════════════════════════════════════════════
-- M!LK — Lot P : 2 nouveaux articles de blog EN BROUILLON (status='draft')
-- À exécuter MANUELLEMENT dans Supabase Studio (SQL Editor) — NE PAS publier.
-- Erika relit avant toute publication (passer status='published' + published_at).
--
-- ⚠️ IMAGES — placeholders à remplacer APRÈS upload dans Supabase Storage :
--    Chaque article a 2 images = 1 HERO (colonne image_url, rendue en tête par
--    la page) + 1 INLINE (image markdown dans le corps). NE PAS remettre le hero
--    dans le contenu (sinon double affichage).
--      {{HERO_ARTICLE_3}}   → image_url de l'article 3
--      {{INLINE_ARTICLE_3}} → image markdown dans le corps de l'article 3
--      {{HERO_ARTICLE_4}}   → image_url de l'article 4
--      {{INLINE_ARTICLE_4}} → image markdown dans le corps de l'article 4
--    Une fois les placeholders remplacés, la syntaxe markdown ![alt](url) est valide.
--    (Sources d'images : voir le rapport / la section images.)
--
-- Contenu = markdown (rendu par marked + DOMPurify côté /blog/[slug]).
-- Liens internes PRÉFIXÉS /fr (ex. /fr/categorie/gigoteuses) : un lien sans /fr
-- subit un 301 vers /fr/... (mesuré au curl) → hop inutile pour Google et le
-- visiteur. On diverge volontairement du corpus existant (lui sans /fr) ; la
-- correction du corpus est un lot séparé.
-- Dollar-quoting Postgres ($md$…$md$) → apostrophes françaises sans échappement.
-- ON CONFLICT (slug) DO NOTHING → ré-exécutable sans doublon.
--
-- 🔴 À VALIDER PAR ERIKA AVANT PUBLICATION — une seule phrase du lot touche au
--    sommeil (article « emmaillotage-ou-gigoteuse-a-nouer », section « Pourquoi
--    un nouveau-né a besoin d'être enveloppé ») :
--    « Sentir ses bras doucement contenus atténue ces réveils en sursaut. »
--    Elle décrit la TECHNIQUE d'enveloppement (pas le produit) et est bornée par
--    « beaucoup de nouveau-nés ». À confirmer explicitement, ou retirer.
-- ════════════════════════════════════════════════════════════════

-- ─── ARTICLE 3 ──────────────────────────────────────────────────────────────
INSERT INTO blog_posts (slug, title, excerpt, content, image_url, author, category, status, published_at, seo_title, seo_description)
VALUES (
  'emmaillotage-ou-gigoteuse-a-nouer-nouveau-ne',
  'Emmaillotage ou gigoteuse à nouer : que choisir pour un nouveau-né',
  $md$Emmailloter dans un lange ou enfiler une gigoteuse à nouer ? L'un est une technique, l'autre un vêtement. On explique la différence, sans jargon.$md$,
  $md$Avant même la première nuit à la maison, une question revient : faut-il emmailloter son nouveau-né, ou lui mettre une gigoteuse ? Les deux répondent au même besoin — envelopper bébé — mais ce ne sont pas la même chose. L'un est une **technique**, l'autre un **vêtement**. Voici comment les distinguer.

## Pourquoi un nouveau-né a besoin d'être enveloppé

Pendant les dernières semaines avant la naissance, bébé vit dans un espace réduit, contenu de tous côtés. À la naissance, ce cadre disparaît d'un coup. Beaucoup de nouveau-nés sont plus calmes quand ils retrouvent une sensation d'enveloppement : les bras ramenés près du corps, un contact doux sur le buste. Ça n'a rien de magique et ça ne remplace ni un repas ni un câlin — c'est simplement un repère rassurant pour un tout-petit qui découvre l'espace.

Il y a aussi le réflexe de sursaut, très visible les premières semaines : un bruit, un changement de position, et les bras s'écartent d'un coup. Ce mouvement réveille souvent bébé en pleine nuit. Sentir ses bras doucement contenus atténue ces réveils en sursaut — c'est tout l'intérêt d'envelopper.

Quelle que soit la solution retenue, il est recommandé de coucher bébé **sur le dos**, sur un matelas ferme, sans couette ni oreiller avant un an. En cas de doute, votre sage-femme ou votre pédiatre reste le meilleur repère.

## L'emmaillotage : le principe, et ses limites

Emmailloter, c'est envelopper bébé dans un grand lange, les bras le long du corps, en repliant le tissu de façon ajustée mais souple. Bien fait, ça contient les sursauts et rassure.

Ses limites sont réelles :

- **La technique s'apprend.** Un emmaillotage trop lâche se défait ; trop serré, notamment sur les hanches, il n'est pas conseillé. Les jambes doivent rester libres de bouger.
- **Ça se refait à chaque change.** À 3h du matin, replier correctement un lange autour d'un bébé qui gigote, ce n'est pas l'idéal.
- **Ça a une fin.** Il est généralement recommandé d'arrêter l'emmaillotage dès que bébé commence à se retourner.

Pour emmailloter, il faut surtout un lange assez grand : [un lange en mousseline de bambou](/fr/categorie/langes) de bonne dimension change tout.

## La gigoteuse à nouer : le même effet, sans la technique

La gigoteuse — aussi appelée turbulette, c'est exactement le même vêtement — est un sac de couchage porté par-dessus les vêtements. Elle remplace la couette, déconseillée avant un an. Bébé y est enveloppé sans qu'on ait à replier quoi que ce soit : on l'installe, on ferme, c'est prêt.

La variante **à nouer** ajoute un réglage : au lieu d'une taille figée, on ajuste la longueur avec un nœud. Concrètement :

- Elle **s'ouvre d'une main**, même dans le noir, pour un change de nuit sans tout défaire.
- Elle **s'ajuste** à mesure que bébé grandit, au lieu d'être trop grande puis trop courte.
- Il n'y a **pas de rangée de boutons-pression** à aligner sur un bébé qui bouge.

Le nœud, concrètement : on ferme le bas de la gigoteuse à la longueur voulue. Pour un tout-petit, on raccourcit ; à mesure qu'il grandit, on desserre. Une seule gigoteuse couvre ainsi une plage de tailles plus large qu'un modèle figé — un achat qui dure, au lieu d'être remplacé au bout de six semaines.

C'est la logique de M!LK : moins de gestes, moins de réveils. [Nos gigoteuses à nouer en bambou](/fr/categorie/gigoteuses) sont pensées pour ça.

![Petits pieds de bébé sur une couverture]({{INLINE_ARTICLE_3}})

## Alors, emmaillotage ou gigoteuse à nouer ?

Ce n'est pas vraiment l'un contre l'autre.

- **Les tout premiers temps**, si votre bébé est apaisé par une sensation très enveloppante et que le pliage vous est familier, l'emmaillotage au lange peut convenir.
- **Au quotidien**, la gigoteuse à nouer offre le même bénéfice — l'enveloppement — sans la technique ni le risque de tissu qui se défait la nuit.

Beaucoup de parents utilisent les deux : le lange pour d'autres usages (couvrir la poussette, protéger un matelas à langer), la gigoteuse à nouer pour dormir.

## Jusqu'à quand ?

L'emmaillotage a une fin nette : dès les premiers signes de retournement. La gigoteuse, elle, accompagne bien plus longtemps — on passe simplement à la taille au-dessus. Si vous hésitez sur la taille de départ, [notre guide des tailles](/fr/guide-des-tailles) donne les repères poids/âge.

## Quoi vérifier avant d'acheter

Que vous partiez sur un lange ou une gigoteuse :

- **La matière respire.** Un bébé transpire ; une viscose de bambou (chez M!LK, 95 % viscose de bambou et 5 % élasthanne) évacue mieux l'humidité que le synthétique. Cherchez la certification **OEKO-TEX Standard 100**, qui garantit l'absence des substances nocives testées — ce n'est pas un label bio, c'est une garantie de sécurité chimique.
- **L'encolure ne passe pas par-dessus le menton** sur une gigoteuse : bébé ne doit pas pouvoir glisser à l'intérieur.
- **Les coutures sont plates** et aucune étiquette ne gratte la nuque.
- **Pas de capuche ni d'élément amovible** près du visage.
- **La longueur suit le poids, pas seulement l'âge.** Deux bébés du même âge n'ont pas la même taille : fiez-vous d'abord au repère poids.

Pour le détail taille par taille, [bien choisir une gigoteuse 0-3 mois](/fr/blog/gigoteuse-0-3-mois-comment-bien-choisir) reprend tout, point par point.

En cas de doute sur le sommeil de votre bébé ou sur l'emmaillotage, parlez-en à votre sage-femme, votre pédiatre ou votre professionnel de santé.$md$,
  $md${{HERO_ARTICLE_3}}$md$,
  'Erika', 'Conseils', 'draft', NULL,
  $md$Emmaillotage ou gigoteuse à nouer : que choisir | M!LK$md$,
  $md$Emmaillotage ou gigoteuse à nouer pour votre nouveau-né ? La différence, les limites de chaque, et jusqu'à quand emmailloter — sans jargon.$md$
) ON CONFLICT (slug) DO NOTHING;

-- ─── ARTICLE 4 ──────────────────────────────────────────────────────────────
INSERT INTO blog_posts (slug, title, excerpt, content, image_url, author, category, status, published_at, seo_title, seo_description)
VALUES (
  'vetement-bebe-sans-etiquette-coutures-plates',
  'Sans étiquette, coutures plates : pourquoi ces détails changent tout',
  $md$L'étiquette qui gratte, les coutures en relief, les pressions mal placées : les détails invisibles qui décident si un vêtement est porté sans broncher.$md$,
  $md$On regarde la coupe, le motif, parfois la matière. On regarde rarement l'étiquette cousue dans le cou, ou les coutures à l'intérieur. Pourtant, pour un nouveau-né, ce sont souvent ces détails-là qui décident si un vêtement est porté sans broncher — ou retiré en pleurs. Ce ne sont pas des arguments de vente : ce sont des points de contact permanents avec une peau qui ne pardonne rien.

## Ce que la peau d'un nouveau-né supporte mal

La peau d'un bébé est bien plus fine que la nôtre, et elle réagit à ce qui la touche en permanence. Un vêtement, bébé le porte quasiment 24h/24, à même la peau. Ce qui, pour un adulte, n'est qu'un léger agacement — une étiquette, une couture un peu dure — devient pour lui un inconfort répété, qu'il ne peut pas déplacer lui-même. On ne parle pas de soigner quoi que ce soit : juste de retirer les irritants évitables — ceux qu'on peut supprimer sans rien promettre sur la santé. Pour les peaux réactives, [nos vêtements pensés pour les peaux sensibles](/fr/vetements-bebe-peau-sensible) partent de ce principe.

## L'étiquette qui frotte la nuque

L'étiquette de composition classique est cousue à l'intérieur du col. Sur la nuque d'un nouveau-né — une zone fine, souvent en contact avec le matelas — elle frotte à chaque mouvement de tête. Résultat : des rougeurs, un bébé qui s'agace sans qu'on comprenne pourquoi.

La solution est simple : **pas d'étiquette cousue**. Les informations obligatoires (taille, composition, entretien) peuvent être **imprimées directement sur le tissu**, à plat. Rien ne dépasse, rien ne gratte. C'est ce qu'on appelle un vêtement sans étiquette — l'étiquette existe, mais elle ne se sent pas.

Le test est immédiat : passez un doigt à l'intérieur du col. S'il y a une languette rigide, bébé la sentira encore plus que vous — sa peau est plus fine, et il reste allongé dessus une bonne partie de la journée.

À ne pas confondre avec [savoir lire une étiquette de composition](/fr/blog/lire-etiquettes-textile-bebe) : là, on parle de l'information à décoder ; ici, de l'étiquette physique qui frotte.

## Les coutures en relief

À l'intérieur d'un vêtement, une couture épaisse laisse une marque. Sous les bras, dans le dos, à l'entrejambe, ces reliefs appuient sur la peau quand bébé est allongé.

Les **coutures plates** règlent ça : les deux morceaux de tissu sont assemblés bord à bord, sans surépaisseur. Le test se fait à la main — on passe les doigts à l'intérieur du vêtement : ça doit être lisse. C'est un des premiers réflexes à avoir sur un [body en bambou à encolure enveloppe et coutures plates](/fr/categorie/bodies).

![Petits pieds d'un nouveau-né]({{INLINE_ARTICLE_4}})

## Les pressions mal placées

Les boutons-pression sont pratiques, mais mal placés, ils appuient. Une pression dans le dos, là où bébé s'allonge, c'est un point dur toute la nuit. Deux choses comptent :

- **Le nombre.** Trois pressions bien pensées valent mieux que douze à aligner sur un bébé qui gigote.
- **L'emplacement.** Sur le devant et l'entrejambe (pour le change), jamais sous le dos, là où bébé repose tout son poids.

Un [pyjama sans étiquette qui gratte](/fr/categorie/pyjamas) avec une ouverture par zip inversé évite carrément le problème : on change par le bas, sans rangée de pressions dorsales.

## La bonne taille compte aussi

Un vêtement trop petit tend le tissu et fait ressortir la moindre couture ; trop grand, il plisse et les pressions se retrouvent au mauvais endroit. Le confort commence par la bonne taille — [notre guide des tailles](/fr/guide-des-tailles) donne les repères poids/âge pour viser juste.

## Après plusieurs lavages

Un bon détail de conception tient dans le temps. Une étiquette imprimée ne se recroqueville pas comme une étiquette cousue, qui finit par se border et gratter. Des coutures plates bien faites ne se rigidifient pas au séchage. Et une matière de qualité — une viscose de bambou lavée à 30 °C — reste souple au lieu de bouloucher. Le vrai test d'un vêtement bébé, c'est son dixième lavage, pas le premier.

## Comment vérifier un vêtement, en magasin ou en ligne

Trois gestes, trente secondes :

1. **Retournez-le.** Regardez l'intérieur du col : une étiquette cousue ? Passez le doigt sur les coutures : lisses ou en relief ?
2. **Repérez les pressions.** Comptez-les, vérifiez qu'aucune ne tombe sous le dos.
3. **Touchez la matière.** Elle doit être souple et respirante. Une viscose de bambou (chez M!LK, 95 % viscose de bambou et 5 % élasthanne) reste douce lavage après lavage. Cherchez la certification **OEKO-TEX Standard 100** : elle garantit l'absence des substances nocives testées — une sécurité chimique, pas un label bio.

Ces détails ne se voient pas sur une photo de boutique. Ils se sentent. Et pour un bébé qui porte ses vêtements en continu, ils font la différence entre un vêtement qu'on oublie et un vêtement qu'on retire.$md$,
  $md${{HERO_ARTICLE_4}}$md$,
  'Erika', 'Conseils', 'draft', NULL,
  $md$Vêtement bébé sans étiquette : pourquoi ça compte | M!LK$md$,
  $md$Étiquette qui gratte, coutures en relief, pressions mal placées : pourquoi un vêtement bébé sans étiquette change le confort. On détaille.$md$
) ON CONFLICT (slug) DO NOTHING;

-- Vérif rapide après exécution :
--   select slug, status, category, left(title,40) from blog_posts
--   where slug in ('emmaillotage-ou-gigoteuse-a-nouer-nouveau-ne','vetement-bebe-sans-etiquette-coutures-plates');
