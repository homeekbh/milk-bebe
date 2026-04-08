import { supabaseServer } from "@/lib/server/supabase";

// GET — liste tous les codes ou valide un code
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  // Validation d'un code depuis le panier
  if (code) {
    const { data, error } = await supabaseServer
      .from("promo_codes")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .eq("active", true)
      .single();

    if (error || !data) {
      return Response.json({ error: "Code invalide ou expiré" }, { status: 404 });
    }

    // Vérifie expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return Response.json({ error: "Ce code a expiré" }, { status: 400 });
    }

    // Vérifie max utilisations
    if (data.max_uses !== null && data.uses >= data.max_uses) {
      return Response.json({ error: "Ce code a atteint sa limite d'utilisation" }, { status: 400 });
    }

    return Response.json(data);
  }

  // Liste tous les codes (admin)
  const { data } = await supabaseServer
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });

  return Response.json(data ?? []);
}

// POST — crée un code
export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await supabaseServer
    .from("promo_codes")
    .insert([{
      code:       body.code.toUpperCase().trim(),
      type:       body.type,
      value:      parseFloat(body.value),
      min_order:  parseFloat(body.min_order ?? 0),
      max_uses:   body.max_uses ? parseInt(body.max_uses) : null,
      expires_at: body.expires_at || null,
      active:     true,
    }])
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}

// PUT — modifie (active/désactive ou édite)
export async function PUT(req: Request) {
  const { id, ...rest } = await req.json();
  const { data, error } = await supabaseServer
    .from("promo_codes")
    .update(rest)
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}

// DELETE — supprime un code
export async function DELETE(req: Request) {
  const { id } = await req.json();
  const { error } = await supabaseServer
    .from("promo_codes")
    .delete()
    .eq("id", id);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}