-- ─────────────────────────────────────────────────────────────────────────────
-- STOCK PAR MOTIF (Option A) — ALIGNEMENT CIBLÉ de 2 produits désynchronisés (bug #1)
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠️ NON EXÉCUTÉ — à relire, puis lancer À LA MAIN (Bou) avant la bascule phase 4.
--
-- Corrige UNIQUEMENT le stock du motif "Terracotta" de 2 produits dont colors[] a été
-- écrasé par le bug #1 (save qui remet le stock au total d'origine). Les autres écarts
-- (−1 à −3 = ventes réelles) sont NÉGLIGEABLES et NE sont PAS touchés (Erika ajustera).
--
--   1. "Gigoteuse à Nouer — Terracotta" : stock physique réel = 17 (taille unique "0-6 mois")
--   2. "Lange Bambou — Terracotta"        : stock physique réel = 20 (taille unique — clé À VÉRIFIER)
--
-- GARANTIES :
--   • Ne touche QUE ces 2 produits (ciblage par nom), et QUE le motif "Terracotta".
--   • Ne modifie QUE colors[motif].sizes_stock et colors[motif].stock. Aucune autre clé
--     (id, name, hex, image_url, validated, sizes), aucun autre motif, aucun autre produit.
--     La colonne products.stock (agrégat legacy) N'EST PAS touchée.
--   • IDEMPOTENT : SET de valeurs ABSOLUES (17 / 20) → relançable, résultat identique.
-- ═════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1 — CONFIRMATION (lecture seule) : nom EXACT, tailles, clé réelle du sizes_stock
-- ═══════════════════════════════════════════════════════════════════════════
-- ILIKE tolérant (tiret/espacement) pour être SÛR de trouver les 2 produits et lire
-- leur p.name exact + la ou les clés réelles de sizes_stock (colonne `cles_taille`).
select
  p.id,
  p.name,
  p.sizes                                              as tailles_produit,       -- axe taille (niveau produit)
  p.stock                                              as stock_produit_legacy,  -- NON modifié par ce script
  c->>'name'                                           as motif,
  c->>'id'                                             as motif_id,
  c->'sizes'                                           as tailles_motif,
  c->'sizes_stock'                                     as sizes_stock_actuel,
  (select string_agg(k, ', ')
     from jsonb_object_keys(coalesce(c->'sizes_stock','{}'::jsonb)) k)           as cles_taille,  -- ← clé(s) réelle(s)
  c->>'stock'                                          as stock_motif_actuel
from products p
cross join lateral jsonb_array_elements(coalesce(p.colors,'[]'::jsonb)) c
where p.name ilike '%Gigoteuse%Terracotta%'
   or p.name ilike '%Lange%Terracotta%'
order by p.name, motif;
-- 👉 VÉRIFIER dans le résultat :
--    - le p.name EXACT (à recopier dans les constantes ci-dessous si le tiret diffère) ;
--    - la clé `cles_taille` du LANGE (doit valoir 'Taille unique' ; sinon corriger c_lange_taille) ;
--    - qu'il n'y a QU'UNE seule taille par motif Terracotta (mono-taille attendu).


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2 — CORRECTION  ⚠️ ÉCRIT DU STOCK (ces 2 motifs uniquement)
-- ═══════════════════════════════════════════════════════════════════════════
-- Bloc DO : trouve l'index du motif "Terracotta" dans colors[], puis pose sizes_stock
-- (objet 1 clé = mono-taille) et l'agrégat stock du motif. Si le motif est introuvable
-- (nom/tiret différent), il ne fait RIEN (message NOTICE) — aucun risque.
do $$
declare
  v_idx int;
  v_lange_key text;   -- clé de taille du Lange LUE depuis la base (jamais retapée — caractère × = U+00D7)
  -- ── Paramètres — VÉRIFIER via la Section 1 avant de lancer ────────────────────
  c_motif           text := 'Terracotta';                      -- motif ciblé dans colors[]
  c_gigoteuse_name  text := 'Gigoteuse à Nouer — Terracotta';   -- ⚠️ recopier le p.name EXACT si besoin
  c_gigoteuse_taille text := '0-6 mois';                        -- taille unique (clé confirmée, ASCII)
  c_gigoteuse_qty   int  := 17;                                 -- stock physique réel
  c_lange_name      text := 'Lange Bambou — Terracotta';        -- ⚠️ recopier le p.name EXACT si besoin
  c_lange_qty       int  := 20;                                 -- stock physique réel
  -- NB : la clé de taille du Lange ("120×120 cm") N'EST PAS saisie ici. Elle est LUE en base
  --      (v_lange_key) → zéro risque d'encodage du caractère × (U+00D7).
begin
  -- ── 1. Gigoteuse à Nouer — Terracotta → sizes_stock={"0-6 mois":17}, stock=17 ──
  select (ord - 1) into v_idx
  from products p, jsonb_array_elements(p.colors) with ordinality as e(el, ord)
  where p.name = c_gigoteuse_name and el->>'name' = c_motif
  limit 1;

  if v_idx is not null then
    update products
       set colors = jsonb_set(
                      jsonb_set(colors, array[v_idx::text, 'sizes_stock'],
                                jsonb_build_object(c_gigoteuse_taille, c_gigoteuse_qty)),
                      array[v_idx::text, 'stock'], to_jsonb(c_gigoteuse_qty))
     where name = c_gigoteuse_name;
    raise notice 'OK Gigoteuse: motif % idx=% -> sizes_stock={"%":%}, stock=%',
                 c_motif, v_idx, c_gigoteuse_taille, c_gigoteuse_qty, c_gigoteuse_qty;
  else
    raise notice 'IGNORÉ Gigoteuse: motif "%" introuvable pour "%" (vérifier le nom).', c_motif, c_gigoteuse_name;
  end if;

  -- ── 2. Lange Bambou — Terracotta → sizes_stock={<clé LUE en base>:20}, stock=20 ──
  select (ord - 1) into v_idx
  from products p, jsonb_array_elements(p.colors) with ordinality as e(el, ord)
  where p.name = c_lange_name and el->>'name' = c_motif
  limit 1;

  if v_idx is not null then
    -- Clé de taille RÉUTILISÉE depuis la base (jamais retapée) : clé existante du sizes_stock du motif ;
    -- repli sur product.sizes[0]. Le Lange n'a qu'UNE taille ("120×120 cm").
    select coalesce(
             (select k from jsonb_object_keys(coalesce(p.colors->v_idx->'sizes_stock', '{}'::jsonb)) k limit 1),
             p.sizes->>0
           )
      into v_lange_key
    from products p
    where p.name = c_lange_name;

    if v_lange_key is not null then
      update products
         set colors = jsonb_set(
                        jsonb_set(colors, array[v_idx::text, 'sizes_stock'],
                                  jsonb_build_object(v_lange_key, c_lange_qty)),
                        array[v_idx::text, 'stock'], to_jsonb(c_lange_qty))
       where name = c_lange_name;
      raise notice 'OK Lange: motif % idx=% clé="%" -> sizes_stock={"%":%}, stock=%',
                   c_motif, v_idx, v_lange_key, v_lange_key, c_lange_qty, c_lange_qty;
    else
      raise notice 'IGNORÉ Lange: aucune clé de taille lisible (sizes_stock ET product.sizes vides) — rien fait.';
    end if;
  else
    raise notice 'IGNORÉ Lange: motif "%" introuvable pour "%" (vérifier le nom).', c_motif, c_lange_name;
  end if;
end $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3 — POST-VÉRIFICATION (lecture seule) : les 2 motifs Terracotta après correction
-- ═══════════════════════════════════════════════════════════════════════════
-- Attendu : Gigoteuse → sizes_stock={"0-6 mois":17}, stock=17 ; Lange → {"120×120 cm":20}, stock=20.
--           products.stock (legacy) INCHANGÉ. Aucun autre motif/produit modifié.
select
  p.name,
  c->>'name'        as motif,
  c->'sizes_stock'  as sizes_stock_apres,
  c->>'stock'       as stock_motif_apres,
  p.stock           as stock_produit_legacy_inchange
from products p
cross join lateral jsonb_array_elements(coalesce(p.colors,'[]'::jsonb)) c
where (p.name ilike '%Gigoteuse%Terracotta%' or p.name ilike '%Lange%Terracotta%')
  and c->>'name' = 'Terracotta'
order by p.name;
