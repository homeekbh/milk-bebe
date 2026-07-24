-- ─────────────────────────────────────────────────────────────────────────────
-- 027 — REDIRECTIONS 404 : products.old_slug (301 ancien slug → nouveau)
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠️ NON EXÉCUTÉ. Additif. À relire puis lancer à la main (Bou).
--
-- Quand l'admin renomme le slug d'un produit, l'ancienne URL /produits/<ancien> devient un lien
-- mort (404). Cette colonne permet, avant notFound(), de retrouver le produit par son ancien slug
-- et de rediriger en 301 vers le nouveau (D4). Le PUT produit écrira old_slug = ancien slug lors
-- d'un renommage (Lot 3) ; le lookup 301 vit dans la fiche (Lot 6).
--
-- Historique : UN SEUL niveau (dernier ancien slug). Un nouveau renommage écrase old_slug — les
-- renommages en chaîne ne conservent que le précédent (acceptable, cf. D4). Pour un historique
-- complet, remplacer par une table product_redirects(old_slug PK, product_id) ; non retenu ici.
-- ═════════════════════════════════════════════════════════════════════════════

alter table products add column if not exists old_slug text;

-- Lookup rapide par ancien slug (partiel : uniquement les produits renommés).
create index if not exists idx_products_old_slug
  on products (old_slug) where old_slug is not null;
