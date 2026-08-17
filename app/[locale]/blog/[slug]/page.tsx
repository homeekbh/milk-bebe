import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { marked } from "marked";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { supabaseServer } from "@/lib/server/supabase";
import { getAlternates } from "@/i18n/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import BeholdWidget from "@/components/blog/BeholdWidget";

export const revalidate = 3600;

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

const C = { dark: "#1a1410", amber: "#c49a4a", light: "#ede8df", cream: "#f2ede6", taupe: "#e9e1d4" };

// Réduit une URL d'image blog pointant vers NOTRE domaine (milkbebe.fr) en
// chemin relatif → next/image la traite comme image LOCALE (optimisée, sans
// remotePattern). Retourne null si l'URL ne matche pas (host externe / autre)
// → l'appelant retombe sur <img>, pour ne pas casser un futur article à image
// externe non whitelistée (que next/image refuserait).
function localBlogImage(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return url; // déjà relatif
  const m = url.match(/^https?:\/\/(?:www\.)?milkbebe\.fr(\/.*)$/i);
  return m ? m[1] : null;
}

type Post = {
  id: string; slug: string; title: string; excerpt?: string | null; content?: string | null;
  image_url?: string | null; author?: string | null; published_at?: string | null;
  updated_at?: string | null;
  category?: string | null; seo_title?: string | null; seo_description?: string | null;
};

// Mappe un article vers la catégorie produit pertinente (maillage interne).
// Heuristique par mots-clés du slug + catégorie de l'article. null ⇒ /produits.
function relatedCategory(post: Post): string | null {
  const s = `${post.slug} ${post.category ?? ""}`.toLowerCase();
  if (s.includes("pyjama")) return "pyjamas";
  if (s.includes("body")) return "bodies";
  if (s.includes("gigoteuse") || s.includes("turbulette")) return "gigoteuses";
  if (s.includes("lange") || s.includes("emmaillot") || s.includes("swaddle")) return "langes";
  if (s.includes("bonnet") || s.includes("bandeau")) return "accessoires";
  return null;
}

async function getPost(slug: string): Promise<Post | null> {
  try {
    const { data } = await supabaseServer
      .from("blog_posts").select("*")
      .eq("slug", slug).eq("status", "published").maybeSingle();
    return (data as Post) ?? null;
  } catch { return null; }
}

async function getRecent(excludeSlug: string): Promise<Post[]> {
  try {
    const { data } = await supabaseServer
      .from("blog_posts")
      .select("id, slug, title, image_url, category, published_at")
      .eq("status", "published")
      .neq("slug", excludeSlug)
      .order("published_at", { ascending: false })
      .limit(3);
    return (data ?? []) as Post[];
  } catch { return []; }
}

function fmtDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch { return ""; }
}

// Retire un suffixe/marque "M!LK" déjà présent dans un title : le template
// "%s | M!LK" du layout racine l'ajoute une seule fois → évite "… | M!LK | M!LK".
function deBrand(s: string): string {
  return s.replace(/\s*[|—-]?\s*M!LK\s*[|—-]?\s*/gi, " ").replace(/\s+/g, " ").trim();
}

// Extrait la FAQ markdown d'un article ("## Questions fréquentes" suivi de
// paragraphes "**Question ?** Réponse") pour émettre un FAQPage JSON-LD réutilisable.
// Les liens markdown du texte de réponse sont remplacés par leur libellé.
function extractFaq(md: string): { q: string; a: string }[] {
  const m = md.match(/##\s*Questions fréquentes\s*([\s\S]*?)(?:\n##\s|$)/i);
  if (!m) return [];
  const out: { q: string; a: string }[] = [];
  const re = /\*\*(.+?)\*\*[ \t]*([^\n]*)/g;
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(m[1])) !== null) {
    const q = mm[1].trim();
    const a = mm[2].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
    if (q && a) out.push({ q, a });
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Journal" };
  return {
    title: deBrand(post.seo_title || post.title),
    description: post.seo_description || post.excerpt || undefined,
    alternates: getAlternates(locale, `/blog/${slug}`),
    openGraph: post.image_url ? { images: [{ url: post.image_url }], type: "article" } : undefined,
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "blog" });

  const post = await getPost(slug);
  if (!post) notFound();

  const [recent, rawHtml] = await Promise.all([
    getRecent(slug),
    marked.parse(post.content || "", { breaks: true, gfm: true }),
  ]);
  // ⚠️ SANITISATION AU RENDU RETIRÉE le 01/08/2026 — jsdom casse en serverless.
  // isomorphic-dompurify charge jsdom, dont une dépendance (html-encoding-sniffer) fait un require()
  // CommonJS sur un module devenu ESM pur (@exodus/bytes) → ERR_REQUIRE_ESM à CHAQUE rendu en
  // production (le build passe et le rendu local est en 200 car le Node local diffère). Externaliser
  // le paquet ne répare PAS un require() incompatible : la seule issue est de ne plus exécuter jsdom
  // au rendu. On rend donc directement la sortie de marked.parse().
  //
  // CHOIX CONSCIENT DE SÉCURITÉ : le contenu blog provient EXCLUSIVEMENT de l'admin protégé, où seule
  // Erika écrit. On fait confiance à cette source ; marked.parse suffit à produire le HTML.
  //
  // ⚠️ SI un jour le contenu blog devient éditable par un tiers, OU importable depuis une source
  // externe (flux, API publique, migration), il FAUDRA sanitiser À L'ÉCRITURE (avant insertion en
  // base) — surtout PAS re-brancher un sanitizer jsdom ici au rendu.
  const html = rawHtml as string;

  const canonical = `${BASE}/${locale}/blog/${post.slug}`;
  const blogPostingLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: (post.seo_title || post.title || "").slice(0, 110),
    ...(post.image_url ? { image: [post.image_url] } : {}),
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at || post.published_at || undefined,
    author: { "@type": "Organization", name: post.author || "M!LK", url: `${BASE}/${locale}` },
    publisher: {
      "@type": "Organization",
      name: "M!LK",
      logo: { "@type": "ImageObject", url: `${BASE}/logo-milk-white.png`, width: "193", height: "113" },
    },
    description: post.seo_description || post.excerpt || undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    url: canonical,
    inLanguage: locale,
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("breadcrumb_home"), item: `${BASE}/${locale}` },
      { "@type": "ListItem", position: 2, name: t("breadcrumb_blog"), item: `${BASE}/${locale}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: canonical },
    ],
  };

  const relatedCat = relatedCategory(post);
  const heroImg = localBlogImage(post.image_url);

  // FAQPage JSON-LD si l'article contient une section "## Questions fréquentes".
  const faqItems = extractFaq(post.content || "");
  const faqLd = faqItems.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;

  return (
    <div style={{ background: C.light, minHeight: "100vh" }}>
      <JsonLd data={faqLd ? [blogPostingLd, breadcrumbLd, faqLd] : [blogPostingLd, breadcrumbLd]} />
      <style>{`
        .blog-prose { font-size:clamp(16px,1.3vw,18px); line-height:1.8; color:rgba(26,20,16,0.82); }
        .blog-prose h2 { font-size:clamp(22px,2.6vw,30px); font-weight:950; letter-spacing:-0.8px; color:${C.dark}; margin:38px 0 14px; line-height:1.2; }
        .blog-prose h3 { font-size:clamp(18px,2vw,22px); font-weight:900; color:${C.dark}; margin:28px 0 10px; }
        .blog-prose p { margin:0 0 18px; }
        .blog-prose ul, .blog-prose ol { margin:0 0 18px; padding-left:24px; }
        .blog-prose li { margin:0 0 8px; }
        .blog-prose a { color:${C.amber}; font-weight:700; }
        .blog-prose strong { color:${C.dark}; font-weight:800; }
        .blog-prose blockquote { margin:24px 0; padding:14px 20px; border-left:3px solid ${C.amber}; background:rgba(196,154,74,0.08); border-radius:0 10px 10px 0; font-style:italic; }
        .blog-recent { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        @media(max-width:760px){ .blog-recent{ grid-template-columns:1fr!important; } }
      `}</style>

      <article style={{ maxWidth: 760, margin: "0 auto", padding: "100px 4vw 24px" }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: 13, fontWeight: 700, color: "rgba(26,20,16,0.45)", marginBottom: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>{t("breadcrumb_home")}</Link>
          <span>›</span>
          <Link href="/blog" style={{ color: "inherit", textDecoration: "none" }}>{t("breadcrumb_blog")}</Link>
          <span>›</span>
          <span style={{ color: C.dark }}>{post.title}</span>
        </nav>

        {post.category && (
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: C.amber, marginBottom: 12 }}>{post.category}</div>
        )}
        <h1 style={{ margin: "0 0 14px", fontSize: "clamp(28px,4.5vw,46px)", fontWeight: 950, letterSpacing: -1.6, color: C.dark, lineHeight: 1.05 }}>{post.title}</h1>
        <div style={{ fontSize: 14, color: "rgba(26,20,16,0.5)", fontWeight: 600, marginBottom: 28 }}>
          {t("by")} {post.author ?? "Erika"}
          {post.published_at && (
            <> · <time dateTime={post.published_at}>{fmtDate(post.published_at, locale)}</time></>
          )}
        </div>

        {post.image_url && (
          <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: 20, overflow: "hidden", marginBottom: 36, background: C.taupe }}>
            {heroImg
              ? <Image src={heroImg} alt={post.title} fill sizes="(max-width:800px) 92vw, 760px" style={{ objectFit: "cover" }} priority />
              : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.image_url} alt={post.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              )}
          </div>
        )}

        {/* Contenu markdown */}
        <div className="blog-prose" dangerouslySetInnerHTML={{ __html: html }} />

        <div style={{ marginTop: 44 }}>
          <Link href="/blog" style={{ display: "inline-block", padding: "13px 26px", borderRadius: 12, background: C.dark, color: C.cream, fontWeight: 900, fontSize: 14, textDecoration: "none" }}>{t("back")}</Link>
        </div>
      </article>

      {/* Produits liés (maillage interne) — structure : lien vers la catégorie
          produit pertinente. Labels via i18n (à valider/ajuster par Erika). */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "8px 4vw 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: "22px 24px", borderRadius: 16, background: C.cream, border: "1px solid rgba(26,20,16,0.1)" }}>
          <span style={{ fontSize: "clamp(16px,2vw,20px)", fontWeight: 950, letterSpacing: -0.5, color: C.dark }}>{t("related_title")}</span>
          <Link href={relatedCat ? `/categorie/${relatedCat}` : "/produits"}
            style={{ display: "inline-block", padding: "12px 24px", borderRadius: 12, background: C.amber, color: C.dark, fontWeight: 900, fontSize: 14, textDecoration: "none", whiteSpace: "nowrap" }}>
            {t("related_cta")}
          </Link>
        </div>
      </div>

      {/* Articles récents */}
      {recent.length > 0 && (
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 4vw 0" }}>
          <h2 style={{ margin: "0 0 20px", fontSize: "clamp(20px,2.5vw,28px)", fontWeight: 950, letterSpacing: -1, color: C.dark }}>{t("recent")}</h2>
          <div className="blog-recent">
            {recent.map(r => {
              const rImg = localBlogImage(r.image_url);
              return (
                <Link key={r.id} href={`/blog/${r.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                  <div style={{ borderRadius: 16, overflow: "hidden", background: C.cream, border: "1px solid rgba(26,20,16,0.1)", height: "100%" }}>
                    <div style={{ position: "relative", aspectRatio: "16/10", background: C.taupe }}>
                      {r.image_url
                        ? (rImg
                            ? <Image src={rImg} alt={r.title} fill sizes="(max-width:760px) 92vw, 340px" style={{ objectFit: "cover" }} />
                            : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={r.image_url} alt={r.title} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                            ))
                        : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontWeight: 950, color: "rgba(26,20,16,0.15)" }}>M!LK</div>}
                    </div>
                    <div style={{ padding: "14px 16px 16px" }}>
                      {r.category && <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: C.amber, marginBottom: 5 }}>{r.category}</div>}
                      <div style={{ fontWeight: 900, fontSize: 15, color: C.dark, lineHeight: 1.25 }}>{r.title}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Widget Instagram Behold */}
      <BeholdWidget />
    </div>
  );
}
