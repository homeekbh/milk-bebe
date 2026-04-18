import { createClient } from "@supabase/supabase-js";
import { NextResponse }  from "next/server";
import type { NextRequest } from "next/server";

type AdminAuthResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

export async function requireAdmin(req: NextRequest): Promise<AdminAuthResult> {
  const cookieHeader = req.headers.get("cookie") ?? "";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Extraire le token JWT du cookie Supabase
  const tokenMatch = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/);
  const rawToken   = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;

  if (!rawToken) {
    return { ok: false, response: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  }

  let accessToken = "";
  try {
    const parsed = JSON.parse(rawToken);
    accessToken  = parsed.access_token ?? parsed[0]?.access_token ?? "";
  } catch {
    accessToken = rawToken;
  }

  if (!accessToken) {
    return { ok: false, response: NextResponse.json({ error: "Token invalide" }, { status: 401 }) };
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return { ok: false, response: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { ok: false, response: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  }

  return { ok: true };
}