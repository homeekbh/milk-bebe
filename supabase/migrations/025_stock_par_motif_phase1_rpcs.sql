-- ─────────────────────────────────────────────────────────────────────────────
-- CHANTIER « STOCK PAR MOTIF » (Option A) — PHASE 1/9 : SCHÉMA + RPCs (ADDITIF)
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠️ NON EXÉCUTÉ. Ce fichier est ÉCRIT pour relecture. Il est ADDITIF :
--    il ne fait que CRÉER deux fonctions. AUCUN code applicatif ne les appelle
--    encore (cf. docs/plan-stock-par-motif-A.md). Le stock continue de fonctionner
--    comme aujourd'hui via products.stock / products.sizes_stock (RPC 001).
--    Aucun cutover ici. À exécuter seulement après relecture (Bou).
--
-- ─────────────────────────────────────────────────────────────────────────────
-- FORME JSONB CIBLE DE products.colors  (source de vérité FUTURE du stock)
-- ─────────────────────────────────────────────────────────────────────────────
-- products.colors = jsonb ARRAY. Chaque élément (motif) :
--   {
--     "id":          "<uuid stable>",        ← CLÉ DE JOINTURE du décrément (immuable)
--     "name":        "Terracotta",           ← libellé affiché (éditable, PAS une clé)
--     "hex":         "#c4744a",
--     "image_url":   "https://…" | null,
--     "validated":   true,
--     "sizes":       ["Naissance","0-3 mois","3-6 mois"],   ← = product.sizes (axe partagé)
--     "sizes_stock": { "Naissance": 20, "0-3 mois": 20, "3-6 mois": 20 },  ← ★ VÉRITÉ (2D)
--     "stock":       60                       ← agrégat dénormalisé = Σ sizes_stock (maintenu par RPC)
--   }
-- Décisions figées :
--   • Tailles AU NIVEAU PRODUIT (matrice motif × taille) : l'axe taille = product.sizes,
--     recopié dans chaque colors[].sizes.
--   • Cas 2D  : vérité = colors[i].sizes_stock[taille]  (produit à tailles).
--   • Cas 1D  : vérité = colors[i].stock (scalaire)     (produit sans taille : Lange/Bonnet/Bandeau).
--   • Motif unique (N=1) = simple cas N=1, aucune branche séparée.
--   • motif_id = uuid STABLE : jointure fiable même si le "name" du motif est renommé.
--
-- Les colonnes products.stock / products.sizes_stock sont CONSERVÉES en agrégat
-- dénormalisé (lectures fiche/listes/flux) et maintenues par ces RPC. Elles seront
-- retirées comme "source" seulement en phase finale (9).
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. DÉCRÉMENT ATOMIQUE PAR MOTIF ──────────────────────────────────────────
-- decrement_stock_motif(product_id, motif_id, taille, qty)
--   • Verrou de ligne (FOR UPDATE) → anti-survente concurrente.
--   • p_size NULL  → cas 1D : décrémente colors[i].stock.
--   • p_size fourni→ cas 2D : décrémente colors[i].sizes_stock[taille], recalcule colors[i].stock.
--   • Échec si stock insuffisant (renvoie { ok:false, error:'insufficient_*' }), rien n'est écrit.
--   • Maintient l'agrégat produit products.stock = Σ colors[].stock.
create or replace function decrement_stock_motif(
  p_product_id uuid,
  p_motif_id   text,
  p_size       text default null,
  p_quantity   integer default 1
) returns jsonb
language plpgsql
as $$
declare
  v_colors    jsonb;
  v_idx       integer;
  v_cur       integer;
  v_new_qty   integer;
  v_new_sizes jsonb;
begin
  if p_quantity is null or p_quantity < 1 then
    return jsonb_build_object('ok', false, 'error', 'invalid_quantity');
  end if;

  -- Verrou de ligne = atomicité (2 ventes simultanées sur la dernière unité → 1 seule passe).
  select colors into v_colors from products where id = p_product_id for update;
  if v_colors is null or jsonb_typeof(v_colors) <> 'array' then
    return jsonb_build_object('ok', false, 'error', 'no_colors');
  end if;

  -- Index du motif par id STABLE (pas par name).
  select (ord - 1) into v_idx
    from jsonb_array_elements(v_colors) with ordinality as e(elem, ord)
   where elem->>'id' = p_motif_id
   limit 1;
  if v_idx is null then
    return jsonb_build_object('ok', false, 'error', 'motif_not_found', 'motif_id', p_motif_id);
  end if;

  if p_size is not null then
    -- ── Cas 2D : colors[idx].sizes_stock[taille] ──
    v_cur := coalesce((v_colors #>> array[v_idx::text, 'sizes_stock', p_size])::integer, 0);
    if v_cur < p_quantity then
      return jsonb_build_object('ok', false, 'error', 'insufficient_size_stock',
        'motif_id', p_motif_id, 'size', p_size, 'available', v_cur, 'requested', p_quantity);
    end if;
    v_new_qty := v_cur - p_quantity;
    v_colors  := jsonb_set(v_colors, array[v_idx::text, 'sizes_stock', p_size], to_jsonb(v_new_qty), true);
    -- Recalcule l'agrégat du motif = Σ de ses tailles.
    v_new_sizes := v_colors #> array[v_idx::text, 'sizes_stock'];
    v_colors := jsonb_set(v_colors, array[v_idx::text, 'stock'],
      to_jsonb((select coalesce(sum(value::integer), 0) from jsonb_each_text(v_new_sizes))), true);
  else
    -- ── Cas 1D : colors[idx].stock scalaire (motif sans dimension taille) ──
    v_cur := coalesce((v_colors #>> array[v_idx::text, 'stock'])::integer, 0);
    if v_cur < p_quantity then
      return jsonb_build_object('ok', false, 'error', 'insufficient_stock',
        'motif_id', p_motif_id, 'available', v_cur, 'requested', p_quantity);
    end if;
    v_new_qty := v_cur - p_quantity;
    v_colors  := jsonb_set(v_colors, array[v_idx::text, 'stock'], to_jsonb(v_new_qty), true);
  end if;

  -- Écrit colors + maintient l'agrégat produit (dénormalisation lue par fiche/listes/flux).
  update products
     set colors = v_colors,
         stock  = (select coalesce(sum((c->>'stock')::integer), 0) from jsonb_array_elements(v_colors) c)
   where id = p_product_id;

  return jsonb_build_object('ok', true, 'motif_id', p_motif_id, 'size', p_size, 'new_qty', v_new_qty);
end;
$$;


-- ── 2. RESTOCK ATOMIQUE PAR MOTIF (symétrique) ───────────────────────────────
-- restock_motif(product_id, motif_id, taille, qty) — miroir du décrément :
--   ré-incrémente colors[i].sizes_stock[taille] (2D) ou colors[i].stock (1D).
--   create_missing = true → recrée une cellule taille absente (restock après passage à 0).
--   Utilisé au remboursement (phase 5). Pas de contrôle "insuffisant" (on ajoute).
create or replace function restock_motif(
  p_product_id uuid,
  p_motif_id   text,
  p_size       text default null,
  p_quantity   integer default 1
) returns jsonb
language plpgsql
as $$
declare
  v_colors    jsonb;
  v_idx       integer;
  v_cur       integer;
  v_new_qty   integer;
  v_new_sizes jsonb;
begin
  if p_quantity is null or p_quantity < 1 then
    return jsonb_build_object('ok', false, 'error', 'invalid_quantity');
  end if;

  select colors into v_colors from products where id = p_product_id for update;
  if v_colors is null or jsonb_typeof(v_colors) <> 'array' then
    return jsonb_build_object('ok', false, 'error', 'no_colors');
  end if;

  select (ord - 1) into v_idx
    from jsonb_array_elements(v_colors) with ordinality as e(elem, ord)
   where elem->>'id' = p_motif_id
   limit 1;
  if v_idx is null then
    return jsonb_build_object('ok', false, 'error', 'motif_not_found', 'motif_id', p_motif_id);
  end if;

  if p_size is not null then
    v_cur := coalesce((v_colors #>> array[v_idx::text, 'sizes_stock', p_size])::integer, 0);
    v_new_qty := v_cur + p_quantity;
    v_colors  := jsonb_set(v_colors, array[v_idx::text, 'sizes_stock', p_size], to_jsonb(v_new_qty), true);
    v_new_sizes := v_colors #> array[v_idx::text, 'sizes_stock'];
    v_colors := jsonb_set(v_colors, array[v_idx::text, 'stock'],
      to_jsonb((select coalesce(sum(value::integer), 0) from jsonb_each_text(v_new_sizes))), true);
  else
    v_cur := coalesce((v_colors #>> array[v_idx::text, 'stock'])::integer, 0);
    v_new_qty := v_cur + p_quantity;
    v_colors  := jsonb_set(v_colors, array[v_idx::text, 'stock'], to_jsonb(v_new_qty), true);
  end if;

  update products
     set colors = v_colors,
         stock  = (select coalesce(sum((c->>'stock')::integer), 0) from jsonb_array_elements(v_colors) c)
   where id = p_product_id;

  return jsonb_build_object('ok', true, 'motif_id', p_motif_id, 'size', p_size, 'new_qty', v_new_qty);
end;
$$;


-- ── 3. DROITS ────────────────────────────────────────────────────────────────
-- Le webhook / les routes admin utilisent la clé service_role (comme decrement_stock_atomic).
grant execute on function decrement_stock_motif(uuid, text, text, integer) to service_role;
grant execute on function restock_motif(uuid, text, text, integer)         to service_role;

-- FIN PHASE 1 (RPCs). Aucun appel applicatif. Rien décrémenté par ces fonctions
-- tant que le webhook / create-session / remboursement ne les invoquent pas (phases 4-5).
