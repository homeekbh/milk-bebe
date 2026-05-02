import { createClient } from "@supabase/supabase-js";
import { NextResponse }  from "next/server";
import type { NextRequest } from "next/server";

type AdminAuthResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Extrait le token depuis le header Authorization (Bearer) OU depuis le cookie Supabase
function extractToken(req: NextRequest): string | null {
  // 1. Bearer token (API calls avec Authorization header)
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // 2. Cookie Supabase (appels depuis le navigateur sans header explicit)
  const cookieHeader = req.headers.get("cookie") ?? "";
  const tokenMatch   = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/);
  const rawToken     = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
  if (!rawToken) return null;

  try {
    const parsed = JSON.parse(rawToken);
    return parsed.access_token ?? parsed[0]?.access_token ?? null;
  } catch {
    return rawToken;
  }
}

export async function requireAdmin(req: NextRequest): Promise<AdminAuthResult> {
  const supabase    = getSupabase();
  const accessToken = extractToken(req);

  if (!accessToken) {
    return { ok: false, response: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return { ok: false, response: NextResponse.json({ error: "Token invalide" }, { status: 401 }) };
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