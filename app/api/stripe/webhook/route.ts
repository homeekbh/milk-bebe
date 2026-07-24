import Stripe from "stripe";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/server/supabase";
import { Resend } from "resend";
import { escapeHtml } from "@/lib/escape-html";
import { logActivity } from "@/lib/server/audit";
import { decideRewardOnRefund } from "@/lib/parrainage-refund";
import { getParrainageSettings, releaseRewards } from "@/lib/parrainage-server";
import { getZoneForCountry } from "@/lib/delivery-config";
import { resolveItemWeightG, PACKAGING_WEIGHT_G } from "@/lib/weight";
import { ventilateTTC } from "@/lib/tva";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});
const resend  = new Resend(process.env.RESEND_API_KEY);
const BASE    = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

// Le webhook enchaîne plusieurs écritures DB + emails (best-effort) : fenêtre d'exécution élargie
// pour éviter un timeout à mi-parcours (Stripe rejouerait sinon l'événement).
export const maxDuration = 60;

const ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL_1,
  process.env.ADMIN_EMAIL_2,
  process.env.ADMIN_EMAIL_3,
].filter(Boolean) as string[];

function extractTailleFromName(name: string): string | null {
  if (!name) return null;
  const parts = name.split(" — ");
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1].trim();
  const taillePatterns = [
    /^Nouveau-né$/i,
    /^\d+-\d+\s*mois$/i,
    /^0-6\s*mois$/i,
    /^6-12\s*mois$/i,
    /^Taille unique$/i,
    /^\d+×\d+\s*cm$/i,
    /^Naissance$/i,
  ];
  if (taillePatterns.some(p => p.test(last))) return last;
  return null;
}

// Attribution du numéro de FACTURE séquentiel (assujetti TVA 20 %). Format
// MILK-<année>-<n padé 6>. IDEMPOTENT : n'attribue QUE si absent (rejeu Stripe → déjà présent →
// skip), + garde .is("invoice_number", null) contre la concurrence. Le numéro est FIGÉ à la 1re
// émission. NE BLOQUE JAMAIS la commande : tant que la table facture_seq / la RPC
// next_facture_number / la colonne orders.invoice_number ne sont pas en base (SQL à appliquer par
// Bou — cf. rapport), l'attribution échoue GRACIEUSEMENT → log + alerte admin best-effort (esprit B2),
// le paiement/la commande priment. S'active dès le SQL appliqué.
async function assignInvoiceNumber(orderId: string, existingInvoiceNumber: string | null | undefined): Promise<void> {
  if (existingInvoiceNumber) return; // déjà attribué → figé, on ne touche plus
  try {
    const year = new Date().getFullYear();
    const { data: seq, error: seqErr } = await supabaseServer.rpc("next_facture_number", { p_year: year });
    if (seqErr) throw seqErr;
    const n = Number(seq);
    if (!Number.isFinite(n) || n <= 0) throw new Error(`séquence invalide: ${String(seq)}`);
    const invoiceNumber = `MILK-${year}-${String(n).padStart(6, "0")}`;
    const { error: updErr } = await supabaseServer
      .from("orders")
      .update({ invoice_number: invoiceNumber })
      .eq("id", orderId)
      .is("invoice_number", null)  // garde concurrence : n'écrit que si toujours vide
      .select("id").maybeSingle();
    if (updErr) throw updErr;
  } catch (e: any) {
    console.error(`[webhook] attribution n° facture échouée pour ${orderId}:`, e?.message);
    try {
      if (ADMIN_EMAILS.length > 0) {
        await resend.emails.send({
          from:    "M!LK <contact@milkbebe.fr>",
          to:      ADMIN_EMAILS,
          subject: `⚠️ N° de facture non attribué — commande #${orderId.slice(0, 8).toUpperCase()}`,
          html:    `<div style="font-family:sans-serif;padding:24px;max-width:560px"><h2 style="color:#b91c1c;margin:0 0 12px">Numéro de facture non attribué</h2><p>La commande <strong>#${escapeHtml(orderId)}</strong> a bien été payée et enregistrée, mais l'attribution du numéro de facture séquentiel a échoué : <strong>${escapeHtml(e?.message ?? "erreur inconnue")}</strong>.</p><p>Vérifier que la table <code>facture_seq</code>, la RPC <code>next_facture_number</code> et la colonne <code>orders.invoice_number</code> existent (cf. rapport). À régulariser ensuite dans l'admin « Factures ».</p></div>`,
        });
      }
    } catch {}
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// B3 — Adresse de livraison COLLECTÉE par Stripe Checkout (shipping_address_collection).
// ⚠️ API épinglée 2026-01-28.clover : le champ RÉEL est
//    session.collected_information.shipping_details.{address,name}
//    (cf. node_modules/stripe/types/Checkout/Sessions.d.ts:88 & 534-545).
// L'ancien session.shipping_details top-level N'EXISTE PLUS sur cette version → le lire renvoyait
// toujours undefined, d'où un repli SILENCIEUX sur l'adresse de FACTURATION (bug B3 : étiquette FedEx
// internationale à la mauvaise adresse). On lit le champ réel en priorité, avec repli DÉFENSIF sur
// l'ancien champ. PAS de repli facturation ici — l'appelant décide (et alerte à l'international).
function getStripeCollectedShipping(session: Stripe.Checkout.Session): { address: Stripe.Address | null; name: string | null } {
  const s = session as any;
  const sd = s.collected_information?.shipping_details ?? s.shipping_details ?? null;
  return { address: sd?.address ?? null, name: sd?.name ?? null };
}

/** Champs minimaux requis pour une étiquette d'expédition fiable (surtout à l'international). */
function isShippingAddressComplete(a: any): boolean {
  return !!(a && a.line1 && a.city && a.postal_code && a.country);
}

/**
 * B3 — Adresse retenue absente/incomplète (ou repli facturation) : ne JAMAIS expédier en silence à
 * une mauvaise adresse. Log visible (prod) + alerte admin best-effort (esprit B2, mais SANS throw :
 * la commande est déjà enregistrée, on ne bloque pas le paiement).
 */
async function alertIncompleteShipping(session: Stripe.Checkout.Session, resolved: any, context: string): Promise<void> {
  console.error(`[webhook] B3 — adresse de livraison absente/incomplète (${context}, session ${session.id}) : collected_information.shipping_details manquant/partiel → étiquette NON fiable tant qu'un admin n'a pas vérifié.`);
  try {
    if (ADMIN_EMAILS.length > 0) {
      await resend.emails.send({
        from:    "M!LK <contact@milkbebe.fr>",
        to:      ADMIN_EMAILS,
        subject: `⚠️ Adresse de livraison à vérifier — session ${session.id.slice(0, 24)}`,
        html:    `<div style="font-family:sans-serif;padding:24px;max-width:560px"><h2 style="color:#b45309;margin:0 0 12px">Adresse de livraison à vérifier avant expédition</h2><p>Session Stripe <strong>${escapeHtml(session.id)}</strong> — ${escapeHtml(context)}.</p><p>Aucune adresse de livraison Stripe complète (<code>collected_information.shipping_details</code>).</p><p>Adresse retenue : <code>${escapeHtml(JSON.stringify(resolved ?? null))}</code></p><p>⚠️ Vérifier / compléter l'adresse dans l'admin AVANT de générer l'étiquette d'expédition — ne pas expédier à l'adresse de facturation par erreur.</p></div>`,
      });
    }
  } catch (alertErr: any) {
    console.error("[webhook] alerte admin « adresse à vérifier » échouée:", alertErr?.message);
  }
}

/**
 * Point 2 — Commande INTERNATIONALE dont le pays/zone n'a pas pu être persisté : create-label
 * risquerait de la router en FR (Colissimo) au lieu de FedEx. Non silencieux : alerte admin
 * best-effort (sans throw : la commande est déjà enregistrée).
 */
async function alertMissingIntlZone(session: Stripe.Checkout.Session, orderId: string, delivery: any): Promise<void> {
  try {
    if (ADMIN_EMAILS.length > 0) {
      await resend.emails.send({
        from:    "M!LK <contact@milkbebe.fr>",
        to:      ADMIN_EMAILS,
        subject: `⚠️ Commande internationale sans pays/zone — #${orderId.slice(0, 8).toUpperCase()}`,
        html:    `<div style="font-family:sans-serif;padding:24px;max-width:560px"><h2 style="color:#b45309;margin:0 0 12px">Pays / zone de livraison non enregistré</h2><p>La commande <strong>#${escapeHtml(orderId)}</strong> (session ${escapeHtml(session.id)}) est internationale (${escapeHtml(String(delivery?.country ?? "?"))} / zone ${escapeHtml(String(delivery?.shipping_zone ?? "?"))}) mais <code>shipping_country</code> / <code>shipping_zone</code> n'ont pas pu être écrits en base.</p><p>⚠️ Renseigner le pays sur la commande AVANT de générer l'étiquette : sinon create-label pourrait la router en FR (Colissimo) au lieu de FedEx.</p></div>`,
      });
    }
  } catch (alertErr: any) {
    console.error("[webhook] alerte admin « pays/zone intl manquant » échouée:", alertErr?.message);
  }
}

// Ventilation TVA (assujetti 20 %, TVA « en dedans ») FIGÉE sur la commande. Idempotent (mêmes valeurs à
// chaque appel). Best-effort NON silencieux (esprit B2, SANS throw) : si l'écriture échoue (colonnes
// montant_ht/montant_tva/taux_tva absentes tant que la migration 024 n'est pas appliquée, ou erreur DB)
// → log visible + alerte admin best-effort. La ventilation reste recalculable à la volée (HT = TTC/1,20).
async function writeTvaVentilation(session: Stripe.Checkout.Session, orderId: string, amountTTC: number): Promise<void> {
  const { ht, tva, ratePct } = ventilateTTC(amountTTC);
  let failMsg = "";
  try {
    const { error } = await supabaseServer.from("orders")
      .update({ montant_ht: ht, montant_tva: tva, taux_tva: ratePct })
      .eq("id", orderId);
    if (!error) return;
    failMsg = error.message;
  } catch (e: any) {
    failMsg = e?.message ?? "exception";
  }
  console.error(`[webhook] ventilation TVA NON écrite pour ${orderId} (TTC ${Number(amountTTC).toFixed(2)} → HT ${ht} / TVA ${tva}) : ${failMsg}. Vérifier orders.montant_ht/montant_tva/taux_tva (migration 024).`);
  try {
    if (ADMIN_EMAILS.length > 0) {
      await resend.emails.send({
        from:    "M!LK <contact@milkbebe.fr>",
        to:      ADMIN_EMAILS,
        subject: `⚠️ Ventilation TVA non enregistrée — commande #${orderId.slice(0, 8).toUpperCase()}`,
        html:    `<div style="font-family:sans-serif;padding:24px;max-width:560px"><h2 style="color:#b45309;margin:0 0 12px">Ventilation TVA non écrite</h2><p>La commande <strong>#${escapeHtml(orderId)}</strong> (session ${escapeHtml(session.id)}) est payée, mais l'écriture de la ventilation TVA a échoué (HT ${ht} € / TVA ${tva} € / taux ${ratePct} %).</p><p>Cause probable : colonnes <code>montant_ht</code> / <code>montant_tva</code> / <code>taux_tva</code> absentes → appliquer la migration <code>024_orders_tva.sql</code>. La ventilation reste recalculable (HT = TTC / 1,20).</p></div>`,
      });
    }
  } catch (alertErr: any) {
    console.error("[webhook] alerte admin « ventilation TVA » échouée:", alertErr?.message);
  }
}

// ── Traitement d'une commande PACK (metadata.type === "pack") ────────────────
// Branche séparée du flow commande normal : crée UNE commande (items = 1 ligne
// pack + breakdown produits, pack_id renseigné) PUIS, une seule fois (claim
// atomique webhook_processed), décrémente le stock de chaque produit du pack
// (qty 1, taille choisie) et envoie les emails.
async function handlePackOrder(session: Stripe.Checkout.Session) {
  const meta   = session.metadata ?? {};
  const packId = meta.pack_id || null;
  const size   = meta.size || null;
  let productIds: string[] = [];
  try { productIds = JSON.parse(meta.product_ids ?? "[]"); } catch {}
  // Taille réelle par produit ({ [productId]: size|null }). Fallback sur `size`
  // (sessions créées avant le mapping par produit) → aucune régression.
  let productSizes: Record<string, string | null> = {};
  try { productSizes = JSON.parse(meta.product_sizes ?? "{}"); } catch {}
  const sizeFor = (pid: string): string | null => (pid in productSizes ? productSizes[pid] : size);

  const email  = session.customer_details?.email ?? meta.guest_email ?? "";
  const name   = session.customer_details?.name ?? "";
  const amount = (session.amount_total ?? 0) / 100;

  // B3 : adresse RÉELLE collectée par Stripe (collected_information.shipping_details), repli
  // facturation en dernier recours. Le coffret est expédiable FR/BE/CH/LU/MC → l'adresse compte.
  const packShip = getStripeCollectedShipping(session);
  const addr = packShip.address ?? session.customer_details?.address ?? null;
  const shippingAddress = addr ? {
    name:        packShip.name ?? name,
    line1:       addr.line1 ?? "", line2: addr.line2 ?? "",
    city:        addr.city ?? "", postal_code: addr.postal_code ?? "", country: addr.country ?? "FR",
  } : null;

  const { data: prods } = await supabaseServer
    .from("products").select("id, name, slug, weight_g, colors")
    .in("id", productIds.length ? productIds : ["none"]);
  const prodMap: Record<string, any> = {};
  (prods ?? []).forEach((p: any) => { prodMap[p.id] = p; });

  // Poids du coffret = Σ(poids net des composants) + emballage (250 g, 1×) — MÊME logique / MÊMES
  // constantes que le chemin unifié (resolveItemWeightG + PACKAGING_WEIGHT_G, lib/weight.ts). Un
  // coffret = 1 exemplaire de chaque composant (create-pack-session : un id par pack_item, qté 1).
  const packWeightG = Math.round(productIds.reduce((sum: number, pid: string) => sum + resolveItemWeightG(prodMap[pid]), 0)) + PACKAGING_WEIGHT_G;

  const packProducts = productIds.map(pid => {
    // Motif par pièce (phase 2, transport) : N=1 auto-résolu depuis colors ; multi-motif → null.
    const pcColors: any[] = Array.isArray(prodMap[pid]?.colors) ? prodMap[pid].colors : [];
    const pieceMotifId = pcColors.length === 1 && pcColors[0]?.id ? String(pcColors[0].id) : null;
    return { id: pid, name: prodMap[pid]?.name ?? "Produit", slug: prodMap[pid]?.slug ?? null, taille: sizeFor(pid), motif_id: pieceMotifId };
  });
  const items = [{
    id:            `pack:${packId}`,
    is_pack:       true,
    pack_id:       packId,
    quantity:      1,
    taille:        size,
    name:          `${meta.pack_title ?? "Coffret"}${size ? ` — ${size}` : ""}`,
    price:         amount,
    slug:          null,
    category_slug: "pack",
    products:      packProducts,
  }];

  // 1) Upsert de la commande EN PREMIER (idempotent via stripe_session_id).
  //    On ne met JAMAIS webhook_processed dans le payload : ON CONFLICT DO
  //    UPDATE préserve les colonnes absentes → le flag de claim reste intact.
  const { data: orderData, error: orderErr } = await supabaseServer
    .from("orders")
    .upsert([{
      stripe_session_id: session.id,
      items,
      amount_total:      amount,
      customer_email:    email,
      customer_name:     name,
      status:            "payee",
      shipping_status:   "en_preparation",
      shipping_address:  shippingAddress,
      pack_id:           packId,
    }], { onConflict: "stripe_session_id", ignoreDuplicates: false })
    .select().single();

  // ── B2 (chemin PACK) : commande NON écrite → alerte admin best-effort + throw → 500 →
  //    rejeu Stripe. Sans ce garde, le dispatcher renvoie 200 → Stripe ne rejoue pas →
  //    coffret payé perdu en silence (les effets de bord sont déjà gardés par orderData?.id).
  if (orderErr || !orderData?.id) {
    try {
      if (ADMIN_EMAILS.length > 0) {
        await resend.emails.send({
          from:    "M!LK <contact@milkbebe.fr>",
          to:      ADMIN_EMAILS,
          subject: `🚨 Coffret payé NON enregistré — session ${session.id.slice(0, 24)}`,
          html:    `<div style="font-family:sans-serif;padding:24px;max-width:560px"><h2 style="color:#b91c1c;margin:0 0 12px">Coffret payé non enregistré</h2><p>L'écriture <code>orders</code> a échoué pour la session Stripe <strong>${escapeHtml(session.id)}</strong>.</p><p>Erreur : <strong>${escapeHtml(orderErr?.message ?? "aucune ligne retournée (orderData vide)")}</strong></p><p>⚠️ Le client a potentiellement été débité. Stripe rejoue l'événement ; si la commande n'apparaît pas dans l'admin, vérifier côté Stripe et rembourser / recréer si besoin.</p></div>`,
        });
      }
    } catch (alertErr: any) {
      console.error("[webhook] alerte admin « coffret non enregistré » échouée:", alertErr?.message);
    }
    throw new Error(`[webhook] upsert orders (pack) échoué (session ${session.id}) — 500 pour forcer le rejeu Stripe`);
  }

  // Persistance payment_intent_id (lookups charge.refunded / payment_failed). Best-effort.
  const packPaymentIntentId = typeof (session as any).payment_intent === "string"
    ? (session as any).payment_intent : (session as any).payment_intent?.id ?? null;
  if (packPaymentIntentId) {
    try { await supabaseServer.from("orders").update({ stripe_payment_intent_id: packPaymentIntentId }).eq("id", orderData.id); } catch {}
  }

  // Poids + pays/zone (PARITÉ avec handleUnifiedOrder) — best-effort, à chaque appel (idempotent), AVANT
  // le claim. Sans ça, un coffret INTERNATIONAL serait bloqué à la génération d'étiquette (garde poids
  // FedEx) ou routé en FR par défaut (pays/zone absents). Le pays vient de l'adresse Stripe collectée.
  if (orderData?.id) {
    // Poids réel du coffret : écrase le défaut DB (retiré par migration 022 → NULL sinon).
    if (packWeightG > 0) {
      try { await supabaseServer.from("orders").update({ total_weight_g: packWeightG }).eq("id", orderData.id); } catch {}
    }
    // Pays / zone : coffret expédiable FR/BE/CH/LU/MC (create-pack-session). Pays = adresse Stripe.
    const packCountry = String(shippingAddress?.country ?? "").trim().toUpperCase();
    const packZone    = packCountry ? getZoneForCountry(packCountry) : null;
    const packIsIntl  = !!packCountry && packCountry !== "FR";
    if (packCountry) {
      try {
        await supabaseServer.from("orders").update({
          shipping_country: packCountry,
          shipping_zone:    packZone ? String(packZone) : null,
        }).eq("id", orderData.id);
      } catch (zoneErr: any) {
        if (packIsIntl) {
          console.error(`[webhook] coffret INTERNATIONAL ${orderData.id} (${packCountry}) : échec écriture shipping_country/zone — risque de routage FR par défaut.`, zoneErr?.message);
          await alertMissingIntlZone(session, orderData.id, { country: packCountry, shipping_zone: packZone });
        }
      }
    }
    // Ventilation TVA (assujetti 20 %, « en dedans ») — idempotent, best-effort non silencieux. amount = TTC.
    await writeTvaVentilation(session, orderData.id, amount);
  }

  // 2) Claim atomique : le premier webhook bascule webhook_processed false→true
  //    et "gagne" le droit d'exécuter les effets de bord. Le WHERE
  //    webhook_processed=false rend l'update atomique côté Postgres → sur un
  //    rejeu Stripe, claimed=null → isFirstProcessing=false.
  let isFirstProcessing = false;
  if (orderData?.id) {
    const { data: claimed } = await supabaseServer
      .from("orders")
      .update({ webhook_processed: true })
      .eq("id", orderData.id)
      .eq("webhook_processed", false)
      .select("id")
      .maybeSingle();
    isFirstProcessing = !!claimed;
  }

  // 3) Effets de bord EXACTEMENT-UNE-FOIS par commande.
  if (isFirstProcessing) {
    // Numéro de facture séquentiel (idempotent, non bloquant) — attribué à la 1re émission.
    await assignInvoiceNumber(orderData.id, (orderData as any)?.invoice_number);
    // B3 — coffret expédiable à l'international (BE/CH/LU/MC) : si l'adresse Stripe collectée est
    // absente/incomplète (repli facturation), alerter avant qu'une étiquette FedEx ne parte à la
    // mauvaise adresse. Dans isFirstProcessing → 1×/commande, jamais au rejeu Stripe.
    const packUsedBilling = !packShip.address && !!session.customer_details?.address;
    if (packUsedBilling || !isShippingAddressComplete(shippingAddress)) {
      await alertIncompleteShipping(session, shippingAddress, "coffret/pack (expédition FR/BE/CH/LU/MC)");
    }
    // Décrément stock atomique par produit (avec fallback non-atomique). Survente : on
    // collecte les ruptures (RPC error → fallback + détection ; RPC ok=false → stock insuffisant)
    // puis on alerte l'admin — COMME le chemin unifié. Sans ça, un refus RPC sur le dernier
    // exemplaire d'une pièce de coffret passait en silence (course → 2 paiements, 1 non honoré).
    const stockIssues: Array<{ name: string; size?: string; available: number; error?: string }> = [];
    const motifStockIssues: Array<{ name: string; motif_id: string; size?: string; error: string }> = [];  // dual-write phase 4
    for (const pid of productIds) {
      const pSize = sizeFor(pid);
      const pName = prodMap[pid]?.name ?? "Produit";
      // ── ANCIEN système (FILET, products.stock) — decrement_stock_atomic. INCHANGÉ. ──
      const { data: rpcResult, error: rpcErr } = await supabaseServer.rpc("decrement_stock_atomic", {
        p_product_id: pid, p_quantity: 1, p_size: pSize,
      });
      if (rpcErr) {
        const { data: fp } = await supabaseServer.from("products").select("id, stock, sizes_stock").eq("id", pid).single();
        if (fp) {
          if ((fp.stock ?? 0) < 1) stockIssues.push({ name: pName, size: pSize ?? undefined, available: fp.stock ?? 0 });
          const upd: any = { stock: Math.max(0, (fp.stock ?? 0) - 1) };
          if (pSize) {
            const ss = fp.sizes_stock ?? {};
            if ((ss[pSize] ?? 0) < 1) stockIssues.push({ name: pName, size: pSize, available: ss[pSize] ?? 0 });
            upd.sizes_stock = { ...ss, [pSize]: Math.max(0, (ss[pSize] ?? 0) - 1) };
          }
          await supabaseServer.from("products").update(upd).eq("id", pid);
        } else {
          stockIssues.push({ name: pName, size: pSize ?? undefined, available: 0, error: "product_not_found" });
        }
      } else {
        const result = rpcResult as any;
        if (!result?.ok) stockIssues.push({ name: pName, size: pSize ?? undefined, available: Number(result?.available ?? 0), error: String(result?.error ?? "unknown") });
      }

      // ── NOUVEAU système (DUAL-WRITE, colors[motif].sizes_stock) — pièce à motif UNIQUE (N=1). ──
      //    Pièce sans motif → SEUL l'ancien système. Échec → alerte B2, jamais de blocage (payé).
      const pcColors: any[] = Array.isArray(prodMap[pid]?.colors) ? prodMap[pid].colors : [];
      const pMotifId = pcColors.length === 1 && pcColors[0]?.id ? String(pcColors[0].id) : null;
      if (pMotifId) {
        const { data: motifRes, error: motifErr } = await supabaseServer.rpc("decrement_stock_motif", {
          p_product_id: pid, p_motif_id: pMotifId, p_size: pSize, p_quantity: 1,
        });
        if (motifErr || !(motifRes as any)?.ok) {
          const reason = motifErr?.message ?? String((motifRes as any)?.error ?? "unknown");
          motifStockIssues.push({ name: pName, motif_id: pMotifId, size: pSize ?? undefined, error: reason });
          console.error(`[webhook] DUAL-WRITE divergence (coffret) — decrement_stock_motif KO (produit ${pid}, motif ${pMotifId}): ${reason}`);
        }
      }
    }
    // Rupture APRÈS paiement (coffret) → commande CONSERVÉE + alerte admin (pas de remboursement auto).
    if (stockIssues.length > 0 && ADMIN_EMAILS.length > 0) {
      const issuesHtml = stockIssues.map(i => `<li><strong>${escapeHtml(i.name)}</strong>${i.size ? ` (taille ${escapeHtml(i.size)})` : ""} — dispo ${i.available}</li>`).join("");
      try {
        await resend.emails.send({
          from: "M!LK <contact@milkbebe.fr>", to: ADMIN_EMAILS,
          subject: `⚠️ STOCK INSUFFISANT (coffret) — commande #${orderData.id.slice(0, 8).toUpperCase()}`,
          html: `<div style="font-family:sans-serif;padding:24px;max-width:560px"><h2 style="color:#b91c1c;margin:0 0 12px">Stock insuffisant après paiement (coffret)</h2><p>Commande <strong>#${orderData.id.slice(0, 8).toUpperCase()}</strong> de <strong>${escapeHtml(name || email)}</strong> :</p><ul style="background:#fee2e2;padding:14px 24px;border-radius:8px;color:#991b1b;line-height:1.6">${issuesHtml}</ul><p>📦 Vérifier le stock réel avant expédition ; si rupture confirmée, alternative ou remboursement.</p><a href="${BASE}/admin/commandes" style="display:inline-block;margin-top:12px;padding:12px 22px;background:#1a1410;color:#c49a4a;font-weight:900;border-radius:10px;text-decoration:none">Voir la commande →</a></div>`,
        });
      } catch {}
      try { await logActivity("stock_alert", `Stock insuffisant (coffret) #${orderData.id.slice(0, 8).toUpperCase()} — ${stockIssues.length} item(s)`, { entity_id: orderData.id, meta: { issues: stockIssues, customer_email: email } }); } catch {}
    }
    // GARDE-FOU DUAL-WRITE (motif, coffret) : divergence colors[motif] vs products.stock → commande
    // CONSERVÉE + alerte, jamais de remboursement auto.
    if (motifStockIssues.length > 0 && ADMIN_EMAILS.length > 0 && orderData) {
      const mHtml = motifStockIssues.map(i => `<li><strong>${escapeHtml(i.name)}</strong>${i.size ? ` (taille ${escapeHtml(i.size)})` : ""} — motif ${escapeHtml(i.motif_id)} — ${escapeHtml(i.error)}</li>`).join("");
      try {
        await resend.emails.send({
          from: "M!LK <contact@milkbebe.fr>", to: ADMIN_EMAILS,
          subject: `⚠️ DIVERGENCE STOCK MOTIF (coffret, dual-write) — commande #${orderData.id.slice(0, 8).toUpperCase()}`,
          html: `<div style="font-family:sans-serif;padding:24px;max-width:560px"><h2 style="color:#b45309;margin:0 0 12px">Décrément par motif divergent (coffret)</h2><p>Commande <strong>#${orderData.id.slice(0, 8).toUpperCase()}</strong> — colors[motif].sizes_stock n'a pas suivi products.stock :</p><ul style="background:#fef3c7;padding:14px 24px;border-radius:8px;color:#92400e;line-height:1.6">${mHtml}</ul><p>📦 Reconcilier à la main. Commande CONSERVÉE (payée), pas de remboursement auto.</p></div>`,
        });
      } catch {}
      try { await logActivity("stock_motif_divergence", `Divergence dual-write motif (coffret) #${orderData.id.slice(0, 8).toUpperCase()} — ${motifStockIssues.length} item(s)`, { entity_id: orderData.id, meta: { motifStockIssues, customer_email: email } }); } catch {}
    }

    if (email && orderData) {
      try {
        await fetch(`${BASE}/api/emails/confirmation`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_EMAIL_SECRET ?? "" },
          // A5 : les coffrets sont livrés à domicile (adresse collectée par Stripe) → renseigner le
          // bloc livraison de l'email (sinon deliveryBlock vide → le client ne voit pas son adresse).
          body:    JSON.stringify({ to: email, email, customer_name: name, items, amount_total: amount, order_id: orderData.id, shipping_address: shippingAddress, delivery_type: shippingAddress ? "home" : null, home_address: shippingAddress }),
        });
      } catch {}
    }

    if (orderData && ADMIN_EMAILS.length > 0) {
      try {
        await resend.emails.send({
          from:    "M!LK <contact@milkbebe.fr>",
          to:      ADMIN_EMAILS,
          subject: `🎁 Nouveau pack vendu — ${amount.toFixed(2)} € — ${name || email}`,
          html: `<div style="font-family:sans-serif;padding:24px;max-width:520px"><h2 style="margin:0 0 10px">🎁 Pack : ${escapeHtml(meta.pack_title ?? "")}</h2><p>${escapeHtml(name || "Client")} — ${escapeHtml(email)}</p><p>Taille : <strong>${size || "—"}</strong> · <strong>${amount.toFixed(2)} €</strong></p><ul style="line-height:1.6">${packProducts.map(p => `<li>${p.name}</li>`).join("")}</ul><a href="${BASE}/admin/commandes" style="display:inline-block;margin-top:10px;padding:12px 22px;background:#1a1410;color:#c49a4a;font-weight:900;border-radius:10px;text-decoration:none">Voir la commande →</a></div>`,
        });
      } catch {}
    }

    try {
      await logActivity("commande_pack", `Pack vendu : ${meta.pack_title ?? ""} — ${amount.toFixed(2)} €`,
        { entity_id: orderData?.id, meta: { pack_id: packId, size, product_ids: productIds, customer_email: email } });
    } catch {}
  }
}

// ── Commande UNIFIÉE (produits + packs) via draft pending_orders ─────────────
// metadata = { pending_order_id }. On lit le draft (sélection RÉSOLUE), on crée
// 1 commande (montant = Stripe, source de vérité) puis — UNE seule fois (claim
// atomique du draft pending→consumed) — on décrémente CHAQUE pièce sur SA taille
// (produits + pièces de packs) et on envoie les emails.
async function handleUnifiedOrder(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};
  const pendingId = meta.pending_order_id;
  if (!pendingId) return;

  const { data: draft } = await supabaseServer
    .from("pending_orders").select("*").eq("id", pendingId).maybeSingle();
  if (!draft) { console.error("[webhook] pending_order introuvable:", pendingId); return; }

  const products: any[] = Array.isArray(draft.products) ? draft.products : [];
  const packs:    any[] = Array.isArray(draft.packs)    ? draft.packs    : [];
  const delivery: any   = draft.delivery ?? {};

  const email    = session.customer_details?.email ?? draft.guest_email ?? "";
  const name     = session.customer_details?.name ?? "";
  const amount   = (session.amount_total ?? 0) / 100;
  const discount = ((session.total_details?.amount_discount ?? 0)) / 100;

  // B3 : adresse RÉELLE collectée par Stripe (collected_information.shipping_details) pour
  // l'international ; repli facturation en dernier recours (alerté plus bas). La FRANCE passe par
  // delivery.home_address (tunnel) et n'est PAS affectée par ce changement.
  const collectedShip = getStripeCollectedShipping(session);
  const sAddr = collectedShip.address ?? session.customer_details?.address ?? null;
  const shippingFromStripe = sAddr ? {
    name: collectedShip.name ?? name,
    line1: sAddr.line1 ?? "", line2: sAddr.line2 ?? "",
    city: sAddr.city ?? "", postal_code: sAddr.postal_code ?? "", country: sAddr.country ?? "FR",
  } : null;
  const finalShippingAddress = delivery.home_address
    ? { ...delivery.home_address, line2: delivery.home_address.line2 ?? "" }
    : shippingFromStripe;

  // Items commande : produits + 1 ligne par pack (breakdown des pièces).
  const items = [
    ...products.map((p: any) => ({
      id: p.id, name: p.name, slug: p.slug, price: p.price, quantity: p.quantity,
      taille: p.taille ?? null, motif_id: p.motif_id ?? null, category_slug: p.category_slug ?? "",
    })),
    ...packs.map((pk: any) => ({
      id: `pack:${pk.pack_id}`, is_pack: true, pack_id: pk.pack_id,
      name: `${pk.title}${pk.size ? ` — ${pk.size}` : ""}`,
      price: pk.price, quantity: pk.quantity, taille: pk.size ?? null,
      slug: pk.slug ?? null, category_slug: "pack",
      products: (pk.pieces ?? []).map((pc: any) => ({ id: pc.product_id, name: pc.name, taille: pc.size, motif_id: pc.motif_id ?? null })),
    })),
  ];

  const relay = delivery.relay ?? null;

  const { data: orderData, error: orderErr } = await supabaseServer
    .from("orders")
    .upsert([{
      stripe_session_id: session.id,
      items,
      amount_total:      amount,
      customer_email:    email,
      customer_name:     name,
      promo_code:        draft.promo_code ?? null,
      discount,
      status:            "payee",
      shipping_status:   "en_preparation",
      shipping_address:  finalShippingAddress,
      delivery_type:     delivery.delivery_type ?? null,
      delivery_price:    Number(delivery.delivery_price ?? 0) || 0,
      relay_id:          relay?.id ?? null,
      relay_name:        relay?.name ?? null,
      relay_address:     relay?.street ?? null,
      relay_city:        relay?.city ?? null,
      relay_postal_code: relay?.postal_code ?? null,
      relay_type:        relay?.type ?? null,
    }], { onConflict: "stripe_session_id", ignoreDuplicates: false })
    .select().single();
  if (orderErr) process.env.NODE_ENV !== "production" && console.error("[webhook] unified order upsert:", orderErr.message);

  // ── B2 : commande NON écrite → ARRÊT AVANT tout effet de bord (claim / décrément / promo).
  //    Avec ON CONFLICT DO UPDATE (.select().single()), orderData null ⟺ échec RÉEL d'écriture.
  //    Un rejeu d'une commande DÉJÀ écrite renvoie la ligne (DO UPDATE) → orderData peuplé → on
  //    ne passe PAS ici, et le claim plus bas verra le draft déjà "consumed" → 200 sans rien doubler.
  //    Ici (échec réel) : alerte admin best-effort PUIS throw → catch global (≈L1026) → 500 → Stripe
  //    rejoue, le draft reste "pending" pour un retraitement propre.
  if (orderErr || !orderData?.id) {
    try {
      if (ADMIN_EMAILS.length > 0) {
        await resend.emails.send({
          from:    "M!LK <contact@milkbebe.fr>",
          to:      ADMIN_EMAILS,
          subject: `🚨 Commande NON enregistrée — session ${session.id.slice(0, 24)}`,
          html:    `<div style="font-family:sans-serif;padding:24px;max-width:560px"><h2 style="color:#b91c1c;margin:0 0 12px">Commande payée non enregistrée</h2><p>L'écriture <code>orders</code> a échoué pour la session Stripe <strong>${escapeHtml(session.id)}</strong>.</p><p>Erreur : <strong>${escapeHtml(orderErr?.message ?? "aucune ligne retournée (orderData vide)")}</strong></p><p>⚠️ Le client a potentiellement été débité. Stripe rejoue l'événement automatiquement ; si la commande n'apparaît pas rapidement dans l'admin, vérifier côté Stripe (paiement de la session) et rembourser / recréer si besoin.</p></div>`,
        });
      }
    } catch (alertErr: any) {
      // Un échec d'alerte ne doit JAMAIS empêcher le rejeu : on logge et on throw quand même.
      console.error("[webhook] alerte admin « commande non enregistrée » échouée:", alertErr?.message);
    }
    // Throw INCONDITIONNEL (hors du try ci-dessus) → 500 → rejeu Stripe, draft encore "pending".
    throw new Error(`[webhook] upsert orders échoué (session ${session.id}) — 500 pour forcer le rejeu Stripe`);
  }

  // Signal international (country renseigné et ≠ FR). create-session écrit TOUJOURS delivery.country
  // (défaut "FR" en métropole). Portée FONCTION : réutilisé pour le tél E.164, le garde pays/zone ET
  // l'alerte B3 — car une commande FR point relais/locker n'a PAS de home_address non plus (elle a un
  // relay), donc « !home_address » ne signifie PAS international.
  const isIntl = !!delivery.country && String(delivery.country).trim().toUpperCase() !== "FR";

  // Best-effort (colonnes optionnelles) : carrier + téléphone (E.164, priorité tunnel FR) + pays/zone + poids + payment_intent.
  if (orderData?.id) {
    const carrierValue = (delivery.carrier === "mondial_relay" || delivery.carrier === "colissimo") ? delivery.carrier : "colissimo";
    try { await supabaseServer.from("orders").update({ carrier: carrierValue }).eq("id", orderData.id); } catch {}
    // Téléphone (colonne orders.customer_phone, lue par create-label) : PRIORITÉ au tél saisi dans le
    // tunnel FRANCE (delivery.customer_phone). Sinon, à l'international, Stripe l'a collecté en E.164
    // via phone_number_collection → session.customer_details.phone. AUCUN faux numéro.
    // ⚠️ À l'INTERNATIONAL, FedEx EXIGE l'E.164 (+indicatif) : un numéro NATIONAL qui se glisserait
    // dans le tunnel (prefill/cas limite) écraserait l'E.164 de Stripe → étiquette rejetée. On ne
    // retient donc le tél tunnel QUE s'il commence par "+" à l'international ; sinon on prend Stripe.
    // FRANCE : inchangé (numéro national accepté — Colissimo / Mondial Relay).
    const tunnelPhone = String(delivery.customer_phone ?? "").trim();
    const stripePhone = String(session.customer_details?.phone ?? "").trim();
    const usableTunnelPhone = isIntl ? (tunnelPhone.startsWith("+") ? tunnelPhone : "") : tunnelPhone;
    const finalPhone  = usableTunnelPhone || stripePhone;
    if (finalPhone) {
      try { await supabaseServer.from("orders").update({ customer_phone: finalPhone }).eq("id", orderData.id); } catch {}
    } else {
      console.warn(`[webhook] commande ${orderData.id} sans téléphone (ni tunnel FR, ni Stripe) — customer_phone laissé null (pas de faux numéro).`);
    }
    // Pays + zone de livraison (orders.shipping_country / shipping_zone) → create-label route FR
    // (Colissimo/Mondial Relay) vs INTERNATIONAL (FedEx) d'après ces colonnes. FR : best-effort
    // silencieux (le routage domestique est le défaut correct). INTERNATIONAL : une commande hors-FR
    // SANS pays/zone en base serait routée en FR par défaut (Colissimo ≠ FedEx) → JAMAIS silencieux :
    // log visible + alerte admin best-effort (esprit B2, sans throw).
    if (delivery.country || delivery.shipping_zone) {
      try {
        await supabaseServer.from("orders").update({
          shipping_country: delivery.country ? String(delivery.country) : null,
          shipping_zone:    delivery.shipping_zone ? String(delivery.shipping_zone) : null,
        }).eq("id", orderData.id);
      } catch (zoneErr: any) {
        if (isIntl) {
          console.error(`[webhook] commande INTERNATIONALE ${orderData.id} (${delivery.country}/${delivery.shipping_zone}) : échec écriture shipping_country/zone — risque de routage FR par défaut.`, zoneErr?.message);
          await alertMissingIntlZone(session, orderData.id, delivery);
        }
      }
    }
    // Poids réel d'expédition (bug #5) : calculé par create-session (Σ produits/pièces de
    // packs + emballage) et transmis via draft.delivery.total_weight_g. Écrase le défaut DB
    // (500 g) pour que create-label demande la VRAIE tranche transporteur. Best-effort.
    const draftWeightG = Number(delivery.total_weight_g);
    if (Number.isFinite(draftWeightG) && draftWeightG > 0) {
      try { await supabaseServer.from("orders").update({ total_weight_g: Math.round(draftWeightG) }).eq("id", orderData.id); } catch {}
    }
    // payment_intent (main) : indispensable aux lookups charge.refunded / payment_failed (sinon fallback API fragile).
    const uPaymentIntentId = typeof (session as any).payment_intent === "string"
      ? (session as any).payment_intent : (session as any).payment_intent?.id ?? null;
    if (uPaymentIntentId) { try { await supabaseServer.from("orders").update({ stripe_payment_intent_id: uPaymentIntentId }).eq("id", orderData.id); } catch {} }
    // Ventilation TVA (assujetti 20 %, « en dedans ») — idempotent, best-effort non silencieux. amount = TTC.
    await writeTvaVentilation(session, orderData.id, amount);
  }

  // ── Claim ATOMIQUE du draft (pending→consumed) → effets de bord exactement-1×.
  const { data: claimed } = await supabaseServer
    .from("pending_orders")
    .update({ status: "consumed", consumed_at: new Date().toISOString() })
    .eq("id", pendingId).eq("status", "pending")
    .select("id").maybeSingle();
  if (!claimed) return; // déjà consommé (rejeu Stripe) → pas de double décrément

  // Numéro de facture séquentiel (idempotent, non bloquant) — attribué à la 1re émission.
  if (orderData?.id) await assignInvoiceNumber(orderData.id, (orderData as any)?.invoice_number);

  // B3 — INTERNATIONAL uniquement (isIntl = pays ≠ FR) : l'adresse vient de Stripe (collected_information),
  // pas du tunnel. Si elle est absente/incomplète (ou repli facturation), NE PAS laisser partir une
  // étiquette FedEx à la mauvaise adresse en silence → log visible + alerte admin best-effort. Après le
  // claim atomique (return si rejeu) → l'alerte ne part qu'à la 1re émission, jamais au rejeu.
  // ⚠️ Garde sur isIntl et NON sur !delivery.home_address : une commande FR point relais/locker n'a pas
  //    non plus de home_address (elle a un relay) → l'ancien garde alertait à tort CHAQUE relais FR.
  if (isIntl) {
    const usedBilling = !collectedShip.address && !!session.customer_details?.address;
    if (usedBilling || !isShippingAddressComplete(finalShippingAddress)) {
      await alertIncompleteShipping(session, finalShippingAddress, "commande internationale");
    }
  }

  // ── PARRAINAGE — exactement 1× (protégé par le claim atomique ci-dessus) ──
  //    Rattachement filleul→parrain + création/consommation des récompenses
  //    UNIQUEMENT ici, au paiement confirmé (anti-abus règles 2 & 3).
  try {
    const pay: any        = draft.parrainage ?? {};
    const orderId         = orderData?.id;
    const parrainDiscount = Number(pay.parrain_discount ?? 0) || 0;
    const rewardDiscount  = Number(pay.reward_discount ?? 0) || 0;

    if (orderId && (pay.parrain_code || parrainDiscount > 0 || rewardDiscount > 0)) {
      // Réconciliation sur la commande du filleul.
      try {
        await supabaseServer.from("orders").update({
          parrain_code:        pay.parrain_code ?? null,
          parrain_discount:    parrainDiscount,
          recompense_discount: rewardDiscount,
        }).eq("id", orderId);
      } catch {}
    }

    // Méca 1 : le filleul a payé avec un code parrain → le PARRAIN gagne une récompense.
    if (orderId && pay.parrain_id && pay.parrain_code) {
      const { data: already } = await supabaseServer
        .from("parrainage_recompenses").select("id").eq("filleul_order_id", orderId).limit(1).maybeSingle();
      if (!already) {
        const settings  = await getParrainageSettings();
        const expiresAt = new Date(Date.now() + settings.duree_validite_jours * 86_400_000).toISOString();
        await supabaseServer.from("parrainage_recompenses").insert([{
          parrain_id:       pay.parrain_id,
          filleul_order_id: orderId,
          montant:          settings.montant_recompense,
          status:           "disponible",
          expires_at:       expiresAt,
        }]);
        // Email parrain (récompense disponible) — best-effort.
        try {
          const { data: pp } = await supabaseServer
            .from("profiles").select("email, prenom").eq("id", pay.parrain_id).maybeSingle();
          if (pp?.email) {
            fetch(`${BASE}/api/emails/parrain-recompense`, {
              method:  "POST",
              headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_EMAIL_SECRET ?? "" },
              body:    JSON.stringify({ email: pp.email, prenom: pp.prenom ?? "", montant: settings.montant_recompense }),
            }).catch(() => {});
          }
        } catch {}
      }
    }

    // Méca 2 : marquer les récompenses « utilisée ». R2 : accepte "reservee" (réservée à
    // create-session) ET "disponible" (drafts legacy pré-R2, ou fallback si le SQL n'est pas
    // encore appliqué). Idempotent : au rejeu la récompense est déjà "utilisee" → 0 ligne matchée.
    const rewardIds: string[] = Array.isArray(pay.reward_ids) ? pay.reward_ids.map(String) : [];
    if (orderId && rewardIds.length > 0) {
      await supabaseServer.from("parrainage_recompenses")
        .update({ status: "utilisee", used_on_order_id: orderId })
        .in("id", rewardIds).in("status", ["reservee", "disponible"]);
    }
  } catch (e: any) {
    process.env.NODE_ENV !== "production" && console.error("[webhook] parrainage:", e?.message);
  }

  // ── Décrément : produits + chaque pièce de chaque pack, sur SA taille (× qty).
  const stockIssues: Array<{ name: string; size?: string; requested: number; available: number; error?: string }> = [];
  // DUAL-WRITE (phase 4) : divergences du décrément par motif (colors[motif]) — n'échouent JAMAIS la
  // commande (payée), juste alertées (esprit B2). Séparé de stockIssues pour tracer la source.
  const motifStockIssues: Array<{ name: string; motif_id: string; size?: string; requested: number; error: string }> = [];
  const dec: { id: string; qty: number; size: string | null; motif_id: string | null; motif_size: string | null; name: string }[] = [];
  for (const p of products) dec.push({ id: p.id, qty: Number(p.quantity) || 1, size: p.taille ?? null, motif_id: p.motif_id ?? null, motif_size: p.motif_size ?? null, name: p.name });
  for (const pk of packs) {
    const pq = Number(pk.quantity) || 1;
    for (const pc of (pk.pieces ?? [])) dec.push({ id: pc.product_id, qty: pq, size: pc.size ?? null, motif_id: pc.motif_id ?? null, motif_size: pc.size ?? null, name: pc.name });
  }
  for (const d of dec) {
    // ── ANCIEN système (FILET, products.stock) — decrement_stock_atomic. INCHANGÉ. ──
    const { data: rpcResult, error: rpcErr } = await supabaseServer.rpc("decrement_stock_atomic", {
      p_product_id: d.id, p_quantity: d.qty, p_size: d.size,
    });
    if (rpcErr) {
      const { data: fp } = await supabaseServer.from("products").select("id, stock, sizes_stock").eq("id", d.id).single();
      if (fp) {
        if ((fp.stock ?? 0) < d.qty) stockIssues.push({ name: d.name, size: d.size ?? undefined, requested: d.qty, available: fp.stock ?? 0 });
        const upd: any = { stock: Math.max(0, (fp.stock ?? 0) - d.qty) };
        if (d.size) {
          const ss = fp.sizes_stock ?? {};
          if ((ss[d.size] ?? 0) < d.qty) stockIssues.push({ name: d.name, size: d.size, requested: d.qty, available: ss[d.size] ?? 0 });
          upd.sizes_stock = { ...ss, [d.size]: Math.max(0, (ss[d.size] ?? 0) - d.qty) };
        }
        await supabaseServer.from("products").update(upd).eq("id", d.id);
      } else {
        stockIssues.push({ name: d.name, size: d.size ?? undefined, requested: d.qty, available: 0, error: "product_not_found" });
      }
    } else {
      const result = rpcResult as any;
      if (!result?.ok) stockIssues.push({ name: d.name, size: d.size ?? undefined, requested: d.qty, available: Number(result?.available ?? 0), error: String(result?.error ?? "unknown") });
    }

    // ── NOUVEAU système (DUAL-WRITE phase 4, colors[motif].sizes_stock) — decrement_stock_motif. ──
    //    UNIQUEMENT si l'item a un motif_id (Bandeau/Bonnet/legacy sans motif → SEUL l'ancien système).
    //    Échec (stock motif insuffisant / motif introuvable) → on NE bloque PAS (commande payée) :
    //    log + collecte pour alerte B2. MÊME bloc idempotent (post-claim) → rejeu = pas de double décrément.
    if (d.motif_id) {
      const { data: motifRes, error: motifErr } = await supabaseServer.rpc("decrement_stock_motif", {
        p_product_id: d.id, p_motif_id: d.motif_id, p_size: d.motif_size, p_quantity: d.qty,
      });
      if (motifErr || !(motifRes as any)?.ok) {
        const reason = motifErr?.message ?? String((motifRes as any)?.error ?? "unknown");
        motifStockIssues.push({ name: d.name, motif_id: d.motif_id, size: d.motif_size ?? undefined, requested: d.qty, error: reason });
        console.error(`[webhook] DUAL-WRITE divergence — decrement_stock_motif KO (produit ${d.id}, motif ${d.motif_id}, taille ${d.motif_size ?? "—"}): ${reason}`);
      }
    }
  }

  // GARDE-FOU B : rupture APRÈS paiement → commande CONSERVÉE + alerte Erika
  // (PAS de remboursement auto — décision métier en attente).
  if (stockIssues.length > 0 && ADMIN_EMAILS.length > 0 && orderData) {
    const issuesHtml = stockIssues.map(i => `<li><strong>${i.name}</strong>${i.size ? ` (taille ${i.size})` : ""} — commandé ${i.requested}, dispo ${i.available}</li>`).join("");
    try {
      await resend.emails.send({
        from: "M!LK <contact@milkbebe.fr>", to: ADMIN_EMAILS,
        subject: `⚠️ STOCK INSUFFISANT — commande #${orderData.id.slice(0, 8).toUpperCase()}`,
        html: `<div style="font-family:sans-serif;padding:24px;max-width:560px"><h2 style="color:#b91c1c;margin:0 0 12px">Stock insuffisant après paiement</h2><p>Commande <strong>#${orderData.id.slice(0, 8).toUpperCase()}</strong> de <strong>${name || email}</strong> :</p><ul style="background:#fee2e2;padding:14px 24px;border-radius:8px;color:#991b1b;line-height:1.6">${issuesHtml}</ul><p>📦 Vérifier le stock réel avant expédition ; si rupture confirmée, alternative ou remboursement.</p><a href="${BASE}/admin/commandes" style="display:inline-block;margin-top:12px;padding:12px 22px;background:#1a1410;color:#c49a4a;font-weight:900;border-radius:10px;text-decoration:none">Voir la commande →</a></div>`,
      });
    } catch {}
    try { await logActivity("stock_alert", `Stock insuffisant (commande unifiée) #${orderData.id.slice(0, 8).toUpperCase()} — ${stockIssues.length} item(s)`, { entity_id: orderData.id, meta: { issues: stockIssues, customer_email: email } }); } catch {}
  }

  // GARDE-FOU DUAL-WRITE (motif) : le décrément colors[motif] a divergé de products.stock (échec RPC
  // motif / stock motif insuffisant) alors que la commande est PAYÉE → CONSERVÉE, jamais de remboursement
  // auto. Alerte admin pour reconcilier colors[motif].sizes_stock à la main. Rare une fois les stocks
  // colors[] fiabilisés (phase de transition).
  if (motifStockIssues.length > 0 && ADMIN_EMAILS.length > 0 && orderData) {
    const html = motifStockIssues.map(i => `<li><strong>${i.name}</strong>${i.size ? ` (taille ${i.size})` : ""} — motif ${i.motif_id}, commandé ${i.requested} — ${i.error}</li>`).join("");
    try {
      await resend.emails.send({
        from: "M!LK <contact@milkbebe.fr>", to: ADMIN_EMAILS,
        subject: `⚠️ DIVERGENCE STOCK MOTIF (dual-write) — commande #${orderData.id.slice(0, 8).toUpperCase()}`,
        html: `<div style="font-family:sans-serif;padding:24px;max-width:560px"><h2 style="color:#b45309;margin:0 0 12px">Décrément par motif divergent</h2><p>Commande <strong>#${orderData.id.slice(0, 8).toUpperCase()}</strong> — le stock global (products.stock) a été décrémenté, mais colors[motif].sizes_stock n'a pas suivi :</p><ul style="background:#fef3c7;padding:14px 24px;border-radius:8px;color:#92400e;line-height:1.6">${html}</ul><p>📦 Reconcilier le stock du motif dans l'admin. Commande CONSERVÉE (payée), pas de remboursement auto.</p><a href="${BASE}/admin/commandes" style="display:inline-block;margin-top:12px;padding:12px 22px;background:#1a1410;color:#c49a4a;font-weight:900;border-radius:10px;text-decoration:none">Voir la commande →</a></div>`,
      });
    } catch {}
    try { await logActivity("stock_motif_divergence", `Divergence dual-write motif (commande unifiée) #${orderData.id.slice(0, 8).toUpperCase()} — ${motifStockIssues.length} item(s)`, { entity_id: orderData.id, meta: { motifStockIssues, customer_email: email } }); } catch {}
  }

  // Promo uses_count — CHAQUE code appliqué (cumul étape 21) + conversion panier.
  {
    const appliedCodes: string[] = Array.isArray(draft.promo_codes) && draft.promo_codes.length
      ? draft.promo_codes
      : (draft.promo_code ? [draft.promo_code] : []);
    for (const pc of appliedCodes) {
      const { data: promo } = await supabaseServer.from("promo_codes").select("id, uses_count").eq("code", pc).maybeSingle();
      if (!promo) continue;
      // Incrément ATOMIQUE (élimine la race read-modify-write sur uses_count).
      // Fallback non-atomique si la RPC est absente (même pattern que
      // decrement_stock_atomic). Reste dans le bloc exactement-1× (post-claim).
      const { error: rpcErr } = await supabaseServer.rpc("increment_promo_uses", { p_promo_id: promo.id });
      if (rpcErr) {
        process.env.NODE_ENV !== "production" && console.error("[webhook] RPC increment_promo_uses indispo, fallback non-atomique:", rpcErr.message);
        await supabaseServer.from("promo_codes").update({ uses_count: (promo.uses_count ?? 0) + 1 }).eq("id", promo.id);
      }
    }
  }
  if (email) await supabaseServer.from("abandoned_carts").update({ converted: true }).eq("email", email.toLowerCase().trim());

  // Email confirmation client + alerte admin nouvelle commande.
  if (email && orderData) {
    // Bloc livraison de l'email (régression flux unifié) : le template ne lit QUE relay /
    // home_address. On les passe donc, comme le fait le legacy. Mode relais → delivery.relay ;
    // sinon (domicile FR OU international) → finalShippingAddress + delivery_type "home" pour
    // que le template affiche l'adresse (FR : home_address du draft ; intl : adresse Stripe).
    const confirmIsRelay = delivery.delivery_type === "point_relais" || delivery.delivery_type === "locker";
    try {
      await fetch(`${BASE}/api/emails/confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_EMAIL_SECRET ?? "" },
        body: JSON.stringify({
          to: email, email, customer_name: name, items, amount_total: amount, order_id: orderData.id,
          shipping_address: finalShippingAddress, promo_code: draft.promo_code ?? null, discount,
          delivery_type: confirmIsRelay ? delivery.delivery_type : "home",
          relay:         confirmIsRelay ? relay : null,
          home_address:  confirmIsRelay ? null : finalShippingAddress,
        }),
      });
    } catch {}
  }
  if (orderData && ADMIN_EMAILS.length > 0) {
    try {
      await resend.emails.send({
        from: "M!LK <contact@milkbebe.fr>", to: ADMIN_EMAILS,
        subject: `🛒 Nouvelle commande — ${amount.toFixed(2)} € — ${name || email}`,
        html: `<div style="font-family:sans-serif;padding:24px;max-width:560px"><h2 style="margin:0 0 10px">🛒 Commande ${amount.toFixed(2)} €</h2><p>${escapeHtml(name || "Client")} — ${escapeHtml(email)}</p><ul style="line-height:1.6">${items.map((it: any) => `<li>${escapeHtml(String(it.name ?? ""))}${it.taille ? ` (${escapeHtml(String(it.taille))})` : ""} ×${it.quantity}</li>`).join("")}</ul><a href="${BASE}/admin/commandes" style="display:inline-block;margin-top:10px;padding:12px 22px;background:#1a1410;color:#c49a4a;font-weight:900;border-radius:10px;text-decoration:none">Voir la commande →</a></div>`,
      });
    } catch {}
  }
}

// ── checkout.session.expired — filet de sécurité paniers abandonnés ──────────
// Une Checkout Session non payée expire (24h par défaut, ou expiration manuelle).
// Cet événement capture les abandons APRÈS redirection Stripe — y compris quand le
// client a saisi son email DANS l'UI Stripe (Apple Pay / Google Pay), cas où le
// champ email du site (/panier → useEffect → /api/cart/save) n'est jamais rempli.
// Complète (ne remplace pas) la capture précoce côté site. Upsert sur `email`
// (jamais un insert brut) → pas de doublon avec une capture déjà faite, et on
// réutilise le MÊME schéma abandoned_carts que /api/cart/save → la séquence de
// relance (/api/emails/relance) fonctionne à l'identique quelle que soit la source.
async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  // Sécurité : ne rien faire si la session a en réalité été payée.
  if (session.payment_status === "paid") return;

  const email = (session.customer_details?.email ?? session.customer_email ?? "").toString().trim();
  if (!email) return; // aucun email capté (ni site, ni UI Stripe) → rien à relancer

  // Reconstituer le panier depuis le draft pending_orders (metadata.pending_order_id).
  let items: Array<{ id: string | null; name: string; price: number; quantity: number }> = [];
  let total = 0;
  const pendingId = session.metadata?.pending_order_id;

  if (pendingId) {
    const { data: draft } = await supabaseServer
      .from("pending_orders").select("products, packs, status, parrainage").eq("id", pendingId).maybeSingle();
    // Draft déjà consommé = commande payée → ne PAS créer d'abandon (double sécurité).
    if (draft?.status === "consumed") return;
    // R2 : session expirée/abandonnée → libérer les récompenses réservées (reservee→disponible).
    const expiredRewardIds: string[] = Array.isArray((draft?.parrainage as any)?.reward_ids) ? (draft!.parrainage as any).reward_ids.map(String) : [];
    if (expiredRewardIds.length) await releaseRewards(expiredRewardIds);
    const products: any[] = Array.isArray(draft?.products) ? draft!.products : [];
    const packs:    any[] = Array.isArray(draft?.packs)    ? draft!.packs    : [];
    items = [
      ...products.map((p: any) => ({ id: p.id, name: p.name, price: Number(p.price) || 0, quantity: Number(p.quantity) || 1 })),
      ...packs.map((pk: any) => ({ id: `pack:${pk.pack_id}`, name: `${pk.title}${pk.size ? ` — ${pk.size}` : ""}`, price: Number(pk.price) || 0, quantity: Number(pk.quantity) || 1 })),
    ];
    total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  }

  // Fallback (pas de draft exploitable, ex. ancienne session pack) : line_items Stripe.
  if (items.length === 0) {
    try {
      const li = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
      items = (li.data ?? []).map(l => ({ id: null, name: l.description ?? "Article", price: (l.price?.unit_amount ?? 0) / 100, quantity: l.quantity ?? 1 }));
    } catch {}
    total = (session.amount_total ?? 0) / 100;
  }
  if (items.length === 0) return; // rien à relancer

  const emailClean = email.toLowerCase();
  const prenom = session.customer_details?.name?.split(" ")[0] || email.split("@")[0];

  // Mirror /api/cart/save : préserver relance_1/2/3 et ne JAMAIS ressusciter un
  // panier déjà converti (le client a payé via une autre session).
  const { data: existing } = await supabaseServer
    .from("abandoned_carts")
    .select("id, converted, relance_1, relance_2, relance_3")
    .eq("email", emailClean)
    .maybeSingle();
  if (existing?.converted) return;

  const row = {
    email:      emailClean,
    prenom,
    items,
    total,
    converted:  false,
    updated_at: new Date().toISOString(),
    relance_1:  existing?.relance_1 ?? false,
    relance_2:  existing?.relance_2 ?? false,
    relance_3:  existing?.relance_3 ?? false,
  };
  // update-or-insert manuel : abandoned_carts n'a pas de contrainte UNIQUE(email) →
  // .upsert({ onConflict: "email" }) échouait (42P10) et ne créait jamais la ligne.
  const { error } = existing
    ? await supabaseServer.from("abandoned_carts").update(row).eq("id", existing.id)
    : await supabaseServer.from("abandoned_carts").insert(row);
  if (error) process.env.NODE_ENV !== "production" && console.error("[webhook] abandoned_carts (expired) upsert:", error.message);
}

// Statuts « commande déjà payée / terminale » : on ne les écrase JAMAIS avec
// echec_paiement (un payment_intent.payment_failed peut concerner une tentative
// distincte alors que la commande est déjà payée). Couvre les deux vocabulaires
// (status commande + shipping_status) par prudence.
const PAID_OR_TERMINAL_STATUSES = new Set([
  "payee", "paid", "remboursee", "rembours_partiel",
  "litige", "litige_gagne", "annulee",
  "en_preparation", "expediee", "livree",
]);

// Retrouve la commande liée à un paiement Stripe : d'abord via
// stripe_payment_intent_id (colonne persistée par checkout.session.completed),
// sinon en remontant à la session Checkout associée au payment_intent.
// Factorisé pour charge.refunded, payment_intent.payment_failed et les litiges.
async function findOrderByPaymentIntent(piId: string | null): Promise<any | null> {
  if (!piId) return null;
  const cols = "id, amount_total, customer_email, stripe_session_id, status, refund_amount";

  const { data: byPi } = await supabaseServer
    .from("orders").select(cols)
    .eq("stripe_payment_intent_id", piId).maybeSingle();
  if (byPi) return byPi;

  try {
    const sessions = await stripe.checkout.sessions.list({ payment_intent: piId, limit: 1 });
    const sid = sessions.data[0]?.id;
    if (sid) {
      const { data: bySid } = await supabaseServer
        .from("orders").select(cols)
        .eq("stripe_session_id", sid).maybeSingle();
      if (bySid) return bySid;
    }
  } catch {}
  return null;
}

// Échec d'une écriture de reversal parrainage (annulation OU mise en révision) → rendu VISIBLE,
// jamais silencieux. Log non gaté (visible en prod) + alerte admin best-effort (même esprit que le
// garde B2). NE throw PAS : le traitement du remboursement/litige lui-même ne doit pas être bloqué
// par l'échec d'une écriture de récompense.
async function reportRewardReversalFailure(opts: {
  rewardId: string; orderId: string; parrainId: string | null; montant: any; kind: string; error: string;
}): Promise<void> {
  console.error(`[reverseReferralRewards] échec ${opts.kind} récompense ${opts.rewardId} (commande filleul ${opts.orderId}) : ${opts.error}`);
  try {
    if (ADMIN_EMAILS.length > 0) {
      await resend.emails.send({
        from:    "M!LK <contact@milkbebe.fr>",
        to:      ADMIN_EMAILS,
        subject: `⚠️ Reversal récompense parrain ÉCHOUÉ — récompense ${opts.rewardId.slice(0, 8)}`,
        html:    `<div style="font-family:sans-serif;padding:24px;max-width:560px"><h2 style="color:#b91c1c;margin:0 0 12px">Reversal parrainage échoué (${escapeHtml(opts.kind)})</h2><p>La mise à jour de la récompense <strong>${escapeHtml(opts.rewardId)}</strong> (parrain <strong>${escapeHtml(String(opts.parrainId ?? "?"))}</strong>, ${(Number(opts.montant) || 0).toFixed(2)} €), suite au remboursement/litige de la commande filleul <strong>${escapeHtml(opts.orderId)}</strong>, a échoué.</p><p>Erreur : <strong>${escapeHtml(opts.error)}</strong></p><p style="background:#fee2e2;padding:12px;border-radius:8px;color:#991b1b">⚠️ Le remboursement/litige a bien été traité, mais la récompense parrain n'a PAS été annulée/flaggée. À corriger manuellement dans l'admin.</p></div>`,
      });
    }
  } catch (alertErr: any) {
    console.error("[reverseReferralRewards] alerte admin « reversal échoué » elle-même en échec :", alertErr?.message);
  }
}

// Anti-abus parrainage (étape 22) : quand une commande FILLEUL est remboursée
// (refund total/partiel) ou que son litige est PERDU, on applique decideRewardOnRefund
// à chaque récompense parrain générée par cette commande. Idempotent : les filtres
// .eq (status='disponible' / annulation_en_attente=false) rendent le rejeu sans effet.
async function reverseReferralRewards(orderId: string, isTotalRefund: boolean): Promise<void> {
  try {
    const { data: genRewards } = await supabaseServer
      .from("parrainage_recompenses")
      .select("id, status, montant, parrain_id, used_on_order_id")
      .eq("filleul_order_id", orderId);

    for (const rew of genRewards ?? []) {
      const { action, reason } = decideRewardOnRefund(String(rew.status), isTotalRefund);
      if (action === "noop") continue;

      if (action === "cancel") {
        const { data: done, error: cancelErr } = await supabaseServer
          .from("parrainage_recompenses")
          .update({ status: "annulee", annulee_at: new Date().toISOString(), annulation_reason: reason })
          .eq("id", rew.id).eq("status", "disponible")
          .select("id").maybeSingle();
        if (cancelErr) {
          // Échec RÉEL (contrainte manquante, réseau) → visible + alerte admin. NB : 0 ligne
          // matchée (récompense plus 'disponible') n'est PAS une erreur (cancelErr null) →
          // no-op idempotent normal, pas d'alerte.
          await reportRewardReversalFailure({ rewardId: rew.id, orderId, parrainId: rew.parrain_id, montant: rew.montant, kind: "annulation", error: cancelErr.message });
        } else if (done) {
          await logActivity(
            "parrain_recompense_annulee",
            `Récompense parrain annulée (commande filleul remboursée) — ${(Number(rew.montant) || 0).toFixed(2)} €`,
            { entity_id: rew.id, meta: { reason, filleul_order_id: orderId, parrain_id: rew.parrain_id } },
          );
        }
      } else {
        // flag_review : cas ambigu (remboursement partiel) ou déjà utilisée →
        // révision humaine, jamais d'annulation/clawback auto.
        const { data: done, error: flagErr } = await supabaseServer
          .from("parrainage_recompenses")
          .update({ annulation_en_attente: true, annulation_reason: reason })
          .eq("id", rew.id).eq("annulation_en_attente", false)
          .select("id").maybeSingle();
        if (flagErr) {
          await reportRewardReversalFailure({ rewardId: rew.id, orderId, parrainId: rew.parrain_id, montant: rew.montant, kind: "mise_en_revision", error: flagErr.message });
        } else if (done) {
          await logActivity(
            "parrain_recompense_a_verifier",
            `Récompense parrain à vérifier (${reason}) — ${(Number(rew.montant) || 0).toFixed(2)} €`,
            { entity_id: rew.id, meta: { reason, reward_status: rew.status, filleul_order_id: orderId, parrain_id: rew.parrain_id, used_on_order_id: rew.used_on_order_id } },
          );
        }
      }
    }
  } catch (rewErr: any) {
    // Exception inattendue (ex. SELECT initial, logActivity) → visible en prod aussi (plus de gate
    // NODE_ENV) : un reversal parrainage raté doit toujours laisser une trace.
    console.error("[reverseReferralRewards]", rewErr?.message);
  }
}

export async function POST(req: Request) {
  const body        = await req.text();
  const headersList = await headers();
  const sig         = headersList.get("stripe-signature");

  if (!sig) return new Response("Missing stripe signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    process.env.NODE_ENV !== "production" && console.error("❌ Webhook signature error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    process.env.NODE_ENV !== "production" && console.log("✅ Webhook received:", session.id);

    try {
      // Pack : branche dédiée. Le flow commande normal ci-dessous lit
      // metadata.items, absent pour un pack → on traite et on sort.
      if (session.metadata?.type === "pack") {
        await handlePackOrder(session);
        return new Response("OK", { status: 200 });
      }

      // Commande UNIFIÉE (produits + packs) via draft — flux panier actuel.
      if (session.metadata?.pending_order_id) {
        await handleUnifiedOrder(session);
        return new Response("OK", { status: 200 });
      }

      // ── metadata.items = SLIM (id + quantity + taille seulement) ───────────
      // create-session ne stocke plus que ces 3 champs (limite Stripe 500 car.
      // par valeur de metadata). On re-fetch name/slug/price/category depuis
      // Supabase et on reconstruit le même tableau enrichi qu'avant, pour que
      // tout le code en aval (order, emails, stock) reste inchangé.
      const itemsRaw = JSON.parse(session.metadata?.items ?? "[]");

      // Batch : 1 seule requête pour TOUS les produits (élimine le N+1 — avant,
      // 1 requête .single() par article via Promise.all).
      const enrichIds = [...new Set((itemsRaw as any[]).map(i => i.id).filter(Boolean))];
      const { data: enrichProds } = await supabaseServer
        .from("products")
        .select("id, name, slug, price_ttc, promo_price, promo_start, promo_end, category_slug")
        .in("id", enrichIds.length ? enrichIds : ["none"]);
      const enrichMap: Record<string, any> = {};
      (enrichProds ?? []).forEach((p: any) => { enrichMap[p.id] = p; });

      const items = (itemsRaw as any[]).map((it) => {
        const product = enrichMap[it.id];
        const now = new Date();
        const promoActive =
          product?.promo_price && product?.promo_start && product?.promo_end &&
          new Date(product.promo_start) <= now && new Date(product.promo_end) >= now;
        const price = promoActive ? product!.promo_price : (product?.price_ttc ?? 0);

        // Reconstitue le nom affiché avec la taille (ex: "Body éclairs — 0-3 mois")
        const displayName = it.taille && product?.name
          ? `${product.name} — ${it.taille}`
          : (product?.name ?? "");

        return {
          id:            it.id,
          quantity:      it.quantity ?? 1,
          taille:        it.taille ?? null,
          name:          displayName,
          slug:          product?.slug ?? null,
          price,
          category_slug: product?.category_slug ?? "",
        };
      });

      const promoCode = session.metadata?.promo_code || null;
      const discount  = parseFloat(session.metadata?.discount ?? "0");
      const email     = session.customer_details?.email ?? "";
      const name      = session.customer_details?.name  ?? "";
      const amount    = (session.amount_total ?? 0) / 100;

      // B3 : champ RÉEL collected_information.shipping_details (repli facturation en dernier recours).
      const legacyShip   = getStripeCollectedShipping(session);
      const shippingAddr = legacyShip.address ?? session.customer_details?.address ?? null;
      const shippingName = legacyShip.name ?? name;
      const shippingAddress = shippingAddr ? {
        name:        shippingName,
        line1:       shippingAddr.line1       ?? "",
        line2:       shippingAddr.line2       ?? "",
        city:        shippingAddr.city        ?? "",
        postal_code: shippingAddr.postal_code ?? "",
        country:     shippingAddr.country     ?? "FR",
      } : null;

      // ── Mode de livraison (Mondial Relay) ───────────────────────────────
      const deliveryType  = session.metadata?.delivery_type ?? null;
      const deliveryPrice = parseFloat(session.metadata?.delivery_price ?? "0") || 0;
      const relayId       = session.metadata?.relay_id          || null;
      const relayName     = session.metadata?.relay_name        || null;
      const relayStreet   = session.metadata?.relay_street      || null;
      const relayCity     = session.metadata?.relay_city        || null;
      const relayCp       = session.metadata?.relay_postal_code || null;
      const relayType     = session.metadata?.relay_type        || null;

      let homeAddrParsed: any = null;
      try { homeAddrParsed = JSON.parse(session.metadata?.home_address ?? ""); } catch {}

      // Si home_address fourni côté UI → on l'utilise comme shipping_address
      const finalShippingAddress = homeAddrParsed
        ? { ...homeAddrParsed, line2: homeAddrParsed.line2 ?? "" }
        : shippingAddress;

      // Persister payment_intent_id pour permettre les lookups depuis
      // charge.refunded / payment_intent.payment_failed.
      const paymentIntentId =
        typeof (session as any).payment_intent === "string"
          ? (session as any).payment_intent
          : (session as any).payment_intent?.id ?? null;

      // ─ Upsert en 2 étapes : status/statuts (GARANTI) + colonnes optionnelles
      //   (stripe_payment_intent_id) en best-effort. Si la colonne manque, on
      //   ne perd pas l'upsert principal (cf. migration 001 commit D).
      //   ⚠️ Ne JAMAIS inclure webhook_processed ici : ON CONFLICT DO UPDATE
      //   préserve les colonnes absentes → le flag de claim reste intact.
      const { data: orderData, error: orderError } = await supabaseServer
        .from("orders")
        .upsert([{
          stripe_session_id: session.id,
          items,
          amount_total:      amount,
          customer_email:    email,
          customer_name:     name,
          promo_code:        promoCode,
          discount,
          status:            "payee",
          shipping_status:   "en_preparation",
          shipping_address:  finalShippingAddress,
          delivery_type:     deliveryType,
          delivery_price:    deliveryPrice,
          relay_id:          relayId,
          relay_name:        relayName,
          relay_address:     relayStreet,
          relay_city:        relayCity,
          relay_postal_code: relayCp,
          relay_type:        relayType,
        }], { onConflict: "stripe_session_id", ignoreDuplicates: false })
        .select()
        .single();

      if (orderError) {
        process.env.NODE_ENV !== "production" && console.error("❌ Order upsert error:", orderError.message);
      } else {
        process.env.NODE_ENV !== "production" && console.log("✅ Order saved:", orderData?.id);

        // Best-effort: persister payment_intent_id séparément (colonne optionnelle)
        if (paymentIntentId && orderData?.id) {
          const { error: piErr } = await supabaseServer
            .from("orders")
            .update({ stripe_payment_intent_id: paymentIntentId })
            .eq("id", orderData.id);
          if (piErr) {
            console.warn("[stripe-webhook] stripe_payment_intent_id non persisté (colonne manquante?):", piErr.message);
          }
        }

        // Persister le carrier choisi par le client (depuis metadata Stripe
        // peuplé par /api/checkout/create-session). Fallback "colissimo" si
        // le metadata est manquant (anciennes commandes ou bug client).
        if (orderData?.id) {
          const carrierFromMeta = session.metadata?.carrier;
          process.env.NODE_ENV !== "production" && console.log("[webhook] carrier from metadata:", carrierFromMeta);
          process.env.NODE_ENV !== "production" && console.log("[webhook] full metadata keys:", Object.keys(session.metadata ?? {}).join(", "));
          const carrierValue =
            carrierFromMeta === "mondial_relay" || carrierFromMeta === "colissimo"
              ? carrierFromMeta
              : "colissimo";
          process.env.NODE_ENV !== "production" && console.log("[webhook] persisting carrier:", carrierValue, "for order:", orderData.id);
          const { error: cErr } = await supabaseServer
            .from("orders")
            .update({ carrier: carrierValue })
            .eq("id", orderData.id);
          if (cErr) {
            console.warn("[stripe-webhook] carrier non persisté (colonne manquante?):", cErr.message);
          }
        }

        // Persister customer_phone si présent dans metadata (best-effort
        // 2-step — la colonne peut ne pas exister avant migration 005).
        const phoneFromMeta = session.metadata?.customer_phone;
        if (orderData?.id && phoneFromMeta && phoneFromMeta.trim().length > 0) {
          const { error: pErr } = await supabaseServer
            .from("orders")
            .update({ customer_phone: phoneFromMeta.trim() })
            .eq("id", orderData.id);
          if (pErr) {
            console.warn("[stripe-webhook] customer_phone non persisté (colonne manquante?):", pErr.message);
          }
        }
      }

      // ── Claim atomique d'idempotence ─────────────────────────────────────
      // Le premier webhook reçu pour cette commande bascule webhook_processed
      // false→true et "gagne" le droit d'exécuter les effets de bord une seule
      // fois. Le WHERE webhook_processed=false rend l'update atomique côté
      // Postgres → sur un rejeu Stripe (livraison "at least once"), claimed=null
      // → isFirstProcessing=false → on saute stock / promo / email confirmation.
      let isFirstProcessing = false;
      if (orderData?.id) {
        const { data: claimed } = await supabaseServer
          .from("orders")
          .update({ webhook_processed: true })
          .eq("id", orderData.id)
          .eq("webhook_processed", false)
          .select("id")
          .maybeSingle();
        isFirstProcessing = !!claimed;
      }

      if (isFirstProcessing) {
        // ✅ Batch load produits — 1 requête au lieu de N (sert à mapper item.slug → id
        // et à logguer le nom du produit dans les alertes stock)
        const _itemIds   = [...new Set(items.map((i: any) => i.id).filter(Boolean))];
        const _itemSlugs = [...new Set(items.map((i: any) => i.slug).filter(Boolean))];
        const { data: _allProds } = await supabaseServer
          .from("products").select("id, slug, name")
          .in("id", _itemIds.length ? _itemIds : ["none"]);
        const { data: _allProds2 } = _itemSlugs.length
          ? await supabaseServer.from("products").select("id, slug, name").in("slug", _itemSlugs)
          : { data: [] };
        const _prodsMap: Record<string, any> = {};
        [...(_allProds ?? []), ...(_allProds2 ?? [])].forEach((p: any) => {
          _prodsMap[p.id]   = p;
          _prodsMap[p.slug] = p;
        });

        // #1/#8 — Décrément stock ATOMIQUE via RPC Supabase (cf. migration 001
        // commit D). SELECT FOR UPDATE dans la fonction = deux paiements
        // simultanés sur le dernier exemplaire ne peuvent plus réussir tous
        // les deux. Si le stock est insuffisant côté serveur, on tracke
        // l'anomalie pour notifier l'admin (le client reçoit quand même sa
        // confirmation — il a payé, on ne peut pas le laisser dans le silence).
        const stockIssues: Array<{ slug: string; name: string; requested: number; available: number; size?: string; error?: string }> = [];

        for (const item of items) {
          const productData: any = _prodsMap[item.id] ?? _prodsMap[item.slug] ?? null;
          const productId = productData?.id ?? item.id ?? null;

          if (!productId) {
            console.warn("⚠️ Product not found for item:", item);
            stockIssues.push({
              slug: item.slug ?? "(inconnu)",
              name: item.name ?? "(inconnu)",
              requested: item.quantity ?? 1,
              available: 0,
              error: "product_not_found",
            });
            continue;
          }

          const qty    = item.quantity ?? 1;
          const taille = item.taille ?? extractTailleFromName(item.name ?? "");

          const { data: rpcResult, error: rpcErr } = await supabaseServer.rpc("decrement_stock_atomic", {
            p_product_id: productId,
            p_quantity:   qty,
            p_size:       taille,
          });

          if (rpcErr) {
            // La RPC n'existe pas encore → fallback non-atomique (read-modify-write).
            // On garde l'ancien comportement comme filet de sécurité pendant la
            // période où la migration SQL n'est pas encore exécutée en prod.
            console.error("[stripe-webhook] RPC decrement_stock_atomic indispo, fallback non-atomique:", rpcErr.message);

            const { data: fallbackProd } = await supabaseServer
              .from("products").select("id, stock, sizes_stock, name, slug")
              .eq("id", productId).single();
            if (!fallbackProd) {
              stockIssues.push({ slug: item.slug ?? "(?)", name: item.name ?? "(?)", requested: qty, available: 0, error: "fallback_product_not_found" });
              continue;
            }
            const availableGlobal = fallbackProd.stock ?? 0;
            if (qty > availableGlobal) {
              stockIssues.push({ slug: fallbackProd.slug, name: fallbackProd.name, requested: qty, available: availableGlobal });
            }
            const newStock = Math.max(0, availableGlobal - qty);
            const updatePayload: Record<string, any> = { stock: newStock };
            if (taille) {
              const sizesStock: Record<string, number> = fallbackProd.sizes_stock ?? {};
              const currentTailleStock = sizesStock[taille] ?? 0;
              if (qty > currentTailleStock) {
                stockIssues.push({ slug: fallbackProd.slug, name: fallbackProd.name, requested: qty, available: currentTailleStock, size: taille });
              }
              updatePayload.sizes_stock = { ...sizesStock, [taille]: Math.max(0, currentTailleStock - qty) };
            }
            await supabaseServer.from("products").update(updatePayload).eq("id", productId);
            continue;
          }

          // La RPC renvoie un JSON {ok, ...}
          const result = rpcResult as any;
          if (!result?.ok) {
            const errCode = String(result?.error ?? "unknown");
            console.error(`[stripe-webhook] RPC stock failed: ${errCode}`, result);
            stockIssues.push({
              slug:      productData?.slug ?? item.slug ?? "(?)",
              name:      productData?.name ?? item.name ?? "(?)",
              requested: qty,
              available: Number(result?.available ?? 0),
              size:      taille ?? undefined,
              error:     errCode,
            });
          } else {
            process.env.NODE_ENV !== "production" && console.log(`✅ Stock atomic OK: ${productData?.slug ?? productId} → ${result.new_stock}${taille ? ` (taille ${taille}: ${result.new_size_stock})` : ""}`);
          }
        }

        // #17 — Si problème de stock détecté, notifier l'admin (le client reçoit
        // quand même sa confirmation — il a payé, on ne peut pas le laisser dans
        // le flou — mais l'admin doit savoir qu'il y a un souci à résoudre).
        if (stockIssues.length > 0 && ADMIN_EMAILS.length > 0 && orderData) {
          const issuesHtml = stockIssues.map(i =>
            `<li><strong>${i.name}</strong>${i.size ? ` (taille ${i.size})` : ""} — commandé ${i.requested}, dispo ${i.available}</li>`
          ).join("");
          try {
            await resend.emails.send({
              from:    "M!LK <contact@milkbebe.fr>",
              to:      ADMIN_EMAILS,
              subject: `⚠️ STOCK INSUFFISANT — commande #${orderData.id.slice(0,8).toUpperCase()}`,
              html: `
                <div style="font-family:sans-serif;padding:24px;max-width:560px">
                  <h2 style="color:#b91c1c;margin:0 0 12px">Stock insuffisant détecté</h2>
                  <p>Commande <strong>#${orderData.id.slice(0,8).toUpperCase()}</strong> de <strong>${escapeHtml(name || email)}</strong> :</p>
                  <ul style="background:#fee2e2;padding:14px 24px;border-radius:8px;color:#991b1b;line-height:1.6">${issuesHtml}</ul>
                  <p>📦 <strong>Action requise :</strong> vérifier le stock réel avant expédition. Si rupture confirmée, proposer alternative ou remboursement partiel/total.</p>
                  <a href="${BASE}/admin/commandes" style="display:inline-block;margin-top:12px;padding:12px 22px;background:#1a1410;color:#c49a4a;font-weight:900;border-radius:10px;text-decoration:none">
                    Voir la commande →
                  </a>
                </div>
              `,
            });
          } catch (e) {
            console.error("[stripe-webhook] Admin stock alert email failed:", e);
          }
          try {
            await logActivity(
              "stock_alert",
              `Stock insuffisant sur commande #${orderData.id.slice(0,8).toUpperCase()} — ${stockIssues.length} item(s)`,
              { entity_id: orderData.id, meta: { issues: stockIssues, customer_email: email } }
            );
          } catch {}
        }

        if (promoCode) {
          const { data: promo } = await supabaseServer
            .from("promo_codes").select("id, uses_count").eq("code", promoCode).single();
          if (promo) {
            // Incrément ATOMIQUE (élimine la race read-modify-write). Fallback
            // non-atomique si la RPC est absente (pattern decrement_stock_atomic).
            const { error: rpcErr } = await supabaseServer.rpc("increment_promo_uses", { p_promo_id: promo.id });
            if (rpcErr) {
              console.error("[stripe-webhook] RPC increment_promo_uses indispo, fallback non-atomique:", rpcErr.message);
              await supabaseServer
                .from("promo_codes")
                .update({ uses_count: (promo.uses_count ?? 0) + 1 })
                .eq("id", promo.id);
            }
          }
        }
      }

      // Hors garde : la conversion du panier abandonné est idempotente par
      // nature (update converted=true) et utile à chaque réception.
      if (email) {
        await supabaseServer
          .from("abandoned_carts")
          .update({ converted: true })
          .eq("email", email.toLowerCase().trim());
      }

      if (isFirstProcessing) {
        if (email && orderData) {
          try {
            await fetch(`${BASE}/api/emails/confirmation`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_EMAIL_SECRET ?? "" },
              body: JSON.stringify({
                to:               email,
                email,
                customer_name:    name,
                items,
                amount_total:     amount,
                order_id:         orderData.id,
                shipping_address: finalShippingAddress,
                promo_code:       promoCode,
                discount,
                delivery_type:    deliveryType,
                relay:            relayId ? {
                  id:          relayId,
                  name:        relayName,
                  street:      relayStreet,
                  city:        relayCity,
                  postal_code: relayCp,
                  type:        relayType,
                } : null,
                home_address:     homeAddrParsed,
              }),
            });
          } catch (e) {
            process.env.NODE_ENV !== "production" && console.error("❌ Confirmation email error:", e);
          }
        }

        if (orderData && ADMIN_EMAILS.length > 0) {
          const itemsHtml = items.map((i: any) =>
            `<div style="font-size:14px;color:rgba(242,237,230,0.65);margin-top:6px">
              ${i.name ?? i.slug} × ${i.quantity} — ${(Number(i.price) * i.quantity).toFixed(2)} €
            </div>`
          ).join("");

          for (const adminEmail of ADMIN_EMAILS) {
            try {
              await resend.emails.send({
                from:    "M!LK <contact@milkbebe.fr>",
                to:      adminEmail,
                subject: `🛍️ Nouvelle vente M!LK — ${amount.toFixed(2)} € — ${name || email}`,
                html: `
                  <div style="background:#1a1410;font-family:Arial,sans-serif;padding:32px;border-radius:16px;max-width:520px">
                    <div style="background:#c49a4a;border-radius:12px;padding:14px 20px;margin-bottom:24px;text-align:center">
                      <span style="color:#1a1410;font-weight:950;font-size:20px">M!LK — Nouvelle commande</span>
                    </div>
                    <div style="background:#2a2018;border-radius:14px;padding:20px;margin-bottom:14px">
                      <div style="font-size:15px;font-weight:800;color:#f2ede6">${escapeHtml(name || "Client")}</div>
                      <div style="font-size:13px;color:rgba(242,237,230,0.5);margin-top:3px">${escapeHtml(email)}</div>
                      ${shippingAddress ? `<div style="font-size:12px;color:rgba(242,237,230,0.4);margin-top:8px">${escapeHtml(String(shippingAddress.line1 ?? ""))}, ${escapeHtml(String(shippingAddress.city ?? ""))} ${escapeHtml(String(shippingAddress.postal_code ?? ""))}</div>` : ""}
                    </div>
                    <div style="background:#2a2018;border-radius:14px;padding:20px;margin-bottom:14px">
                      ${itemsHtml}
                      <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(196,154,74,0.2);font-size:22px;font-weight:950;color:#c49a4a;text-align:right">${amount.toFixed(2)} €</div>
                    </div>
                    <a href="${BASE}/admin/commandes" style="display:block;text-align:center;background:#f2ede6;color:#1a1410;padding:14px;border-radius:10px;font-weight:900;font-size:15px;text-decoration:none">
                      Voir dans l'admin →
                    </a>
                  </div>
                `,
              });
            } catch (e) {
              process.env.NODE_ENV !== "production" && console.error("❌ Admin notification error:", e);
            }
          }
        }
      }

    } catch (err: any) {
      process.env.NODE_ENV !== "production" && console.error("❌ Webhook processing error:", err.message);
      return new Response(`Processing error: ${err.message}`, { status: 500 });
    }
  }

  // ── payment_intent.payment_failed — paiement échoué ──────────────────────
  // On marque la commande en "payment_failed" pour la suivre côté admin.
  // Stock NON décrémenté (le webhook checkout.session.completed n'a pas été
  // déclenché car le paiement n'est jamais allé jusqu'au bout) → rien à
  // réintégrer.
  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    process.env.NODE_ENV !== "production" && console.error("⚠️ Payment failed:", pi.id, pi.last_payment_error?.message);

    try {
      // On essaie de retrouver la commande via stripe_payment_intent_id si stocké,
      // sinon via le stripe_session_id en remontant à la session (paiement échoué
      // = il peut quand même y avoir une session associée).
      const order = await findOrderByPaymentIntent(pi.id);

      if (order) {
        // GARDE : ne JAMAIS écraser une commande déjà payée/terminale. Un
        // payment_intent.payment_failed peut concerner une tentative distincte
        // (nouvel essai de carte) alors que la commande a finalement été payée
        // via checkout.session.completed (status="payee").
        const currentStatus = String(order.status ?? "").toLowerCase();
        if (PAID_OR_TERMINAL_STATUSES.has(currentStatus)) {
          await logActivity(
            "commande_echec_paiement",
            `Paiement échoué IGNORÉ (commande déjà en statut "${currentStatus}") — #${String(order.id).slice(0, 8).toUpperCase()}`,
            {
              entity_id: order.id,
              meta: {
                payment_intent_id: pi.id,
                current_status:    currentStatus,
                error_code:        pi.last_payment_error?.code ?? null,
                error_message:     pi.last_payment_error?.message ?? null,
                amount:            (pi.amount ?? 0) / 100,
                customer_email:    order.customer_email,
              },
            }
          );
        } else {
          await supabaseServer.from("orders").update({
            status: "echec_paiement",
          }).eq("id", order.id);

          await logActivity(
            "commande_echec_paiement",
            `Paiement échoué pour commande #${String(order.id).slice(0, 8).toUpperCase()}`,
            {
              entity_id: order.id,
              meta: {
                payment_intent_id: pi.id,
                error_code:        pi.last_payment_error?.code ?? null,
                error_message:     pi.last_payment_error?.message ?? null,
                amount:            (pi.amount ?? 0) / 100,
                customer_email:    order.customer_email,
              },
            }
          );
        }
      } else {
        // Aucune commande retrouvée (cas normal : la session n'a jamais été completée,
        // donc l'order n'existe pas en base). On log quand même l'événement.
        await logActivity(
          "commande_echec_paiement",
          `Paiement échoué (aucune commande associée) — PI ${pi.id}`,
          {
            meta: {
              payment_intent_id: pi.id,
              error_code:        pi.last_payment_error?.code ?? null,
              error_message:     pi.last_payment_error?.message ?? null,
              amount:            (pi.amount ?? 0) / 100,
            },
          }
        );
      }
    } catch (err: any) {
      console.error("❌ payment_intent.payment_failed handler:", err.message); // non gaté : perte d'état argent doit être visible en prod
      // On ne return pas 500 — l'événement est ack
    }
  }

  // ── charge.refunded — remboursement Stripe (manuel dashboard ou via API) ─
  // Cet événement est déclenché APRÈS création d'un refund. Couvre :
  //  - Refunds créés via notre /api/admin/commandes/[id] (action cancel_refund/refund_partial)
  //  - Refunds créés manuellement dans le Stripe Dashboard
  //  - Refunds automatiques (chargeback, etc.)
  // On met le statut à "remboursee" et on log.
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    process.env.NODE_ENV !== "production" && console.log("💸 Charge refunded:", charge.id, charge.amount_refunded);

    try {
      const piId = typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id ?? null;

      const order = await findOrderByPaymentIntent(piId);
      // Stripe envoie amount_refunded CUMULÉ sur la charge (tous refunds confondus).
      const newRefundTotal = (charge.amount_refunded ?? 0) / 100;

      if (!order) {
        // Aucune commande retrouvée — on log quand même.
        await logActivity(
          "commande_remboursee",
          `Remboursement reçu (aucune commande associée) — ${newRefundTotal.toFixed(2)} €`,
          { meta: { charge_id: charge.id, payment_intent_id: piId, amount_refunded: newRefundTotal } },
        );
      } else {
        // Total vs partiel — pilote le routage email ET le parrainage.
        const isTotalRefund =
          charge.refunded === true ||
          (Number(charge.amount ?? 0) > 0 && Number(charge.amount_refunded ?? 0) >= Number(charge.amount ?? 0));

        // IDEMPOTENCE PAR MONTANT : si le cumul remboursé ne DÉPASSE pas ce qu'on a
        // déjà enregistré, aucun nouveau montant à traiter — soit c'est un rejeu
        // Stripe, soit l'admin a déjà écrit refund_amount (+ envoyé son email).
        // → pas d'update, pas d'email. (Le parrainage, lui, reste rejoué : idempotent.)
        const alreadyRecorded = Number(order.refund_amount ?? 0);
        if (newRefundTotal > alreadyRecorded) {
          const newStatus = isTotalRefund ? "remboursee" : "rembours_partiel";

          await supabaseServer.from("orders").update({
            status:        newStatus,
            refund_amount: newRefundTotal,
            refunded_at:   new Date().toISOString(),
          }).eq("id", order.id);

          // EXACTEMENT 1 email client par nouveau remboursement :
          //   total   → /api/emails/cancellation   (commande annulée)
          //   partiel → /api/emails/refund-partial (commande conservée)
          let emailSent = false;
          if (order.customer_email) {
            if (isTotalRefund) {
              // Verrou atomique anti-double-email d'annulation, PARTAGÉ avec
              // l'admin cancel_refund : on n'envoie l'email QUE si on gagne le
              // claim (cancellation_email_sent_at NULL→now). Si l'admin l'a déjà
              // pris — ou sur un rejeu Stripe — le claim échoue → skip, pas de 2e
              // email. (Le remboursement PARTIEL reste à source unique, pas de course.)
              const { data: emailClaim } = await supabaseServer.from("orders")
                .update({ cancellation_email_sent_at: new Date().toISOString() })
                .eq("id", order.id).is("cancellation_email_sent_at", null)
                .select("id").maybeSingle();
              if (emailClaim) {
                try {
                  const res = await fetch(`${BASE}/api/emails/cancellation`, {
                    method:  "POST",
                    headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_EMAIL_SECRET ?? "" },
                    body:    JSON.stringify({ email: order.customer_email, order_number: order.id }),
                  });
                  emailSent = res.ok;
                } catch (e) {
                  process.env.NODE_ENV !== "production" && console.error("[stripe-webhook] cancellation email error:", e);
                }
              }
            } else {
              try {
                const res = await fetch(`${BASE}/api/emails/refund-partial`, {
                  method:  "POST",
                  headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_EMAIL_SECRET ?? "" },
                  body:    JSON.stringify({ email: order.customer_email, order_number: order.id, refund_amount: newRefundTotal, order_total: Number(order.amount_total ?? 0) }),
                });
                emailSent = res.ok;
              } catch (e) {
                process.env.NODE_ENV !== "production" && console.error("[stripe-webhook] refund-partial email error:", e);
              }
            }
          }

          await logActivity(
            "commande_remboursee",
            `Commande #${String(order.id).slice(0, 8).toUpperCase()} ${isTotalRefund ? "remboursée" : "remboursée partiellement"} — ${newRefundTotal.toFixed(2)} €`,
            {
              entity_id: order.id,
              meta: {
                charge_id:         charge.id,
                payment_intent_id: piId,
                amount_refunded:   newRefundTotal,
                is_total_refund:   isTotalRefund,
                new_status:        newStatus,
                currency:          charge.currency,
                customer_email:    order.customer_email,
                email_sent:        emailSent,
                source:            "stripe_webhook",
              },
            }
          );
        } else {
          // Rien de nouveau (rejeu, ou remboursement déjà enregistré par l'admin).
          process.env.NODE_ENV !== "production" &&
            console.log(`[charge.refunded] cumul ${newRefundTotal.toFixed(2)} ≤ enregistré ${alreadyRecorded.toFixed(2)} → pas d'update/email`);
        }

        // ── Anti-abus parrainage — CONSERVÉ tel quel : exécuté à CHAQUE
        //    charge.refunded (même déclenché par une action admin — l'admin ne
        //    touche pas aux récompenses), idempotent via les filtres .eq.
        await reverseReferralRewards(order.id, isTotalRefund);
      }
    } catch (err: any) {
      console.error("❌ charge.refunded handler:", err.message); // non gaté : perte d'état remboursement doit être visible en prod
    }
  }

  // ── charge.dispute.created / .closed — litiges & chargebacks ──────────────
  // created : on bascule la commande en "litige" et on ALERTE l'admin (aucune
  // action auto sur stock/parrainage — un litige n'est pas un remboursement).
  // closed  : "lost" = fonds repris → traiter comme remboursement total ;
  //           "won" = litige gagné → statut "litige_gagne".
  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object as Stripe.Dispute;
    process.env.NODE_ENV !== "production" && console.warn("⚠️ Dispute created:", dispute.id, dispute.reason);

    try {
      const piId = typeof dispute.payment_intent === "string"
        ? dispute.payment_intent
        : dispute.payment_intent?.id ?? null;
      const order  = await findOrderByPaymentIntent(piId);
      const amount = (dispute.amount ?? 0) / 100;

      if (order) {
        // Idempotent : ne réécrit pas un statut déjà en litige.
        if (String(order.status ?? "").toLowerCase() !== "litige") {
          await supabaseServer.from("orders").update({ status: "litige" }).eq("id", order.id);
        }

        await logActivity(
          "commande_litige",
          `Litige/chargeback ouvert — commande #${String(order.id).slice(0, 8).toUpperCase()} — ${amount.toFixed(2)} €`,
          {
            entity_id: order.id,
            meta: { dispute_id: dispute.id, payment_intent_id: piId, amount, reason: dispute.reason, dispute_status: dispute.status, customer_email: order.customer_email },
          }
        );

        // Alerte admin (modèle "pack vendu") — aucune action auto stock/parrainage.
        if (ADMIN_EMAILS.length > 0) {
          const numero = String(order.id).slice(0, 8).toUpperCase();
          try {
            await resend.emails.send({
              from:    "M!LK <contact@milkbebe.fr>",
              to:      ADMIN_EMAILS,
              subject: `⚠️ Litige/chargeback — commande #${numero} — ${amount.toFixed(2)} €`,
              html: `<div style="font-family:sans-serif;padding:24px;max-width:560px"><h2 style="color:#b91c1c;margin:0 0 12px">Litige ouvert (chargeback)</h2><p>Commande <strong>#${numero}</strong> — <strong>${escapeHtml(String(order.customer_email ?? "?"))}</strong></p><p>Montant contesté : <strong>${amount.toFixed(2)} €</strong><br>Motif Stripe : <strong>${escapeHtml(String(dispute.reason ?? "—"))}</strong></p><p style="background:#fee2e2;padding:12px;border-radius:8px;color:#991b1b">Aucune action automatique (stock/parrainage) n'a été prise. À traiter dans Stripe <strong>avant la date limite de réponse</strong>.</p><a href="${BASE}/admin/commandes" style="display:inline-block;margin-top:10px;padding:12px 22px;background:#1a1410;color:#c49a4a;font-weight:900;border-radius:10px;text-decoration:none">Voir la commande →</a></div>`,
            });
          } catch (e) {
            process.env.NODE_ENV !== "production" && console.error("[charge.dispute.created] admin alert email:", e);
          }
        }
      } else {
        await logActivity(
          "commande_litige",
          `Litige/chargeback ouvert (aucune commande associée) — ${amount.toFixed(2)} €`,
          { meta: { dispute_id: dispute.id, payment_intent_id: piId, amount, reason: dispute.reason } },
        );
      }
    } catch (err: any) {
      console.error("❌ charge.dispute.created handler:", err.message); // non gaté : perte d'état litige doit être visible en prod
    }
  }

  if (event.type === "charge.dispute.closed") {
    const dispute = event.data.object as Stripe.Dispute;
    const outcome = String(dispute.status ?? ""); // "won" | "lost" | "warning_closed" | …
    process.env.NODE_ENV !== "production" && console.warn("⚖️ Dispute closed:", dispute.id, outcome);

    try {
      const piId = typeof dispute.payment_intent === "string"
        ? dispute.payment_intent
        : dispute.payment_intent?.id ?? null;
      const order  = await findOrderByPaymentIntent(piId);
      const amount = (dispute.amount ?? 0) / 100;

      if (order) {
        const numero = String(order.id).slice(0, 8).toUpperCase();

        if (outcome === "lost") {
          // Litige PERDU = fonds définitivement repris → équivalent remboursement total.
          // Idempotent : ne réécrit pas un statut déjà remboursee.
          if (String(order.status ?? "").toLowerCase() !== "remboursee") {
            await supabaseServer.from("orders").update({
              status:      "remboursee",
              refunded_at: new Date().toISOString(),
            }).eq("id", order.id);
          }
          await reverseReferralRewards(order.id, true);
          await logActivity(
            "commande_litige",
            `Litige PERDU (chargeback) — commande #${numero} — ${amount.toFixed(2)} €`,
            { entity_id: order.id, meta: { dispute_id: dispute.id, payment_intent_id: piId, amount, outcome, customer_email: order.customer_email } },
          );
        } else if (outcome === "won") {
          // Litige GAGNÉ. Idempotent : ne bascule que depuis "litige".
          if (String(order.status ?? "").toLowerCase() === "litige") {
            await supabaseServer.from("orders").update({ status: "litige_gagne" }).eq("id", order.id);
          }
          await logActivity(
            "commande_litige",
            `Litige GAGNÉ — commande #${numero}`,
            { entity_id: order.id, meta: { dispute_id: dispute.id, payment_intent_id: piId, amount, outcome, customer_email: order.customer_email } },
          );
        } else {
          // Autre issue (warning_closed, etc.) → log seulement.
          await logActivity(
            "commande_litige",
            `Litige clôturé (${outcome}) — commande #${numero}`,
            { entity_id: order.id, meta: { dispute_id: dispute.id, payment_intent_id: piId, amount, outcome, customer_email: order.customer_email } },
          );
        }
      } else {
        await logActivity(
          "commande_litige",
          `Litige clôturé (${outcome}, aucune commande associée)`,
          { meta: { dispute_id: dispute.id, payment_intent_id: piId, amount, outcome } },
        );
      }
    } catch (err: any) {
      console.error("❌ charge.dispute.closed handler:", err.message); // non gaté : perte d'état litige doit être visible en prod
    }
  }

  // ── checkout.session.expired — capture des paniers abandonnés post-Stripe ────
  // Filet de sécurité : attrape les abandons où l'email n'a été saisi que dans
  // l'UI Stripe (Apple Pay / Google Pay), jamais dans le champ email du site.
  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      await handleCheckoutExpired(session);
    } catch (err: any) {
      // On ne renvoie pas 500 — l'événement est ack (évite les retries Stripe inutiles).
      console.error("❌ checkout.session.expired handler:", err.message); // non gaté : échec de relance doit être visible en prod
    }
  }

  return new Response("OK", { status: 200 });
}
