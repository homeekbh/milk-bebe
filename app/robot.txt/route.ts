export function GET() {
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /profil

Sitemap: ${process.env.NEXT_PUBLIC_BASE_URL ?? "https://milk-bebe.vercel.app"}/sitemap.xml`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain" },
  });
}