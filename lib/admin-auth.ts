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

// Extrait le JWT depuis toutes les sources possibles
function extractToken(req: NextRequest): string | null {
  // 1. Bearer token header (le plus fiable)
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);

  // 2. Cookies Supabase — plusieurs formats selon la version du SDK
  const cookieHeader = req.headers.get("cookie") ?? "";
  if (!cookieHeader) return null;

  // Format Supabase v2+ : sb-[ref]-auth-token
  const matches = cookieHeader.match(/sb-[^=]+-auth-token(?:\.\d+)?=([^;]+)/g) ?? [];
  for (const match of matches) {
    const val = decodeURIComponent(match.split("=").slice(1).join("="));
    try {
      const parsed = JSON.parse(val);
      const token  = parsed.access_token ?? parsed[0]?.access_token;
      if (token) return token;
    } catch {
      // Peut être un JWT direct
      if (val.startsWith("eyJ")) return val;
    }
  }

  // Format alternatif : supabase-auth-token
  const legacy = cookieHeader.match(/supabase-auth-token=([^;]+)/);
  if (legacy) {
    try {
      const parsed = JSON.parse(decodeURIComponent(legacy[1]));
      return parsed[0] ?? null;
    } catch {}
  }

  return null;
}

export async function requireAdmin(req: NextRequest): Promise<AdminAuthResult> {
  const supabase    = getSupabase();
  const accessToken = extractToken(req);

  if (!accessToken) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Token invalide" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Accès refusé" }, { status: 403 }),
    };
  }

  return { ok: true };
}