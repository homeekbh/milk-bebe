// Lecture des schémas réels orders / order_items / reviews depuis le swagger
// PostgREST + 1 ligne échantillon pour comprendre les types/conventions réels.
// Aucun INSERT — uniquement read.

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error("Manque env"); process.exit(1); }

const supa = createClient(URL, KEY, { auth: { persistSession: false } });

// 1) Swagger pour lister les colonnes + types
const swagRes = await fetch(`${URL}/rest/v1/`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
});
const swag = await swagRes.json();

function printDefinition(name) {
  const d = swag.definitions?.[name];
  if (!d) { console.log(`(${name} introuvable dans le swagger)`); return; }
  console.log(`\n══ ${name} ${"═".repeat(60 - name.length)}`);
  for (const [col, meta] of Object.entries(d.properties ?? {})) {
    const m = meta;
    const type = m.format ?? m.type ?? "?";
    const nullable = m.description?.includes("Note:") ? "" :
                     (d.required ?? []).includes(col) ? " NOT NULL" : "";
    const dflt = m.default !== undefined ? ` DEFAULT ${JSON.stringify(m.default)}` : "";
    const fk   = m.description?.match(/<fk table='(\w+)' column='(\w+)'/);
    const fkS  = fk ? ` → FK ${fk[1]}.${fk[2]}` : "";
    console.log(`  ${col.padEnd(30)} ${type.padEnd(15)}${nullable}${dflt}${fkS}`);
  }
}

for (const t of ["orders", "order_items", "reviews", "products"]) {
  printDefinition(t);
}

// 2) Échantillons réels (1 ligne par table) pour voir les conventions
async function sample(t, n = 1) {
  const { data, error } = await supa.from(t).select("*").limit(n);
  if (error) { console.log(`(${t} sample err : ${error.message})`); return; }
  if (!data?.length) { console.log(`(${t} vide)`); return; }
  console.log(`\n── ${t} sample (1ère ligne, masquée) ──`);
  const row = data[0];
  for (const [k, v] of Object.entries(row)) {
    const display = typeof v === "string" && v.length > 80 ? v.slice(0, 80) + "..." :
                    JSON.stringify(v);
    console.log(`  ${k.padEnd(30)} = ${display}`);
  }
}
console.log("\n\n═══ ÉCHANTILLONS RÉELS ═══");
await sample("orders");
await sample("order_items");
await sample("reviews");

// 3) Statut autorisés sur orders (regroup par statuts existants)
const { data: statuses } = await supa
  .from("orders")
  .select("status, shipping_status")
  .limit(200);
if (statuses?.length) {
  const s1 = [...new Set(statuses.map(s => s.status).filter(Boolean))];
  const s2 = [...new Set(statuses.map(s => s.shipping_status).filter(Boolean))];
  console.log("\n── valeurs déjà vues ──");
  console.log("  status              :", s1);
  console.log("  shipping_status     :", s2);
}
