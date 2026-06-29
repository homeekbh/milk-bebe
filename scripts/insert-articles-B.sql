-- ════════════════════════════════════════════════════════════════
-- M!LK — Blog : 3 nouveaux articles (Partie B : B1, B2, B3)
-- À exécuter MANUELLEMENT dans Supabase Studio (SQL Editor).
-- Suppose la table blog_posts déjà créée (cf. scripts/seed-blog.sql).
-- ON CONFLICT (slug) DO NOTHING -> ré-exécutable sans doublon.
-- image_url = NULL : Erika ajoutera les visuels via l'admin si souhaité.
-- ════════════════════════════════════════════════════════════════

INSERT INTO blog_posts (slug, title, excerpt, content, author, category, status, published_at, seo_title, seo_description) VALUES (
  'entretien-vetements-bambou-bebe',
  'Comment laver les vêtements en bambou de bébé',
  'Le bambou s''entretient facilement, mais quelques gestes le gardent doux longtemps. Température, séchage, ce qu''il faut éviter : le guide M!LK.',
  'Bonne nouvelle : le bambou est facile à vivre. Mais trois ou quatre réflexes suffisent à le garder doux et net lavage après lavage.

## Avant la première mise

Lave toujours un vêtement neuf avant de l''enfiler à bébé. Ça retire les résidus de fabrication et ça réveille la douceur de la fibre.

## La température

30°C suffisent. Le bambou est naturellement antibactérien, pas besoin de surchauffer. À 30°, il ne rétrécit pas et les couleurs tiennent.

## La lessive

Une lessive douce, idéalement spéciale bébé. Évite l''assouplissant : il encrasse la fibre et réduit justement sa douceur et sa respirabilité (l''inverse du but).

## Le séchage

À l''air libre de préférence. Si sèche-linge, programme doux/basse température. La chaleur excessive est le seul vrai ennemi du bambou.

## Les taches

Régurgitations, fuites : rince à l''eau froide vite fait, puis lavage normal. L''eau chaude fixe les taches de lait, pas l''inverse.

## En résumé

30°, pas d''assouplissant, séchage doux. C''est tout.

Entre les régurgitations et les fuites, on en change souvent : mieux vaut [prévoir plusieurs bodies](/categorie/bodies).',
  'Erika', 'Bambou', 'published', now() - interval '0 days',
  'Laver le bambou de bébé : le guide simple',
  'Le bambou s''entretient facilement, mais quelques gestes le gardent doux longtemps. Température, séchage, ce qu''il faut éviter : le guide M!LK.'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, title, excerpt, content, author, category, status, published_at, seo_title, seo_description) VALUES (
  'bonnet-bandeau-bebe-utilite',
  'Bonnet et bandeau bébé : à quoi ça sert vraiment',
  'Le bonnet de naissance n''est pas qu''un accessoire mignon : il a un vrai rôle. On t''explique pourquoi, et comment bien le choisir en bambou.',
  'Un nouveau-né perd beaucoup de chaleur par la tête. C''est pour ça que la maternité lui en met un dès la naissance — le bonnet n''est pas une coquetterie, c''est de la régulation thermique.

## Le bonnet, les premières semaines

Bébé ne régule pas encore bien sa température. Un bonnet doux l''aide à garder sa chaleur sans surchauffer, surtout après le bain et les premières sorties. En bambou : respirant, donc pas d''effet « tête en sueur ».

## Le bandeau, après

Quand le bonnet n''est plus nécessaire au quotidien, le bandeau prend une autre place : confort doux, finition d''une tenue, sans serrer le crâne fragile. Choisis-le sans élastique dur et dans une matière qui ne marque pas.

## Comment bien choisir

La matière (douce, respirante, certifiée), l''absence de coutures dures, et une taille qui tient sans comprimer. Le bambou coche les trois.

Pour aller plus loin : découvre nos [accessoires bébé en bambou](/categorie/accessoires) et nos [coffrets de naissance](/packs).',
  'Erika', 'Conseils', 'published', now() - interval '1 days',
  'Bonnet & bandeau bébé : utiles ou déco ?',
  'Le bonnet de naissance n''est pas qu''un accessoire mignon : il a un vrai rôle. On t''explique pourquoi, et comment bien le choisir en bambou.'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, title, excerpt, content, author, category, status, published_at, seo_title, seo_description) VALUES (
  'passer-taille-au-dessus-bebe',
  'Quand passer bébé à la taille au-dessus',
  'Bébé semble à l''étroit ? Voici les signes qui montrent qu''il est temps de passer à la taille au-dessus, et comment anticiper sans gaspiller.',
  'Les 6 premiers mois, bébé peut changer de taille toutes les 4 à 8 semaines. Difficile de suivre. Voici comment repérer le bon moment, sans racheter trop tôt ni trop tard.

## Les signes qu''un vêtement est devenu trop petit

Les pieds qui forcent dans le pyjama, l''entrejambe des bodies qui tire (et qui finit par bâiller), des marques rouges aux chevilles ou aux poignets, une fermeture difficile.

## Anticipe d''une taille

Garde toujours la taille au-dessus prête à l''emploi. Un bébé qui pousse la nuit, ça arrive. Mieux vaut l''avoir dans le tiroir que de courir.

## Comment éviter le gaspillage

Privilégie des matières résistantes au lavage répété (le bambou tient bien), des coupes un peu évolutives, et n''achète pas tout en Nouveau-né : c''est la taille qui dure le moins.

On t''envoie un petit rappel par email au bon moment pour la taille suivante — pile quand bébé est sur le point d''en avoir besoin.

Pour aller plus loin : parcours [toute la collection](/produits).',
  'Erika', 'Conseils', 'published', now() - interval '2 days',
  'Bébé grandit : quand passer à la taille suivante',
  'Bébé semble à l''étroit ? Voici les signes qui montrent qu''il est temps de passer à la taille au-dessus, et comment anticiper sans gaspiller.'
) ON CONFLICT (slug) DO NOTHING;

