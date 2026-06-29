-- ════════════════════════════════════════════════════════════════
-- M!LK — Blog Vague 2 : 5 nouveaux articles (B4 → B8)
-- À exécuter MANUELLEMENT dans Supabase Studio AVANT update-articles-C.sql
-- (la Partie C lie vers ces articles). ON CONFLICT (slug) DO NOTHING.
-- image_url = NULL : Erika ajoute les visuels via l'admin si souhaité.
-- ════════════════════════════════════════════════════════════════

INSERT INTO blog_posts (slug, title, excerpt, content, author, category, status, published_at, seo_title, seo_description) VALUES (
  'premier-hiver-bebe-habiller',
  'Premier hiver de bébé : comment l''habiller',
  'Le premier hiver de bébé sans surchauffer ni avoir froid : la règle des couches, la bonne gigoteuse, et pourquoi le bambou change tout la nuit.',
  'Le piège de l''hiver, ce n''est pas le froid — c''est la surchauffe. On a tellement peur que bébé ait froid qu''on l''emmitoufle, et il finit en sueur. Voici comment viser juste.

## La règle simple

Habille bébé avec une couche de plus que toi. Si tu es bien avec un pull, lui c''est un body + un pyjama. Pas plus pour rester à l''intérieur.

## La superposition gagnante

Un body près du corps (manches longues l''hiver), un pyjama par-dessus, et pour dormir, une gigoteuse adaptée à la température de la chambre. Le bambou est ton allié ici : il est thermorégulateur, donc il tient chaud sans étouffer, et il évacue l''humidité si bébé transpire.

## La nuit

Pas de couverture ni de couette pour un nourrisson (sécurité). La gigoteuse remplace tout : bébé reste couvert même s''il bouge. Vise une chambre autour de 18-20°C.

## Comment savoir s''il a trop chaud ou froid

Touche sa nuque (pas les mains ni les pieds, naturellement plus frais). Nuque tiède et sèche = parfait. Moite = trop habillé. Fraîche = ajoute une couche.

## Les sorties

Une couche de plus + bonnet (la tête perd beaucoup de chaleur) + chaussons. Et on retire une couche dès qu''on rentre dans un magasin chauffé, sinon c''est la surchauffe assurée.

## Questions fréquentes

**Body manches courtes ou longues l''hiver ?** Manches longues sous le pyjama, pour une couche chaude de plus sans volume.

**Faut-il une gigoteuse plus épaisse l''hiver ?** Adapte à la température de la chambre plutôt qu''à la saison. Une chambre à 20°C ne demande pas une gigoteuse très chaude.

Pour aller plus loin : [nos bodies bambou](/categorie/bodies), [nos gigoteuses à nouer](/categorie/gigoteuses), [notre bonnet bambou](/produits/bonnet-bambou-terracotta), et l''article [Thermorégulation bébé](/blog/thermoregulation-bebe-comprendre-pour-mieux-habiller).',
  'Erika', 'Conseils', 'published', now() - interval '0 days',
  'Premier hiver de bébé : comment bien l''habiller',
  'Le premier hiver de bébé sans surchauffer ni avoir froid : la règle des couches, la bonne gigoteuse, et pourquoi le bambou change tout la nuit.'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, title, excerpt, content, author, category, status, published_at, seo_title, seo_description) VALUES (
  'premier-ete-bebe-bambou-chaleur',
  'Premier été de bébé : l''habiller quand il fait chaud',
  'Canicule, nuits chaudes : comment habiller bébé l''été sans qu''il ait trop chaud. Pourquoi le bambou respirant aide à le garder au frais, jour et nuit.',
  'Un bébé régule mal sa température — et la chaleur le fatigue vite. L''été, le bon réflexe n''est pas de le dévêtir complètement, mais de choisir la bonne matière.

## Pourquoi pas « tout nu »

Un bébé nu se déshydrate et brûle plus vite au soleil. Une couche légère et respirante le protège et le garde au frais. C''est exactement ce que fait le bambou : respirant, il laisse passer l''air et évacue la transpiration au lieu de la garder contre la peau.

## La tenue de jour

Par forte chaleur, un simple body manches courtes en bambou suffit souvent. À l''ombre, à la maison, c''est parfait. Ajoute un chapeau et de l''ombre pour les sorties.

## La nuit chaude

C''est là que beaucoup galèrent. Une gigoteuse légère en bambou (ou juste un body si la chambre est très chaude) vaut mieux qu''un drap que bébé repousse. Le bambou reste frais au toucher et limite la sensation moite.

## Repère la surchauffe

Nuque moite, joues très rouges, agitation. Touche la nuque : tiède et sèche = bon. Et hydrate plus souvent (sein/biberon) quand il fait chaud.

## À éviter

Les matières synthétiques qui collent et font transpirer, et les épaisseurs « au cas où ». L''été, on allège.

## Questions fréquentes

**Body seul la nuit, c''est suffisant ?** Si la chambre dépasse ~26°C, un body bambou seul peut suffire. Surveille la nuque.

**Le bambou tient-il vraiment plus frais que le coton ?** Il est plus respirant et évacue mieux l''humidité, d''où la sensation de fraîcheur.

Pour aller plus loin : [nos bodies bambou](/categorie/bodies), [le body Smileys](/produits/body-bambou-smileys), [nos gigoteuses légères](/categorie/gigoteuses), et l''article [Thermorégulation bébé](/blog/thermoregulation-bebe-comprendre-pour-mieux-habiller).',
  'Erika', 'Conseils', 'published', now() - interval '1 days',
  'Bébé l''été : bien l''habiller quand il fait chaud',
  'Canicule, nuits chaudes : comment habiller bébé l''été sans qu''il ait trop chaud. Pourquoi le bambou respirant aide à le garder au frais, jour et nuit.'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, title, excerpt, content, author, category, status, published_at, seo_title, seo_description) VALUES (
  'combien-de-bodies-prevoir-bebe',
  'Combien de bodies prévoir pour bébé',
  'Régurgitations, fuites de couche, changes imprévus : voici combien de bodies prévoir par taille pour ne jamais être à court, sans suréquiper.',
  'Le body, c''est la pièce que tu changes le plus souvent. Régurgitation, fuite de couche, rot raté : un nouveau-né peut passer par plusieurs bodies dans une journée. Mieux vaut en avoir assez sous la main.

## Le bon nombre

La plupart des parents tournent confortablement avec 6 à 8 bodies par taille. En dessous, tu fais des lessives en urgence. Au-dessus, tu en stockes que bébé ne portera jamais (il grandit trop vite).

## Pourquoi par taille, pas en gros

Un bébé peut changer de taille en 4 à 8 semaines. Acheter 15 bodies en Nouveau-né, c''est en jeter la moitié. Répartis : quelques-uns en Nouveau-né, le gros en 0-3 mois.

## L''encolure compte

Choisis une encolure enveloppe (qui s''ouvre largement) : pour retirer un body sali par le haut sans tout passer sur la tête de bébé. Détail qui sauve, surtout après une régurgitation.

## La matière aussi

Un body se lave souvent, donc il doit tenir le lavage et rester doux. Le bambou supporte très bien les lavages répétés à 30° sans perdre sa douceur.

## Questions fréquentes

**6-8 bodies, ça vaut pour toutes les saisons ?** Oui, mais varie les manches : courtes l''été, longues l''hiver.

**Manches courtes ou longues ?** Quelques-uns de chaque. Les manches courtes se superposent toute l''année sous un pyjama.

Pour aller plus loin : [nos bodies bambou](/categorie/bodies), [le body Éclair](/produits/body-bambou-eclair), et le [guide des tailles](/guide-des-tailles).',
  'Erika', 'Conseils', 'published', now() - interval '2 days',
  'Combien de bodies prévoir pour bébé ?',
  'Régurgitations, fuites de couche, changes imprévus : voici combien de bodies prévoir par taille pour ne jamais être à court, sans suréquiper.'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, title, excerpt, content, author, category, status, published_at, seo_title, seo_description) VALUES (
  'liste-de-naissance-par-ou-commencer',
  'Liste de naissance : par où commencer',
  'Première liste de naissance ? Voici comment la construire sans se noyer : les vêtements essentiels par taille, et ce qui sert vraiment dès le retour.',
  'Une liste de naissance, ça part vite dans tous les sens. On t''aide à la cadrer côté vêtements — l''essentiel, sans le superflu.

## Commence par les tailles, pas par les quantités

Prévois surtout du Nouveau-né (premières semaines) et du 0-3 mois (qui prend le relais vite). Évite de tout demander en Nouveau-né : c''est la taille qui dure le moins.

## Le trousseau vêtements de base

- 6-8 bodies par taille (la pièce qu''on change le plus)
- 4-6 pyjamas (bébé y vit jour et nuit les premières semaines)
- 2-3 gigoteuses (remplacent couverture et drap, en sécurité)
- 1-2 bonnets + accessoires doux

## Privilégie l''utile au mignon

Un vêtement de naissance, ça doit servir, pas finir au tiroir. Vise des pièces faciles à enfiler (encolure enveloppe, zip), une matière douce et certifiée, des coupes unisexes que tu réutilises pour un éventuel deuxième.

## L''astuce cadeau

Pour ceux qui veulent offrir, oriente vers un coffret de naissance : ça réunit les essentiels en une fois, et c''est plus utile qu''un énième doudou.

## Questions fréquentes

**Combien de pyjamas faut-il vraiment ?** 4 à 6 par taille suffisent largement les premières semaines.

**Faut-il acheter avant la naissance ?** Oui pour le Nouveau-né et un peu de 0-3 mois ; le reste peut attendre, bébé grandit.

Pour aller plus loin : [nos coffrets de naissance](/packs), le [guide des tailles](/guide-des-tailles), [nos pyjamas bambou](/categorie/pyjamas), et l''article [Layette nourrisson](/blog/layette-nourrisson-ce-dont-vous-avez-vraiment-besoin).',
  'Erika', 'Naissance', 'published', now() - interval '3 days',
  'Liste de naissance : par où commencer',
  'Première liste de naissance ? Voici comment la construire sans se noyer : les vêtements essentiels par taille, et ce qui sert vraiment dès le retour.'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, title, excerpt, content, author, category, status, published_at, seo_title, seo_description) VALUES (
  'lire-etiquettes-textile-bebe',
  'Coton, bambou, bio : lire les étiquettes des vêtements bébé',
  'OEKO-TEX, GOTS, « bio » : que garantissent vraiment les labels sur les vêtements de bébé ? Le guide clair pour choisir une matière saine.',
  'Sur une étiquette de vêtement bébé, tout se ressemble — et tout ne se vaut pas. Voici comment décoder en 2 minutes.

## OEKO-TEX Standard 100

C''est le label qu''on voit le plus. Il garantit l''absence de substances nocives dans le textile fini (métaux lourds, résidus de teinture, etc.), testé sur le produit qui touchera la peau. Pour une peau de bébé, c''est l''essentiel. Attention : OEKO-TEX ne veut pas dire « bio » — il certifie la non-nocivité, pas l''origine biologique de la fibre.

## GOTS

Celui-là certifie l''origine biologique de la fibre (coton bio) et des critères environnementaux/sociaux de production. C''est un label sur la matière première, complémentaire d''OEKO-TEX.

## « Bio » tout court

Sans label derrière, le mot ne garantit rien de vérifié. Cherche toujours un sigle (GOTS, OEKO-TEX) plutôt qu''une simple mention marketing.

## Et la matière ?

Coton, bambou (viscose), synthétique : ça change la sensation et le comportement. Le bambou est apprécié pour sa douceur, sa respirabilité et sa thermorégulation. Mais matière ≠ label : un bon textile, c''est une matière agréable + une certification sérieuse.

## À retenir

Pour bébé, vise au minimum OEKO-TEX (non-nocivité), et regarde la matière selon le confort recherché. Le reste, c''est du marketing.

## Questions fréquentes

**OEKO-TEX ou GOTS, lequel privilégier ?** Ils ne disent pas la même chose : OEKO-TEX = sans substances nocives, GOTS = bio. OEKO-TEX est le minimum pour la peau ; GOTS ajoute l''origine bio.

**Le bambou est-il certifié ?** Chez M!LK, oui : OEKO-TEX. (Voir notre article dédié.)

Pour aller plus loin : l''article [OEKO-TEX, ce que ça veut dire concrètement](/blog/oeko-tex-ce-que-ca-veut-dire-concretement), l''article [Bambou vs coton](/blog/bambou-vs-coton-comparaison-honnete), et [découvrir la matière](/pourquoi-bambou).',
  'Erika', 'Bambou', 'published', now() - interval '4 days',
  'Étiquettes textile bébé : comment les lire',
  'OEKO-TEX, GOTS, « bio » : que garantissent vraiment les labels sur les vêtements de bébé ? Le guide clair pour choisir une matière saine.'
) ON CONFLICT (slug) DO NOTHING;

