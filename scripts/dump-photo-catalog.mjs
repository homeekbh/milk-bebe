// Dump live photo catalog from Supabase → milk-photos-catalog.json
// Usage : node --env-file=.env.local scripts/dump-photo-catalog.mjs

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname }                  from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

// ── 1. Produits ──────────────────────────────────────────────────────────────
const { data: products, error: pErr } = await supabase
  .from("products")
  .select("*")
  .order("position", { ascending: true });

if (pErr) {
  console.error("Erreur lecture products:", pErr);
  process.exit(1);
}

// ── 2. Storage bucket "products" ────────────────────────────────────────────
async function listAll(bucket, prefix = "") {
  const out = [];
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit:  1000,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) return { files: out, error };
  for (const item of data ?? []) {
    if (item.id === null) {
      // dossier → récursion
      const sub = await listAll(bucket, prefix ? `${prefix}/${item.name}` : item.name);
      out.push(...sub.files);
    } else {
      out.push(prefix ? `${prefix}/${item.name}` : item.name);
    }
  }
  return { files: out, error: null };
}

// Détecte le bucket réellement utilisé en parsant une URL d'image d'un produit
function detectBucket(rows) {
  const re = /\/storage\/v1\/object\/public\/([^/]+)\//;
  for (const p of rows ?? []) {
    const candidates = [
      p.image_url,
      ...(Array.isArray(p.images) ? p.images : []),
      ...(Array.isArray(p.colors) ? p.colors.map(c => c?.image_url) : []),
    ].filter(Boolean).map(String);
    for (const u of candidates) {
      const m = u.match(re);
      if (m) return m[1];
    }
  }
  return null;
}

let bucketUsed = detectBucket(products) ?? "products";
let storageFiles = [];
let bucketErr   = null;

{
  const r = await listAll(bucketUsed);
  if (r.error) {
    bucketErr = r.error;
    // fallback : tenter d'autres noms de bucket usuels
    for (const b of ["product-images", "products", "public", "images"]) {
      if (b === bucketUsed) continue;
      const r2 = await listAll(b);
      if (!r2.error) {
        bucketUsed   = b;
        storageFiles = r2.files;
        bucketErr    = null;
        break;
      }
    }
  } else {
    storageFiles = r.files;
  }
}

function publicUrl(path) {
  return `${url.replace(/\/$/, "")}/storage/v1/object/public/${bucketUsed}/${path}`;
}

// ── 3. Normalisation produits → shape demandée ─────────────────────────────
function extractImages(p) {
  // Cherche tableaux d'images sur plusieurs colonnes possibles
  const candidates = [p.images, p.image_urls, p.gallery, p.photos];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length) return c.map(String);
  }
  // Fallback : image_url unique
  if (p.image_url) return [String(p.image_url)];
  return [];
}

function extractColors(p) {
  // Colonnes possibles : colors, variants, motifs
  const candidates = [p.colors, p.variants, p.motifs];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length) {
      return c.map(v => ({
        name:      v?.name ?? v?.label ?? "",
        hex:       v?.hex  ?? v?.color ?? null,
        image_url: v?.image_url ?? v?.image ?? v?.url ?? null,
      }));
    }
  }
  return [];
}

const productsOut = (products ?? []).map(p => ({
  id:       p.id,
  name:     p.name,
  category: p.category_slug ?? p.category ?? null,
  slug:     p.slug,
  images:   extractImages(p),
  colors:   extractColors(p),
}));

// ── 4. URLs uniques ────────────────────────────────────────────────────────
const allUrls = new Set();
for (const p of productsOut) {
  for (const u of p.images) allUrls.add(u);
  for (const c of p.colors) if (c.image_url) allUrls.add(c.image_url);
}
// Ajoute les fichiers du bucket en URL publique (peuvent être différents
// des URLs déjà stockées en base)
for (const path of storageFiles) {
  allUrls.add(publicUrl(path));
}

const catalog = {
  generated_at: new Date().toISOString().slice(0, 10),
  bucket_used:  bucketUsed,
  bucket_error: bucketErr ? String(bucketErr.message ?? bucketErr) : null,
  storage_files_count: storageFiles.length,
  products:     productsOut,
  total_images: allUrls.size,
  all_image_urls: [...allUrls].sort(),
};

// ── 5. Écriture fichier ────────────────────────────────────────────────────
const outPath = process.argv[2] ?? "/home/claude/milk-photos-catalog.json";
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(catalog, null, 2), "utf8");

// ── 6. Résumé ──────────────────────────────────────────────────────────────
const byCat = new Map();
for (const p of productsOut) {
  const c = p.category ?? "(none)";
  byCat.set(c, (byCat.get(c) ?? 0) + 1);
}

console.log("");
console.log("═══════ M!LK — Catalogue photos ═══════");
console.log(`Fichier      : ${outPath}`);
console.log(`Bucket       : ${bucketUsed}${bucketErr ? "  ⚠ " + bucketErr.message : ""}`);
console.log(`Produits     : ${productsOut.length}`);
console.log(`Fichiers storage : ${storageFiles.length}`);
console.log(`Total images uniques : ${allUrls.size}`);
console.log("");
console.log("Par catégorie :");
for (const [cat, n] of [...byCat.entries()].sort((a,b) => b[1] - a[1])) {
  console.log(`  · ${cat.padEnd(20)} ${n}`);
}
console.log("═══════════════════════════════════════");
