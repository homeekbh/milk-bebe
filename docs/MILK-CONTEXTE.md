# M!LK — Inventaire de l'état du code

> **Inventaire vivant.** Ce fichier dit **où en est le code**, pas comment
> travailler dessus — la méthode vit dans `docs/MILK-METHODE.md`.
>
> **Si ce fichier contredit le code, c'est le code qui a raison.** Toute note
> démentie par une lecture se corrige immédiatement, et le rapport de lot doit
> signaler qu'elle était fausse.
>
> Chaque entrée porte son statut et sa date de vérification. Une entrée sans date
> vérifiée est une supposition, pas un fait.
>
> Dernière mise à jour : **31 juillet 2026**.

---

## 1. Résolu — ne plus réinvestiguer

Ces points ont été vérifiés par lecture du code. Les rouvrir coûte un lot pour
rien.

| Sujet | Vérifié | Détail |
|---|---|---|
| `/favoris` vide ou blanc sur mobile | 31/07 | Le mécanisme supposé (« fetch sur `ids` vide ») **n'a jamais existé** : `app/[locale]/favoris/page.tsx` utilise le contexte `useWishlist()`, garde `if (!mounted) return`, court-circuite sur `ids.length === 0`, et `loadFavorites` a `[ids]` en dépendance. Le vrai défaut (page blanche en webview Instagram) a été corrigé au lot N par un bloc « Réessayer ». |
| Badge panier figé après ajout d'un pack | 31/07 | `app/[locale]/packs/[slug]/PackDetailClient.tsx:97` émet bien `milk-pack-cart-changed`. Route atteignable, prouvée par la chaîne d'imports. Un CTA « Voir mon panier » persistant existe après ajout. |
| Favoris inaccessibles depuis le header mobile | 31/07 | `Header.tsx:275` — lien présent dans la barre mobile `.milk-burger`, avec badge. Le doublon avec la version bureau (`:250`) est une duplication responsive assumée : source unique `useWishlist()`. |
| Apple Pay / Google Pay bloqués par `payment_method_types: ["card"]` | 31/07 | **Faux.** `create-session` omet `payment_method_types`, donc le mode automatique de Stripe est actif et les wallets s'affichent. |
| `next-intl` installé mais inutilisé | 31/07 | **Faux.** Massivement utilisé : `useTranslations`, routing i18n, segment `[locale]`. Locales `fr` et `en`. |
| Duplication d'URL sans préfixe de locale | 30/07 | `proxy.ts:44-48` fait un 301 permanent vers `/fr`, query préservée. La racine `/` reste volontairement en 307. Sitemap émet `/fr` et `/en` avec `alternates.languages`. |
| Règle métier « un pack, une ligne » dans le moteur promo | 29/07 | `buildCartLines` construit une `WorkLine` par pack ; `coversScope` rejette explicitement tout code scopé sur un pack. Testé par lecture sur deux scénarios. Ne pas « corriger ». |
| Sections admin « non reliées aux vraies tables » | 30/07 | Doute levé : `popups`, `newsletter_subscribers`, `reviews` sont des tables réelles et les routes existent. |

---

## 2. Architecture réelle — chemins vérifiés

Tout chemin cité sans `[locale]` est faux. Vérifiés le 31/07 :

```
app/[locale]/favoris/page.tsx
app/[locale]/packs/[slug]/PackDetailClient.tsx
app/[locale]/success/page.tsx
app/[locale]/produits/[slug]/ProductClient.tsx     ← édition chirurgicale only
app/api/checkout/create-session/route.ts            ← et non app/api/create-session
app/api/stripe/webhook/route.ts                     ← 1555 lignes
components/ConsentManager.tsx                       ← et non components/analytics/
components/analytics/consent-store.ts
components/layout/Header.tsx
lib/analytics.ts
lib/internal-traffic.ts
lib/meta-capi.ts                                    ← créé au lot M4
proxy.ts                                            ← le middleware
```

**Webhook Stripe.** Le flux actif est `handleUnifiedOrder`, atteint dès que
`metadata.pending_order_id` existe — c'est-à-dire toujours. Le flux legacy
(≈ l.794-1010) est mort.

Claim atomique sur `pending_orders` (`.eq("status","pending")` → `"consumed"`),
l.344-349. **Pas** sur `webhook_processed`. Voir `MILK-METHODE.md`.

Effets de bord dans le claim, donc exactement une fois : n° de facture, alerte
adresse internationale, parrainage, décrément de stock, revalidation ISR,
incrément `uses_count` promo, `abandoned_carts.converted`, email client, email
admin, puis appel CAPI.

---

## 3. Mesure publicitaire — état au 31/07

Chaîne complète livrée en quatre lots dans la nuit du 30 au 31 juillet.

| Lot | Objet | Commit |
|---|---|---|
| M1 | Le pixel Meta ne charge plus sur le trafic interne. `ConsentManager` réutilise `isInternalTraffic()`. Testé : 1 requête `fbevents.js` sans cookie, 0 avec. | `b76ccf7` |
| M3 | Capture au checkout : cookie miroir `milk_consent`, plus `_fbp`, `_fbc`, IP, user-agent, referer, écrits dans `pending_orders.tracking` (jsonb). Contrat de la route inchangé, tout lu côté serveur. | `c25520d` |
| M4 | Conversions API sur l'achat. `lib/meta-capi.ts`, appel post-claim dans son propre `try/catch`. `eventID` = `session.id` Stripe, identique côté pixel et côté serveur. | `2248a29` |

**Migration appliquée le 31/07 :**
`ALTER TABLE pending_orders ADD COLUMN IF NOT EXISTS tracking jsonb;`

**Conditions de non-envoi du CAPI** (toutes silencieuses, sans erreur) : token
absent, pixel absent, `tracking` nul, `consent !== "accepted"`, commande marquée
`is_internal_test`.

**Variables Vercel :** `META_CAPI_ACCESS_TOKEN`, `META_GRAPH_VERSION` = `v25.0`.
`META_CAPI_TEST_EVENT_CODE` a été **retiré le 31/07** après décision de ne pas
faire d'achat de test.

⚠️ **L'appel à Meta n'a jamais abouti une seule fois.** Aucun test n'a été
réalisé faute de commande réelle. La première vraie vente est le test. À
surveiller dans Events Manager → Vue d'ensemble : l'événement `Purchase` doit
apparaître avec une source serveur.

**Correspondance automatique avancée du pixel : entièrement désactivée**
(constaté le 31/07 dans Events Manager). Aucun signal d'identité n'est envoyé
depuis le navigateur. Le CAPI compense côté serveur. Décision d'activation ou
non : non tranchée.

**Incertitude assumée sur le hachage de la ville.** Les accents sont conservés
(`saintétienne`). Meta demande « pas de caractères spéciaux », ce qui admet trois
lectures. Se tranchera sur les scores de correspondance dans Events Manager, pas
avant d'avoir des achats.

---

## 4. Confirmé cassé ou à corriger

| Sujet | Vérifié | Détail |
|---|---|---|
| `used_count` avant toute bascule du moteur promo | 29/07 | `webhook/route.ts:~523` parcourt `draft.promo_codes`, la liste **legacy**. Au flip `PROMO_ENGINE='scoped'`, un code rejeté par le moteur scopé serait quand même compté comme utilisé. La facturation resterait juste, la comptabilité d'usage sur-compterait. **Bloquant pour le lot 7c-2.** |
| 6 pages admin orphelines | 30/07 | Absentes du tableau `NAV` d'`AdminShell.tsx`, zéro référence ailleurs : `/admin/promos` (411 l., **doublon** de `/admin/codes-promos` qui en fait 812), `/admin/alerts` (248), `/admin/exports` (56), `/admin/direct` (43), `/admin/params` (3), `/admin/scoring` (3). ≈ 764 lignes mortes. Revérifier par grep avant suppression. |
| 138 blocs `catch` silencieux | 30/07 | Sur 468 blocs `catch`, seuls 20 portent un `captureException`, tous côté analytics et accueil admin. Un échec de webhook Stripe, Sendcloud ou Resend reste invisible. |
| `public/` pèse 44 Mo sur 49 | 30/07 | 20 PNG de plus d'1 Mo. Deux fichiers testés au hasard ne sont référencés nulle part — les photos produit vivent dans Supabase Storage. Vérifier les 20 avant suppression. |
| Reliquats du lot D | 30/07 | (a) bordure et ombre rouges de la carte promo (`ProduitsGrid.tsx:79,81`) à passer en ambre ; (b) décision sur l'animation `milk-promo-shake` ; (c) code mort dans `ProductClient.tsx` : `getProductEntretien` (~l.116) et la variable `entretien` (~l.581) ne sont consommées par aucun rendu ; (d) virgule décimale française conservée à tort sur `/en` dans le guide des tailles (~l.200-203). |

---

## 5. Statut inconnu — à vérifier avant d'agir

Ne rien planifier sur ces points sans reconnaissance préalable.

- **`PROMO_ENGINE` sur Vercel** — le défaut du code est `legacy`, la valeur en
  production n'a jamais été confirmée.
- **`lib/promo-combine.ts`** — l'aperçu client dans le panier applique-t-il la
  même règle de portée que le moteur scopé serveur ? Un affichage divergent est
  possible.
- **Règles d'alerte Sentry** — 20 captures existent, aucune règle d'alerte n'a
  été vérifiée. On ne sait pas si quoi que ce soit est réellement notifié.
- **`fbq` prétendument dupliqué dans `panier/page.tsx`** — affirmation de
  l'ancien skill. `fbq` est centralisé dans `lib/analytics.ts`. Très
  probablement périmé, non revérifié.
- **`ProductRecommendations`** — importé et rendu (`success/page.tsx:7`), mais
  son contenu réel n'a pas été inspecté. L'ancien skill le disait vide.
- **Search Console** — 1 erreur serveur 5xx jamais identifiée, 32 pages
  « détectées, non indexées ». Possiblement résiduel de la duplication d'URL
  désormais corrigée. À re-mesurer.
- **Sendcloud** — champs `currency` et `total_order_value` jamais confirmés par
  le support. La Suisse et le Royaume-Uni exigent une déclaration complète.

---

## 6. Prêt à coder — reconnaissance déjà faite

**Lot U — modale d'avis sur la fiche produit.** Reconnaissance faite au commit
`d8d1b0c`. Tout existe :

- `components/ui/Modal.tsx` (73 l.) — modale générique déjà accessible : Échap,
  clic extérieur, bouton ×, scroll de fond bloqué, focus posé. **La réutiliser,
  ne pas en créer une septième.**
- `GET /api/reviews?product_id=X` — filtre `approved=true` côté serveur, exclut
  `customer_email`.
- `components/product/RatingInline.tsx` — composant partagé unique, appelé à deux
  endroits (`ProductClient.tsx:905`, `page.tsx:116`). L'anti-dérive est déjà
  satisfaite.

Reste à faire : rendre `RatingInline` cliquable (prop `onClick` optionnelle),
fetcher au clic, afficher dans `Modal`. La fiche ne possède que l'agrégat.

*Contexte :* `ReviewsBlock` a été retiré **volontairement** de la fiche et déplacé
sur `/produits`. Un audit externe l'avait signalé à tort comme un oubli.

**Autres prompts préparés :** page `/avis-clients` (ne pas toucher à
`app/[locale]/avis/page.tsx`, qui est le formulaire de dépôt) · lien footer
« Avis clients » · zoom d3 sur `WorldVisitorsMap.tsx` · libellés de canaux en
français dans le dashboard analytics · sélecteur de période sticky.

---

## 7. En attente de tiers

| Sujet | Bloqué par |
|---|---|
| Blog, lot P | 2 articles en brouillon : uploader 4 images dans Supabase Storage, remplacer les placeholders par `UPDATE` SQL, relecture Erika, publier. |
| Étiquetage et fiche technique | Harrison Zhu (Shandong Tocreative, Qingdao) : grammage en g/m², rapport de résistance thermique (valeur TOG, exigée pour les gigoteuses en Europe), correction de l'étiquette — les dénominations UE sont « viscose de bambou / élasthanne », pas « bambou / spandex ». ⚠️ **Aucune valeur TOG ne doit être publiée avant réception.** |
| CGV et mentions légales | À mettre à jour : parrainage (barème complet), Klarna, tous les moyens de paiement actifs, cohérence avec la politique de retour. |
| Email de masse clients + newsletter | Prompt déjà rédigé en artefact — **le récupérer, ne pas le régénérer de mémoire.** |
| Trustpilot ou Avis Vérifiés | Bou doit créer le compte externe. Puis fiche Google My Business. |

---

## 8. Repères analytics et marketing

**Emails.** Deux adresses, décision actée le 30/07 : `contact@milkbebe.fr` (seul
expéditeur Resend, SPF/DKIM/DMARC configurés) et `home.ekbh@gmail.com` (réception
des alertes admin, valeur de `ADMIN_EMAIL`). Ne plus proposer d'en créer d'autres.

**Meta Ads au 31/07.**
- `FROID | Acquisition | IG | Reel Bambou` — 10 €/jour, 26/07 → 09/08. Au 29/07 :
  4 135 impressions, fréquence 1,40, 141 clics, CTR 3,41 % (référence en froid :
  0,5-1,5 %), 19 paniers à 1,65 €, 2 checkouts, **0 achat**.
- `TIÈDE | Reciblage | IG | Pack Smiley` — 3 €/jour, publié le 30/07, audience
  `Insta - Engagement 365j`.
- Total dépensé sur Meta : 86,25 €.

⚠️ **0 achat sur 19 paniers n'est pas une anomalie.** À un taux réel de 9 %,
observer 0 a environ 17 % de probabilité.

⚠️ L'audience `Insta - Engagement 365j` est **polluée par le trafic interne
antérieur au lot M1**. Rien ne permet de l'en retirer. Ne pas sur-interpréter les
chiffres du MOFU, ne pas monter son budget.

**Google Ads : arrêté** par Bou le 30/07. Motif : 32 % de sessions sans
engagement, le pire score du site, sur 17 €/jour.

**Sources les mieux mesurées du site** : Meta et Instagram (11,7 % et 2,9 % de
sessions non engagées, contre 32 % pour Google). Ne pas supposer l'inverse.

**Rendez-vous du 2 août** : vérifier la fréquence de la campagne MOFU. Sous 2,0
laisser tourner ; au-dessus de 2,5 passer à 2 €/jour ou couper. Vérifier aussi la
portée : si elle dépasse largement 1 200, Meta a élargi malgré l'audience
personnalisée.
