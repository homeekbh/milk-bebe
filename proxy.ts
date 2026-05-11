import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") ?? "";

  // ── COMING SOON — uniquement sur milkbebe.fr, jamais sur vercel.app ──────
  const isProd   = host === "milkbebe.fr" || host === "www.milkbebe.fr";
  const isVercel = host.includes("vercel.app");

  if (
    isProd &&
    !isVercel &&
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)).*)" ],
};