import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  // Laisser passer la page de login admin
  if (req.nextUrl.pathname === "/admin/login") return NextResponse.next();

  // Laisser passer les routes API
  if (req.nextUrl.pathname.startsWith("/api")) return NextResponse.next();

  // Pour les routes admin — vérifier qu'un cookie Supabase existe
  if (req.nextUrl.pathname.startsWith("/admin")) {
    const cookies     = req.cookies.getAll();
    const hasSession  = cookies.some(c =>
      c.name.includes("auth-token") || c.name.includes("sb-")
    );

    if (!hasSession) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};