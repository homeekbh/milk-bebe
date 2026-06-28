-- ════════════════════════════════════════════════════════════════
-- M!LK — Blog : table + RLS + 10 articles seed
-- À exécuter manuellement dans Supabase Studio (SQL Editor).
-- ════════════════════════════════════════════════════════════════

-- 1) Table (créée si absente)
CREATE TABLE IF NOT EXISTS blog_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  title           text NOT NULL,
  excerpt         text,
  content         text,
  image_url       text,
  author          text DEFAULT 'Erika',
  category        text,
  status          text DEFAULT 'draft',          -- 'draft' | 'published'
  published_at    timestamptz,
  seo_title       text,
  seo_description text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_posts_status_pubdate_idx ON blog_posts (status, published_at DESC);

-- 2) RLS : lecture publique des articles publiés uniquement.
--    (Les écritures passent par le service role côté serveur, qui bypass la RLS.)
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blog public read published" ON blog_posts;
CREATE POLICY "blog public read published" ON blog_posts
  FOR SELECT USING (status = 'published');

-- 3) Seed — 10 articles publiés (ON CONFLICT DO NOTHING -> ré-exécutable).

INSERT INTO blog_posts (slug, title, excerpt, content, author, category, status, published_at, seo_title, seo_description) VALUES (
  'pyjama-bebe-bambou-pourquoi-cest-different',
  'Pyjama bébé bambou : pourquoi c''est différent',
  'Le bambou n''est pas un argument marketing. C''est une matière qui change concrètement les nuits de votre bébé — et les vôtres.',
  'On vous vend du bambou partout. Alors soyons clairs : ce n''est pas une mode, c''est une matière qui résout des problèmes précis quand on a un nouveau-né.

## Plus doux, vraiment

La fibre de bambou est naturellement plus fine que le coton. Résultat : un toucher proche de la soie, sans traitement chimique. Pour une peau de nouveau-né — qui réagit à tout — c''est la différence entre un bébé qui dort et un bébé qui pleure parce que ça gratte.

## Thermorégulateur : l''argument qui compte la nuit

Un bébé ne régule pas bien sa température. Trop chaud, il transpire et se réveille. Trop froid, pareil. Le bambou respire et évacue l''humidité mieux que le coton classique. Concrètement : moins de réveils liés à la chaleur, des nuits un peu plus longues.

- **Été** : il reste frais, n''emprisonne pas la transpiration.
- **Hiver** : il garde la chaleur sans surchauffer.

C''est un seul pyjama pour toute l''année, ou presque.

## Naturellement plus sain

Le bambou est naturellement antibactérien et hypoallergénique. Pour les peaux atopiques, à tendance eczéma, ça évite une couche d''irritation en plus. Et si c''est certifié **OEKO-TEX Standard 100**, vous avez la garantie qu''aucune substance nocive ne touche la peau de votre bébé.

## Ce que le bambou ne fait pas

Soyons honnêtes : le bambou ne fait pas dormir un bébé qui a faim, ni ne remplace une bonne routine. Ce n''est pas magique. C''est juste une matière qui enlève des irritants — la chaleur, le grattement, l''humidité — pour que le reste soit plus simple.

## Le vrai test

Lavez-le. Le bambou de qualité devient **plus doux à chaque lavage** au lieu de bouloches ou de raideur. C''est le meilleur indicateur que la matière est bonne.

Chez M!LK, on a choisi le bambou pour une raison simple : il règle des galères réelles. Pas pour cocher une case écolo sur une étiquette.',
  'Erika', 'Bambou', 'published', now() - interval '0 days',
  'Pyjama bébé bambou : pourquoi c''est vraiment différent | M!LK',
  'Douceur, thermorégulation, respirabilité : ce que le bambou change concrètement pour le pyjama de votre nourrisson.'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, title, excerpt, content, author, category, status, published_at, seo_title, seo_description) VALUES (
  'gigoteuse-0-3-mois-comment-bien-choisir',
  'Gigoteuse 0-3 mois : comment bien choisir',
  'Taille, TOG, fermeture, matière : le guide direct pour ne pas se tromper sur la première gigoteuse de votre bébé.',
  'La gigoteuse remplace la couverture, interdite avant 1 an pour cause de sécurité. C''est l''achat le plus utile du trousseau. Voici comment ne pas se tromper.

## 1. La taille : ni trop grande, ni trop petite

Une gigoteuse trop grande, et bébé glisse à l''intérieur — dangereux. Trop petite, il est comprimé. Pour un 0-3 mois, visez une longueur adaptée au poids, pas seulement à l''âge. La règle : l''encolure ne doit pas pouvoir passer par-dessus le menton.

## 2. La chaleur : adaptez à la pièce

On parle de TOG, mais ce qui compte c''est la température de la chambre :

- **Chambre à 20-22°C** : gigoteuse légère + body manches courtes.
- **Chambre à 16-19°C** : gigoteuse plus chaude + pyjama.

Le piège classique : trop couvrir. Un bébé qui a trop chaud dort mal et c''est un facteur de risque. Touchez la nuque (pas les mains) pour vérifier.

## 3. La fermeture : pensez aux changes de nuit

À 3h du matin, vous n''avez pas envie de batailler. Une **gigoteuse à nouer ou à ouverture rapide** se change sans tout défaire, dans le noir, sans réveiller complètement bébé. Les modèles à 12 boutons-pression sont jolis sur le papier, pénibles en vrai.

## 4. La matière : respirante avant tout

Un bébé bouge, transpire. Une matière qui respire — comme le bambou — évite la surchauffe et garde au sec. Évitez le synthétique pur, qui retient l''humidité.

## 5. Les détails qui changent tout

- Pas de capuche (risque de couvrir le visage).
- Emmanchures bien fermées pour les nuits fraîches.
- Coutures plates pour ne pas marquer la peau.

## En résumé

Une bonne gigoteuse 0-3 mois : la bonne taille, la bonne chaleur pour VOTRE chambre, une ouverture qui simplifie les changes, et une matière qui respire. Le reste, c''est du décor.',
  'Erika', 'Conseils', 'published', now() - interval '3 days',
  'Gigoteuse 0-3 mois : le guide pour bien choisir | M!LK',
  'Taille, chaleur, fermeture, matière : comment choisir la gigoteuse 0-3 mois adaptée à votre nourrisson, sans se tromper.'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, title, excerpt, content, author, category, status, published_at, seo_title, seo_description) VALUES (
  'cadeau-naissance-original-5-idees-qui-servent',
  'Cadeau naissance original : 5 idées qui servent vraiment',
  'Oubliez le énième doudou. Voici 5 cadeaux de naissance que les parents utilisent vraiment — et n''oublient pas.',
  'Le meilleur cadeau de naissance n''est pas le plus mignon. C''est celui que les parents utilisent toutes les semaines sans y penser.

## 1. Un coffret d''essentiels bambou

Bodies, pyjama, gigoteuse, lange : les pièces que les parents lavent et relavent. Un coffret bien choisi remplace dix petits cadeaux gadgets.

## 2. Le lange grand format

Sous-estimé, ultra utile. Un grand lange sert de couverture d''appoint, de tapis à langer nomade, de protection poussette, de drap d''allaitement.

## 3. Une carte cadeau de leur marque préférée

Pas glamour ? Peut-être. Mais ça évite les doublons et le mauvais goût. Les parents choisissent la taille, le motif, le moment.

## 4. Quelque chose pour LA MAMAN

On oublie souvent les parents. Le post-partum est rude. Un cadeau qui pense à la personne, pas seulement au bébé, marque les esprits.

## 5. Un trousseau de tailles "d''après"

Tout le monde offre du naissance. Personne n''offre du 3-6 ou 6-12 mois. Pourtant bébé grandit vite.

## Ce qu''il faut éviter

- Le 15e doudou.
- Les vêtements taille naissance en quantité.
- Le bruyant, le clignotant, le "qui prend de la place".

## La règle d''or

Demandez-vous : est-ce que ça va servir toutes les semaines ? Si oui, c''est un bon cadeau.',
  'Erika', 'Naissance', 'published', now() - interval '6 days',
  'Cadeau de naissance original : 5 idées vraiment utiles | M!LK',
  'Marre des cadeaux de naissance qui finissent au placard ? 5 idées originales et utiles que les jeunes parents utilisent vraiment.'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, title, excerpt, content, author, category, status, published_at, seo_title, seo_description) VALUES (
  'oeko-tex-ce-que-ca-veut-dire-concretement',
  'OEKO-TEX : ce que ça veut dire concrètement',
  'OEKO-TEX, ce label qu''on voit partout. Ce qu''il garantit vraiment pour la peau de votre bébé — sans jargon.',
  'Vous voyez "OEKO-TEX" sur les étiquettes. C''est un argument de vente, oui — mais derrière, il y a une vraie garantie.

## C''est quoi, exactement

OEKO-TEX Standard 100 est une certification indépendante. Elle teste le textile pour s''assurer qu''il ne contient **aucune substance nocive** : métaux lourds, formaldéhyde, colorants allergènes, pesticides.

## Pourquoi c''est crucial pour un bébé

La peau d''un nourrisson est plus fine et plus perméable que celle d''un adulte. Elle absorbe davantage. Un bébé porte ses vêtements 24h/24, contre sa peau. La certification réduit le risque d''irritation.

## Le niveau qui compte

OEKO-TEX a plusieurs classes. La plus exigeante — **Classe I** — concerne les articles pour bébés de moins de 3 ans. C''est celle qu''il faut chercher.

## Ce que le label ne dit pas

- Il ne garantit pas que c''est bio.
- Il ne dit rien sur les conditions de fabrication.
- C''est une garantie de sécurité chimique, pas un label de qualité globale.

## Comment vérifier

Un vrai certificat porte un numéro. Une marque sérieuse peut vous le montrer.

Chez M!LK, tout est certifié OEKO-TEX. Pour nous, ce n''est pas un argument — c''est une évidence.',
  'Erika', 'Bambou', 'published', now() - interval '9 days',
  'OEKO-TEX Standard 100 : ce que le label garantit | M!LK',
  'Que signifie vraiment la certification OEKO-TEX Standard 100 pour un vêtement bébé ? Explication simple et concrète.'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, title, excerpt, content, author, category, status, published_at, seo_title, seo_description) VALUES (
  'les-nuits-avec-un-nouveau-ne-ce-que-personne-ne-dit',
  'Les nuits avec un nouveau-né : ce que personne ne dit',
  'Les réveils, l''épuisement, la culpabilité. Une lecture honnête des premières nuits — et quelques choses qui aident vraiment.',
  'On vous prépare à l''accouchement. Personne ne vous prépare aux nuits.

## Le mythe du "il fait ses nuits"

Un nouveau-né se réveille toutes les 2 à 4 heures. C''est normal et nécessaire. Lâchez la culpabilité. Vous ne ratez rien.

## Ce qui épuise vraiment

Ce n''est pas le nombre de réveils. C''est le fractionnement du sommeil. Trois heures d''affilée valent mieux que six heures coupées en morceaux.

## Ce qui aide concrètement

- **Réduire les frictions du change** : un vêtement qui s''ouvre vite, dans le noir, sans réveiller bébé à fond.
- **L''emmaillotage** : il calme le réflexe de Moro.
- **La bonne température** : chambre à 19-20°C, matière respirante.
- **Se relayer** : si vous êtes deux, alternez.

## La partie dont on parle peu

L''irritabilité, les larmes sans raison, le sentiment d''être dépassé : c''est fréquent. Si ça dure ou s''aggrave, parlez-en.

## La bonne nouvelle

Ça change. Lentement, par paliers, mais ça change.',
  'Erika', 'Lifestyle', 'published', now() - interval '12 days',
  'Les nuits avec un nouveau-né : la vérité honnête | M!LK',
  'Réveils, épuisement : ce que personne ne vous dit sur les premières nuits avec un nouveau-né, et ce qui aide vraiment.'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, title, excerpt, content, author, category, status, published_at, seo_title, seo_description) VALUES (
  'body-bebe-les-erreurs-a-eviter',
  'Body bébé : les erreurs à éviter',
  'Encolure, pressions, taille, matière : les erreurs classiques sur les bodies, et comment les éviter.',
  'Le body, c''est la pièce qu''on enfile le plus. Une mauvaise coupe, et c''est dix batailles par jour.

## Erreur 1 : l''encolure qui ne passe pas

Un body qui s''enfile par la tête sur un nouveau-né, c''est la garantie des pleurs. Préférez une **encolure enveloppe** qui s''enfile par le bas.

## Erreur 2 : trop de boutons-pression

7, 10, 12 pressions à aligner sur un bébé qui gigote. Trois pressions bien placées suffisent.

## Erreur 3 : la mauvaise taille "pour faire durer"

Un body trop large baille, l''entrejambe descend, ça ne tient pas la couche. Prenez la taille du moment.

## Erreur 4 : ignorer la matière

Le body est en contact direct avec la peau toute la journée. Visez le respirant et le doux, certifié OEKO-TEX.

## Erreur 5 : oublier les détails

Coutures plates, étiquettes imprimées (pas cousues), moufles intégrées si possible.

## Combien en faut-il ?

Pour un nouveau-né : 6 à 8 bodies. Entre les régurgitations et les fuites de couche, vous en changez souvent.',
  'Erika', 'Conseils', 'published', now() - interval '15 days',
  'Body bébé : les erreurs à éviter pour bien choisir | M!LK',
  'Encolure, boutons-pression, taille, matière : les erreurs courantes sur les bodies bébé et comment les éviter.'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, title, excerpt, content, author, category, status, published_at, seo_title, seo_description) VALUES (
  'bambou-vs-coton-comparaison-honnete',
  'Bambou vs coton : comparaison honnête',
  'Sans parti pris commercial : ce que le bambou fait mieux que le coton, et ce que le coton garde pour lui.',
  'On vend du bambou, donc autant être transparents.

## Douceur : avantage bambou

La fibre de bambou est plus fine. Le toucher est plus soyeux, surtout après quelques lavages.

## Respirabilité : avantage bambou

Le bambou évacue mieux l''humidité. Pour un bébé qui transpire la nuit, ça fait une différence réelle.

## Thermorégulation : avantage bambou

Frais en été, chaud en hiver : le bambou s''adapte mieux aux variations.

## Solidité : match nul

Un bon bambou tient très bien le lavage. La qualité compte plus que la fibre.

## Prix : avantage coton

Le bambou de qualité coûte plus cher à produire. Si le budget est le critère numéro un, le coton gagne.

## Écologie : c''est nuancé

Le bambou pousse vite, sans pesticides. Mais sa transformation peut être chimique. Le label compte plus que la matière brute.

## Le verdict honnête

- Pour la peau sensible, les nuits, le confort : bambou.
- Pour le budget serré : coton de qualité.
- Dans tous les cas : exigez OEKO-TEX.',
  'Erika', 'Bambou', 'published', now() - interval '18 days',
  'Bambou vs coton bébé : la comparaison honnête | M!LK',
  'Douceur, respirabilité, durabilité, prix : comparaison honnête entre le bambou et le coton pour les vêtements de bébé.'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, title, excerpt, content, author, category, status, published_at, seo_title, seo_description) VALUES (
  'layette-nourrisson-ce-dont-vous-avez-vraiment-besoin',
  'Layette nourrisson : ce dont vous avez vraiment besoin',
  'La liste de naissance réaliste, sans le superflu. Ce qui sert vraiment les premières semaines.',
  'Les listes de naissance font peur : 200 articles, des centaines d''euros. La vérité, c''est qu''un nouveau-né a besoin de peu.

## Les vêtements

- 6 à 8 bodies
- 4 à 6 pyjamas
- 2 gigoteuses
- 1 à 2 langes grand format
- 2 bonnets

## Le sommeil

- Un couchage adapté aux normes
- Une gigoteuse (pas de couverture avant 1 an)
- Un drap-housse de rechange

## Ce dont vous n''avez PAS besoin tout de suite

- Le parc, le trotteur, les jouets sophistiqués
- Les chaussures
- Les tenues "occasion" en quantité

## Le principe

Achetez peu, mais bien. Mieux vaut 6 bodies confortables que 20 qui grattent.

## Et après ?

Anticipez la taille suivante (3-6 mois) plutôt que de surstocker du naissance.',
  'Erika', 'Naissance', 'published', now() - interval '21 days',
  'Layette nourrisson : la liste vraiment utile | M!LK',
  'La liste de layette réaliste pour un nouveau-né : ce dont vous avez vraiment besoin les premières semaines, sans le superflu.'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, title, excerpt, content, author, category, status, published_at, seo_title, seo_description) VALUES (
  'thermoregulation-bebe-comprendre-pour-mieux-habiller',
  'Thermorégulation bébé : comprendre pour mieux habiller',
  'Un bébé régule mal sa température. Comprendre comment l''habiller selon la saison — et éviter la surchauffe.',
  'Un nouveau-né ne régule pas sa température comme nous. Trop couvert, il surchauffe ; pas assez, il a froid.

## Pourquoi bébé régule mal

Un nourrisson a une grande surface de peau par rapport à son poids et un système de régulation immature. Il perd vite de la chaleur.

## La règle de base

Habillez bébé avec **une couche de plus que vous**.

## Vérifier : la nuque, pas les mains

Les mains et pieds sont souvent frais — c''est normal. Touchez la nuque : tiède = parfait, moite = trop chaud, frais = ajoutez une couche.

## Le danger : la surchauffe

On a tendance à trop couvrir. C''est une erreur. En cas de doute, habillez plus léger.

## La bonne température de chambre

Visez **18 à 20°C**. C''est la fourchette recommandée.

## Saison par saison

- **Été** : body manches courtes + gigoteuse légère.
- **Mi-saison** : body + pyjama + gigoteuse légère.
- **Hiver** : body + pyjama + gigoteuse plus chaude.',
  'Erika', 'Conseils', 'published', now() - interval '24 days',
  'Thermorégulation bébé : comment bien l''habiller | M!LK',
  'Pourquoi un bébé régule mal sa température et comment l''habiller selon la saison pour éviter la surchauffe.'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, title, excerpt, content, author, category, status, published_at, seo_title, seo_description) VALUES (
  'milk-pourquoi-on-a-tout-repense',
  'M!LK : pourquoi on a tout repensé',
  'On n''a pas créé une marque de vêtements. On a créé une réponse aux petites galères répétées du quotidien avec un nouveau-né.',
  'M!LK n''est pas né d''une envie de faire "encore une marque de vêtements bébé". C''est né d''un agacement très concret.

## Le point de départ

Quand on a un nouveau-né, on découvre une série de petites galères que personne n''avait annoncées. Les boutons-pression impossibles à 3h du matin. Les moufles qui disparaissent. Les langes trop petits. Les matières qui grattent.

## Ce qu''on a refusé

On a refusé de faire du joli pour le joli. On a refusé les matières bas de gamme. On a refusé d''ajouter des fonctionnalités inutiles.

## Ce qu''on a décidé

Partir des problèmes réels. Pour chaque pièce, une seule question : est-ce que ça simplifie la vie des parents épuisés ?

- Un double zip qui change la couche sans tout déshabiller.
- Des moufles intégrées qu''on ne perd plus.
- Une gigoteuse qui s''ouvre dans le noir.
- Du bambou certifié OEKO-TEX.

## Pour qui

Pour les parents qui n''ont pas besoin de plus de "mignon". Ils ont besoin de moins de charge mentale.

## La promesse

Des essentiels bébé. Sans le superflu. Pensés pour les vraies nuits, les vrais matins, la vraie vie de parent.',
  'Erika', 'M!LK', 'published', now() - interval '27 days',
  'M!LK : pourquoi on a tout repensé pour les parents | M!LK',
  'L''histoire de M!LK : pourquoi on a repensé les essentiels bébé autour des vraies galères des parents.'
) ON CONFLICT (slug) DO NOTHING;
