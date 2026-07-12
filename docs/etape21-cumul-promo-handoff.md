# Étape 21 — Cumul de codes promo classiques — HANDOFF (reprise en nouvelle session)

> État au moment du handoff : **backend construit + vérifié, UI restante à faire.**
> **Rien n'est poussé** — 3 commits LOCAUX en avance sur `origin/main` (@ `80228f7`).
> ⛔ Feature payment-critical : **aucun push sans validation explicite de Bou.**

## Décisions déjà validées par Bou (à respecter, ne pas re-demander)

1. **Schéma** : réutiliser la colonne `promo_codes.cumulable` (bool, existe déjà) +
   AJOUTER `promo_codes.cumulable_codes text[]` (liste des codes compatibles).
   **NE PAS toucher** à l'ancienne `cumulable_avec` (texte, legacy orpheline, non lue).
2. **Plafond 60 %** : **REFUSER le dernier code** si le cumul (≥ 2 codes) dépasse 60 %
   du sous-total (pas de clamp). Un code SEUL n'est jamais plafonné (collab 100 % OK).
3. **Ordre de calcul** : montants **FIXES d'abord**, puis **POURCENTAGES** sur le reste.
4. **Compat mutuelle** : A+B autorisé seulement si `B ∈ A.cumulable_codes` ET
   `A ∈ B.cumulable_codes` (déclaration des deux côtés) ET les deux `cumulable=true`.

## Commits LOCAUX (non poussés) — `git log origin/main..HEAD`

| Commit | Rôle | Fichiers |
|---|---|---|
| `7b1aece` | (1/4) calcul pur + validation + tests | **NEW** `lib/promo-combine.ts` · **MOD** `lib/promo-validate.ts` · **NEW** `supabase/migrations/016_promo_cumul.sql` · **NEW** `e2e/promo-cumul-calc.spec.ts` |
| `3285ddb` | (2/4) backend paiement | **MOD** `app/api/checkout/create-session/route.ts` · **MOD** `app/api/stripe/webhook/route.ts` · **MOD** `supabase/migrations/016_promo_cumul.sql` |
| `96ee4d3` | (3a/4) endpoint validate | **MOD** `app/api/promo/validate/route.ts` |

## Ce qui est FAIT et vérifié

- **`lib/promo-combine.ts`** (PUR, sans I/O) : `combinePromos(promos, subtotal)` →
  compat mutuelle + ordre fixe→% + plafond 60 % (cumul seulement). Exporte
  `PROMO_CAP_RATE = 0.60`, types `ValidatedPromo` / `PromoComboResult` / `PromoComboEntry`.
- **`lib/promo-validate.ts`** : `validatePromoCode` expose désormais `cumulable` +
  `cumulable_codes` ; `validatePromoCombo(codes[], subtotal)` = validation DB par code
  puis `combinePromos`. Ré-exporte `combinePromos`/`PROMO_CAP_RATE`/types.
- **`create-session`** : accepte `promo_codes[]` (fallback `promo_code`). Re-validation
  avec **dégradation gracieuse** (code fautif retiré, on réessaie). **Garde-fou 60 %
  "tous confondus"** (promo+parrain+récompenses, ≥2 codes) → retire le dernier code +
  recalcule. Draft `pending_orders` : `promo_code` (1er, compat) + `promo_codes[]`.
  Coupon Stripe unique inchangé (fold promo+parrain+récompenses).
- **Webhook** (`handleUnifiedOrder`, après le claim atomique = exactement-1×) :
  incrémente `uses_count` de CHAQUE code de `draft.promo_codes`.
- **`/api/promo/validate`** : renvoie aussi `cumulable` + `cumulable_codes`.
- **Tests** : `e2e/promo-cumul-calc.spec.ts` = **10 tests verts** (ordre fixe→%,
  indépendance saisie, sens-unique refusé, non-cumulable refusé, plafond 60 %
  dépassé/juste-sous, 2 fixes, livraison, fixe>sous-total). `tsc` vert.

## Migration SQL — GÉNÉRÉE, NON EXÉCUTÉE

`supabase/migrations/016_promo_cumul.sql` (à lancer par Bou dans Supabase Studio) :
```sql
alter table promo_codes   add column if not exists cumulable_codes text[] default null;
alter table pending_orders add column if not exists promo_codes     text[] default null;
```
(`promo_codes.cumulable` bool existe déjà → réutilisé.)

## ✅ FAIT depuis le handoff (UI — commits LOCAUX non poussés)

| Commit | Rôle | Fichiers |
|---|---|---|
| `42d0914` | (4a/4) /panier multi-codes UI | **MOD** `app/[locale]/panier/page.tsx` |
| `0bdd1c1` | (4b/4) admin cumul + alerte 60 % | **MOD** `app/admin/codes-promos/page.tsx` · **MOD** `app/api/admin/promos/route.ts` |

- **`/panier`** : `promoData` unique → **liste `promoCodes[]`** ; remise dérivée LIVE via
  `combinePromos(promoCodes, subtotal)` (l'affiché = le facturé). `applyPromo` teste le
  cumul avant d'ajouter (refus explicite sinon). Suppression individuelle. Champ visible
  si tous cumulables. Re-check async (min_order + garde-fou plafond, avec message, jamais
  de clamp silencieux). « Il te reste X€ » généralisé (÷ facteur % composé). Récap : 1 ligne
  par code. `handleCheckout` envoie `promo_codes[]`.
- **Admin** : case « Cumulable » (→ `cumulable`) + multi-select des autres codes cumulables
  (→ `cumulable_codes`) ; **liaison MUTUELLE** auto (le code créé est inscrit chez chaque
  partenaire) ; **alerte 60 %** si paire %+% dépasse le plafond (confirm avant création).
  API admin POST/PUT construisent `cumulable`/`cumulable_codes` explicitement.
- **Vérifs** : `tsc` + `npm run build` verts ; **10 tests cumul-calc** verts ; **suite panier**
  (promo/steps/gating/add-to-cart/account) **verte** (non-régression).

### ⛔ RESTE : validation groupée + migration + push
1. Faire relire ce diff à Bou.
2. Bou relit puis exécute **`016_promo_cumul.sql`** dans Supabase Studio (⚠️ tant que la
   colonne `cumulable_codes` n'existe pas, créer un code cumulable en admin échoue, et le
   cumul reste inactif au panier — dégradation propre, pas de crash).
3. Test manuel end-to-end avec 2 vrais codes DB mutuellement cumulables (impossible avant
   la migration).
4. **PUIS** push (tous les commits `7b1aece`→`0bdd1c1`).

---

## Détail d'origine — RESTE À FAIRE (désormais FAIT, conservé pour trace)

### A. `/panier` (`app/[locale]/panier/page.tsx`) — GROS refactor, page critique
Remplacer le `promoData` UNIQUE (state ligne ~59) par une **LISTE** de codes appliqués.
Chaque entrée = un `ValidatedPromo` : `{ code, type, value, free_shipping,
cumulable_avec_livraison, cumulable, cumulable_codes }` — tous renvoyés par
`/api/promo/validate`.
- **Dérivé (dans le render)** : `combo = combinePromos(promoCodes, subtotal)` (import
  depuis `@/lib/promo-combine`). `discount = combo.valid ? combo.totalDiscount : 0`.
  → recalcul live automatique au changement de sous-total (pas besoin de l'ancien
  `recalcPromo` async pour le montant ; garder un re-check async min_order optionnel).
- **`applyPromo`** (ligne ~452) : valider le nouveau code via `/api/promo/validate`,
  construire son `ValidatedPromo`, tenter `combinePromos([...promoCodes, nouveau])` ;
  si `valid` → l'ajouter ; sinon afficher `combo.error` (refus du 2e).
- **Champ de saisie** : le garder visible si `promoCodes.length === 0` OU si TOUS les
  codes appliqués sont `cumulable` (permettre un 2e). Un code non-cumulable → plus de champ.
- **Affichage** : chaque code appliqué séparément avec SA remise (`combo.entries[i].discount`)
  + un bouton **Supprimer individuel** par code. Récap total : une ligne par code.
- **Points de contact à mettre à jour** (références `promoData`) : `discount` (~338),
  `computeCartTotals.promo` (~345-353), `promoBlocksThreshold` (~392), barre
  « il te reste X€ » (~402-403, simplifier pour le multi-codes), tracking
  `trackBeginCheckout` (~552), **`handleCheckout` body → envoyer `promo_codes: [...]`**
  (~577, au lieu de `promo_code`), encart promo (~713-721), récap remises (~845-851).
- ⚠️ La **re-validation serveur** (create-session) fait déjà autorité — le panier est
  l'affichage. Interaction avec parrainage : le parrainage lit `discount` (total promo),
  donc passer `combo.totalDiscount` comme `promoDiscount` à `computeParrainage` (déjà le
  cas via la variable `discount`).

### B. Admin `app/admin/codes-promos/page.tsx` (page ACTIVE ; `/admin/promos` est orpheline)
- Case **« Cumulable avec d'autres codes »** → pilote `cumulable`.
- Si cochée : **multi-select** des AUTRES codes actifs **eux-mêmes `cumulable`** →
  pilote `cumulable_codes`. Un code exclusif n'apparaît jamais comme option.
- Sauvegarde via l'API admin des codes (ajouter `cumulable`/`cumulable_codes` au payload
  — vérifier `app/api/admin/promos/route.ts` POST/PUT : construire explicitement ces champs).
- **Alerte 60 %** à la config : si une paire %+% a un pire cas combiné
  `1-(1-p1)(1-p2) > 60%` → alerte + confirmation explicite avant activation. (Les paires
  à montant fixe dépendent du panier → garanties par le garde-fou checkout.)

### C. Finalisation
- `tsc --noEmit` + `npm run build` + **suite complète** (`npm run test:e2e`, dont les 10
  tests cumul + non-régression panier/promo).
- **Test de validation manuel** (spec étape 21) : 2 codes mutuellement cumulables →
  les 2 s'appliquent, total correct (fixe→%) ; déclaration à sens unique → refusée ;
  plafond 60 % dépassé → refusé.
- ⛔ **Présenter pour validation groupée** → Bou lance la migration 016 → **PUIS push**.

## Reprise
Nouvelle session : lire ce fichier + `git log --stat origin/main..HEAD`. Les commits
`7b1aece` / `3285ddb` / `96ee4d3` contiennent tout le backend. Continuer par A (panier),
puis B (admin), puis C.
