-- ═══════════════════════════════════════════════════════════════════════════
-- 022_total_weight_g_no_default.sql
-- Point 3 (audit intl) — RETIRER le DEFAULT 500 de orders.total_weight_g.
--
-- Le DEFAULT 500 g MASQUAIT une absence d'écriture du poids : une commande dont le poids réel n'était
-- pas persisté partait quand même avec 500 g → poids potentiellement SOUS-DÉCLARÉ à FedEx sans qu'on
-- le voie (mauvaise tranche FEDEX_INTL_TIERS / prix faux). Le pipeline poids (create-session → webhook,
-- Σ produits + emballage) écrit désormais la VRAIE valeur ; en retirant le défaut, une absence
-- d'écriture apparaît en NULL (visible) au lieu de 500 (silencieux).
-- Côté code, create-label REFUSE alors une étiquette INTERNATIONALE sans poids (tranche FedEx
-- impossible) plutôt que d'utiliser un défaut faux (cf. app/api/admin/sendcloud/create-label/route.ts).
--
-- ⚠️ NON exécuté ici — à appliquer en prod (comme 019/020/021).
--
-- NB versionnement : orders.total_weight_g (comme shipping_country / shipping_zone / carrier /
-- customer_phone / stripe_payment_intent_id / invoice_number — « lot SENDCLOUD-META ») a été ajouté
-- MANUELLEMENT en prod et n'est versionné dans AUCUNE migration. Ce fichier crée donc la colonne si
-- absente (env neuf) PUIS retire le défaut (prod). Les AUTRES colonnes du lot restent à versionner
-- dans une migration dédiée (hors périmètre de ce correctif).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Env neuf : créer la colonne NULLABLE et SANS défaut. Idempotent (no-op si déjà présente en prod).
alter table orders
  add column if not exists total_weight_g integer;

-- 2) Prod : retirer le DEFAULT 500 existant (pas de défaut → NULL si non renseigné).
alter table orders
  alter column total_weight_g drop default;

-- 3) La colonne DOIT rester NULLABLE (sinon un insert sans poids échouerait après DROP DEFAULT).
--    Idempotent : no-op si déjà nullable.
alter table orders
  alter column total_weight_g drop not null;

-- NB : les commandes EXISTANTES à total_weight_g = 500 sont AMBIGUËS (vrai 500 g OU ancien défaut) →
-- on NE les modifie PAS. Le changement ne concerne que les NOUVELLES commandes.

-- ── Vérifs post-exécution suggérées ─────────────────────────────────────────
--   select column_default, is_nullable from information_schema.columns
--     where table_name = 'orders' and column_name = 'total_weight_g';   -- default NULL, nullable YES
-- ═══════════════════════════════════════════════════════════════════════════
