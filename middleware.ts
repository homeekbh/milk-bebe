import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── COMING SOON — uniquement sur milkbebe.fr ─────────────────────────────
  const host   = req.headers.get("host") ?? "";
  const isProd = host === "milkbebe.fr" || host === "www.milkbebe.fr";

  if (
    isProd &&
    !pathname.startsWith("/coming-soon") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/favicon") &&
    !pathname.startsWith("/robots") &&
    !pathname.startsWith("/sitemap") &&
    !pathname.startsWith("/images") &&
    pathname !== "/manifest.json"
  ) {
    return NextResponse.redirect(new URL("/coming-soon", req.url));
  }
  // ─────────────────────────────────────────────────────────────────────────

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)).*)" ],
};