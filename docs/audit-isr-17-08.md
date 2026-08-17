# Audit ISR — écritures de cache — 17/08/2026

> **Diagnostic.** Un correctif ciblé (blog `revalidate 60 → 3600`) accompagne cet audit ; tous
> les autres `revalidate` restent inchangés à dessein (voir §6). Le cycle de facturation Vercel
> se réinitialise le 19/08 — d'où l'urgence du relevé.

## 1. Le constat mesuré

- **994 240 écritures ISR** pour **171 220 lectures** sur le cycle en cours → **ratio 5,81** (contre 5,53 le 09/08).
- ~**30 000 écritures/jour**, **maintenues** pendant une semaine où le trafic humain a été **divisé par 9** (461 → 53 vues/jour).
- **Conclusion immédiate : les écritures ne suivent pas les visites humaines.** Quelque chose régénère le cache indépendamment du trafic réel.

## 2. Inventaire complet

### 2.1 `export const revalidate` (pages ISR)

| Route | revalidate (s) | Chemins × locale | Régén. max/j = 86400/rev × chemins |
|---|---|---|---|
| `app/[locale]/blog/[slug]/page.tsx` | **60** → *3600 (corrigé)* | 27 × 2 = **54** | **77 760** → *1 296* |
| `app/[locale]/blog/page.tsx` | **60** → *3600 (corrigé)* | 2 | 2 880 → *48* |
| `app/[locale]/packs/[slug]/page.tsx` | 60 | 5 × 2 = 10 | 14 400 |
| `app/[locale]/packs/page.tsx` | 60 | 2 | 2 880 |
| `app/[locale]/categorie/[slug]/page.tsx` | 120 | 5 × 2 = 10 | 7 200 |
| `app/[locale]/produits/page.tsx` | 120 | 2 | 1 440 |
| `app/[locale]/produits/[slug]/page.tsx` + `layout.tsx` | 900 | 14 × 2 = 28 (SSG au build) | 2 688 |
| `app/[locale]/cgv/page.tsx` | 300 | 2 | 576 |
| `app/[locale]/guide-des-tailles/page.tsx` | 3600 | 2 | 48 |
| `app/[locale]/vetements-bebe-peau-sensible/page.tsx` | 3600 | 2 | 48 |

### 2.2 Route Handlers avec `revalidate` (cache de handler)

| Route | revalidate (s) | Régén. max/j |
|---|---|---|
| `app/api/packs/[slug]/route.ts` | 60 | 5 × 1 440 = 7 200 |
| `app/api/packs/route.ts` | 60 | 1 440 |
| `app/api/blog/posts/route.ts` | 60 | 1 440 |
| `app/api/promo/featured/route.ts` | 60 | 1 440 |
| `app/api/settings/public/route.ts` | 0 (dynamique) | 0 |
| `app/api/parrainage/settings-public/route.ts` | 0 (dynamique) | 0 |

### 2.3 `revalidatePath` / `revalidateTag`

- **Aucun `revalidateTag`** dans le dépôt.
- `revalidatePath` : **uniquement** via `lib/revalidate-product.ts` (`revalidateProduct`). Par appel, il revalide, **pour chaque locale (fr, en)** : la ou les fiche(s) `/produits/<slug>`, `/produits`, et la ou les catégorie(s) → **≈ 6 à 10 chemins**.
- Appelants (tous **événementiels**, volume négligeable) :
  - `app/api/stripe/webhook/route.ts:488` (une commande payée),
  - `app/api/admin/products/route.ts:52,144,206` (sauvegarde produit admin),
  - `app/api/admin/stock/manual-order/route.ts:126` (sortie de stock manuelle).

### 2.4 Crons

`vercel.json` — 3 crons quotidiens : `/api/emails/relance` (09:00), `/api/admin/stock-alerts` (08:00), `/api/cron/daily` (10:00). **Aucun n'appelle `revalidatePath`/`revalidateTag`** (vérifié par grep). → **contribution ISR nulle.**

### 2.5 `generateStaticParams`

- `app/[locale]/layout.tsx` → 2 locales.
- `app/[locale]/produits/[slug]/layout.tsx` → 14 produits → **28 fiches pré-générées au build** (revalidate 900 ensuite).
- `categorie/[slug]`, `packs/[slug]`, `blog/[slug]` : **pas de `generateStaticParams`** → générées **on-demand** à la 1ʳᵉ requête, puis ISR.

### 2.6 Autres

- **Aucun** `dynamic = "force-static"`, **aucun** `fetchCache` particulier.
- Le **flux Google Shopping** (`app/api/feed/google-shopping`) est **`dynamic = "force-dynamic"`** + `Cache-Control` CDN 6 h → **HORS ISR**, ne produit aucune écriture ISR.

## 3. Le calcul

Somme des régénérations **théoriques maximales** (un crawler touchant *chaque* chemin à *chaque* fenêtre de revalidation), **avant** correctif :

- Pages ISR : ≈ **109 920/j** (dont **blog = 80 640/j, soit 73 %**).
- Route Handlers : ≈ **11 520/j**.
- **Total théorique max ≈ 121 000/j.**

**Observé : ~30 000/j → ≈ 25 % du maximum théorique.** L'ordre de grandeur **colle** : 30 k tient largement dans l'enveloppe 0–121 k, ce qui est attendu puisque les crawlers ne touchent pas *chaque* chemin à *chaque* fenêtre.

**Le blog domine le maximum théorique à 73 %** (54 chemins à `revalidate 60`).

## 4. L'indice décisif : écritures (994 k) > lectures (171 k), ratio 5,81

Un ISR on-demand naïf donnerait **écritures ≈ lectures** (chaque régénération est déclenchée par une requête). Un ratio **> 1** s'explique par des **`revalidate` courts (60 s) sur beaucoup de chemins, frappés par des crawlers espacés de plus de 60 s** : quasiment chaque hit trouve le cache **périmé** → **régénère (écriture)** ; les hits « frais » servis depuis le cache (lectures/HIT) sont **rares**. Autrement dit, la fenêtre de 60 s est **plus courte que l'intervalle de crawl**, donc presque toute requête est une régénération.

## 5. Hypothèses

**Hypothèse principale.** Régénération ISR **on-demand pilotée par les crawlers** (Googlebot, Bingbot, Google Merchant Center, éventuels monitors d'uptime), **indépendante du trafic humain** — d'où le maintien à ~30 k/j quand les visites ont chuté ×9. **Dominée par les 27 articles de blog × 2 locales à `revalidate = 60`** (73 % du max théorique), suivis des packs (60 s) et catégories (120 s).

**Hypothèses concurrentes non écartées** (faute de mesure côté serveur) :

- **(a)** Un crawler particulièrement agressif (impossible d'identifier les user-agents depuis le code seul).
- **(b)** Un monitor d'uptime externe frappant quelques chemins en continu.
- **(c)** La mécanique de comptage exacte de Vercel (« reads » vs « writes ») : si une régénération de **Route Handler** compte comme écriture, l'estimation §2.2 (~11,5 k/j) participe davantage qu'anticipé.
- **(d)** ⭐ **Effet croisé de la désindexation `/en` (lot du 17/08).** **Tous les chemins ISR sont dédoublés fr/en.** En passant `/en` en `noindex` **et** en le retirant du sitemap, on tarit progressivement le **crawl de la moitié `/en`** des chemins → **réduction attendue des écritures ISR, indépendante du correctif blog.** C'est l'observation la plus utile de cet audit : la désindexation `/en` n'était pas pensée comme un levier ISR, mais elle en est un.

## 6. Le correctif de ce lot + ce qu'il faut mesurer pour trancher

**Correctif appliqué (T3b) :** `blog/[slug]` et `blog` (liste) : **`revalidate 60 → 3600`**. Justification : 27 articles × 2 = 54 chemins = 73 % du max théorique ; un article ne change pas d'une minute à l'autre ; coût = un article corrigé met jusqu'à 1 h à apparaître (forçable par Deploy Hook). **Rien d'autre touché** (ni `packs/[slug]`, ni `categorie/[slug]`, ni `produits/[slug]`, ni les Route Handlers à 60 s) : **une variable à la fois**.

⚠️ **Deux changements interviennent dans le même lot** (blog `revalidate` **et** désindexation `/en`, hyp. (d)). **La baisse du prochain cycle ne sera donc PAS attribuable proprement à l'un ou à l'autre.** Compromis assumé : l'objectif est de **réduire**, pas de **démontrer**.

**Pour trancher proprement (mesures à obtenir) :**

1. **Vercel → Usage → ISR, détail des écritures PAR CHEMIN** : confirmer que le blog dominait bien avant, et mesurer la part `/fr` vs `/en`.
2. **Logs d'accès par user-agent** (Googlebot / Bingbot / Merchant / monitor / humains) : confirmer le pilotage crawler.
3. **Après un cycle** : comparer la baisse à la contribution théorique attendue du seul correctif blog (−76 k/j de max théorique) et à l'effet `/en`.
