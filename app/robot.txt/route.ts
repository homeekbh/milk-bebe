export async function GET() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

  const body = `User-agent: *
Allow: /

# Bloquer l'admin
Disallow: /admin
Disallow: /api/

# Sitemap
Sitemap: ${base}/sitemap.xml
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain" },
  });
}