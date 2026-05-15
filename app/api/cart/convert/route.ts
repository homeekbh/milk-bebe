import { supabaseServer } from "@/lib/server/supabase";

export async function POST(req: Request) {
  // Vérifier que l'appelant est authentifié (webhook Stripe ou utilisateur connecté)
  const auth = req.headers.get("authorization") ?? "";

  if (auth.startsWith("Bearer ")) {
    // Appel depuis le webhook Stripe ou client connecté — valider le token
    const token = auth.slice(7);
    const { data: { user } } = await supabaseServer.auth.getUser(token);

    const { email } = await req.json();
    if (!email) return Response.json({ ok: false });

    // Si user connecté, vérifier que l'email correspond
    if (user && user.email?.toLowerCase() !== email.toLowerCase()) {
      return Response.json({ error: "Non autorisé" }, { status: 403 });
    }

    await supabaseServer
      .from("abandoned_carts")
      .update({ converted: true })
      .eq("email", email.toLowerCase().trim());

    return Response.json({ ok: true });
  }

  // Appel interne depuis webhook Stripe (pas de Bearer) — vérifier CRON_SECRET
  const internalSecret = req.headers.get("x-internal-secret") ?? "";
  if (internalSecret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { email } = await req.json();
  if (!email) return Response.json({ ok: false });

  await supabaseServer
    .from("abandoned_carts")
    .update({ converted: true })
    .eq("email", email.toLowerCase().trim());

  return Response.json({ ok: true });
}