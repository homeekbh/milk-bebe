-- ─────────────────────────────────────────────────────────────────────────────
-- STOCK PAR MOTIF (Option A) — SCRIPTS OPÉRATIONNELS (PHASE 1, préparation)
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠️ NON EXÉCUTÉ. Volontairement HORS de supabase/migrations/ pour ne JAMAIS être
--    lancé automatiquement (la section C écrit du stock : à lancer À LA MAIN, au
--    bon moment). Trois sections indépendantes :
--       A) DÉCOUVERTE  — lecture seule, sans risque (à lancer maintenant pour l'état des lieux)
--       B) BACKFILL motif_id — additif, ne touche PAS au stock (optionnel, avant le cutover)
--       C) INIT à 20 par cellule — ÉCRIT du stock : SEULEMENT à la phase de cutover, jamais avant
--    Relecture Bou obligatoire avant toute exécution.
-- ═════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION A — REQUÊTE DE DÉCOUVERTE (lecture seule) : état actuel avant migration
-- ═══════════════════════════════════════════════════════════════════════════

-- A1. Vue d'ensemble par produit : nb motifs, axe tailles (product.sizes), stock legacy,
--     et si chaque motif possède déjà un id stable.
select
  p.id,
  p.name,
  p.category_slug,
  p.published,
  p.stock                                              as stock_legacy_global,
  coalesce(jsonb_array_length(p.sizes), 0)             as nb_tailles_produit,
  p.sizes                                              as tailles_produit,
  coalesce(jsonb_array_length(p.colors), 0)            as nb_motifs,
  (select jsonb_agg(c->>'name') from jsonb_array_elements(p.colors) c) as motifs,
  coalesce((select bool_and(c ? 'id') from jsonb_array_elements(p.colors) c), false) as tous_motifs_ont_id
from products p
order by p.category_slug, p.name;

-- A2. Détail des cellules ACTUELLES motif × taille (colors[].sizes_stock cosmétique aujourd'hui).
select
  p.id, p.name,
  c->>'name'          as motif,
  c->>'id'            as motif_id,
  c->'sizes'          as tailles_motif,
  c->'sizes_stock'    as sizes_stock_actuel,
  c->>'stock'         as stock_motif_actuel
from products p
cross join lateral jsonb_array_elements(coalesce(p.colors, '[]'::jsonb)) c
order by p.name, motif;

-- A3. ⚠️ PRODUITS MULTI-MOTIFS : migration "à trou" (stock global non répartissable) → RECOMPTAGE requis.
select p.id, p.name, p.category_slug, jsonb_array_length(p.colors) as nb_motifs, p.stock as stock_legacy
from products p
where jsonb_array_length(p.colors) > 1
order by nb_motifs desc, p.name;

-- A4. PRODUITS SANS MOTIF : deviendront un motif "Unique" (cas N=1) à l'init.
select p.id, p.name, p.category_slug, p.stock as stock_legacy
from products p
where p.colors is null or jsonb_array_length(p.colors) = 0
order by p.category_slug, p.name;

-- A5. COHÉRENCE AXE TAILLES : produits sans product.sizes (axe taille manquant → seraient traités 1D).
--     À corriger AVANT l'init si le produit devrait avoir des tailles (cf. structure catalogue).
select p.id, p.name, p.category_slug, p.colors is not null as a_des_motifs
from products p
where p.sizes is null or jsonb_array_length(p.sizes) = 0
order by p.category_slug, p.name;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION B — BACKFILL motif_id (ADDITIF, ne touche PAS au stock) — OPTIONNEL
-- ═══════════════════════════════════════════════════════════════════════════
-- Donne un uuid stable à chaque motif qui n'en a pas. Idempotent (n'agit que sur
-- les motifs sans id). N'altère ni sizes_stock ni stock. Peut être lancé tôt.
-- (La section C ajoute aussi l'id si absent ; cette section B sert si l'on veut les
--  ids AVANT de reconstruire les stocks.)
--
-- update products p
--    set colors = (
--      select jsonb_agg(
--        case when elem ? 'id' then elem
--             else elem || jsonb_build_object('id', gen_random_uuid()::text) end)
--      from jsonb_array_elements(p.colors) elem
--    )
--  where p.colors is not null
--    and jsonb_array_length(p.colors) > 0
--    and exists (select 1 from jsonb_array_elements(p.colors) e where not (e ? 'id'));


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION C — INIT À 20 PAR CELLULE motif × taille  ⚠️⚠️ ÉCRIT DU STOCK ⚠️⚠️
-- ═══════════════════════════════════════════════════════════════════════════
-- À LANCER UNIQUEMENT À LA PHASE DE CUTOVER (pas maintenant). Stock fictif 20/cellule,
-- ajusté ensuite par Erika. Reconstruit products.colors pour que, pour CHAQUE produit :
--   • l'axe TAILLE = product.sizes (décision : tailles au niveau produit),
--   • chaque motif existant (ou un motif "Unique" si aucun) reçoive sizes_stock={taille:20},
--   • colors[].stock = Σ sizes_stock (ou 20 en 1D), et products.stock = Σ colors[].stock.
--
-- Structure catalogue attendue (le résultat DOIT y correspondre — sinon corriger
-- product.sizes / colors via A5/A2 avant de lancer) :
--   • Pyjama    : 4 motifs × [Naissance, 0-3 mois, 3-6 mois]  → 12 cellules
--   • Body      : 3 motifs × [0-3 mois, 3-6 mois]             →  6 cellules
--   • Gigoteuse : 4 motifs × [0-6 mois]                       →  4 cellules
--   • Lange / Bonnet / Bandeau : 1 motif × taille unique      →  1 cellule (cas 1D)
--
-- PRÉREQUIS avant de lancer : (1) product.sizes correct par produit (cf. A5) ;
--   (2) les motifs voulus présents dans colors[] (cf. A2). L'init s'appuie sur ces données.
--
-- DO $$
-- declare
--   r             record;
--   v_sizes       text[];
--   v_colors_in   jsonb;
--   v_new_colors  jsonb;
--   v_motif       jsonb;
--   v_sizes_stock jsonb;
--   v_stock       integer;
--   s             text;
-- begin
--   for r in select id, sizes, colors from products loop
--     -- Axe tailles = product.sizes (vide → produit 1D / taille unique).
--     if r.sizes is not null and jsonb_typeof(r.sizes) = 'array' and jsonb_array_length(r.sizes) > 0 then
--       select array_agg(value) into v_sizes from jsonb_array_elements_text(r.sizes);
--     else
--       v_sizes := array[]::text[];
--     end if;
--
--     -- Motifs existants, ou un motif "Unique" si aucun.
--     if r.colors is not null and jsonb_typeof(r.colors) = 'array' and jsonb_array_length(r.colors) > 0 then
--       v_colors_in := r.colors;
--     else
--       v_colors_in := jsonb_build_array(jsonb_build_object('name','Unique','hex','#f2ede6','image_url', null));
--     end if;
--
--     v_new_colors := '[]'::jsonb;
--     for v_motif in select value from jsonb_array_elements(v_colors_in) loop
--       if array_length(v_sizes, 1) is null then
--         -- Cas 1D : pas de taille → stock scalaire.
--         v_sizes_stock := '{}'::jsonb;
--         v_stock := 20;
--       else
--         -- Cas 2D : 20 par taille.
--         v_sizes_stock := '{}'::jsonb;
--         foreach s in array v_sizes loop
--           v_sizes_stock := v_sizes_stock || jsonb_build_object(s, 20);
--         end loop;
--         v_stock := 20 * array_length(v_sizes, 1);
--       end if;
--
--       v_new_colors := v_new_colors || jsonb_build_array(jsonb_build_object(
--         'id',          coalesce(v_motif->>'id', gen_random_uuid()::text),  -- id stable (créé si absent)
--         'name',        coalesce(v_motif->>'name', ''),
--         'hex',         coalesce(v_motif->>'hex', '#f2ede6'),
--         'image_url',   v_motif->'image_url',
--         'validated',   true,
--         'sizes',       to_jsonb(v_sizes),           -- = product.sizes (axe partagé)
--         'sizes_stock', v_sizes_stock,               -- ★ 20 par cellule
--         'stock',       v_stock                      -- agrégat du motif
--       ));
--     end loop;
--
--     update products
--        set colors = v_new_colors,
--            stock  = (select coalesce(sum((c->>'stock')::integer), 0) from jsonb_array_elements(v_new_colors) c)
--      where id = r.id;
--   end loop;
-- end $$;
--
-- Vérification post-init (lecture seule) — total attendu = 20 × nb cellules :
-- select id, name,
--   (select sum((c->>'stock')::int) from jsonb_array_elements(colors) c) as stock_total,
--   stock as stock_produit_agrege
-- from products order by name;
