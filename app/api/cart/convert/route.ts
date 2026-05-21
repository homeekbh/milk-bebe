import { supabaseServer } from "@/lib/server/supabase";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  const token = auth.slice(7);
  const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
  if (authError || !user) {
    return Response.json({ error: "Token invalide" }, { status: 401 });
  }

  const { email } = await req.json();
  if (!email) return Response.json({ ok: false });

  if (user.email?.toLowerCase() !== String(email).toLowerCase()) {
    return Response.json({ error: "Email non autorisé" }, { status: 403 });
  }

  await supabaseServer
    .from("abandoned_carts")
    .update({ converted: true })
    .eq("email", String(email).toLowerCase().trim());

  return Response.json({ ok: true });
}
