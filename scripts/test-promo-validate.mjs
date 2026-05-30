// Tests d'intégration validatePromoCode contre la vraie DB.
// Crée des codes test (préfixe __TEST__) → appelle l'API → vérifie le rejet
// → cleanup.
//
// Usage : node --env-file=.env.local scripts/test-promo-validate.mjs
//
// Couvre :
//   H. Code expiré (expires_at passé) → rejeté avec message "expiré"
//   I. Code avec max_uses atteint → rejeté avec message "maximum"
//   J. (sanity) Code valide actif → accepté avec discount calculé

import { createClient } from "@supabase/supabase-js";

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

if (!URL || !KEY) {
  console.error("❌ Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supa = createClient(URL, KEY, { auth: { persistSession: false } });

// Préfixe unique pour ne pas collisionner avec des codes réels
const RUN_ID = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
const codeH  = `__TEST_EXPIRED_${RUN_ID}__`.slice(0, 50);
const codeI  = `__TEST_MAXED_${RUN_ID}__`.slice(0, 50);
const codeJ  = `__TEST_VALID_${RUN_ID}__`.slice(0, 50);

const created = [];
const results = [];

async function createCode(row) {
  const { data, error } = await supa.from("promo_codes").insert([row]).select().single();
  if (error) throw new Error(`Insert ${row.code} : ${error.message}`);
  created.push(data.id);
  return data;
}

async function callValidate(code, order_total) {
  const res = await fetch(`${BASE}/api/promo/validate`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ code, order_total }),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function cleanup() {
  if (created.length === 0) return;
  await supa.from("promo_codes").delete().in("id", created);
  console.log(`\n🧹 Cleanup : ${created.length} code(s) test supprimé(s).`);
}

function assert(name, condition, detail) {
  if (condition) {
    results.push({ name, ok: true });
    console.log(`✅ ${name}`);
  } else {
    results.push({ name, ok: false, detail });
    console.log(`❌ ${name}`);
    if (detail) console.log(`   ${detail}`);
  }
}

try {
  // ── H. Code expiré ────────────────────────────────────────────────────────
  await createCode({
    code:                     codeH,
    discount_type:            "percent",
    discount_value:           10,
    active:                   true,
    expires_at:               new Date(Date.now() - 86_400_000).toISOString(), // hier
    uses_count:               0,
    free_shipping:            false,
    cumulable_avec_livraison: true,
  });
  const rH = await callValidate(codeH, 100);
  assert(
    "H. Code expiré → rejet 400",
    rH.status === 400 && /expir/i.test(rH.body.error ?? ""),
    `status=${rH.status} body=${JSON.stringify(rH.body)}`
  );

  // ── I. Code max_uses atteint ──────────────────────────────────────────────
  await createCode({
    code:                     codeI,
    discount_type:            "percent",
    discount_value:           20,
    active:                   true,
    max_uses:                 1,
    uses_count:               1, // déjà au max
    free_shipping:            false,
    cumulable_avec_livraison: true,
  });
  const rI = await callValidate(codeI, 100);
  assert(
    "I. Code max_uses atteint → rejet 400",
    rI.status === 400 && /maximum|atteint/i.test(rI.body.error ?? ""),
    `status=${rI.status} body=${JSON.stringify(rI.body)}`
  );

  // ── J. (sanity) Code valide → accepté ──────────────────────────────────────
  await createCode({
    code:                     codeJ,
    discount_type:            "percent",
    discount_value:           10,
    active:                   true,
    uses_count:               0,
    free_shipping:            false,
    cumulable_avec_livraison: true,
  });
  const rJ = await callValidate(codeJ, 100);
  assert(
    "J. (sanity) Code valide actif → accepté avec discount=10€",
    rJ.status === 200 && rJ.body.valid === true && Math.abs(rJ.body.discount - 10) < 0.01,
    `status=${rJ.status} body=${JSON.stringify(rJ.body)}`
  );
  assert(
    "J.2 free_shipping = code-driven (false ici car % cumulable, seuil non testé)",
    rJ.body.free_shipping === false,
    `free_shipping=${rJ.body.free_shipping}`
  );
  assert(
    "J.3 cumulable_avec_livraison = true (passthrough DB)",
    rJ.body.cumulable_avec_livraison === true,
    `cumulable=${rJ.body.cumulable_avec_livraison}`
  );

} finally {
  await cleanup();
}

console.log("");
console.log("─".repeat(60));
const pass = results.filter(r => r.ok).length;
const fail = results.length - pass;
console.log(`Résultat : ${pass}/${results.length} passent, ${fail} échec(s)`);
if (fail > 0) process.exit(1);
console.log("✓ Tous les tests d'intégration promo passent.");
