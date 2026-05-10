import { supabaseServer } from "@/lib/server/supabase";
import { requireAdmin }   from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { type, message, entity_name, entity_id, user_email, meta } = await req.json();
  if (!type || !message) return Response.json({ error: "Paramètres manquants" }, { status: 400 });

  const { error } = await supabaseServer.from("activity_log").insert([{
    type, message, entity_name: entity_name ?? null,
    entity_id: entity_id ?? null, user_email: user_email ?? null,
    meta: meta ?? null,
  }]);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const url    = new URL(req.url);
  const limit  = parseInt(url.searchParams.get("limit") ?? "100");
  const offset = parseInt(url.searchParams.get("offset") ?? "0");
  const type   = url.searchParams.get("type");

  let query = supabaseServer
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) query = query.eq("type", type) as any;

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}