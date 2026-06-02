// Seed 1 commande offerte + 1 avis approuvé pour Juliette N. (gigoteuse smileys).
// Idempotent : vérifie d'abord qu'aucun avis n'existe déjà pour cette
// combinaison email+product_id.
//
// Usage : node --env-file=.env.local scripts/seed-juliette-review.mjs

import { createClient } from "@supabase/supabase-js";
import { randomBytes }   from "node:crypto";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error("Manque env"); process.exit(1); }

// ── Garde-fou : on travaille bien sur milk-prod
if (!URL.includes("ntkqmnenczltlwplswka")) {
  console.error(`❌ URL pointe sur ${URL} — pas milk-prod. STOP.`);
  process.exit(1);
}

const supa = createClient(URL, KEY, { auth: { persistSession: false } });

// ── Données
const PRODUCT_ID    = "773313db-e5c7-41ab-9c4b-865284c6e064"; // gigoteuse-smileys
const PRODUCT_SLUG  = "gigoteuse-smileys";
const PRODUCT_NAME  = "Gigoteuse à Nouer — Smileys";
const PRODUCT_CAT   = "gigoteuses";
const EMAIL         = "neff.juliette@gmail.com";
const DISPLAY_NAME  = "Juliette N.";
const RATING        = 5;
const COMMENT       = "J'ai essayé les deux et c'est très bien. Le pyjama est trop chou et design, l'élasticité est un vrai plus pour l'habiller !! La gigoteuse à nouer aussi est très pratique pour la changer et ne pas l'embêter quand elle dort ! Et sa matière fine est très pratique aussi !!";

// Récupère le prix réel pour discount = prix complet (cohérence "remise 100%")
const { data: product, error: pErr } = await supa
  .from("products")
  .select("id, name, slug, price_ttc, category_slug")
  .eq("id", PRODUCT_ID)
  .single();
if (pErr || !product) {
  console.error(`❌ Produit ${PRODUCT_ID} introuvable :`, pErr?.message);
  process.exit(1);
}
const FULL_PRICE = Number(product.price_ttc);

// ── Idempotence : abort si avis existe déjà
const { data: existingReview } = await supa
  .from("reviews")
  .select("id, customer_name, created_at")
  .eq("customer_email", EMAIL)
  .eq("product_id", PRODUCT_ID)
  .maybeSingle();
if (existingReview) {
  console.log(`⏭  Avis déjà existant (id=${existingReview.id}, ${existingReview.created_at})`);
  console.log("   Aucune modification. Si tu veux re-seed, supprime cet avis manuellement.");
  process.exit(0);
}

// ── Dates : J-21 / J-18
const now = new Date();
const createdAt   = new Date(now.getTime() - 21 * 86400_000);
const deliveredAt = new Date(now.getTime() - 18 * 86400_000);

// ── stripe_session_id unique avec marqueur "offert_juliette_"
const sessionMarker = `offert_juliette_${randomBytes(6).toString("hex")}`;

// ── INSERT order
const orderRow = {
  stripe_session_id: sessionMarker,
  items: [{
    id:            PRODUCT_ID,
    name:          PRODUCT_NAME,
    slug:          PRODUCT_SLUG,
    price:         FULL_PRICE,     // prix unitaire affiché dans l'item
    quantity:      1,
    category_slug: PRODUCT_CAT,
  }],
  amount_total:    0,                // 0€ facturé
  discount:        FULL_PRICE,       // remise = prix complet → 100%
  customer_email:  EMAIL,
  customer_name:   DISPLAY_NAME,
  status:          "payee",
  shipping_status: "livree",         // requis pour cohérence (cf. /api/reviews POST)
  promo_code:      "OFFERT100",      // marqueur (PAS un code dans promo_codes)
  delivery_type:   "home",
  carrier:         "colissimo",
  delivery_price:  0,
  notes:           "Produit offert — campagne test (à exclure des stats CA)",
  created_at:      createdAt.toISOString(),
  delivered_at:    deliveredAt.toISOString(),
  // Pas de relay_*, pas de shipping_address, pas de stripe_payment_intent
};

const { data: order, error: oErr } = await supa
  .from("orders")
  .insert([orderRow])
  .select()
  .single();
if (oErr) {
  console.error("❌ Insert orders failed :", oErr.message);
  process.exit(1);
}
console.log(`✅ Order créée : id=${order.id}  session=${order.stripe_session_id}`);

// ── INSERT review
const reviewRow = {
  order_id:       order.id,
  product_id:     PRODUCT_ID,
  customer_email: EMAIL,           // NOT NULL, stocké pour traçabilité interne
  customer_name:  DISPLAY_NAME,    // ← AFFICHÉ publiquement
  rating:         RATING,
  comment:        COMMENT,
  approved:       true,            // publié immédiatement
  created_at:     new Date(deliveredAt.getTime() + 86400_000 * 7).toISOString(),
};

const { data: review, error: rErr } = await supa
  .from("reviews")
  .insert([reviewRow])
  .select()
  .single();
if (rErr) {
  console.error("❌ Insert reviews failed :", rErr.message);
  console.error("   ⚠️ Ordre créée mais avis non. À nettoyer si besoin.");
  process.exit(1);
}
console.log(`✅ Review créée : id=${review.id}  customer_name="${review.customer_name}"  rating=${review.rating}`);

console.log("");
console.log("─".repeat(60));
console.log("RÉCAP :");
console.log(`  order_id   : ${order.id}`);
console.log(`  review_id  : ${review.id}`);
console.log(`  product    : ${product.name} (${product.slug})`);
console.log(`  created_at : order=${order.created_at} / review=${review.created_at}`);
console.log(`  delivered  : ${order.delivered_at}`);
console.log("─".repeat(60));
