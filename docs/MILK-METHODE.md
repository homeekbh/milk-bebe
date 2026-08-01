# M!LK — Méthode de travail

> **Ce fichier est la SOURCE du skill `milk-expert`.**
> Le skill vit hors du dépôt, dans le projet Claude. Toute modification ici doit
> être reversée dans le skill, sinon les deux divergent — c'est le motif n°1
> appliqué à la documentation, et c'est déjà arrivé une fois (skill « Audit
> Mai 2026 » resté dans le dépôt pendant que la version réécrite du 30/07 vivait
> dans le projet).
>
> Dernière synchronisation : **31 juillet 2026**.

---

## Ce que ce fichier est, et n'est pas

Ce fichier contient **ce qui ne bouge pas** : comment aborder ce dépôt, quels
pièges sont structurels, quelles règles de travail sont non négociables.

Il ne contient **aucun inventaire de bugs**, **aucune liste de priorités**,
**aucun état du code**. Tout cela vit dans `docs/MILK-CONTEXTE.md`.

> **Pourquoi cette séparation.** Une version antérieure mélangeait méthode et
> inventaire. Datée de mai 2026, elle affirmait encore fin juillet que
> `next-intl` était inutilisé, qu'Apple Pay était bloqué par
> `payment_method_types: ["card"]`, et donnait des chemins de fichiers sans
> segment `[locale]` — trois affirmations fausses, présentées comme « vérifiées
> par audit réel du code ». Un inventaire périmé qui se présente comme vérifié
> est **pire qu'aucun inventaire** : il fait perdre des lots entiers à corriger
> du code déjà correct.
>
> **Règle générale : si ce fichier contredit le code, c'est le code qui a raison.**

---

## Les trois motifs qui expliquent presque tous les bugs de ce projet

Ce ne sont pas des observations théoriques. Chacun a coûté au moins deux lots.

### Motif 1 — Les implémentations parallèles dérivent

Quand une même chose est codée à deux endroits, les deux divergent. Toujours.

Exemples réels de ce dépôt : le badge produit a existé en **6 exemplaires**
simultanés ; l'entretien produit suivait deux chemins (base de données et i18n) ;
les codes transporteur FedEx sont restés figés en v2 pendant que l'API passait en
v3 ; la regex de détection des crawlers existait en deux copies littérales ;
`DELIVERY_PRICES` était défini dans le panier **et** dans `create-session`, avec
le risque que l'affichage diverge de la facturation. Et la documentation
elle-même a divergé en deux copies pendant deux jours.

**Conséquence pratique :** avant d'écrire un composant, chercher s'il existe
déjà. Avant d'ajouter une constante, chercher où elle est déjà définie. Un
composant de plus est presque toujours une erreur.

*Nuance :* une duplication **responsive assumée** n'est pas une dérive. Le lien
favoris existe deux fois dans `Header.tsx` — une fois pour le bureau, une fois
pour le mobile — mais les deux lisent la même source `useWishlist()`. Le critère
n'est pas « combien de fois c'est écrit », c'est « combien de sources de vérité ».

### Motif 2 — Le code mort masque les bugs

Deux lots ont été perdus à modifier `getProductEntretien`, une fonction que
**rien n'appelle** — le bloc réellement affiché était une liste séparée lisant
les clés i18n. Deux autres lots ont corrigé `handlePackOrder`, atteignable
uniquement via un chemin lui-même mort.

Dans les deux cas, le correctif était juste. Il ne s'exécutait simplement jamais.

**Conséquence pratique :** avant tout correctif, prouver que le code visé est
bien celui qui tourne. Un `grep` sur le nom de la fonction, un contrôle de la
chaîne d'imports. Cinq minutes qui en économisent des heures.

### Motif 3 — Ce qui n'a jamais été testé ne marche pas

`/recherche` n'a **jamais** fonctionné depuis la création du site : elle appelait
une route API qui n'a jamais existé. Personne ne l'avait ouverte. Les packs ont
été inexpédiables pendant des semaines. Des sections entières de pages
s'affichaient vides au scroll.

**Conséquence pratique :** ne jamais écrire « ça fonctionne » sans avoir exécuté
quelque chose. `tsc` et `build` verts prouvent que le code compile, pas qu'il
marche.

---

## Règles de travail non négociables

### 1. Reconnaissance en lecture seule avant tout sujet non trivial

Un prompt de reconnaissance précède le prompt d'implémentation. Il ne produit
**aucun code**, seulement un rapport : chemins de fichiers, numéros de ligne,
noms de colonnes exacts, et pour chaque point la mention **CERTAIN** ou
**INCERTAIN**.

Le rapport doit se terminer par une section « ce qui m'a surpris » : tout ce qui
contredit les hypothèses du brief. C'est la section la plus utile — c'est là que
se révèlent les notes périmées.

*Un prompt de reconnaissance ne doit jamais contenir de consigne d'écriture.
Si les deux se contredisent, la contrainte de lecture seule l'emporte, et
l'agent doit le signaler plutôt que trancher en silence.*

### 2. Fichiers complets en sortie

Jamais de diff partiel, jamais d'extrait « et ainsi de suite ». Le fichier entier
ou rien.

### 3. Lire avant de modifier

Ouvrir le fichier avant de l'éditer. Toujours.

### 4. `tsc --noEmit` + `npm run build` verts avant chaque commit

Sans exception. Un build rouge ne se pousse pas.

### 5. STOP AVANT PUSH sur tout ce qui touche le client

**S'arrêter et demander validation** dès que la modification touche :
- le tunnel de paiement (`/panier`, `/checkout/*`, `create-session`, webhook Stripe)
- l'instrumentation client (`lib/analytics.ts`, `ConsentManager`)
- tout ce qui s'exécute chez un visiteur

`/admin` seul → pas d'impact visiteur → push direct.

### 6. Le SQL est exécuté à la main

Toute migration, toute requête de diagnostic est **staged** pour exécution
manuelle dans Supabase Studio. Aucun DDL via l'API REST — ça ne fonctionne pas.

Attendre la confirmation avant d'écrire le code qui en dépend.

⚠️ Supabase Studio n'affiche que le résultat de la **dernière** instruction quand
plusieurs sont lancées ensemble. Une requête par onglet.

### 7. Édition chirurgicale sur les gros fichiers

`app/[locale]/produits/[slug]/ProductClient.tsx` et
`app/admin/produits/[id]/page.tsx` : **jamais de régénération complète**.
Modifications ciblées uniquement.

### 8. Un sujet par échange

Ne pas empiler les questions. Ne pas anticiper le lot suivant. Le travail est
découpé en lots numérotés ; un lot ne démarre pas avant que le précédent soit
validé.

### 9. Signaler l'incertitude plutôt qu'inventer

Dire « je ne sais pas » ou « à vérifier » a un coût nul. Une affirmation
plausible mais fausse coûte un lot. Quand une donnée n'existe pas, la
fonctionnalité qui en dépend n'existe pas non plus — **une carte en moins vaut
mieux qu'une carte fausse**.

### 10. Les textes d'Erika sont repris mot pour mot

Jamais paraphrasés, jamais reformulés, jamais « améliorés ».

### 11. Consigner ce qu'on apprend, à la fin de chaque lot

Le test qui décide où écrire :
**« Est-ce que ce sera encore vrai dans six mois, quel que soit l'état du code ? »**

- **Oui** → ce fichier (`docs/MILK-METHODE.md`), et signaler la modification en
  tête du rapport pour reversement dans le skill.
- **Non** → `docs/MILK-CONTEXTE.md`.

Un bug corrigé se retire de `MILK-CONTEXTE.md` ou se marque RÉSOLU avec son
commit. Une note démentie par le code se corrige sur-le-champ, et le rapport
doit dire qu'elle était fausse.

---

## Pièges structurels du dépôt

### Le middleware s'appelle `proxy.ts`

Pas `middleware.ts`. Toute logique de middleware s'ajoute dans ce fichier
existant. Créer un `middleware.ts` ne ferait rien.

### Toutes les pages publiques vivent sous `app/[locale]/`

`next-intl` est actif et massivement utilisé (`useTranslations`, routing i18n,
segment `[locale]`). Locales : `fr` et `en` uniquement. Tout chemin cité sans
`[locale]` est un chemin faux.

Chemins réels vérifiés le 31/07 :
- `app/[locale]/favoris/page.tsx`
- `app/[locale]/packs/[slug]/PackDetailClient.tsx`
- `app/[locale]/success/page.tsx`
- `app/api/checkout/create-session/route.ts`
- `app/api/stripe/webhook/route.ts`
- `components/ConsentManager.tsx` (et non `components/analytics/`)

### La racine `/` doit rester en 307

Les URL sans préfixe de locale sont redirigées en **301** vers `/fr/...`. Mais la
racine `/` reste en **307** : la cible dépend de la langue du navigateur. Forcer
un 301 sur `/` casserait la négociation i18n et le `x-default`.

### `sendBeacon` ne transporte pas d'en-tête personnalisé

L'instrumentation client utilise `navigator.sendBeacon` avec repli
`fetch keepalive`. Ça fonctionne parce que la route ne lit que des en-têtes posés
automatiquement par le navigateur (`cookie`, `user-agent`, `x-forwarded-for`).
**Ajouter un en-tête custom côté serveur casserait silencieusement le tracking.**

### Supabase JS v2 stocke les tokens en localStorage, pas en cookies

`adminFetch` lit le Bearer token en itérant les clés `sb-*-auth-token` du
localStorage. Une authentification admin server-side par cookie ne fonctionne pas
avec cette configuration.

### Les patches CSS s'accumulent et cassent

Toujours **remplacer un bloc de style entier** plutôt que le patcher
incrémentalement. `position: sticky` est particulièrement fragile quand des
règles `position: static` s'accumulent hors media queries.

### Monaco est routé comme la France

Pour l'expédition : Colissimo, pas FedEx. La normalisation `routingCountry()`
doit être appliquée **partout** où un code pays brut venu de Stripe est comparé
à `"FR"`.

### L'idempotence du webhook Stripe porte sur `pending_orders`, pas sur `webhook_processed`

⚠️ **Corrigé le 31/07 — l'ancienne version de cette note était fausse.**

Le flux actif est `handleUnifiedOrder`. Son claim atomique est :

```
.from("pending_orders")
.update({ status: "consumed", consumed_at: … })
.eq("id", pendingId).eq("status", "pending")
```

Le motif `UPDATE orders … WHERE webhook_processed = false` n'existe que dans le
**flux legacy, qui est mort** : `checkout.session.completed` porte toujours
`metadata.pending_order_id`, donc le dispatch part en `handleUnifiedOrder` puis
retourne immédiatement.

**Conséquence :** `orders.webhook_processed` reste à `false` sur toutes les
commandes réelles. **Ce drapeau n'est pas un indicateur de panne** et ne doit
jamais servir de signal de supervision.

Tout nouvel effet de bord se place **après** le claim `pending_orders`, dans son
propre `try/catch`, sur le modèle de l'email de confirmation — un échec y est
avalé sans compromettre la commande ni provoquer un retry Stripe.

### Deux paniers, deux stores, deux événements

Le panier produits (`milk_cart_v2`) et le panier packs (`milk_pack_cart`) sont
des stores localStorage **séparés**. Un pack est **une seule ligne**, jamais
trois.

Le badge du header relit `milk_pack_cart` et se réabonne à l'événement
`milk-pack-cart-changed`. Cet événement est indispensable : une écriture
localStorage dans le même onglet ne déclenche **pas** l'événement `storage`.
Toute écriture dans un de ces stores doit émettre l'événement correspondant.

### Les valeurs de portée promo sont au singulier en base

`'all'`, `'category'`, `'product'` côté base ; le moteur attend `'products'`.
Le pont est fait par `lib/promo-scope-adapter.ts`.

### Un code promo scopé ne touche jamais un pack

Règle métier absolue. Seuls les codes globaux remisent un pack, sur son prix
forfaitaire. C'est codé et testé — ne pas « corriger ».

### `product.image_url` prime sur `c?.image_url`

Dans le flux Shopping. L'inverse a produit des images de nuancier dans Google
Merchant Center.

### Le trafic interne est filtré par cookie, pas côté serveur

`isInternalTraffic()` (`lib/internal-traffic.ts`) teste le cookie
`milk_internal_traffic=true` **ou** `?internal=milk2026` dans l'URL. Le cookie
est posé côté client, non-httpOnly, valable un an, **par navigateur et par
appareil**.

Ce filtre couvre `fbqTrack` et le chargement du pixel Meta. Il ne peut rien pour
un appareil qui n'a jamais ouvert le lien.

### Une sentinelle sur `.in()` / `.eq()` casse sur une colonne typée

Ne jamais passer une valeur sentinelle (`["none"]`, `"0"`, `""`…) à `.in()` ou
`.eq()` pour couvrir le cas d'une liste vide : sur une colonne typée (`uuid`,
`int`), Postgres rejette le cast et l'erreur remonte comme une **panne de base**
(503, interprétée à tort comme un incident DB). Si la liste est vide, **ne pas
requêter du tout** — partir d'un tableau vide.

Et un `uuid` bien formé n'est **pas** une preuve d'existence : sur une colonne
portant une clé étrangère, **vérifier l'existence, pas le format**. (Coûté : un
503 sur tout panier 100 % packs, plus tous les ajouts de packs perdus en
analytics — commit `4a4f547`.)

### `return null` pendant l'hydratation gèle la position de scroll

Une page qui fait `return null` pendant l'hydratation conserve la position de
scroll précédente : le navigateur n'a rien à scroller au moment de la navigation,
puis le contenu apparaît en place. Le piège est aggravé quand le Provider qui porte
`hydrated` persiste dans le layout — la page suivante ne remonte alors pas du tout,
et le scroll par défaut de Next ne se déclenche jamais.

Tout scroll-to-top doit se déclencher quand le contenu devient **PRÊT**, pas au
montage. Et le hook doit être appelé **AVANT** le `return null` (règle des hooks
React). Vu sur le tunnel `/checkout/*`, corrigé par `useScrollTopWhenReady`.

### Deux notions de CA — et le filtre no-op qui les rend faux

Le projet distingue **deux notions de chiffre d'affaires** :
- **CA comptable** (`countsInAccounting`) : classification `'cliente'` ou
  `'vente_directe'`. Une vente physique est de l'argent encaissé — elle compte en
  comptabilité, TVA et facturation.
- **Statistiques web** (`countsInWebStats`) : `'cliente'` seule. Une vente physique
  n'a produit ni visite ni panier ; l'inclure fausserait le taux de conversion et
  le panier moyen.

Les deux composent avec `isValidOrder` (tests, annulations, remboursements exclus).

⚠️ **Piège structurel.** Un filtre portant sur une colonne (`is_internal_test`,
`classification`) est un **no-op silencieux si la colonne n'a pas été SÉLECTIONNÉE**
dans la requête : elle vaut `undefined` et le prédicat la laisse passer. Le filtre
paraît correct à la lecture, et ne filtre rien. C'est ce qui a rendu les
statistiques de parrainage fausses depuis l'origine.

**Règle : toute requête utilisant `isValidOrder`, `countsInAccounting` ou
`countsInWebStats` DOIT sélectionner explicitement `is_internal_test` ET
`classification`.**

---

## Lire les données sans se tromper

Ces erreurs ont toutes été commises sur ce projet, plusieurs fois.

### Ne jamais comparer des unités différentes

Une **session** n'est pas un **événement**. Une visiteuse qui ouvre trois fiches
produit génère 1 session et 3 `ViewContent`. Diviser des sessions par des clics
puis comparer à un compteur d'événements produit des écarts imaginaires.

### Ne jamais conclure sur la dernière journée d'un export Meta

L'attribution est différée (fenêtre de 7 jours). Un jour affiché à 0 conversion
peut en compter 6 le lendemain, rétroactivement.

### Vérifier les bornes de la fenêtre avant de calculer un rythme

Une campagne lancée à 18h49 n'a pas consommé une journée pleine ce jour-là.

### La taille estimée d'une audience Meta se lit après rechargement

L'interface affiche brièvement l'ancienne valeur après sélection.

### Un petit dénominateur ne prouve rien

0 achat sur 19 paniers a environ 17 % de probabilité si le vrai taux est de 9 %.
Ce n'est pas un signal. Toujours estimer si l'observation est distinguable du
bruit avant de tirer une alarme.

### Le contexte métier prime sur les références sectorielles

Les taux de conversion « standards » mélangent tous les trafics. Une femme
enceinte qui clique sur un CTA « Acheter » dans un Reel n'est pas un visiteur
lambda. Une audience de reciblage n'a pas besoin d'un filtre démographique —
elle s'est qualifiée elle-même par son comportement.

### Une image ne se valide pas en la regardant vite

Un graphique dont l'axe des abscisses porte des libellés dupliqués (« Juin »
présent en 2026 **et** en 2027) verra matplotlib superposer les deux années au
même point. La courbe repart en arrière et se croise. Toujours passer des
positions numériques et poser les étiquettes séparément.

---

## Meta Ads sur ce compte

**Le panneau « Score de campagne » et les suggestions de Meta AI poussent
systématiquement vers les automatisations.** Le score de 100 mesure la conformité
aux recommandations de Meta, pas la qualité de la campagne.

**Ne jamais activer l'audience Advantage+ sur une campagne de reciblage.** Elle
autorise Meta à diffuser au-delà de l'audience personnalisée.

**Contournement vérifié pour cibler une audience personnalisée en campagne Ventes
Advantage+ :** créer une **audience enregistrée** qui *inclut* l'audience
personnalisée, puis la sélectionner via « Utiliser une audience enregistrée ».
Contrôle de réussite : la taille estimée doit chuter à la taille réelle —
**après rechargement de la page**.

**Le partage de budget** n'a aucun intérêt sur une campagne à un seul ad set.
Contrôle : le maximum hebdomadaire affiché doit valoir exactement 7 × le budget
quotidien.

**Décocher « Publicités multi-annonceurs »** : Meta s'y autorise explicitement à
redimensionner ou recadrer la créa.

**Toujours vérifier la piste audio d'une vidéo avant diffusion.** Un fichier peut
porter une piste AAC déclarée tout en étant en silence numérique (−91 dB).

**Le code d'événement de test du CAPI empêche toute comptabilisation.** Tant que
`META_CAPI_TEST_EVENT_CODE` est défini, les événements n'apparaissent que dans
l'outil de test : ni rapports, ni optimisation, ni audiences. À retirer dès la
validation faite.

---

## Format des livrables

### Prompt de reconnaissance
Points numérotés · une question précise par point · réponse attendue sous forme
`fichier:ligne` + verdict + **CERTAIN**/**INCERTAIN** · section finale « ce qui
m'a surpris » · rappel explicite : lecture seule, aucune modification, aucun
commit.

Trois verdicts possibles pour un bug supposé : **CONFIRMÉ**, **DÉJÀ CORRIGÉ**,
**INEXISTANT**.

### Prompt d'implémentation
Contexte · objectif · étapes numérotées · **interdictions explicites** · critères
de validation · ce qui doit figurer dans le rapport final.

Les interdictions comptent autant que les instructions. « N'invente aucun
indicateur », « ne réécris pas ce composant, importe-le », « ne touche à aucun
calcul existant » évitent la majorité des dérives.

### Rapport de lot
Fichiers touchés · ce qui a changé · **écarts assumés par rapport à la consigne,
et pourquoi** · confirmation `tsc` + `build` · hash du commit · **mention en tête
si `docs/MILK-METHODE.md` a été modifié**.

La section des écarts est essentielle. Un agent qui s'écarte de la consigne pour
une bonne raison et le dit vaut mieux qu'un agent qui obéit littéralement à une
consigne erronée.
