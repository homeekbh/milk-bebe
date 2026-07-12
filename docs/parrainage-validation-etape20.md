# Parrainage — Checklist de validation finale (Étape 20)

> À dérouler **ensemble**, point par point, avant le `git push`. Chaque scénario indique :
> les **actions UI précises**, le **montant exact attendu à chaque étape**, et ce qui doit être
> **coché / grisé / bloqué** et pourquoi.
>
> Réglages par défaut (admin `/admin/parrainage`) : récompense **5 €**, seuil filleul **60 €**,
> **barème récompenses 60 / 80 / 90 / 100 €** (1 seuil par position), max **4**/commande, validité **30 j**.
> Rappel : **l'affiché au panier = le facturé** (le serveur re-calcule tout à `create-session`).

## Prérequis

- **2 comptes** : compte **A** (le parrain) et compte **B** (le filleul). Récupère le code
  parrain de A dans son profil → onglet **🎁 Parrainage** (8 caractères, ex. `K7PMR4TX`).
- Un moyen de paiement test réel (Stripe LIVE → petit montant, ou carte de test si bascule test).
- Accès à la **boîte mail réelle** du compte A (scénario email).
- Codes promo actifs connus : `MILK10` (-10 %), `ETE30` (-30 %).

---

# PARTIE A — Les 9 scénarios de calcul (parcours UI)

> Ces 9 cas sont déjà couverts par les **11 tests automatisés** (`e2e/parrainage-calc.spec.ts`,
> tous verts). Ici on rejoue la **même logique dans l'interface** pour confirmer que l'affiché
> correspond au calcul. Construis le panier pour atteindre le **sous-total cible** indiqué.
> Astuce **boundary** : pour tomber pile sur un seuil, ajuste `seuil_filleul` dans l'admin à la
> valeur exacte de ton panier (ça teste aussi la prise en compte immédiate — scénario B7).

### A1 — 50 € + code parrain → invalide (sous 60 €)
- **Panier** : sous-total **50,00 €**. **Actions** : saisis le code parrain de A dans « Code parrain » → **Appliquer**.
- **Attendu** : encart **jaune** (pas vert), message **« il manque 10,00 € »** + « Code parrain valable à partir de 60 € ».
- **Récap** : Sous-total 50,00 € · **pas de ligne « Code parrain »** · Total TTC **50,00 €**.

### A2 — 70 € + code parrain → 65 €, livraison offerte
- **Panier** : sous-total **70,00 €**. Applique le code parrain de A.
- **Attendu** : encart **vert** « − 5,00 € ». Ligne récap **« Code parrain … − 5,00 € »**.
- **Livraison** : « Offerte » (70 ≥ 60). **Total TTC 65,00 €**.

### A3 — 60 € pile + code parrain → 55 €, livraison AUSSI offerte (`>=`)
- **Panier** : sous-total **60,00 € exactement** (ou mets `seuil_filleul = 60` et un panier de 60 €).
- **Attendu** : encart **vert** « − 5,00 € » (60 ≥ 60). **Livraison « Offerte »** (même comparateur `>=`).
- **Total TTC 55,00 €**. *(C'est LE test du `>=` : à 60 € pile, remise ET livraison actives.)*

### A4 — 65 € + code parrain PUIS promo -30 % → parrain & livraison retombent invalides
- **Panier** : sous-total **65,00 €**. 1) applique le code parrain → vert « − 5,00 € ».
  2) applique **ETE30** (-30 %).
- **Attendu après ETE30** : total après promo = **45,50 €**. L'encart parrain repasse **jaune**
  « il manque 14,50 € » (45,50 < 60). Ligne « Code parrain » **disparaît** du récap.
- **Livraison** : redevient **payante** (45,50 < 60). **Total TTC 45,50 € + livraison**.

### A5 (barème) — 100 €, ETE30 → 70 €, code parrain → 65 € : 1ʳᵉ récompense débloquée, pas les suivantes
- **Panier** : sous-total **100,00 €** (compte B avec ≥ 2 récompenses dispo).
- **Actions** : applique **ETE30** (→ 70,00 €), puis le code parrain de A (→ 65,00 €).
- **Attendu** : Récap = Sous-total 100 · ETE30 − 30,00 € · Code parrain − 5,00 € · **Total 65,00 €**.
  Bloc « Mes récompenses » : la **1ʳᵉ case est cochable** (65 ≥ 60) ; la **2ᵉ est grisée** avec
  **« ajoute 15,00 € pour débloquer la 2ᵉ remise »** (80 − 65). Coche la 1ʳᵉ → **Total 60,00 €**.

### A6 (barème) — manque exact pour la PROCHAINE case (pas le seuil final)
- **Panier (compte B, ≥ 2 récompenses dispo)** : sous-total **70,00 €**, applique le code parrain → 65,00 €.
- **Attendu** : 1ʳᵉ récompense cochable ; 2ᵉ **grisée** avec **« ajoute 15,00 € pour débloquer la 2ᵉ remise »**
  (80 − 65 — **pas** 35 € vers un seuil unique à 100). Chaque récompense affiche « expire dans N j ».

### A7 — propre code refusé
- Voir **B6** (anti-abus) — la remise n'est jamais appliquée.

### A8 — code parrain ET récompenses sur la même commande
- **Panier (compte B, ≥2 récompenses dispo)** : sous-total **120,00 €**. Applique le code parrain de A (→ 115,00 €).
- **Attendu** : 115 ≥ 100 → bloc récompenses **actif**. **Coche 2 récompenses**.
- **Récap** : Sous-total 120 · Code parrain − 5,00 € · **Récompenses (2) − 10,00 €** · **Total 105,00 €**.

### A8b — plafond max 4
- **Panier (compte B, ≥6 récompenses dispo)** : sous-total **200,00 €**, code parrain appliqué.
- **Attendu** : impossible de cocher plus de **4** cases (la 5ᵉ est **grisée/non-cliquable**).
  Récompenses − 20,00 € (4 × 5). **Total 200 − 5 − 20 = 175,00 €**.

### A9 — parrainage désactivé (admin)
- Voir **B8** — code parrain inopérant + section profil suspendue.

---

# PARTIE B — Scénarios spécifiques à la couche UI

### B1 — Section « Parrainage » du profil (compte A, sans filleul)
- **Actions** : connecte-toi (A) → `/fr/profil` → onglet **🎁 Parrainage**.
- **Attendu** : le **code** s'affiche en gros (ambre, monospace, encadré pointillé, léger pulse).
  Bouton **📋 Copier** → au clic devient **« ✓ Copié ! »**, le code est dans le presse-papier (colle pour vérifier).
  Bouton **↗ Partager** (partage natif mobile, sinon copie). **« Mes récompenses »** = « Aucune récompense pour l'instant ». **« Mes filleuls »** = « Personne n'a encore utilisé ton code. »

### B2 — Un filleul utilise le code → apparaît chez le parrain APRÈS paiement (pas avant)
- **Actions** : compte **B**, panier ≥ 60 €, applique le code de **A**, **avant de payer** : sur le profil de A,
  « Mes filleuls » doit **rester vide** (le rattachement se fait au webhook payé, jamais à la saisie).
- **Paye** la commande B. **Après confirmation Stripe** : recharge le profil de A → le filleul **apparaît**
  (email masqué type `ma••••@domaine`, date du jour) et **une récompense « 5,00 € — disponible · 30 j »** apparaît.
- **Vérif base (optionnel)** : `select * from parrainage_recompenses where parrain_id = <A>;` → 1 ligne
  `disponible`, `filleul_order_id` = la commande de B.

### B3 — Email parrain reçu (vraie boîte mail)
- Suite de B2 : le compte **A** doit **recevoir un vrai email** « 🎁 5€ de récompense parrainage »
  (sujet, bloc ambre avec le code, bouton « Voir mes récompenses → » vers `/fr/profil`).
- **Vérif** : reçu dans la **vraie boîte** de A (pas seulement en base). Un seul email même si Stripe rejoue le webhook (idempotence).

### B4 (barème) — Récompense grisée à un palier non atteint — message exact
- **Compte B** avec ≥ 2 récompenses dispo, panier **70 €** + code parrain (→ 65 €).
- **Attendu** : la **1ʳᵉ** récompense est **cochable** ; la **2ᵉ** est **grisée** (opacité réduite, case désactivée)
  avec le message exact **« ajoute 15,00 € pour débloquer la 2ᵉ remise »** (80 − 65), en orange.
  Chaque récompense affiche « expire dans N j » (orange si ≤ 7 j).

### B5 (barème) — Franchir un palier → la case suivante se dégrise EN DIRECT (sans reload)
- **Départ** : panier B à **70 €** + code parrain (→ 65 €) : 1ʳᵉ cochable, **2ᵉ grisée** (cf. B4).
- **Action** : **augmente la quantité** pour porter le total après parrain à **≥ 80 €** (le palier de la 2ᵉ case),
  **sans recharger la page**.
- **Attendu** : la **2ᵉ case se dégrise instantanément**, son message « ajoute … € » disparaît ; cocher
  cette 2ᵉ récompense **met à jour le Total TTC en direct** (− 5,00 € de plus). Continue vers **90 € / 100 €**
  pour débloquer les 3ᵉ / 4ᵉ de la même façon.

### B6 — Propre code parrain refusé (message clair, pas d'erreur technique)
- **Compte A** connecté, panier ≥ 60 €, saisit **son propre** code parrain → **Appliquer**.
- **Attendu** : message rouge **« Vous ne pouvez pas utiliser votre propre code parrain. »**
  (❌, lisible — pas une erreur 500/technique). Aucune remise appliquée.
- **Bonus invité** : en invité, saisir un code dont l'email de commande = l'email du parrain → **même blocage**.

### B7 — Admin change un seuil → pris en compte immédiatement (sans redéploiement)
- **Actions** : `/admin/parrainage`, passe **seuil filleul** de 60 à **80 €**, **Enregistrer** (toast « ✓ »).
- **Vérif** : sur `/panier` (recharge simple, pas de déploiement), un panier de **70 €** + code parrain
  affiche maintenant **« il manque 10,00 € »** (70 < 80) → **pas de remise**. Remets **60 €** ensuite pour A2/A3.
- **Barème** : dans le bloc **« Barème de déblocage des récompenses »**, passe la **2ᵉ récompense** de 80 à **75 €**,
  Enregistrer. Sur `/panier` (rechargé), un total après parrain à **76 €** débloque désormais **2** cases
  (76 ≥ 75) au lieu d'1. **Refus** attendu si tu tentes un barème décroissant (ex. 2ᵉ < 1ʳᵉ) → toast d'erreur.
  Remets **{60,80,90,100}** à la fin.

### B8 — Désactivation du programme (admin)
- **Actions** : `/admin/parrainage`, **toggle « Programme actif » → OFF**, Enregistrer.
- **Attendu `/panier`** (rechargé) : le **bloc « Code parrain » disparaît** pour un compte connecté
  (et un code déjà saisi cesse d'être appliqué côté serveur). Le bloc « Mes récompenses » disparaît aussi.
- **Attendu `/profil` → Parrainage** : bandeau **« Le programme de parrainage est temporairement suspendu. »**
- **Réactive** (ON) à la fin.

### B9 — Cron d'expiration (calcul-à-la-lecture + cron)
- **Prépa base** : sur une récompense `disponible` du compte A, force la date passée :
  `update parrainage_recompenses set expires_at = now() - interval '1 day' where id = <reward>;`
- **Calcul-à-la-lecture (immédiat)** : sur `/profil` de A, la récompense apparaît **« expirée »** ; sur `/panier`
  elle **n'est plus proposée** (ni comptée) — **sans attendre le cron**.
- **Cron** : déclenche `GET /api/cron/daily` avec `Authorization: Bearer <CRON_SECRET>` →
  réponse `results.parrainageExpired.expired ≥ 1`. En base, `status` de la récompense est passé à **`expiree`**.

---

## Récap « GO push »

- [ ] A1→A9 conformes (montants exacts + comparateur `>=` à 60 € pile).
- [ ] B1 (profil), B2 (filleul après paiement), B3 (email réel), B4 (grisé + message),
      B5 (dégrisage live), B6 (propre code bloqué), B7 (admin live), B8 (désactivation), B9 (expiration).
- [ ] Aucune régression : `npm run test:e2e` **vert** (24 tests) + `tsc` + `build` verts.
- [ ] Vérif finale base : cohérence `orders.parrain_discount` / `recompense_discount` vs montants affichés.

Si tout est ✅ → **push** de l'ensemble du module parrainage (étapes 12-20).
