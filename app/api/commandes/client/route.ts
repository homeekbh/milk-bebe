import { supabaseServer } from "@/lib/server/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email) return Response.json({ error: "Email manquant" }, { status: 400 });

  // Vérifier que l'utilisateur connecté correspond à l'email demandé
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const { data: { user } } = await supabaseServer.auth.getUser(token);
    // Si token valide mais email différent → refuser
    if (user && user.email?.toLowerCase() !== email.toLowerCase()) {
      return Response.json({ error: "Accès non autorisé" }, { status: 403 });
    }
  }

  const { data, error } = await supabaseServer
    .from("orders")
    .select("id, created_at, amount_total, status, shipping_status, items, shipping_address, tracking_number")
    .eq("customer_email", email.toLowerCase().trim())
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}