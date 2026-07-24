# Plan — Moteur de codes promo (portée par produit) + relocalisation parrain

> **Aucun code ici.** Analyse de l'existant + algorithme complet + structures SQL (non exécutées) +
> points d'insertion + cas limites + découpage en sous-lots. À valider ENSEMBLE (logique + exemples
> chiffrés) avant tout code. Contraintes : validation **serveur** (create-session), anti-forge, ne rien
> casser (idempotence webhook, R3, tunnel, parrain, stock-par-motif), **calcul exact au centime**.

---

## PARTIE 1 — ANALYSE DE L'EXISTANT

### 1.1 Validation & application d'un code promo (aujourd'hui)

| Étage | Fichier:ligne | Rôle |
|---|---|---|
| Validation 1 code | [lib/promo-validate.ts:46-121](../lib/promo-validate.ts#L46) | `validatePromoCode(code, subtotal)` : DB (actif, dates, max_uses), **min_order testé sur `subtotal`** (:78), calcule `discount` (percent/fixed/free_shipping) **sur le sous-total ENTIER** (:89-96). **Ne lit PAS `scope_type`/`scope_value`** (colonnes créées au Lot 1 mais **inutilisées**). |
| Cumul (pur) | [lib/promo-combine.ts:28-66](../lib/promo-combine.ts#L28) | `combinePromos(promos, subtotal)` : compat **MUTUELLE** obligatoire (:31-43), **fixes puis %** sur le reste (:48-49), **plafond 60 %** si ≥2 codes (:55). Remise appliquée au **sous-total GLOBAL**, pas par produit. |
| Validation N codes | [lib/promo-validate.ts:134-154](../lib/promo-validate.ts#L134) | `validatePromoCombo(codes, subtotal)` : valide chacun (DB) puis `combinePromos`. |
| API temps réel | [app/api/promo/validate/route.ts:18-47](../app/api/promo/validate/route.ts#L18) | `POST {code, order_total}` → `validatePromoCode`. **N'a PAS les items** (juste `order_total`) → ne peut pas, en l'état, décider d'une portée. |
| Panier (client) | [app/[locale]/panier/page.tsx:52-181](../app/[locale]/panier/page.tsx#L52) | State `promoCodes[]`, `combinePromos` miroir (:132), `recheckPromos` re-valide au changement de sous-total (:142-181). |
| **Serveur (facturation)** | [app/api/checkout/create-session/route.ts:388-415](../app/api/checkout/create-session/route.ts#L388) | RE-validation : `validatePromoCombo(codes, subtotal)` → `serverDiscount` (remise globale), dégradation gracieuse (retire un code KO). **Fait foi.** |
| Billing Stripe | [create-session:675-707](../app/api/checkout/create-session/route.ts#L675) | `totalDiscount = serverDiscount + parrainDiscount + rewardDiscount` → **UN seul coupon Stripe `amount_off`** (:691-697). |

**Conséquence clé** : la remise est aujourd'hui un **seul montant € sur le total**. La portée par produit
changera **le calcul de `serverDiscount`**, pas le billing (toujours un `amount_off` = somme).

### 1.2 Parrainage / filleul (aujourd'hui)

**Deux mécaniques** (cf. [lib/parrainage.ts:8-16](../lib/parrainage.ts#L8)) :
- **Méca 1 — code parrain (filleul)** : le filleul saisit le code du parrain → **remise de `montant_recompense` (5 €)** si `totalApresPromo ≥ seuil_filleul` (60 €). Calcul : [computeParrainage:86-94](../lib/parrainage.ts#L86).
- **Méca 2 — récompenses (parrain)** : le parrain a des récompenses accumulées (5 € each), cochables par **barème progressif** `seuils_parrain [60,80,90,100]` sur `totalApresParrain`. Calcul : [:96-126](../lib/parrainage.ts#L96).

- **Ordre STRICT** ([:8-16](../lib/parrainage.ts#L8)) : sous-total → −promo → livraison(≥60) → −parrain(méca1, ≥seuil_filleul) → −récompenses(méca2, barème). Tous seuils `>=`.
- **Anti-abus** : [validateParrainCode:36-62](../lib/parrainage-server.ts#L36) (existe, actif, **jamais son propre code** via userId **ou** email). Crédit récompense parrain **réservé au filleul AUTHENTIFIÉ** ([create-session:518-525](../app/api/checkout/create-session/route.ts#L518)).
- **Réservation atomique** des récompenses (anti double-dépense) : [reserveRewards/releaseRewards:87-114](../lib/parrainage-server.ts#L87).
- **Annulation au refund** : [decideRewardOnRefund](../lib/parrainage-refund.ts#L21) (total+disponible → cancel ; partiel/utilisée → révision) — appliqué par le webhook `charge.refunded`.
- **Saisie aujourd'hui** :
  - **Méca 1 (code parrain)** : **DANS LE PANIER** ([panier:58-61](../app/[locale]/panier/page.tsx#L58)) → écrit dans CheckoutContext.
  - **Méca 2 (récompenses)** : **DÉJÀ à l'étape PAIEMENT** ([panier:198-201](../app/[locale]/panier/page.tsx#L198) le note ; [checkout/paiement/page.tsx:91-174](../app/[locale]/checkout/paiement/page.tsx#L91) sélectionne + calcule).
- **Application serveur** : [create-session:459-555](../app/api/checkout/create-session/route.ts#L459) (re-valide, `reserveRewards`, `computeParrainage`, payload draft).

> Donc le Lot 7 ne « déplace » que **la saisie du code parrain (méca 1)** du panier vers l'étape
> paiement — la méca 2 y est déjà. Le **calcul et l'anti-abus serveur ne bougent pas**.

### 1.3 Sous-total / remise / livraison / seuil (aujourd'hui)

- **Sous-total** : [create-session:385-386](../app/api/checkout/create-session/route.ts#L385) `productsSubtotal + packsSubtotal` (serveur, jamais le client).
- **Totaux (pur, partagé client+serveur)** : [lib/cart-totals.ts:36-56](../lib/cart-totals.ts#L36) `computeCartTotals` : `totalAfterPromo = subtotal − discount` ; port via `computeShipping` sur `totalAfterPromo`.
- **Port + seuil 60 €** : [lib/delivery-config.ts:151-180](../lib/delivery-config.ts#L151) `computeShipping` : `basePrice≤0`→0 ; **`promo.free_shipping`→0** (:164) ; `cumulable_avec_livraison===false`→port payant (:169) ; `subtotal≥seuil`→0 (:174) ; sinon `basePrice`. Seuil lu via `getFreeShippingThreshold()` ([create-session:421](../app/api/checkout/create-session/route.ts#L421)).
- **Le flag « offre_livraison » existe DÉJÀ** : colonne `promo_codes.free_shipping` (bool) + `type='free_shipping'`, persistée par [api/admin/promos/route.ts:39,83](../app/api/admin/promos/route.ts#L39) et lue par `validatePromoCode` (:99-101). C'est **le** flag du point 5.
- **International** : `computeInternationalCartTotals` (port de zone, JAMAIS gratuit).

---

## PARTIE 2 — ALGORITHME COMPLET DU NOUVEAU MOTEUR (portée par produit)

### 2.1 Principe

On **remplace** le cumul « sur le sous-total global » (`combinePromos`) par un moteur **par produit** :
chaque unité facturable (ligne produit ou ligne pack) est **verrouillée** au **premier** code (ordre de
saisie) qui la couvre selon sa **portée**. Un produit remisé par un code **n'est jamais re-remisé**
(RÈGLE 2, garantie par le verrouillage). Le 2ᵉ code n'agit que sur les produits **restants**.

Nouveau module PUR proposé : **`lib/promo-scope.ts`** (sans I/O, testable comme `promo-combine.ts`),
utilisé par le panier (affichage) ET create-session (facturation). La validation DB (existence, actif,
dates, portée réelle) reste côté `promo-validate.ts` (serveur).

### 2.2 Entrées

```
items[]  = unités facturables résolues SERVEUR :
             { kind: 'product'|'pack', id, category_slug, lineTotal }   // lineTotal = prix_unitaire × qty
codes[]  = ≤ 2 codes, DANS L'ORDRE DE SAISIE, chacun DÉJÀ validé (DB) :
             { code, type:'percent'|'fixed'|'free_shipping', value, min_order|null,
               offre_livraison:boolean, scope_type:'all'|'category'|'product',
               scope_value:string|null,        // category_slug si 'category'
               scope_product_ids:string[] }     // ids si 'product'
```

### 2.3 Pseudo-code (calcul par sous-totaux)

```
round2(n) = Math.round((n + EPSILON) * 100) / 100

// couverture d'un item par un code selon la portée
function covers(code, item):
    if code.scope_type == 'all':      return true            // produits ET packs
    if item.kind != 'product':        return false           // 'category'/'product' → produits SEULEMENT
    if code.scope_type == 'category': return item.category_slug == code.scope_value
    if code.scope_type == 'product':  return code.scope_product_ids.includes(item.id)
    return false

// ÉTAPE 1 — verrouillage : chaque item → PREMIER code (ordre) qui le couvre
for item in items:
    item.assigned = null
    for code in codes:                      // ordre de saisie
        if covers(code, item): item.assigned = code.code ; break   // 1er gagnant → verrouillé

// ÉTAPE 2 — sous-total éligible par code (aucun chevauchement par construction)
for code in codes:
    code.eligible = round2( Σ item.lineTotal where item.assigned == code.code )

// ÉTAPE 3 — remise par code sur SON éligible
for code in codes:
    if code.type == 'percent':        code.discount = round2(code.eligible * code.value / 100)
    else if code.type == 'fixed':     code.discount = min(round2(code.value), code.eligible)   // borné à l'éligible
    else /* free_shipping */:         code.discount = 0                                        // seule offre_livraison agit

// ÉTAPE 4 — SEUIL min_order (A2 ACTÉ) : testé sur le TOTAL PANIER après les remises des codes
//   appliqués AVANT lui (le "running total"), PAS sur l'éligible du code, PAS sur le total final.
//   → traitement des codes DANS L'ORDRE DE SAISIE, avec un running total :
//     running = subtotal
//     for code in codes (ordre de saisie) :
//         if code.min_order != null AND running < code.min_order :
//             REJET du code (retiré, message ; ses items restent NON remisés)   // pas de discount
//             continue
//         code.discount = (cf. Étape 3, calculé sur code.eligible)
//         running = round2(running − code.discount)                              // pour le code suivant
//   Exemple (validé) : panier 85€ = pyjama 30 + body 20 + gigoteuse 35.
//     C1 PROMO-PYJAMA -50% (portée pyjama) → discount 15 ; running = 85 − 15 = 70.
//     C2 ETE30 min 60€ -30% : running 70 ≥ 60 → OK ; éligible = body+gigoteuse = 55 → discount 16,50.

// ÉTAPE 5 — remise produit totale + livraison
totalProductDiscount = round2( Σ code.discount des codes NON rejetés )   // pas de double par construction
offreLivraison       = any code appliqué a offre_livraison == true       // flag free_shipping (métropole only)
totalAfterPromo      = round2( subtotal − totalProductDiscount )

// ÉTAPE 6 — parrain/filleul (méca 1) — INCHANGÉ, à l'étape paiement, sur totalAfterPromo
//   computeParrainage(promoDiscount = totalProductDiscount, ...) : si totalAfterPromo ≥ seuil_filleul
//   → parrainDiscount ; puis récompenses (méca 2) par barème. (lib/parrainage.ts, non modifié)

// ÉTAPE 7 — livraison finale (computeShipping, inchangé) :
//   port offert si  offreLivraison (promo.free_shipping)  OU  totalAfterPromo ≥ seuil(60€)  ; sinon basePrice
```

### 2.4 Ordre de calcul DÉFINITIF (spec point 7)

1. **Codes produit → produits verrouillés** (Étapes 1-3).
2. **Vérif seuils (min_order) + activation livraison gratuite** (Étapes 4, `offreLivraison`).
3. **Total après codes promo** (`totalAfterPromo`, Étape 5).
4. **Parrain/filleul à l'étape paiement** si `totalAfterPromo ≥ 60 €` (Étape 6, `computeParrainage` inchangé).
5. **Livraison** : gratuite si `offreLivraison` OU seuil atteint, sinon calculée (Étape 7, `computeShipping` inchangé).

### 2.5 Garde-fous conservés

- **Billing = un seul `amount_off`** = `totalProductDiscount + parrainDiscount + rewardDiscount` (inchangé).
- **Plafond 60 % « tous confondus »** ([create-session:527-543](../app/api/checkout/create-session/route.ts#L527)) : **conservé** comme filet final. Le plafond **par cumul mutuel** de `combinePromos` (:55) disparaît (remplacé par le scoping) — voir A3.
- **Anti-forge** : `covers()` re-jugé côté serveur contre `product.category_slug` / `product.id` **lus en DB** (jamais le body). `scope_value`/`scope_product_ids` **lus sur `promo_codes` en DB**, jamais du client.

---

## PARTIE 3 — STRUCTURE DE DONNÉES (SQL À ÉCRIRE, NON EXÉCUTÉ)

Rappel Lot 1 (exécuté) : `promo_codes.scope_type ('all'|'category'|'product', défaut 'all')` + `scope_value text`.

### 3.1 Portée MULTI-produits — recommandation : **colonne JSONB** (pas de table de liaison)

```sql
-- 029_promo_scope_products.sql  (NON EXÉCUTÉ)
-- Portée 'product' MULTIPLE : liste d'ids produits. 'category' garde scope_value (1 slug).
alter table promo_codes add column if not exists scope_product_ids jsonb not null default '[]'::jsonb;
-- Convention :
--   scope_type='all'      → scope_value NULL,        scope_product_ids '[]'
--   scope_type='category' → scope_value=category_slug, scope_product_ids '[]'
--   scope_type='product'  → scope_value NULL,        scope_product_ids '["<uuid>", ...]'
```
- **Pourquoi JSONB et pas une table de liaison** : M!LK a peu de produits/codes ; lecture en 1 requête
  (le code est déjà chargé par `validatePromoCode`), zéro jointure, validation triviale
  (`ids.includes(item.id)`). **Alternative** (si intégrité référentielle voulue) : table
  `promo_code_products(promo_id uuid, product_id uuid, primary key(promo_id, product_id))` — plus lourde,
  **non retenue (A1 acté : JSONB).**

### 3.2 Flag « offre_livraison »

**Déjà présent** : `promo_codes.free_shipping` (bool). **Recommandation : le RÉUTILISER** (le libeller
« Offre la livraison » dans l'admin), pas de nouvelle colonne. Si un nom explicite est exigé, ajouter
`offre_livraison bool`. **A4 acté : réutiliser `free_shipping`** (aucune nouvelle colonne).

### 3.3 Limite 2 codes

Aucune colonne : la limite « 2 max » est une règle **UI + serveur** (le serveur ne prend que les 2
premiers codes de la liste). Rien à migrer.

---

## PARTIE 4 — POINTS D'INSERTION (fichier:ligne)

| Zone | Fichier:ligne | Modif |
|---|---|---|
| **Admin — persist portée** | [api/admin/promos/route.ts:32-90](../app/api/admin/promos/route.ts#L32) | POST+PUT : passer `scope_type`, `scope_value`, `scope_product_ids` (+ `free_shipping`/offre_livraison déjà là). Validation serveur (scope_type ∈ enum). |
| **Admin — UI portée** | [app/admin/codes-promos/page.tsx:39-47](../app/admin/codes-promos/page.tsx#L39) (type) + formulaire | Sélecteur portée (Tous / Catégorie / Produit(s)) ; si Catégorie → `<select>` catégories ; si Produit(s) → **liste à cocher** de produits (fetch `/api/produits`) → `scope_product_ids`. Case « Offre la livraison ». |
| **Moteur pur** | **`lib/promo-scope.ts`** (nouveau) | `applyScopedPromos(items, codes) → { perCode[], totalProductDiscount, offreLivraison, uncoveredItems }`. Pur, testable. |
| **Validation serveur** | [lib/promo-validate.ts:46-121](../lib/promo-validate.ts#L46) | Renvoyer `scope_type/scope_value/scope_product_ids/offre_livraison`. **Retirer le calcul `discount` global** (désormais fait par `promo-scope` sur les items) OU le garder pour compat `/api/promo/validate`. |
| **Calcul facturation** | [create-session:388-415](../app/api/checkout/create-session/route.ts#L388) | Remplacer `validatePromoCombo`+`serverDiscount` global par : valider chaque code (DB) → `applyScopedPromos(validatedItems+packs, codes)` → `serverDiscount = totalProductDiscount`. `serverPromoForCS.free_shipping = offreLivraison`. Le reste (parrain, coupon, garde-fou 60 %) **inchangé**. |
| **Affichage remises** | [create-session:546-555](../app/api/checkout/create-session/route.ts#L546) draft + panier/paiement | Persister le **détail par code** (quel code, quels produits, combien) pour l'affichage « -X € (CODE) sur produit Y ». |
| **Panier — 2 codes** | [panier:52-181](../app/[locale]/panier/page.tsx#L52) | UI progressive (1 champ → 2ᵉ après validation du 1er → 3ᵉ tentative = « Limite de codes promo atteinte »), bouton retirer par champ, recalcul par sous-totaux (`applyScopedPromos`). |
| **Panier — retrait parrain** | [panier:58-61](../app/[locale]/panier/page.tsx#L58) + bloc JSX parrain | **Supprimer** la zone code parrain ; la remplacer par un **message mis en valeur** : « Tout code parrainage ou filleul est à valider à l'étape paiement ». |
| **Paiement — saisie parrain** | [checkout/paiement/page.tsx:91-174](../app/[locale]/checkout/paiement/page.tsx#L91) | **Ajouter** la saisie du code parrain (méca 1) **APRÈS** les codes promo, avant/à côté des récompenses (méca 2, déjà là). Écrit dans CheckoutContext. |
| **Parrain — calcul** | [lib/parrainage.ts](../lib/parrainage.ts) + [create-session:459-555](../app/api/checkout/create-session/route.ts#L459) | **NON MODIFIÉ** : `computeParrainage(promoDiscount = totalProductDiscount)`, anti-abus, réservation, refund — tout conservé. Seule la **saisie** bouge (panier→paiement). |

---

## PARTIE 5 — CAS LIMITES

| Cas | Comportement attendu |
|---|---|
| **Panier sans produit éligible** (code catégorie/produit ne couvre rien) | **REFUSÉ (A5)** : `code.eligible = 0` → le code est **rejeté** avec le message « Ce code ne s'applique à aucun produit de votre panier ». (Un code 'all' couvre toujours ≥ 1 produit/pack → jamais ce cas.) |
| **2 codes qui se chevauchent** (même produit couvert par les deux) | Le **1er (ordre de saisie)** verrouille le produit ; le 2ᵉ ne le voit plus → **jamais 2 remises** sur un produit (RÈGLE 2). |
| **Code A = 'all', puis code B = catégorie** | A couvre TOUT en premier → B n'a plus aucun produit éligible → **B REFUSÉ (A5)**. Ordre de saisie critique → l'UI doit l'expliquer. |
| **Seuil (min_order) non atteint** | Le code est **rejeté** (retiré + message) ; test sur le running total = subtotal − remises des codes précédents (A2). Jamais de remise si min non atteint. |
| **Arrondis** | `round2` (Math.round((n+EPSILON)*100)/100) à CHAQUE étape (comme `promo-combine`/`parrainage`). `fixed` borné à `eligible` (jamais négatif). % : `round2(eligible*value/100)`. Le total facturé = somme des remises arrondies → un seul `amount_off` (centimes entiers). **Test dédié** (ex. 33,33 % de 10,00 €). |
| **Retrait / changement d'un code** | Recalcul **complet** par `applyScopedPromos` (verrouillage refait de zéro) → pas d'état résiduel. Panier + paiement re-valident (min, portée) au changement de sous-total. |
| **Livraison gratuite par un code vs seuil 60 €** | Indépendants et **OR** : port offert si `offre_livraison` (même < 60 €) **OU** `totalAfterPromo ≥ 60 €`. Un code %/€ `cumulable_avec_livraison=false` désactive le seuil (comportement existant conservé). |
| **Parrain sous 60 €** (`totalAfterPromo < seuil_filleul`) | `parrainApplicable = false` → `parrainDiscount = 0` ; afficher le **shortfall** (« encore X € pour activer votre code parrain ») — `computeParrainage.parrainShortfall` existe déjà. |
| **Code free_shipping seul** (type='free_shipping') | `discount=0`, `offreLivraison=true` → port offert, aucune remise produit. |
| **International** | Port de zone toujours facturé ; `offre_livraison` **n'offre PAS** le port international (règle existante `computeInternationalCartTotals`). À confirmer (A6). |
| **Pack + code catégorie/produit** | Pack **non couvert** par 'category'/'product' (seulement 'all'). (Décision A7 : veut-on qu'un code catégorie couvre les packs de cette catégorie ?) |

---

## PARTIE 6 — DÉCOUPAGE EN SOUS-LOTS TESTABLES

- **7a — Structure + Admin** : SQL `029_promo_scope_products.sql` (JSONB, non exécuté) ; admin promos API (persist scope) + UI (sélecteur portée + liste produits à cocher + case livraison). **Test** : créer 1 code par portée, vérifier la persistance (all/category/product-list) + relecture.
- **7b — Moteur pur `lib/promo-scope.ts`** : `applyScopedPromos` + **tests unitaires** (verrouillage 1er gagnant, chevauchement, fixed borné, %, sans-éligible, min_order, arrondis, 2 codes ordre). Aucun I/O → compilable/testable en isolation (comme `promo-combine`).
- **7c — Calcul serveur (create-session) + affichage** : brancher `applyScopedPromos` (portée re-jugée en DB), `serverDiscount = totalProductDiscount`, `offreLivraison`, garde-fou 60 % conservé, détail par code au draft. Panier/paiement : miroir client. **Test** : chiffrage EXACT panier = facturé (plusieurs paniers).
- **7d — UI panier (2 codes progressifs + retrait parrain + message) & paiement (saisie parrain)** : relocalisation méca 1 ; méca 2 déjà en place ; calcul/anti-abus serveur inchangés. **Test** : flux UX (1→2 codes, retrait, 3ᵉ bloqué, parrain à l'étape paiement, exemples chiffrés).

Ordre : **7a → 7b → 7c → 7d**. 7b indépendant de 7a (mock des codes). Chaque sous-lot : tsc + build + (7b) tests.

---

## PARTIE 7 — DÉCISIONS ACTÉES

| Réf | Décision |
|---|---|
| **A1** | Portée multi-produits : **colonne JSONB `scope_product_ids`** (pas de table de liaison). |
| **A2** | `min_order` testé sur **le TOTAL PANIER après les remises des codes appliqués AVANT lui** (running total), pas sur l'éligible, pas sur le total final. Traitement dans l'ordre de saisie (cf. Étape 4 + exemple 85€). |
| **A3** | **Retirer** l'ancien cumul `cumulable`/`cumulable_codes` (rendu inutile par le scoping). **Garder** le plafond **60 % « tous confondus »** (promo + parrain + récompenses) comme filet anti-abus final. |
| **A4** | `offre_livraison` = **réutiliser `promo_codes.free_shipping`** (aucune nouvelle colonne). |
| **A5** | Code ne couvrant **aucun** produit du panier → **REFUSÉ** + message « Ce code ne s'applique à aucun produit de votre panier ». |
| **A6** | `offre_livraison` **métropole uniquement** — jamais à l'international (règle `computeInternationalCartTotals` conservée). |
| **A7** | Un code **catégorie/produit ne couvre PAS les packs** ; les packs ne sont éligibles qu'à un code **portée 'all'**. |
| **A8** | Ordre des 2 codes = **ordre de saisie** (déterministe, cohérent avec l'UI progressive). |

---

## Rappels contraintes (non négociables)
- **Serveur fait foi** : portée + montants re-calculés dans create-session sur les **items validés (DB)** ;
  `scope_*` lus en DB ; jamais le body client.
- **Ne pas casser** : idempotence webhook (claims), R3 (validation stock), tunnel, **parrain** (calcul,
  anti-abus, réservation, refund — seule la *saisie* méca 1 bouge), stock-par-motif.
- **Centime exact** : `round2` à chaque étape ; un seul `amount_off` (centimes entiers) ; tests d'arrondi.
