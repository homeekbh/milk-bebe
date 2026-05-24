---
name: milk-expert
description: >
  Expert complet du projet M!LK (milkbebe.fr) — boutique e-commerce bébé bambou OEKO-TEX.
  Utilise ce skill pour TOUTE tâche liée à M!LK : code, bug, feature, SEO, conversion,
  sécurité, admin, emails, Stripe, Sendcloud, Supabase, Next.js, marketing.
  Déclenche ce skill dès que l'utilisateur mentionne M!LK, milkbebe, Erika, bébé bambou,
  une commande, une étiquette, un produit, le panier, le checkout, l'admin, les avis,
  les promos, les emails, les stats, le SEO, Instagram, les Reels, la livraison,
  Sendcloud, Stripe, ou toute tâche de développement sur ce projet.
  Ce skill contient des faits VÉRIFIÉS par audit réel du code — pas des suppositions.
---

# M!LK — Expert Projet Complet (Audit Mai 2026)

## ⚠️ RÈGLES ABSOLUES

1. **Fichiers complets uniquement** — jamais de diff partiel, toujours le fichier entier
2. **PowerShell encoding** — toujours `-Encoding UTF8` sur Windows
3. **No useState dans .map()** — règle React stricte
4. **useSearchParams** — toujours dans `<Suspense>` pour Next.js prod
5. **Supabase SSR** — useEffect dépendant localStorage attend `mounted=true`
6. **Stripe deduplication** — upsert avec `stripe_session_id` unique
7. **Cron Vercel Hobby** — max 1/jour (`0 9 * * *`)
8. **Texte Erika** — mot pour mot, jamais paraphrasé, jamais reformulé
9. **Push immédiat** — commit + push sans attendre validation sauf demande explicite
10. **Tester avant d'affirmer** — ne jamais dire "ça fonctionne" sans curl/test réel

---

## IDENTITÉ MARQUE

**M!LK** — essentiels bébé bambou certifié OEKO-TEX, 0–6 mois.
Fondatrice : **Erika Kosztandi**, maman 2 garçons, Menton (06500).
Structure : **EKBH SASU**, directrice non salariée.
Positionnement : moderne, unisexe, épuré, sans superflu. Premium accessible.

**Voix Erika :** directe, punchy, émotionnelle, courte. Jamais paraphrasée.

**Couleurs :**
- Fond : `#1a1410` (brun chaud sombre)
- Accent : `#c49a4a` (ambre doré)
- Texte : `#f2ede6` (crème)

---

## STACK TECHNIQUE

| Couche | Valeur |
|--------|--------|
| Framework | Next.js 16, React 19, App Router |
| Styling | Tailwind v4, TypeScript |
| Backend | Supabase (projet : milk-prod, ref: ntkqmnenczltlwplswka) |
| Paiement | Stripe LIVE |
| Expédition | Sendcloud API v3 |
| Emails | Resend (from: contact@milkbebe.fr) |
| Déploiement | Vercel Hobby |
| Repo | homeekbh/milk-bebe (branche main) |
| Domaine | www.milkbebe.fr |

---

## ARCHITECTURE FICHIERS (vérifiée par audit)

```
app/
├── page.tsx                    — Server Component ✅ (generateMetadata OK)
├── _homepage/HomepageClient.tsx — "use client" (animations)
├── panier/page.tsx             — Checkout complet avec guest + livraison
├── produits/[slug]/page.tsx    — Fiche produit avec Apple Pay
├── categorie/[slug]/page.tsx   — Page catégorie avec SEO content
├── success/page.tsx            — Page confirmation (MANQUE upsell)
├── favoris/page.tsx            — Wishlist localStorage (mounted fix ✅)
├── admin/
│   ├── layout.tsx              — Auth côté client (MANQUE middleware)
│   └── commandes/page.tsx      — Gestion commandes + Sendcloud
├── api/
│   ├── stripe/webhook/route.ts — Webhook principal ✅
│   ├── webhooks/stripe/route.ts — Re-export du webhook (doublon inoffensif)
│   ├── checkout/create-session/ — Stripe session
│   ├── admin/sendcloud/create-label/ — Étiquettes Sendcloud v3
│   ├── emails/                 — confirmation, shipped, relance, avis, taille-suivante
│   ├── cron/daily/             — Maître cron (avis J+7 + taille-suivante)
│   └── emails/relance/         — Abandon panier (3 séquences)
└── sitemap.ts / robot.ts       — ✅ Dynamiques

components/
├── product/
│   ├── ExpressCheckout.tsx     — Apple Pay / Google Pay via PaymentRequest API
│   ├── ProductRecommendations.tsx — ⚠️ PLACEHOLDER VIDE (à coder)
│   └── ProductPurchasePanel.tsx
├── seo/
│   ├── JsonLd.tsx              — ✅ Structured data
│   ├── Breadcrumb.tsx          — ✅ Fil d'ariane
│   └── CategorySeoContent.tsx  — ✅ Contenu SEO 350 mots/catégorie
└── bot/ChatWidget.tsx          — Fermeture auto 2min inactivité ✅
```

---

## SUPABASE — ÉTAT SÉCURITÉ (post-audit mai 2026)

### Tables avec RLS activée ✅ (protégées)
```
profiles, promo_codes, page_views, activity_log
newsletter_subscribers (verrouillé mai 2026)
orders, customers, abandoned_carts, admin_logs, reviews,
order_items, stock_alerts, waitlist, add_to_cart_events, product_images
(verrouillé mai 2026 — migration 006_rls_lockdown.sql)
```

### Tables publiques par design (anon peut lire)
```
products, categories, popups, homepage_config, shipping_methods
```
Ces tables sont lues côté client pour afficher le site — normal.

### ⚠️ IMPORTANT : toute nouvelle table créée doit avoir RLS activé immédiatement
```sql
ALTER TABLE nouvelle_table ENABLE ROW LEVEL SECURITY;
REVOKE SELECT, INSERT, UPDATE, DELETE ON nouvelle_table FROM anon, authenticated;
```

### Accès DB
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → lecture seule des tables publiques
- `SUPABASE_SERVICE_ROLE_KEY` → bypass RLS, server-side uniquement
- DDL (ALTER TABLE, CREATE) → SQL Editor Supabase Studio uniquement (pas via API REST)

---

## SENDCLOUD API v3 — CONFIG VÉRIFIÉE

**Host :** `https://panel.sendcloud.sc`
**Auth :** Basic (SENDCLOUD_PUBLIC_KEY:SENDCLOUD_SECRET_KEY)
**Sender Address ID :** `782727`

### Mapping codes shipping (hardcodé — TESTÉ)
```typescript
const SENDCLOUD_OPTION_CODES = {
  colissimo: {
    point_relais: "colissimo:post-office",  // ⚠️ exige to_service_point mais incompatible relay Colissimo
    home: "colissimo:home/fr",
  },
  mondial_relay: {
    point_relais: "mondial_relay:service_point,dualapi/size=l,c2c", // ✅ FONCTIONNE
    home: "mondial_relay:home_domestic,dualapi/c2c",
  },
}
```

### ⚠️ Bug Colissimo Point Relais (non résolu)
`colissimo:post-office` exige `to_service_point` mais le relay_id Colissimo
est incompatible avec ce code shipping. Erreur : "Service point carrier does not match".
**Workaround actuel :** utiliser Mondial Relay pour les tests PR.
**Solution définitive :** activer contrat "So Colissimo / Point Retrait" dans panel.sendcloud.sc

### Body announce correct (v3 OpenAPI — VÉRIFIÉ)
```json
{
  "ship_with": {
    "type": "shipping_option_code",
    "properties": { "shipping_option_code": "<code>" }
  },
  "from_address": { "sender_address_id": 782727 },
  "to_address": {
    "name": "...", "address_line_1": "...", "city": "...",
    "postal_code": "...", "country_code": "FR",
    "email": "...", "phone_number": "..."
  },
  "to_service_point": { "id": "<string>" },
  "parcels": [{ "weight": { "value": "0.500", "unit": "kg" } }],
  "order_number": "...",
  "request_label": true
}
```

### ⚠️ CRITIQUE : adresse relais
En mode point_relais, `shipping_address` est VIDE.
Toujours utiliser `order.relay_*` columns :
- `order.relay_address` → address_line_1
- `order.relay_city` → city
- `order.relay_postal_code` → postal_code

### Récupération label
`response.data.parcels[0].documents[0].link`

---

## STRIPE — CONFIGURATION

### Session create
```typescript
payment_method_types: ["card"]
// ⚠️ Apple Pay/Google Pay absents du Stripe Checkout redirect
// Fix : passer à automatic_payment_methods: { enabled: true }
```

### Apple Pay sur fiche produit
`components/product/ExpressCheckout.tsx` — utilise PaymentRequest API natif ✅
Fonctionne sur Safari/iOS et Chrome Android sans Stripe redirect.

### Webhook
Route principale : `/api/stripe/webhook/route.ts` ✅
Re-export : `/api/webhooks/stripe/route.ts` (doublon inoffensif — même handler)
**Ne configurer qu'UNE seule URL dans le dashboard Stripe.**

### Décrément stock
RPC atomique `decrement_stock_atomic` avec fallback non-atomique.
Restock automatique à l'annulation via `restoreStock`.

---

## EMAILS RESEND — SÉQUENCES VÉRIFIÉES

**From :** toujours `contact@milkbebe.fr`

| Email | Trigger | Fichier |
|-------|---------|---------|
| Confirmation commande | Webhook Stripe checkout.completed | api/emails/confirmation |
| Expédition + tracking | Admin marque "expédiée" | api/emails/shipped |
| Annulation + remboursement | Admin cancel | api/emails/cancellation |
| Relance abandon panier x3 | Cron 9h : 1h / 24h / 72h | api/emails/relance |
| Demande avis J+7 | Cron 10h daily | api/emails/avis |
| Taille suivante | Cron 10h : J+45 / J+75 | api/emails/taille-suivante |
| Welcome -10% newsletter | Subscribe | api/newsletter/subscribe |

### ⚠️ Cron vercel.json — doublon potentiel
```json
{ "path": "/api/emails/relance", "schedule": "0 9 * * *" },
{ "path": "/api/cron/daily",     "schedule": "0 10 * * *" }
```
Vérifier que `/api/cron/daily` n'appelle PAS aussi `/api/emails/relance`
pour éviter double envoi.

---

## CONVERSION — ÉTAT RÉEL (audit code)

### ✅ Implémenté
- Guest checkout (guestEmail dans panier/page.tsx)
- Apple Pay / Google Pay via ExpressCheckout.tsx sur fiche produit
- Séquence abandon panier 3 emails
- Exit intent popup -10%
- Codes promos avec validation
- Wishlist localStorage (mounted fix)
- Chatbot avec fermeture auto 2min

### ⚠️ Bugs confirmés par lecture code
1. **DELIVERY_PRICES dupliqué** — défini dans `panier/page.tsx` ET `api/checkout/create-session/route.ts`. Si désynchronisés → affichage ≠ facturation. Source unique de vérité à créer.
2. **fbq dupliqué** dans `panier/page.tsx` — fonction définie 2 fois (lignes 1-5 et 8-14). Analytics Meta potentiellement faux.
3. **Apple Pay absent Stripe redirect** — `payment_method_types: ["card"]` bloque Apple Pay dans le tunnel Stripe. Fix : `automatic_payment_methods: { enabled: true }`.

### ❌ Manquant (impact business direct)
1. **ProductRecommendations = placeholder vide** (`/* placeholder */`) — 0 recommandation affichée
2. **Success page sans upsell** — pas de produits suggérés après achat
3. **Recherche non prédictive** — pas d'autocomplétion temps réel
4. **Pas d'email bienvenue** à la création de compte
5. **next-intl installé mais inutilisé** — bundle inutilement lourd

---

## SEO — DÉPLOYÉ (commits vérifiés)

| Commit | Contenu |
|--------|---------|
| 706e535 | generateMetadata dynamique toutes pages |
| 8a1d0ba | JSON-LD structured data (Product, Organization, FAQ, BreadcrumbList) |
| 90155c4 | Sitemap dynamique + robots.ts |
| 50ebc79 | Contenu SEO 350 mots/catégorie |
| a7b92b9 | next/image optimisé (AVIF/WebP, priority LCP) |
| d93247e | Breadcrumbs visuels + aria |

**Mots-clés cibles (Google Search Console — mai 2026) :**
- "gigoteuse bambou" → position 23, objectif top 5
- "pyjama bambou bébé" → position 5, objectif top 3
- "body bébé OEKO-TEX" → position 8, objectif top 5

**Objectif trafic :** 1000 clics/mois (actuellement ~50/mois)
**Prochaine analyse :** juin 2026 (6 semaines après déploiement SEO)

---

## VARIABLES D'ENVIRONNEMENT VERCEL

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SENDCLOUD_PUBLIC_KEY
SENDCLOUD_SECRET_KEY
SENDCLOUD_SENDER_ADDRESS_ID=782727
RESEND_API_KEY
INTERNAL_EMAIL_SECRET
CRON_SECRET
NEXT_PUBLIC_BASE_URL=https://www.milkbebe.fr
ADMIN_EMAIL_1=contact@milkbebe.fr
```

---

## CATALOGUE PRODUITS

14 produits actifs, 210 images, bucket `product-images` Supabase Storage.

| Catégorie | Nb produits | Slug |
|-----------|-------------|------|
| Bodies | 3 | bodies |
| Pyjamas | 4 | pyjamas |
| Gigoteuses | 4 | gigoteuses |
| Langes | 1 | langes |
| Accessoires | 2 | accessoires |

**Motifs disponibles :** Éclair, Smileys, Damier, Terracotta, et autres.

---

## PRIORITÉS BUSINESS — ROI DÉCROISSANT

### 🔴 Urgent (cette semaine)
1. Fixer `automatic_payment_methods: { enabled: true }` dans Stripe session → +15% conversion mobile, 30min
2. Coder `ProductRecommendations` → +15% panier moyen, 3h
3. Dédupliquer `DELIVERY_PRICES` → source unique de vérité, 1h
4. Fixer double `fbq` dans panier → analytics corrects, 15min
5. Supprimer `next-intl` si inutilisé → bundle -50kb, 15min

### 🟠 Court terme (2 semaines)
6. Success page upsell → recommandations post-achat
7. Recherche prédictive temps réel → /recherche
8. Email bienvenue création compte
9. Vérifier double cron relance (vercel.json)
10. Activer "So Colissimo" Sendcloud → Colissimo PR fonctionnel

### 🟡 Moyen terme (1 mois)
11. Middleware Next.js pour protection admin server-side
12. Content Security Policy dans next.config.ts
13. Blog SEO — 2 articles/mois (bambou bébé, conseils nuit, trousseau)
14. Pinterest — compte M!LK avec vraies photos
15. Backlinks — Linkuma 3-5 liens blogs maternité (~50€)

### 🟢 Long terme (3 mois)
16. Multilingual EN/IT (LangContext déjà en place)
17. Restock alerts email
18. Programme parrainage "10€ pour toi + amie"
19. Trustpilot widget
20. Meta Ads + Google Ads post-lancement

---

## PARCOURS CLIENT COMPLET

```
Homepage → Catégorie → Fiche produit → Panier → Checkout
→ Stripe Checkout → Webhook Stripe → Supabase order créé
→ Email confirmation client → Admin notifié (OrderAlerts)
→ Admin génère étiquette Sendcloud → Marque expédiée
→ Email tracking client → J+7 email demande avis
→ Client laisse avis /avis?order_id=X → Admin valide
→ Avis visible catégorie + fiche produit
→ J+45/J+75 email taille suivante
```

## PARCOURS ADMIN COMPLET

```
/admin/commandes → voir commandes filtrées par statut/transporteur
→ Cliquer commande → voir détail complet
→ Générer étiquette Sendcloud (mondial_relay ✅ / colissimo PR ⚠️)
→ Imprimer PDF → Marquer expédiée (email auto client)
→ Ou : Annuler + Rembourser Stripe
  → Annulation Sendcloud automatique
  → Restock automatique
  → Email annulation client
  → UI épurée (masque étiquettes/tracking)
```

**Statuts order :** `payee` → `en_preparation` → `expediee` → `livree` / `annulee` / `remboursee`

---

## BENCHMARKS E-COMMERCE 2026 (pour décisions)

- Taux conversion moyen e-commerce FR : 1.5–3%
- Taux abandon panier moyen : 70%
- Mobile = 54% du trafic M!LK, conversion mobile < desktop
- Apple Pay / Google Pay → +20-30% conversion mobile
- Produits avec 11-30 avis → +68% conversion vs 0 avis
- Referral/affiliate → taux conversion 4-5.4% (meilleur canal)
- Email marketing → 2-8% conversion
- Checkout 1 page vs multi-pages → -26% abandon
