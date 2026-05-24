import { supabaseServer } from "@/lib/server/supabase";

/**
 * GET /api/avis/check?order_id=<uuid>&email=<email>
 *
 * Endpoint léger appelé depuis /avis pour vérifier qu'un lien d'avis est valide
 * avant d'afficher le formulaire. Pas d'auth admin — la vérification se fait via
 * la paire (order_id, email) : seule la personne qui possède l'email rattaché à
 * la commande peut afficher le formulaire.
 *
 * Renvoie :
 *   - 200 { order: { id, customer_email, customer_name, shipping_status, items } }
 *   - 400 { error } si paramètres manquants
 *   - 404 { error } si commande introuvable / email non correspondant
 *   - 403 { error } si commande non encore expédiée
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderId   = searchParams.get("order_id")?.trim() ?? "";
  const emailRaw  = searchParams.get("email")?.trim().toLowerCase() ?? "";

  if (!orderId || !emailRaw) {
    return Response.json({ error: "Paramètres manquants." }, { status: 400 });
  }

  const { data: order, error } = await supabaseServer
    .from("orders")
    .select("id, customer_email, customer_name, shipping_status, items")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    return Response.json({ error: "Commande introuvable." }, { status: 404 });
  }

  if ((order.customer_email ?? "").toLowerCase() !== emailRaw) {
    return Response.json({ error: "L'adresse email ne correspond pas à cette commande." }, { status: 404 });
  }

  if (!["expediee", "livree"].includes(order.shipping_status)) {
    return Response.json(
      { error: "Tu pourras laisser un avis dès que ta commande sera expédiée." },
      { status: 403 }
    );
  }

  return Response.json({ order });
}
