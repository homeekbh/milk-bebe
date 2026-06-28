import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { supabaseServer } from "@/lib/server/supabase";
import { getAlternates } from "@/i18n/seo";
import BeholdWidget from "@/components/blog/BeholdWidget";

export const revalidate = 60;

const C = { dark: "#1a1410", amber: "#c49a4a", light: "#ede8df", cream: "#f2ede6", taupe: "#e9e1d4" };

type Post = {
  id: string; slug: string; title: string; excerpt?: string | null; content?: string | null;
  image_url?: string | null; author?: string | null; published_at?: string | null;
  category?: string | null; seo_title?: string | null; seo_description?: string | null;
};

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Journal M!LK" };
  return {
    title: post.seo_title || post.title,
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

  const [recent, html] = await Promise.all([
    getRecent(slug),
    marked.parse(post.content || "", { breaks: true, gfm: true }),
  ]);

  return (
    <div style={{ background: C.light, minHeight: "100vh" }}>
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
          {t("by")} {post.author ?? "Erika"} · {fmtDate(post.published_at, locale)}
        </div>

        {post.image_url && (
          <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: 20, overflow: "hidden", marginBottom: 36, background: C.taupe }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.image_url} alt={post.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        {/* Contenu markdown */}
        <div className="blog-prose" dangerouslySetInnerHTML={{ __html: html as string }} />

        <div style={{ marginTop: 44 }}>
          <Link href="/blog" style={{ display: "inline-block", padding: "13px 26px", borderRadius: 12, background: C.dark, color: C.cream, fontWeight: 900, fontSize: 14, textDecoration: "none" }}>{t("back")}</Link>
        </div>
      </article>

      {/* Articles récents */}
      {recent.length > 0 && (
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 4vw 0" }}>
          <h2 style={{ margin: "0 0 20px", fontSize: "clamp(20px,2.5vw,28px)", fontWeight: 950, letterSpacing: -1, color: C.dark }}>{t("recent")}</h2>
          <div className="blog-recent">
            {recent.map(r => (
              <Link key={r.id} href={`/blog/${r.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                <div style={{ borderRadius: 16, overflow: "hidden", background: C.cream, border: "1px solid rgba(26,20,16,0.1)", height: "100%" }}>
                  <div style={{ position: "relative", aspectRatio: "16/10", background: C.taupe }}>
                    {r.image_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={r.image_url} alt={r.title} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontWeight: 950, color: "rgba(26,20,16,0.15)" }}>M!LK</div>}
                  </div>
                  <div style={{ padding: "14px 16px 16px" }}>
                    {r.category && <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: C.amber, marginBottom: 5 }}>{r.category}</div>}
                    <div style={{ fontWeight: 900, fontSize: 15, color: C.dark, lineHeight: 1.25 }}>{r.title}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Widget Instagram Behold */}
      <BeholdWidget />
    </div>
  );
}
