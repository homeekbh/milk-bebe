import { supabaseServer } from "@/lib/server/supabase";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return Response.json({ ok: false });

  await supabaseServer
    .from("abandoned_carts")
    .update({ converted: true })
    .eq("email", email.toLowerCase().trim());

  return Response.json({ ok: true });
}