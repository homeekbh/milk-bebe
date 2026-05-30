// Test E2E sécurité — Forge le body de /api/checkout/create-session avec
// discount=99 + free_shipping=true, vérifie que Stripe facture le BON montant
// (= identique au body légitime). Aucun paiement effectué.
//
// Étapes :
//   1. Récupère un produit réel pour atteindre subtotal ≈ 70€ (≥ seuil 60€)
//   2. Appelle /api/checkout/create-session 2× :
//      A) body légitime (pas de code, valeurs honnêtes)
//      B) body forgé   (discount=99, free_shipping=true, code bidon)
//   3. Extrait le session_id depuis l'URL Stripe retournée
//   4. Récupère les sessions via Stripe API (STRIPE_SECRET_KEY)
//   5. Compare amount_total + line_items + discounts
//   6. Vérifie qu'aucune commande n'a été créée en DB
//
// Usage : node --env-file=.env.local scripts/test-forge-checkout.mjs

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";
const SKEY = process.env.STRIPE_SECRET_KEY;

if (!URL || !KEY || !SKEY) {
  console.error("❌ Manque NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / STRIPE_SECRET_KEY");
  process.exit(1);
}

const supa   = createClient(URL, KEY, { auth: { persistSession: false } });
const stripe = new Stripe(SKEY);

const results = [];
function assert(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok ? "✅" : "❌"} ${name}`);
  if (!ok && detail) console.log(`   ${detail}`);
}

// ── 1. Trouve un produit qui permet d'atteindre ≈70€ avec une qty raisonnable
const { data: products, error: pErr } = await supa
  .from("products")
  .select("id, name, slug, price_ttc, stock, category_slug")
  .eq("published", true)
  .gt("stock", 5)
  .order("price_ttc", { ascending: false })
  .limit(10);

if (pErr || !products || products.length === 0) {
  console.error("❌ Impossible de trouver un produit éligible :", pErr?.message);
  process.exit(1);
}

const product = products[0];
const qty     = Math.max(1, Math.ceil(70 / Number(product.price_ttc)));
const subtotalEur = Number(product.price_ttc) * qty;
console.log(`📦 Produit test : "${product.name}" — ${product.price_ttc}€ × ${qty} = ${subtotalEur.toFixed(2)}€\n`);

// ── 2. Construit les deux bodies
function buildBody(extra = {}) {
  return {
    items: [{
      id:            product.id,
      slug:          product.slug,
      name:          product.name,
      price:         Number(product.price_ttc),
      quantity:      qty,
      category_slug: product.category_slug ?? "",
    }],
    customer_email: "test-forge@milkbebe.fr",
    customer_phone: "0612345678",
    carrier:        "mondial_relay",
    delivery_type:  "point_relais",
    relay: {
      id:          "TEST_RELAY_XX_123",
      name:        "Test Relay",
      street:      "1 rue de Test",
      city:        "Paris",
      postal_code: "75001",
      type:        "point_relais",
    },
    ...extra,
  };
}

async function callCreateSession(body, label) {
  const res = await fetch(`${BASE}/api/checkout/create-session`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  if (!res.ok || !json?.url) {
    console.error(`❌ [${label}] HTTP ${res.status} — ${text.slice(0, 300)}`);
    process.exit(1);
  }
  // L'URL Stripe contient le session id : cs_(test|live)_xxx
  const m = json.url.match(/(cs_(?:test|live)_[A-Za-z0-9]+)/);
  if (!m) {
    console.error(`❌ [${label}] Impossible d'extraire session_id de l'URL : ${json.url}`);
    process.exit(1);
  }
  return { sessionId: m[1], url: json.url };
}

console.log("📞 Appel A — body légitime (panier 70€, pas de code) ...");
const legit = await callCreateSession(buildBody(), "legit");
console.log(`   session_id : ${legit.sessionId}\n`);

console.log("📞 Appel B — body FORGÉ (discount: 99, free_shipping: true, code bidon) ...");
const forged = await callCreateSession(buildBody({
  discount:      99,           // ← tentative de remise inexistante
  free_shipping: true,         // ← tentative de port gratuit forcé
  promo_code:    "TOTALLYFAKE_NOPE_NEVER_EXISTS",
}), "forge");
console.log(`   session_id : ${forged.sessionId}\n`);

// ── 3. Retrieve full session details depuis Stripe
console.log("🔍 Retrieving sessions from Stripe ...");
const [legitS, forgedS] = await Promise.all([
  stripe.checkout.sessions.retrieve(legit.sessionId, { expand: ["line_items", "line_items.data.price.product"] }),
  stripe.checkout.sessions.retrieve(forged.sessionId, { expand: ["line_items", "line_items.data.price.product"] }),
]);

console.log("\n── Comparaison ──");
console.log(`  legit   : amount_total=${legitS.amount_total} amount_subtotal=${legitS.amount_subtotal} discounts=${(legitS.total_details?.amount_discount ?? 0)}`);
console.log(`  forge   : amount_total=${forgedS.amount_total} amount_subtotal=${forgedS.amount_subtotal} discounts=${(forgedS.total_details?.amount_discount ?? 0)}`);
console.log("");

// ── 4. ASSERTIONS ──────────────────────────────────────────────────────────

assert(
  "K.1 amount_total forgé === amount_total légitime",
  legitS.amount_total === forgedS.amount_total,
  `legit=${legitS.amount_total} forge=${forgedS.amount_total}`
);

assert(
  "K.2 Aucun discount appliqué sur la session forgée",
  (forgedS.total_details?.amount_discount ?? 0) === 0,
  `amount_discount=${forgedS.total_details?.amount_discount}`
);

const legitItems = legitS.line_items?.data ?? [];
const forgedItems = forgedS.line_items?.data ?? [];

assert(
  "K.3 Même nombre de line_items entre légitime et forgé",
  legitItems.length === forgedItems.length,
  `legit=${legitItems.length} forge=${forgedItems.length}`
);

// ── Détail des lignes pour vérif visuelle
console.log("\n── Détail line_items ──");
console.log("  LÉGITIME :");
for (const li of legitItems) {
  console.log(`    · ${li.description ?? "(no name)"} — qty ${li.quantity} — ${li.amount_total} cents`);
}
console.log("  FORGÉ :");
for (const li of forgedItems) {
  console.log(`    · ${li.description ?? "(no name)"} — qty ${li.quantity} — ${li.amount_total} cents`);
}

// ── Vérif port : si subtotal >= 60 → port offert (line item port absent
//    OU = 0). Si < 60 → port présent et > 0 dans LES DEUX sessions.
const legitHasShipping  = legitItems.some(li => /relais|domicile|locker/i.test(String(li.description ?? "")));
const forgedHasShipping = forgedItems.some(li => /relais|domicile|locker/i.test(String(li.description ?? "")));

assert(
  "K.4 Présence/absence du line_item port identique (le flag client ne supprime PAS le port)",
  legitHasShipping === forgedHasShipping,
  `legit=${legitHasShipping} forge=${forgedHasShipping}`
);

// Vérif metadata serveur
assert(
  "K.5 metadata.discount serveur = 0 dans la session forgée (code bidon ignoré)",
  String(forgedS.metadata?.discount ?? "") === "0",
  `metadata.discount=${forgedS.metadata?.discount}`
);

assert(
  "K.6 metadata.promo_code serveur = '' dans la session forgée (code bidon ignoré)",
  String(forgedS.metadata?.promo_code ?? "") === "",
  `metadata.promo_code=${forgedS.metadata?.promo_code}`
);

// ── 5. Vérifie qu'AUCUNE commande n'a été créée en DB par ces appels
console.log("\n🔍 Vérif DB : aucune commande créée par ces sessions ...");
const { data: orders, error: oErr } = await supa
  .from("orders")
  .select("id, stripe_session_id, created_at")
  .in("stripe_session_id", [legit.sessionId, forged.sessionId]);

if (oErr) {
  console.warn("⚠️ Erreur lecture orders :", oErr.message, "— check manuel requis");
} else {
  assert(
    "K.7 Aucune ligne dans orders pour ces 2 session_id (webhook pas déclenché sans paiement)",
    (orders?.length ?? 0) === 0,
    `${orders?.length ?? 0} ligne(s) trouvée(s) : ${JSON.stringify(orders ?? [])}`
  );
}

// ── 6. Cleanup : expire les sessions Stripe pour ne pas polluer
console.log("\n🧹 Cleanup : expire les 2 sessions Stripe ...");
for (const sid of [legit.sessionId, forged.sessionId]) {
  try {
    await stripe.checkout.sessions.expire(sid);
  } catch (e) {
    console.warn(`   (expire ${sid} : ${e.message})`);
  }
}

// ── Résultat ──────────────────────────────────────────────────────────────
console.log("");
console.log("─".repeat(60));
const pass = results.filter(r => r.ok).length;
const fail = results.length - pass;
console.log(`Résultat : ${pass}/${results.length} passent, ${fail} échec(s)`);
if (fail > 0) {
  console.log("");
  console.log("⚠️ FAILLE SÉCURITÉ : le serveur a accepté des valeurs forgées.");
  process.exit(1);
}
console.log("✓ Test sécurité E2E PASSE — le serveur ignore correctement les flags client.");
