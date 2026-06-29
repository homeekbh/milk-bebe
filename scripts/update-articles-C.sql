-- ════════════════════════════════════════════════════════════════
-- M!LK — Blog Vague 2, Partie C : enrichissement ADDITIF des 10 articles
-- À exécuter APRÈS insert-articles-B4-B8.sql (liens vers ces articles).
-- ADDITIF : on ajoute FAQ + maillage EN FIN d'article, on n'efface RIEN.
-- Idempotent : le guard "content NOT LIKE '%ajout SEO vague 2%'" empêche
-- tout double-ajout si le script est relancé.
-- ════════════════════════════════════════════════════════════════

UPDATE blog_posts
SET content = content || '

<!-- ajout SEO vague 2 -->

## Questions fréquentes

**Zip ou pressions sur un pyjama bébé ?** Le zip se ferme d''une main pendant un change de nuit ; les pressions sont classiques mais plus longues. À toi de voir selon tes nuits.

**Le pyjama bambou tient-il chaud l''hiver ?** Oui, il est thermorégulateur : il tient chaud sans étouffer, et reste frais l''été.

Pour aller plus loin : [voir le pyjama Éclair](/produits/pyjama-bambou-eclair) · [tous nos pyjamas](/categorie/pyjamas).'
WHERE slug = 'pyjama-bebe-bambou-pourquoi-cest-different' AND content NOT LIKE '%ajout SEO vague 2%';

UPDATE blog_posts
SET content = content || '

<!-- ajout SEO vague 2 -->

## Questions fréquentes

**Quelle gigoteuse selon la saison ?** Adapte à la température de la chambre plutôt qu''à la saison. Vise 18-20°C et une gigoteuse qui ne fait pas transpirer.

**Gigoteuse à nouer, c''est pratique ?** Oui : elle s''ajuste au gabarit et s''enfile sans réveiller bébé.

Pour aller plus loin : [voir nos gigoteuses à nouer](/categorie/gigoteuses) · [la gigoteuse Smileys](/produits/gigoteuse-smileys).'
WHERE slug = 'gigoteuse-0-3-mois-comment-bien-choisir' AND content NOT LIKE '%ajout SEO vague 2%';

UPDATE blog_posts
SET content = content || '

<!-- ajout SEO vague 2 -->

## Questions fréquentes

**Quel cadeau de naissance est vraiment utile ?** Ce que les parents changent tous les jours : bodies, pyjamas, ou un coffret prêt à offrir.

**Quelle taille offrir ?** Plutôt du 3-6 mois : bébé le portera plus longtemps.

Pour aller plus loin : [voir nos coffrets de naissance](/packs) · [guide des tailles](/guide-des-tailles).'
WHERE slug = 'cadeau-naissance-original-5-idees-qui-servent' AND content NOT LIKE '%ajout SEO vague 2%';

UPDATE blog_posts
SET content = content || '

<!-- ajout SEO vague 2 -->

## Questions fréquentes

**OEKO-TEX = bio ?** Non. Absence de substances nocives, pas origine biologique.

**Pourquoi c''est important pour bébé ?** Sa peau est très fine ; ce qui la touche en permanence doit être sain.

Pour aller plus loin : [pour les peaux sensibles](/vetements-bebe-peau-sensible) · [notre matière](/pourquoi-bambou).'
WHERE slug = 'oeko-tex-ce-que-ca-veut-dire-concretement' AND content NOT LIKE '%ajout SEO vague 2%';

UPDATE blog_posts
SET content = content || '

<!-- ajout SEO vague 2 -->

## La température de la chambre

Un facteur sous-estimé : vise 18-20°C, ni couette ni couverture (sécurité), une gigoteuse adaptée fait tout le travail.

## Questions fréquentes

**Quelle température pour la chambre de bébé ?** Autour de 18-20°C.

Pour aller plus loin : [nos gigoteuses](/categorie/gigoteuses) · l''article [Premier hiver de bébé](/blog/premier-hiver-bebe-habiller).'
WHERE slug = 'les-nuits-avec-un-nouveau-ne-ce-que-personne-ne-dit' AND content NOT LIKE '%ajout SEO vague 2%';

UPDATE blog_posts
SET content = content || '

<!-- ajout SEO vague 2 -->

## Questions fréquentes

**Combien de bodies prévoir ?** 6 à 8 par taille. [Voir l''article dédié](/blog/combien-de-bodies-prevoir-bebe).

**Quelle encolure choisir ?** Enveloppe : pour retirer un body sali par le bas comme par le haut.

Pour aller plus loin : [le body Éclair](/produits/body-bambou-eclair) · [le body Smileys](/produits/body-bambou-smileys) · [guide des tailles](/guide-des-tailles).'
WHERE slug = 'body-bebe-les-erreurs-a-eviter' AND content NOT LIKE '%ajout SEO vague 2%';

UPDATE blog_posts
SET content = content || '

<!-- ajout SEO vague 2 -->

## Le tableau en bref

Bambou : plus doux, plus respirant, thermorégulateur ; coton : robuste, économique, moins technique. Les deux peuvent être OEKO-TEX.

## Questions fréquentes

**Le bambou est-il vraiment plus doux ?** Sa fibre est lisse, d''où la sensation 3× plus douce mise en avant.

Pour aller plus loin : [lire les étiquettes](/blog/lire-etiquettes-textile-bebe) · [notre matière](/pourquoi-bambou).'
WHERE slug = 'bambou-vs-coton-comparaison-honnete' AND content NOT LIKE '%ajout SEO vague 2%';

UPDATE blog_posts
SET content = content || '

<!-- ajout SEO vague 2 -->

## La checklist par taille

Bodies ×6-8, pyjamas ×4-6, gigoteuses ×2-3, bonnet — un mémo rapide pour ne rien oublier.

## Questions fréquentes

**Par où commencer une liste de naissance ?** Par les tailles Nouveau-né + 0-3 mois. [Voir l''article dédié](/blog/liste-de-naissance-par-ou-commencer).

Pour aller plus loin : [nos coffrets](/packs) · [Liste de naissance](/blog/liste-de-naissance-par-ou-commencer) · [guide des tailles](/guide-des-tailles).'
WHERE slug = 'layette-nourrisson-ce-dont-vous-avez-vraiment-besoin' AND content NOT LIKE '%ajout SEO vague 2%';

UPDATE blog_posts
SET content = content || '

<!-- ajout SEO vague 2 -->

## Questions fréquentes

**Comment savoir si bébé a trop chaud ?** Touche sa nuque : moite = trop habillé ; tiède et sèche = parfait.

**Le bambou aide-t-il vraiment ?** Il est respirant et thermorégulateur, il limite la surchauffe comme le coup de froid.

Pour aller plus loin : [Premier hiver](/blog/premier-hiver-bebe-habiller) · [Premier été](/blog/premier-ete-bebe-bambou-chaleur) · [nos gigoteuses](/categorie/gigoteuses).'
WHERE slug = 'thermoregulation-bebe-comprendre-pour-mieux-habiller' AND content NOT LIKE '%ajout SEO vague 2%';

UPDATE blog_posts
SET content = content || '

<!-- ajout SEO vague 2 -->

Pour aller plus loin : [notre histoire](/qui-sommes-nous) · [notre matière](/pourquoi-bambou).'
WHERE slug = 'milk-pourquoi-on-a-tout-repense' AND content NOT LIKE '%ajout SEO vague 2%';

