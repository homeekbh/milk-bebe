# Plan d'exécution global — chantier modèle produit + bugs/features

> **Aucun code ici.** Plan ordonné en **lots** regroupés par fichier/zone/dépendance, à valider
> **lot par lot** avant exécution. Base existante : cache `revalidateProduct` (commit `497af43`,
> non poussé) — à **étendre** (niveau sous-catégorie). Contraintes rappelées en fin de doc.

## Principe de regroupement

Trois « hot files » concentrent la majorité des tâches — on les ouvre **une seule fois** :

| Fichier | Tâches qui le touchent | Lot |
|---|---|---|
| `app/[locale]/produits/[slug]/ProductClient.tsx` | 3 (pastilles), 5 (fil d'ariane), 8 (mono-taille), 12 (continuer achats) | **Lot 5** |
| `app/api/admin/products/route.ts` | 4 (subcat passthrough), 5 (reval subcat), 9 (save old_slug) | **Lot 3** (+ anticipe 9) |
| `app/admin/produits/[id]/page.tsx` | 4 (champ subcat), 7 (retrait blocage no-motif) | **Lot 4** |

Les **fondations** (SQL + modèle données + libellés dynamiques) viennent **avant** la fiche et
l'admin qui en dépendent. Les **diagnostics** sont placés **avant** les lots qu'ils conditionnent.

---

## Vue d'ensemble (ordre + dépendances)

| # | Lot | Tâches | Dépend de | Peut se paralléliser |
|---|---|---|---|---|
| 0 | Diagnostics (lecture seule) | 1, 10a, prep 2/11 | — | — |
| 1 | SQL fondations (écrits, non exécutés) | 2, 4-db, 6-db, 9-db, 11-db | 0 | — |
| 2 | Modèle données : cat/sous-cat + libellés dynamiques (backend) | 4-back, 6 | 1 | — |
| 3 | Product API route (subcat + reval + old_slug) | 4-api, 5-reval, 9-save | 1, 2 | — |
| 4 | Admin produit + catégories (UI) | 4-ui, 7 | 1, 2 | — |
| 5 | Fiche produit (ProductClient + page.tsx) | 3, 5, 8, 12 | 0(diag), 1, 2, 3 | — |
| 6 | Redirections 404 (mécanisme) | 9-redirect | 1(S3), 3 | oui |
| 7 | Codes promo — portée serveur | 11 | 1(S4) | oui (isolé) |
| 8 | Carte visiteurs (fix après diag) | 10b | 0 | oui (isolé) |
| 9 | Journal — décalage date | 15 | — | oui (isolé) |
| 10 | P2 finitions | 13, 14 | (13←cache) | oui |

**≈ 11 lots.** Ordre principal 0→1→2→3→4→5, puis 6, puis les isolés (7, 8, 9) dans n'importe
quel ordre, puis P2 (10). Les lots 7/8/9 ne partagent aucun fichier avec le bloc modèle produit.

---

## Lot 0 — DIAGNOSTICS (préalables, lecture seule)

Produire un court rapport pour chaque, qui alimente les lots suivants.

- **D-Pastilles (tâche 1)** — Confirmé au diagnostic préliminaire, à formaliser :
  regroupement **par `category_slug`**. Le produit COURANT rend ses propres motifs
  (`couleursDispos = product.colors`, [ProductClient.tsx ~693-703](../app/[locale]/produits/[slug]/ProductClient.tsx#L693)) ;
  les AUTRES produits de la même catégorie viennent de `related` (fetch `/api/produits`,
  [~392-395](../app/[locale]/produits/[slug]/ProductClient.tsx#L392)) et sont rendus en pastilles
  **liens** ([~710-729](../app/[locale]/produits/[slug]/ProductClient.tsx#L710)). → À valider : la
  cible (tâche 3) veut **1 pastille par produit** même cat/sous-cat, le courant **non cliquable**.
- **D-Carte (tâche 10a)** — Source = **`orders`** agrégés par ville
  ([geo/route.ts](../app/api/admin/analytics/geo/route.ts#L15-L33)), **pas** des visiteurs :
  `shipping_address.city ?? relay_city ?? "Inconnu"`, filtré `status IN VALID_STATUSES` +
  `periodRange(period)`. Hypothèse à confirmer : 24 h → peu/pas de commandes → carte vide ;
  incohérence 3 j = fenêtre `periodRange`/fuseau **ou** libellé « visiteurs » alors que ce sont des
  **commandes**. Comparer avec la source des autres stats (page_views vs orders) + vérifier
  `normalizePeriod`/`periodRange` dans `lib/analytics-server`.
- **D-Bandeau/Bonnet (prep tâche 2)** — SELECT de découverte (non modifiant) : `sizes`,
  `sizes_stock`, `stock`, `colors` actuels du Bandeau et du Bonnet → pour écrire la migration motif
  avec la bonne structure taille (mono-taille ? quelles tailles ?).
- **D-Promo (prep tâche 11)** — Point d'application confirmé : logique centralisée dans
  `lib/promo-validate.ts` ; re-validation serveur dans create-session
  ([~388](../app/api/checkout/create-session/route.ts#L388)). La portée devra être vérifiée **là**
  (create-session a les items du panier ; `/api/promo/validate` n'a que `order_total`).

---

## Lot 1 — SQL FONDATIONS (écrits, **NON exécutés** — Bou relit et lance)

Tout SQL est idempotent, ciblé, précédé d'un SELECT de confirmation (comme les scripts
`stock-align-*` / `backfill-motif-id` existants). Le **code applicatif** est écrit **défensivement**
(tolère colonne absente / null → fallback) pour ne pas casser avant exécution.

- **S1 — Motif obligatoire Bandeau/Bonnet (tâche 2)** : crée un motif unique (`id` uuid,
  `sizes` = product.sizes, `sizes_stock` reconstruit, `stock` = 17 Bandeau / 18 Bonnet) dans
  `products.colors` pour les 2 produits `nb_motifs=0`. Section 1 = SELECT découverte (cf. Lot 0),
  Section 2 = UPDATE ciblé par nom. **Décision D6** : nom du motif à créer (« Uni » ? coloris ?).
- **S2 — Sous-catégories + libellés (tâches 4, 6)** : ajoute `products.subcategory_slug`
  (+ éventuellement `subcategory_label`) ; **décision D2** : table `subcategories`
  (slug, label, category_slug) et/ou colonne label sur `categories` comme **source de vérité des
  libellés dynamiques**. La table `categories` existe déjà (métadonnée admin, avec fallback
  « does not exist » → peut être absente en prod : à créer proprement si on la rend publique).
- **S3 — Redirections (tâche 9)** : `products.old_slug` (ou table `product_redirects(old_slug,
  product_id)` si on veut un historique multi-renommages). **Décision D4** sur le modèle.
- **S4 — Portée codes promo (tâche 11)** : `promo_codes.scope_type` (`all`|`category`|`product`)
  + `promo_codes.scope_value` (slug catégorie / id produit). **Décision D5** sur le comportement
  panier mixte.

---

## Lot 2 — Modèle données : catégories/sous-catégories + libellés dynamiques (backend)

**Fichiers** : `app/api/admin/categories/route.ts` (+ endpoint sous-catégories), un **resolver de
libellés** partagé (`lib/category-labels.ts` — lit DB `categories`/`subcategories`, fallback sur
`CATEGORY_SEO`/slug capitalisé), `app/[locale]/categorie/[slug]/page.tsx` (libellés dynamiques),
`app/api/produits/route.ts` (expose `subcategory_slug`).

**Tâches** : 4 (données/back), 6 (libellés dynamiques). **Dépend** : S2.

**Anticipation** : le resolver de libellés sera **réutilisé** par la fiche (Lot 5, fil d'ariane) et
l'admin (Lot 4) → l'écrire générique dès maintenant. Garder `CATEGORY_SEO` (title/desc/keywords SEO)
comme fallback — **décision D2** : « libellés dynamiques » = **affichage seul** ou aussi H1/SEO ?

---

## Lot 3 — Product API route (subcat + revalidation + old_slug)

**Fichier** : `app/api/admin/products/route.ts` + `lib/revalidate-product.ts`.

**Tâches** : 4 (`subcategory_slug` passe déjà via `clean = {...rest}` — vérifier + coercition),
5 (étendre `revalidateProduct` au niveau **sous-catégorie**), **9 anticipé** (sauvegarder `old_slug`
quand le slug change, dans le PUT déjà ouvert).

**Dépend** : S2, S3, Lot 2. **Anticipation forte** : ce PUT est **déjà** modifié par le cache
(`before` select + `revalidateProduct`). On y greffe : (a) `subcategory_slug` dans le `before` et
l'appel de reval, (b) `old_slug = before.slug` à l'écriture si renommage. → Le **travail
« product-route » de la tâche 9 est fait ici** ; il ne restera que le **mécanisme de redirect**
(Lot 6).

`revalidateProduct(slug, [catAncienne, catNouvelle], oldSlug, [subcatAncienne, subcatNouvelle])` —
extension du helper pour revalider aussi `/{locale}/sous-categorie/<subcat>` **si** une page
sous-catégorie existe (**décision D1**).

---

## Lot 4 — Admin : produit + catégories (UI)

**Fichiers** : `app/admin/produits/[id]/page.tsx` (champ sous-catégorie + **retrait du blocage
« aucun motif »**, tâche 7), `app/admin/categories/page.tsx` (CRUD sous-catégorie, tâche 4-ui).

**Tâches** : 4 (UI), 7 (nettoyage). **Dépend** : S1 (pour que « tout produit a un motif » soit vrai
→ tâche 7 sûre), S2, Lot 2.

**Anticipation** : en ouvrant `produits/[id]/page.tsx` pour ajouter le champ sous-catégorie, on
**retire au même endroit** le blocage no-motif (tâche 7) et on vérifie que la saisie de stock ne
dépend plus d'un « produit sans motif ». Un seul passage sur ce gros fichier.

---

## Lot 5 — Fiche produit (le hot-file : ProductClient + page.tsx)

**Fichiers** : `app/[locale]/produits/[slug]/ProductClient.tsx` (**chirurgical**),
`app/[locale]/produits/[slug]/page.tsx` (**chirurgical, header eyebrow — jamais de régénération**).

**Tâches (une seule ouverture)** :
- **3 — Pastilles** : afficher 1 pastille par produit de la même cat/**sous-cat** ; le **courant** =
  visible + son nom + **non cliquable** ; les autres = liens. Réutilise `related` (filtrer par
  subcat si présente, sinon category), retire l'auto-affichage des motifs propres si redondant.
- **5 — Fil d'ariane 3 niveaux** : Accueil / Produits / Catégorie / **Sous-catégorie** / Produit,
  côté `page.tsx` (eyebrow) et `ProductClient` (Breadcrumb) via le resolver de libellés (Lot 2).
  **Décision D1** : la sous-catégorie est-elle un **lien** (page dédiée) ou un libellé non cliquable ?
- **8 — Mono-taille élargie** : `taillesDispos.length === 1` (quel que soit le nom, pas seulement
  `"Taille unique"`) → cacher le sélecteur + auto-sélection. Corrige le Lange (`120×120 cm`).
  Étendre `isTailleUniqueOnly`/`effectiveTaille` ([~462](../app/[locale]/produits/[slug]/ProductClient.tsx#L462)).
- **12 — « Continuer mes achats »** : bouton haut + bas de la colonne achat (lien `/produits` ou
  catégorie), sans toucher au CTA panier.

**Dépend** : Lot 0 (D-Pastilles), Lot 2 (labels + subcat), S1 (motifs partout). **Ne touche pas** au
stock-par-motif (phases 1-7) ni à R3.

---

## Lot 6 — Redirections 404 (mécanisme)

**Fichiers** : `proxy.ts` (déjà un `NextResponse.redirect(url, 301)` [:47](../proxy.ts#L47)) **ou**
`app/[locale]/produits/[slug]/page.tsx` (avant `notFound()` : lookup `old_slug` → 301 vers le
nouveau). Idem catégorie devenue vide → redirect vers `/produits` plutôt que 404.

**Tâche** : 9 (partie redirect ; la sauvegarde `old_slug` est déjà faite au Lot 3). **Dépend** : S3.
**Décision D4** : proxy (centralisé, tôt) vs fiche (chirurgical, DB déjà lue). **Isolé**, peut passer
après le bloc modèle.

---

## Lot 7 — Codes promo : portée serveur (tâche 11)

**Fichiers** : `lib/promo-validate.ts` (cœur — accepte scope + calcule le sous-total **éligible**),
`app/api/admin/promos/route.ts` (persiste scope), `app/admin/codes-promos/page.tsx` (UI choix
portée), `app/api/checkout/create-session/route.ts` (**exception checkout sanctionnée** — vérifie la
portée contre les items validés serveur), `app/api/promo/validate` + panier (aperçu).

**Dépend** : S4. **Validation TOUJOURS depuis la DB** (scope lu sur `promo_codes`, jamais du body).
**Décision D5** : panier mixte → remise sur sous-total éligible seulement, ou refus si un item hors
portée ? **Isolé** du bloc modèle (sauf create-session, touché au strict nécessaire).

---

## Lot 8 — Carte visiteurs (fix, tâche 10b)

**Fichiers** : `app/api/admin/analytics/geo/route.ts`, `lib/analytics-server` (`periodRange` /
`normalizePeriod`), composant carte de la page analytics. **Dépend** : Lot 0 (D-Carte).
**Décision D7** : la carte doit-elle montrer les **visiteurs** (source page_views/geo) ou les
**commandes par ville** (actuel) ? Le fix diffère (relabel + fenêtre vs nouvelle source). **Isolé.**

---

## Lot 9 — Journal : décalage de date (tâche 15)

**Fichiers** : à localiser au diagnostic — export CSV vs affichage écran du journal (probable
`app/admin/factures/journal` ou `app/api/admin/export/*`). Cause probable : **formatage UTC vs
local** (30/05 CSV vs 31/05 écran). Petit lot **isolé** : harmoniser le fuseau des deux côtés.

---

## Lot 10 — P2 finitions (en dernier)

- **13 — Revalidation webhook packs/legacy** : `app/api/stripe/webhook/route.ts` +
  `lib/revalidate-product.ts`. Résoudre le `slug` des pièces de pack (via `prodMap`) et du handler
  legacy pour revalider leurs fiches à la vente. Best-effort, post-claim, non bloquant (mêmes règles
  que le commit `497af43`). Non urgent (rattrapé par ISR 900 s).
- **14 — 2e passage audit admin** (lecture seule, doc) : Newsletter, Homepage, Pop-ups,
  Compta/Factures — non audités au 1er passage. Livrable = section ajoutée à
  `docs/audit-admin-fonctionnel.md`.

---

## SQL à écrire (récap — tous NON exécutés)

| Réf | Objet | Tâche | Pré-requis lecture |
|---|---|---|---|
| S1 | Motif unique Bandeau (17) + Bonnet (18) dans `products.colors` | 2 | SELECT découverte (D-Bandeau/Bonnet) |
| S2 | `products.subcategory_slug` (+ label) ; table `subcategories`/`categories` | 4, 6 | — |
| S3 | `products.old_slug` (ou table `product_redirects`) | 9 | — |
| S4 | `promo_codes.scope_type` + `scope_value` | 11 | — |

Chaque script : Section 1 SELECT de confirmation → Section 2 écriture ciblée idempotente → Section 3
post-vérif (modèle des scripts `stock-*` existants). Clés de taille **lues en base**, jamais retapées.

---

## Décisions / conflits à trancher AVANT exécution

| Réf | Décision | Impacte | Recommandation |
|---|---|---|---|
| **D1** | Sous-catégorie = **page dédiée** (`/categorie/[cat]/[subcat]` ou `/sous-categorie/[slug]`) **ou** libellé de fil d'ariane **non cliquable** ? | Lots 2, 3(reval), 5(breadcrumb) | Démarrer **non cliquable** (0 route nouvelle), promouvoir en page si besoin |
| **D2** | Source de vérité des libellés cat/sous-cat : table `categories`/`subcategories` (dynamique) vs denormalisé produit. Et « dynamique » = **affichage seul** ou aussi H1/SEO ? | Lots 1(S2), 2, 5 | Table dédiée pour l'**affichage** ; garder `CATEGORY_SEO` pour le SEO (fallback) |
| **D3** | Sous-catégories **maintenant** ou plus tard ? (« 1 seul modèle → pas besoin » du regroupement visible) | Lots 1-5 | Construire **schéma + admin** ; **différer** le regroupement pastilles-par-subcat tant qu'il n'y a qu'un modèle |
| **D4** | Redirect : `old_slug` + lookup (recommandé) vs `proxy.ts` vs `next.config`. Où le lookup vit ? | Lots 1(S3), 6 | `old_slug` en DB + lookup **avant `notFound()`** dans la fiche (chirurgical) |
| **D5** | Promo portée : panier **mixte** → remise sur sous-total éligible seul, ou refus si item hors portée ? | Lot 7 | Remise sur **sous-total éligible** (plus doux) ; refus explicite si 0 item éligible |
| **D6** | Nom du motif à créer pour Bandeau/Bonnet | Lot 1(S1) | À fournir (ex. « Uni » ou le coloris réel) |
| **D7** | Carte = **visiteurs** (page_views/geo) ou **commandes par ville** (actuel, à relabelliser) ? | Lot 8 | Trancher après D-Carte ; si visiteurs, prévoir une source geo réelle |

### Conflits / vigilance
- **create-session** n'est touché **que** par le Lot 7 (portée promo) — exception explicitement
  autorisée. On ne touche NI R3, NI l'idempotence, NI le stock-par-motif.
- **`produits/[slug]/page.tsx`** : uniquement header (eyebrow) + éventuel lookup `old_slug` — **jamais
  de régénération** de la coque.
- **Remboursement admin** : hors de tous les lots. On n'y touche pas.
- **SQL non exécuté** : chaque feature dépendant d'une colonne doit **fonctionner (défensivement)
  avant** exécution — sinon prévoir un ordre où Bou lance le SQL entre deux lots (à signaler au
  moment de la validation du lot concerné).

---

## Ordre recommandé (résumé)

**0** Diagnostics → **1** SQL fondations → **2** Modèle données (labels/subcat back) →
**3** Product API (subcat + reval + old_slug) → **4** Admin UI (produit + catégories, +tâche 7) →
**5** Fiche (pastilles + fil d'ariane + mono-taille + continuer achats) → **6** Redirections →
puis isolés **7** Promo, **8** Carte, **9** Journal → **10** P2 (webhook packs/legacy, audit admin).

Validation **lot par lot** ; les décisions D1-D7 sont à trancher au plus tard à l'entrée du lot qui
les consomme (D1/D2/D3 dès le Lot 1).
