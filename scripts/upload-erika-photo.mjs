// Upload de la photo Erika vers le bucket product-images
// Usage : node --env-file=.env.local scripts/upload-erika-photo.mjs <source-path>

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const src    = process.argv[2] ?? "c:/Users/homee/Downloads/IMG_9777.JPG";
const target = "erika-et-ses-enfants.jpg";

const supabase = createClient(url, key, { auth: { persistSession: false } });
const file = readFileSync(src);

const { data, error } = await supabase.storage
  .from("product-images")
  .upload(target, file, {
    contentType: "image/jpeg",
    upsert:      true,
  });

if (error) {
  console.error("Erreur upload:", error);
  process.exit(1);
}

const publicUrl = `${url.replace(/\/$/, "")}/storage/v1/object/public/product-images/${target}`;
console.log("✅ Uploadé :", publicUrl);
console.log("   path    :", data.path);
console.log("   size    :", file.length, "bytes");
