-- ─────────────────────────────────────────────────────────────────────────────
-- STOCK PAR MOTIF (Option A) — S1 : créer le motif "Terracotta" du BANDEAU et du BONNET
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠️ NON EXÉCUTÉ — à relire (Section 1 d'abord) puis lancer À LA MAIN (Bou).
--
-- CONTEXTE : le Bandeau et le Bonnet ont aujourd'hui nb_motifs = 0 → leur stock existant
-- (Bandeau ≈ 17, Bonnet ≈ 18) vit dans products.stock / products.sizes_stock (ancien système) et
-- N'entre PAS dans le système stock-par-motif (phases 1-7). On leur crée UN motif unique
-- "Terracotta" (= leur couleur, pastille) qui RECOPIE le stock actuel → ils rejoignent le modèle
-- « catégorie + motif-couleur en pastille » comme les pyjamas.
--
-- CE SCRIPT NE CRÉE QUE LE MOTIF (données). Il ne touche NI la catégorie NI la sous-catégorie
-- (Bou les gère dans l'admin — l'outil sous-catégories est livré vide, cf. migration 026).
--
-- GARANTIES :
--   • Ne touche QUE des produits « bandeau »/« bonnet » qui n'ont AUCUN motif (idempotent :
--     relançable, ne double jamais un motif déjà créé).
--   • Le motif RECOPIE la structure de taille RÉELLE lue en base (jamais de clé retapée) :
--       - ventilation par taille existante (products.sizes_stock non vide) → recopiée telle quelle ;
--       - mono-taille sans ventilation → tout le stock sur l'unique taille (products.sizes[0]) ;
--       - aucune taille → motif 1D (stock scalaire, sizes_stock vide) ;
--       - multi-taille SANS ventilation → AMBIGU → IGNORÉ (NOTICE) : à ventiler à la main.
--   • L'agrégat motif.stock = Σ de son sizes_stock (cohérent avec les RPC). products.stock /
--     products.sizes_stock (filet legacy) NE sont PAS modifiés.
-- ═════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1 — DÉCOUVERTE (lecture seule) : structure taille/stock actuelle + nb_motifs
-- ═══════════════════════════════════════════════════════════════════════════
-- 👉 VÉRIFIER avant d'écrire : que SEULS le Bandeau et le Bonnet visés remontent, que
--    nb_motifs = 0, et lire la clé/les clés RÉELLES de sizes_stock (colonne cles_taille) +
--    le total (stock). Recopier le p.name EXACT dans un WHERE plus strict si d'autres
--    produits « bonnet »/« bandeau » apparaissent.
select
  p.id,
  p.name,
  p.category_slug,
  p.sizes                                              as tailles_produit,
  p.sizes_stock                                        as sizes_stock_actuel,
  (select string_agg(k, ', ')
     from jsonb_object_keys(coalesce(p.sizes_stock,'{}'::jsonb)) k)          as cles_taille,
  p.stock                                              as stock_total,
  jsonb_array_length(coalesce(p.colors,'[]'::jsonb))   as nb_motifs
from products p
where p.name ilike '%bandeau%' or p.name ilike '%bonnet%'
order by p.name;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2 — CRÉATION DU MOTIF  ⚠️ ÉCRIT products.colors (ces produits uniquement)
-- ═══════════════════════════════════════════════════════════════════════════
-- Ne s'exécute que pour les produits « bandeau »/« bonnet » SANS motif (nb_motifs = 0).
do $$
declare
  r             record;
  v_sizes       jsonb;
  v_sizes_stock jsonb;
  v_stock       int;
  v_size_count  int;
  v_key_count   int;
  v_motif       jsonb;
begin
  for r in
    select id, name,
           coalesce(sizes,       '[]'::jsonb) as sizes,
           coalesce(sizes_stock, '{}'::jsonb) as sizes_stock,
           coalesce(stock, 0)                 as stock,
           coalesce(colors,      '[]'::jsonb) as colors
    from products
    where name ilike '%bandeau%' or name ilike '%bonnet%'
  loop
    -- Idempotence : si le produit a déjà ≥ 1 motif, on ne touche à rien.
    if jsonb_array_length(r.colors) > 0 then
      raise notice 'IGNORÉ (déjà un motif) : %', r.name;
      continue;
    end if;

    v_sizes      := r.sizes;
    v_sizes_stock := r.sizes_stock;
    v_stock      := r.stock;
    v_size_count := jsonb_array_length(v_sizes);
    v_key_count  := (select count(*) from jsonb_object_keys(v_sizes_stock));

    if v_key_count > 0 then
      -- Ventilation par taille déjà présente → recopiée ; agrégat = somme réelle.
      v_stock := (select coalesce(sum(value::int), 0) from jsonb_each_text(v_sizes_stock));
    elsif v_size_count = 1 then
      -- Mono-taille sans ventilation → tout le stock sur l'unique taille (clé LUE en base).
      v_sizes_stock := jsonb_build_object(v_sizes->>0, v_stock);
    elsif v_size_count = 0 then
      -- Aucune taille → motif 1D (stock scalaire), sizes_stock vide.
      v_sizes_stock := '{}'::jsonb;
    else
      -- Multi-taille SANS ventilation → on NE crée PAS un motif cassé (décrément 2D échouerait).
      raise notice 'IGNORÉ (% tailles sans sizes_stock, ventilation manquante) : % — répartir à la main puis relancer',
                   v_size_count, r.name;
      continue;
    end if;

    v_motif := jsonb_build_object(
      'id',          gen_random_uuid()::text,   -- uuid STABLE = clé de jointure décrément/restock
      'name',        'Terracotta',
      'hex',         '#c4744a',                 -- couleur pastille (ajustable en admin)
      'image_url',   null,                      -- Bou pourra ajouter la photo motif en admin
      'validated',   true,
      'sizes',       v_sizes,
      'sizes_stock', v_sizes_stock,
      'stock',       v_stock
    );

    update products set colors = jsonb_build_array(v_motif) where id = r.id;
    raise notice 'OK motif "Terracotta" créé : % (stock=%, sizes_stock=%)', r.name, v_stock, v_sizes_stock;
  end loop;
end $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3 — POST-VÉRIFICATION (lecture seule)
-- ═══════════════════════════════════════════════════════════════════════════
-- Attendu : nb_motifs = 1, motif "Terracotta" avec sizes_stock = miroir du stock produit,
--           motif.stock = Σ sizes_stock. products.stock / products.sizes_stock inchangés.
select
  p.name,
  jsonb_array_length(coalesce(p.colors,'[]'::jsonb)) as nb_motifs,
  c->>'id'          as motif_id,
  c->>'name'        as motif,
  c->'sizes_stock'  as motif_sizes_stock,
  c->>'stock'       as motif_stock,
  p.stock           as stock_produit_legacy_inchange,
  p.sizes_stock     as sizes_stock_produit_legacy_inchange
from products p
left join lateral jsonb_array_elements(coalesce(p.colors,'[]'::jsonb)) c on true
where p.name ilike '%bandeau%' or p.name ilike '%bonnet%'
order by p.name;
