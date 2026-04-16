import { supabaseServer } from "@/lib/server/supabase";

export async function POST(req: Request) {
  const { action, description, meta, user_email } = await req.json();
  if (!action || !description) return Response.json({ error: "Paramètres manquants" }, { status: 400 });

  const { error } = await supabaseServer.from("admin_logs").insert([{
    action, description, meta: meta ?? null, user_email: user_email ?? null,
  }]);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}