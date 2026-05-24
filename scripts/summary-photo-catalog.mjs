// Résumé lisible du catalogue photos
import { readFileSync } from "node:fs";

const j = JSON.parse(readFileSync(new URL("./milk-photos-catalog.json", import.meta.url), "utf8"));

const COL_NAME = 42;
const sep = (c = "─") => console.log(c.repeat(78));

console.log("");
sep("═");
console.log("  M!LK — RÉSUMÉ DU CATALOGUE LIVE (depuis Supabase)");
console.log(`  ${j.products.length} produits  ·  ${j.total_images} images uniques  ·  bucket: ${j.bucket_used}`);
sep("═");

for (const [i, p] of j.products.entries()) {
  console.log("");
  console.log(`▌ #${String(i + 1).padStart(2, "0")}  ${p.name}`);
  console.log(`▌      Catégorie : ${p.category ?? "(none)"}    ·    Slug : ${p.slug}`);
  console.log(`▌      Photos    : ${p.images.length}            ·    Coloris : ${p.colors.length}`);

  if (p.colors.length > 0) {
    console.log("▌      Motifs/coloris :");
    for (const c of p.colors) {
      const hex   = (c.hex ?? "—").padEnd(8);
      const name  = (c.name ?? "—").padEnd(20);
      const img   = c.image_url ? c.image_url.split("/").pop() : "(pas d'image)";
      console.log(`▌        · ${name}  ${hex}  ${img}`);
    }
  }

  if (p.images.length > 0) {
    console.log("▌      3 premières images :");
    for (const url of p.images.slice(0, 3)) {
      console.log(`▌        → ${url}`);
    }
    if (p.images.length > 3) {
      console.log(`▌        … (+${p.images.length - 3} autres)`);
    }
  }
  sep();
}

console.log("");
console.log("RÉCAP PAR CATÉGORIE :");
const byCat = new Map();
for (const p of j.products) {
  const k = p.category ?? "(none)";
  byCat.set(k, (byCat.get(k) ?? 0) + p.images.length);
}
for (const [cat, count] of [...byCat.entries()].sort((a,b) => b[1] - a[1])) {
  console.log(`  · ${cat.padEnd(15)} ${count} photos`);
}
console.log("");
console.log(`Total images stockées dans le bucket : ${j.storage_files_count}`);
console.log(`Total URLs uniques (DB + bucket)      : ${j.total_images}`);
console.log("");
