-- ─────────────────────────────────────────────────────────────────────────────
-- STOCK PAR MOTIF (Option A) — BACKFILL motif_id  (Section B extraite)
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠️ NON EXÉCUTÉ — à relire puis lancer À LA MAIN (hors migrations auto).
--
-- BUT : donner un `id` uuid STABLE à chaque motif de products.colors[] qui n'en a
--       pas encore. C'est la clé de jointure du décrément (phase 4) / restock (phase 5).
--
-- GARANTIES :
--   1. IDEMPOTENT — n'ajoute un id qu'aux motifs SANS id (case `elem ? 'id'`), et ne
--      met à jour QUE les produits ayant au moins un motif sans id (clause EXISTS).
--      Relançable autant de fois qu'on veut : aucun doublon d'id, aucun id réécrit.
--   2. NE MODIFIE QUE LE CHAMP id — le motif conservé est `elem` (inchangé) OU
--      `elem || {id}` (fusion jsonb = ajoute la seule clé `id`, préserve name/hex/
--      image_url/validated/sizes/sizes_stock/stock à l'identique). Aucune valeur de
--      stock n'est touchée.
--   3. IGNORE LES PRODUITS SANS MOTIF (colors null/vide → Bandeau, Bonnet…) : exclus
--      par `jsonb_array_length(colors) > 0`. Ils gardent leur stock legacy / taille unique.
--
-- Améliorations vs brouillon commenté (Section B de l'ops) :
--   • `order by ord` (WITH ORDINALITY) → préserve l'ORDRE des motifs (affichage fiche).
--   • `jsonb_typeof(colors) = 'array'` → garde défensive si un colors non-tableau traîne.
-- ═════════════════════════════════════════════════════════════════════════════


-- ── PRÉ-VÉRIFICATION (lecture seule) : combien de motifs sans id avant le backfill ?
select
  count(*) filter (where not (elem ? 'id')) as motifs_sans_id,
  count(*)                                   as motifs_total
from products p
cross join lateral jsonb_array_elements(coalesce(p.colors, '[]'::jsonb)) as elem;


-- ── BACKFILL (n'ajoute QUE le champ id des motifs qui en manquent) ──────────────
update products p
   set colors = (
     select jsonb_agg(
              case
                when elem ? 'id' then elem                                         -- déjà un id → inchangé
                else elem || jsonb_build_object('id', gen_random_uuid()::text)      -- ajoute UNIQUEMENT id
              end
              order by ord                                                          -- préserve l'ordre des motifs
            )
     from jsonb_array_elements(p.colors) with ordinality as e(elem, ord)
   )
 where p.colors is not null
   and jsonb_typeof(p.colors) = 'array'
   and jsonb_array_length(p.colors) > 0
   and exists (                                                                     -- idempotence au niveau ligne
     select 1 from jsonb_array_elements(p.colors) as x
     where not (x ? 'id')
   );


-- ── POST-VÉRIFICATION 1 : plus aucun motif sans id (attendu = 0).
select count(*) as motifs_sans_id_restants
from products p
cross join lateral jsonb_array_elements(coalesce(p.colors, '[]'::jsonb)) as elem
where not (elem ? 'id');


-- ── POST-VÉRIFICATION 2 : stock intact (seul id ajouté) — inspection visuelle.
--    sizes_stock et stock_motif doivent être IDENTIQUES à l'état d'avant (cf. A2).
select
  p.id, p.name,
  c->>'id'          as motif_id,
  c->>'name'        as motif,
  c->'sizes_stock'  as sizes_stock,
  c->>'stock'       as stock_motif
from products p
cross join lateral jsonb_array_elements(coalesce(p.colors, '[]'::jsonb)) c
order by p.name, motif;
