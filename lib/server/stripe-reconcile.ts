import Stripe from "stripe";
import { supabaseServer } from "@/lib/server/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export type StripeGap = {
  session_id: string;
  amount: number;      // euros (amount_total / 100)
  currency: string;    // ex. "EUR"
  created: number;     // epoch secondes (création de la session Stripe)
  email: string | null;
};

export type ReconcileResult = {
  windowHours: number;
  checkedPaid: number; // nb de sessions PAYÉES contrôlées (dénominateur)
  gaps: StripeGap[];   // payées SANS ligne orders correspondante
};

/**
 * Détecte les Checkout Sessions Stripe PAYÉES qui n'ont AUCUNE ligne `orders`
 * correspondante — le SEUL signe observable d'un webhook réellement tombé.
 *
 * Rappel du raisonnement (cf. commit « tuile à préparer ») : l'existence d'une
 * ligne orders prouve déjà que handleUnifiedOrder a tourné ; un vrai échec se
 * traduit par une ABSENCE de ligne, invisible depuis la base. Seule une
 * comparaison avec Stripe peut le voir.
 *
 * @param windowHours fenêtre de recherche (large : rattrape un échec de la veille
 *                    même si le cron a sauté).
 * @param graceMinutes on n'alerte PAS sur une session trop récente : le webhook
 *                    peut atterrir quelques secondes/minutes après le paiement.
 *                    Heuristique sur `created` (pas de paid_at sur l'objet list
 *                    sans expand du payment_intent) — largement suffisante : le
 *                    webhook est quasi instantané, un cas « payé à l'instant sur
 *                    une vieille session » se résorbe au rafraîchissement suivant.
 * @throws si Stripe OU Supabase échoue — l'appelant DOIT gérer (pas de catch
 *         silencieux : politique du dépôt). Le cron logge + Sentry + results ;
 *         l'accueil isole dans son propre try/catch (n'affiche pas le bandeau).
 */
export async function findPaidSessionsMissingOrders(
  windowHours = 48,
  graceMinutes = 15,
): Promise<ReconcileResult> {
  const nowSec   = Math.floor(Date.now() / 1000);
  const gteSec   = nowSec - windowHours * 3600;
  const cutoffSec = nowSec - graceMinutes * 60;

  // 1. Sessions Stripe sur la fenêtre — pagination COMPLÈTE (ne pas supposer une seule page).
  const paid: Stripe.Checkout.Session[] = [];
  let startingAfter: string | undefined;
  // Borne dure : garde-fou contre une boucle infinie si l'API renvoyait toujours has_more.
  for (let page = 0; page < 50; page++) {
    const params: Stripe.Checkout.SessionListParams = { created: { gte: gteSec }, limit: 100 };
    if (startingAfter) params.starting_after = startingAfter;
    const res = await stripe.checkout.sessions.list(params);
    for (const s of res.data) {
      if (s.payment_status === "paid" && s.created <= cutoffSec) paid.push(s);
    }
    if (!res.has_more || res.data.length === 0) break;
    startingAfter = res.data[res.data.length - 1].id;
  }

  if (paid.length === 0) return { windowHours, checkedPaid: 0, gaps: [] };

  // 2. stripe_session_id présents en base sur la même fenêtre, ÉLARGIE de 2 h : une session
  //    au bord des 48 h peut avoir sa ligne orders créée juste après la borne.
  const ordersSinceISO = new Date((gteSec - 2 * 3600) * 1000).toISOString();
  const { data: rows, error } = await supabaseServer
    .from("orders")
    .select("stripe_session_id")
    .gte("created_at", ordersSinceISO)
    .not("stripe_session_id", "is", null);
  if (error) throw new Error(`reconcile: lecture orders échouée — ${error.message}`);
  const known = new Set((rows ?? []).map(r => r.stripe_session_id as string));

  // 3. Sessions payées absentes de la base = trous.
  const gaps: StripeGap[] = paid
    .filter(s => !known.has(s.id))
    .map(s => ({
      session_id: s.id,
      amount: (s.amount_total ?? 0) / 100,
      currency: (s.currency ?? "eur").toUpperCase(),
      created: s.created,
      email: s.customer_details?.email ?? s.customer_email ?? null,
    }));

  return { windowHours, checkedPaid: paid.length, gaps };
}
