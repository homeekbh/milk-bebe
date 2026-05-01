import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { action, description, meta, user_email } = await req.json();
  if (!action || !description) return Response.json({ error: "Paramètres manquants" }, { status: 400 });

  const { error } = await supabaseServer.from("admin_logs").insert([{
    action, description, meta: meta ?? null, user_email: user_email ?? null,
  }]);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}