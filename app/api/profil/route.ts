import { supabaseServer } from "@/lib/server/supabase";

async function getUser(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const { data: { user } } = await supabaseServer.auth.getUser(auth.slice(7));
  return user ?? null;
}

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return Response.json({ error: "Non autorisé" }, { status: 401 });

  const { data } = await supabaseServer
    .from("profiles")
    .select("first_name, last_name, phone, newsletter, shipping_address, billing_address, billing_same")
    .eq("id", user.id)
    .single();

  return Response.json({
    email:            user.email ?? "",
    first_name:       data?.first_name       ?? "",
    last_name:        data?.last_name        ?? "",
    phone:            data?.phone            ?? "",
    newsletter:       data?.newsletter       ?? false,
    shipping_address: data?.shipping_address ?? null,
    billing_address:  data?.billing_address  ?? null,
    billing_same:     data?.billing_same     ?? true,
  });
}

export async function PUT(req: Request) {
  const user = await getUser(req);
  if (!user) return Response.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();

  const { error } = await supabaseServer
    .from("profiles")
    .upsert({ id: user.id, ...body }, { onConflict: "id" });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}