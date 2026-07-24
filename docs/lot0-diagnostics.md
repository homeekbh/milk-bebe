# Lot 0 — Diagnostics (lecture seule)

> Préalables aux lots suivants. Aucune modification de code/données. Le SELECT de découverte
> Bandeau/Bonnet est la **Section 1** de `supabase/scripts/stock-motif-bandeau-bonnet.sql` (S1).

---

## D-Pastilles (tâche 1) — regroupement des pastilles couleur/motif

**Verdict : regroupement PAR `category_slug`.** Confirmé.

Dans `app/[locale]/produits/[slug]/ProductClient.tsx` :

1. **Produit COURANT** — ses propres motifs viennent de `product.colors`
   (`couleursDispos`, rendu ~[L693-703](../app/[locale]/produits/[slug]/ProductClient.tsx#L693)).
   Chaque pastille est **cliquable** (`setCouleur` + `setMotifId`) → sélectionne le motif *au sein
   du même produit*. Comme chaque produit M!LK = **1 motif**, il n'y a en pratique qu'1 pastille
   « propre ».
2. **AUTRES produits** — `related` est chargé côté client via `/api/produits`, filtré
   `p.category_slug === initialProduct.category_slug`, **`slice(0, 4)`**
   (~[L389-400](../app/[locale]/produits/[slug]/ProductClient.tsx#L389)). Rendu en pastilles
   **liens** vers `/produits/<slug>` (~[L710-729](../app/[locale]/produits/[slug]/ProductClient.tsx#L710)).

**Écart avec la cible (tâche 3)** — la refonte veut **1 pastille par PRODUIT** de la même
catégorie / **sous-catégorie**, le **courant visible + son nom + NON cliquable**, les autres
cliquables. Points à traiter au Lot 5 :
- Le courant est aujourd'hui cliquable (sélection de motif) → le rendre **non cliquable** (badge
  « produit actuel »), afficher son **nom**.
- `related` est **tronqué à 4** et filtré par `category_slug` → au Lot 5, retirer/augmenter la
  limite et filtrer par **sous-catégorie** *quand le regroupement par sous-cat sera activé*
  (D3 : différé — un **flag** commutera `category_slug` → `subcategory_slug` sans refonte).
- Éviter le doublon « pastille propre + pastille du même produit dans related » (le fetch related
  exclut déjà `p.id !== initialProduct.id`).

---

## D-Carte (tâche 10) — « carte des visiteurs »

**Verdict : la carte n'affiche PAS les visiteurs — elle agrège les COMMANDES par ville.**

`app/api/admin/analytics/geo/route.ts` lit la table **`orders`**
([L15-33](../app/api/admin/analytics/geo/route.ts#L15)) : `shipping_address.city ?? relay_city ??
"Inconnu"`, filtré `status IN VALID_STATUSES` + fenêtre `periodRange(period)`
(rolling *N* jours depuis maintenant, en ISO/UTC — `lib/analytics-server.ts`
[L32-43](../lib/analytics-server.ts#L32)).

**Explication des symptômes :**
- **24 h → carte vide** : peu ou **aucune commande** sur 1 jour → aucune ville. (Comportement normal
  d'une source *commandes*, mais perçu comme un bug pour une carte dite « visiteurs ».)
- **3 j → points incohérents avec les autres stats** : une poignée de commandes → villes éparses qui
  ne correspondent pas aux **visiteurs/sessions** affichés ailleurs (source différente).
- **7 j → OK** : assez de commandes pour que la carte paraisse peuplée.

**Cause racine = mauvaise source de données** (commandes au lieu de visiteurs), pas un bug de
fenêtre. Et une **vraie source visiteurs existe** : `page_views` capture `country` / `region` /
`city` depuis les en-têtes IP Vercel (`app/api/track-view/route.ts`
[L46-51](../app/api/track-view/route.ts#L46) ; noter que la table `page_views` n'a pas de migration
de colonnes geo dédiée — les champs sont insérés par le track-view, à confirmer côté schéma réel).

**Directions de correction (Lot 8, selon D7) :**
- **(A) Intention = visiteurs** → re-sourcer `geo/route.ts` sur `page_views` agrégé par `city`
  (filtrer les bots via `botSessionIds`), même fenêtre `periodRange`. Cohérent avec les autres stats
  de trafic. **Recommandé** (le nom « visiteurs » + l'existence de `page_views.city` pointent vers ça).
- **(B) Intention = commandes** → **renommer** la carte « Commandes par ville » et accepter la
  rareté sur 24 h/3 j (voire masquer la carte < seuil de commandes).

→ **D7 à trancher** avant le Lot 8. Vérifier aussi au Lot 8 que `page_views.city` est bien peuplé
en prod (dépend de Vercel IP headers).

---

## D-Promo (prep tâche 11) — point d'application de la portée

- Logique **centralisée** dans `lib/promo-validate.ts` (`validatePromoCode`, `validatePromoCombo`).
- **Aperçu panier** : `POST /api/promo/validate` ne reçoit que `{ code, order_total }`
  ([L8](../app/api/promo/validate/route.ts#L8)) — **pas les items** → il ne peut pas, en l'état,
  calculer un sous-total *éligible* par portée. Il faudra lui passer les items (touche le panier).
- **Vérité serveur** : re-validation dans `create-session`
  ([~L388](../app/api/checkout/create-session/route.ts#L388)), qui **possède les items validés
  serveur** (R-MOTIF, prix DB). → **C'est là** que la portée doit être vérifiée (jamais depuis le
  body). D5 = remise sur **sous-total éligible seul** ; refus explicite si 0 item éligible.
- Au Lot 7 : étendre `validatePromoCode` pour accepter la portée (`scope_type`/`scope_value` lus en
  DB) + un **sous-total éligible** (calculé par l'appelant qui a les items). `create-session` filtre
  les items selon la portée ; l'aperçu panier passe aussi les items.

---

## Renvois

- **S1** (motif Terracotta Bandeau/Bonnet) : `supabase/scripts/stock-motif-bandeau-bonnet.sql`
  (Section 1 = SELECT de découverte des tailles/stock — à relire AVANT toute écriture).
- **S2/S3/S4** : migrations `026_subcategories.sql`, `027_product_old_slug.sql`,
  `028_promo_scope.sql` (toutes NON exécutées).
