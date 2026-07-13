# Exclusion du trafic interne des analytics

Empêche les sessions de test (Bou + Claude Code) de polluer les analytics et les
calculs de conversion.

## Comment s'exclure (Bou & Claude Code)

Visiter **une seule fois** :

```
https://www.milkbebe.fr/?internal=milk2026
```

Cela pose un cookie `milk_internal_traffic=true` valable **1 an**. Ensuite, navigation
normale : tant que le cookie est présent, **rien n'est enregistré** (aucune page_view,
aucun add_to_cart, begin_checkout, purchase — ni interne DB, ni GA4, ni Meta Pixel).
Pas besoin de répéter le paramètre à chaque session.

- Cookie effacé / autre appareil / autre navigateur → repasser une fois par le lien.
- Navigation privée → le cookie ne persiste pas, repasser par le lien à chaque session.

## Ce qui est couvert

Bloqué dès que le cookie est présent (garde **client** dans `lib/internal-traffic.ts`,
+ garde **serveur** défensive dans les routes d'ingestion) :

- Vues de page & comportement → `POST/PATCH /api/track-view` (PageTracker)
- Events e-commerce internes → `POST /api/analytics/event` (view_item, add_to_cart,
  begin_checkout, purchase, wishlist, search) via `lib/analytics.ts`
- Vues produit → `POST /api/stats/view`
- GA4 dataLayer + Meta Pixel (fbq) → non émis pour le trafic interne

La toute première page (`?internal=milk2026`) est déjà exclue (le filet vérifie aussi le
paramètre d'URL, avant même que le cookie soit relu).

## Vraies commandes de test → colonne `is_internal_test`

Le paiement passe par Stripe puis le webhook (le cookie n'est pas transmis à Stripe).
Une commande de test se marque donc **manuellement** :

- `/admin/commandes` → bouton **« 🧪 Marquer test interne »** sur la commande
  (bascule `orders.is_internal_test`). Réversible.
- Les dashboards analytics excluent `is_internal_test = true` par défaut (via
  `isValidOrder` + filtres sur les requêtes `orders`).

⚠️ **Migration requise** : `supabase/migrations/018_orders_internal_test.sql`
(colonne `is_internal_test`). À exécuter **avant** de déployer le code du point 4,
sinon les requêtes analytics échouent (colonne inconnue).

Marquer rétroactivement les ~30 commandes de test d'hier + les 4 anciennes depuis
`/admin/commandes`.
