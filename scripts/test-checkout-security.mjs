// Test F — Audit statique sécurité create-session.
// Vérifie que body.discount et body.free_shipping ne sont JAMAIS lus
// dans /api/checkout/create-session/route.ts. Si présent dans le destructure
// du body → faille sécurité ré-introduite par mégarde.
//
// Usage : node scripts/test-checkout-security.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(__dirname, "../app/api/checkout/create-session/route.ts");

const src = readFileSync(FILE, "utf8");

const results = [];

function assert(name, condition, detail) {
  if (condition) {
    results.push({ name, ok: true });
    console.log(`✅ ${name}`);
  } else {
    results.push({ name, ok: false });
    console.log(`❌ ${name}`);
    if (detail) console.log(`   ${detail}`);
  }
}

// ── 1. Le destructure du body ne doit PAS extraire 'discount' ni 'free_shipping' ──
// Cherche la ligne `const { ... } = await req.json();` et son contenu.
const destructureMatch = src.match(/const\s*\{\s*([^}]*?)\s*\}\s*=\s*await\s+req\.json\(\)/s);
const destructured = destructureMatch ? destructureMatch[1] : "";
const destructuredFields = destructured
  .split(/[,\n]/)
  .map(s => s.trim().replace(/:.*$/, "").replace(/=.*$/, ""))
  .filter(Boolean);

assert(
  "F.1 'discount' n'est PAS extrait du body req.json()",
  !destructuredFields.includes("discount"),
  `Champs extraits : ${destructuredFields.join(", ")}`
);
assert(
  "F.2 'free_shipping' n'est PAS extrait du body req.json()",
  !destructuredFields.includes("free_shipping"),
  `Champs extraits : ${destructuredFields.join(", ")}`
);

// ── 2. Le code doit appeler validatePromoCode ──
assert(
  "F.3 Le code APPELLE validatePromoCode pour la re-validation serveur",
  /validatePromoCode\s*\(/.test(src),
  "Pas d'appel à validatePromoCode trouvé"
);

// ── 3. Le code doit appeler computeShipping ──
assert(
  "F.4 Le code APPELLE computeShipping pour le port",
  /computeShipping\s*\(/.test(src),
  "Pas d'appel à computeShipping trouvé"
);

// ── 4. Le Stripe coupon doit utiliser serverDiscount (jamais une variable
//      issue du body côté client) ──
const couponBlockMatch = src.match(/stripe\.coupons\.create\s*\(\s*\{([^}]+)\}/s);
const couponSrc = couponBlockMatch ? couponBlockMatch[1] : "";
assert(
  "F.5 Stripe coupon utilise serverDiscount (jamais 'discount' isolé du body)",
  /serverDiscount/.test(couponSrc),
  `Bloc coupon : ${couponSrc.slice(0, 200)}`
);

// ── 5. Le metadata Stripe doit utiliser serverDiscount + shippingDecision.shippingFree ──
const metadataMatch = src.match(/metadata:\s*\{([^}]+)\}/s);
const metadataSrc = metadataMatch ? metadataMatch[1] : "";
assert(
  "F.6 metadata.discount écrit serverDiscount (pas la valeur client)",
  /discount:\s*String\(\s*serverDiscount\s*\)/.test(metadataSrc),
  "metadata.discount doit être String(serverDiscount)"
);
assert(
  "F.7 metadata.free_shipping écrit shippingDecision.shippingFree (pas la valeur client)",
  /free_shipping:\s*String\(\s*shippingDecision\.shippingFree\s*\)/.test(metadataSrc),
  "metadata.free_shipping doit être String(shippingDecision.shippingFree)"
);

console.log("");
console.log("─".repeat(60));
const pass = results.filter(r => r.ok).length;
const fail = results.length - pass;
console.log(`Résultat : ${pass}/${results.length} passent, ${fail} échec(s)`);
if (fail > 0) {
  console.log("");
  console.log("⚠️ FAILLE SÉCURITÉ : un client pourrait forger discount ou free_shipping.");
  process.exit(1);
}
console.log("✓ Audit sécurité create-session : OK — aucun trust client.");
