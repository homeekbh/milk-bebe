-- ============================================================================
-- Migration — Suppression définitive du mode "locker"
-- À exécuter manuellement dans Supabase Studio (SQL Editor)
-- ============================================================================
--
-- Décision produit : on garde uniquement 2 options de livraison :
--   1. Domicile        (delivery_type = 'home')
--   2. Point Relais    (delivery_type = 'point_relais')
--
-- Les anciennes commandes en 'locker' deviennent 'point_relais' (même
-- transporteur Mondial Relay, même tarif, même UX admin). Le client a
-- déjà reçu son colis, c'est uniquement un nettoyage de cohérence.

UPDATE orders
   SET delivery_type = 'point_relais'
 WHERE delivery_type = 'locker';

-- Sanity check — retourne le nombre de lignes encore en 'locker' (doit valoir 0)
SELECT COUNT(*) AS still_locker
  FROM orders
 WHERE delivery_type = 'locker';
