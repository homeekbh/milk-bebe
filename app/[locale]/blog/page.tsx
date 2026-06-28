import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { supabaseServer } from "@/lib/server/supabase";
import { getAlternates } from "@/i18n/seo";
import BeholdWidget from "@/components/blog/BeholdWidget";

export const revalidate = 60;

const C = { dark: "#1a1410", amber: "#c49a4a", light: "#ede8df", cream: "#f2ede6", taupe: "#e9e1d4" };

type Post = {
  id: string; slug: string; title: string; excerpt?: string | null;
  image_url?: string | null; author?: string | null;
  published_at?: string | null; category?: string | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: getAlternates(locale, "/blog"),
  };
}

async function getPosts(): Promise<Post[]> {
  try {
    const { data, error } = await supabaseServer
      .from("blog_posts")
      .select("id, slug, title, excerpt, image_url, author, published_at, category")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as Post[];
  } catch {
    return [];
  }
}

function fmtDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch { return ""; }
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "blog" });
  const posts = await getPosts();

  return (
    <div style={{ background: C.light, minHeight: "100vh" }}>
      <style>{`
        .blog-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:28px; }
        @media(max-width:760px){ .blog-grid{ grid-template-columns:1fr!important; gap:18px; } }
        .blog-card:hover { transform:translateY(-5px); box-shadow:0 24px 48px rgba(26,20,16,0.16); border-color:${C.amber}; }
        .blog-card:hover .blog-card-img { transform:scale(1.05); }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "120px 4vw 40px" }}>
        {/* En-tête */}
        <div style={{ marginBottom: 44 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 12 }}>M!LK</div>
          <h1 style={{ margin: "0 0 12px", fontSize: "clamp(30px,5vw,54px)", fontWeight: 950, letterSpacing: -2, color: C.dark, lineHeight: 1 }}>{t("title")}</h1>
          <p style={{ margin: 0, fontSize: "clamp(15px,1.6vw,18px)", color: "rgba(26,20,16,0.55)", lineHeight: 1.6, maxWidth: 620 }}>{t("subtitle")}</p>
        </div>

        {/* Liste */}
        {posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px", background: C.cream, borderRadius: 20, border: "1px solid rgba(26,20,16,0.1)" }}>
            <div style={{ fontSize: 20, fontWeight: 950, color: C.dark }}>{t("empty")}</div>
          </div>
        ) : (
          <div className="blog-grid">
            {posts.map(p => (
              <Link key={p.id} href={`/blog/${p.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                <article className="blog-card" style={{ borderRadius: 20, overflow: "hidden", background: C.cream, border: "1px solid rgba(26,20,16,0.1)", boxShadow: "0 6px 24px rgba(26,20,16,0.08)", transition: "all 0.28s cubic-bezier(0.22,1,0.36,1)", height: "100%", display: "flex", flexDirection: "column" }}>
                  <div style={{ position: "relative", aspectRatio: "16/10", background: C.taupe, overflow: "hidden" }}>
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.title} loading="lazy" className="blog-card-img" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s ease" }} />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontWeight: 950, fontSize: 28, color: "rgba(26,20,16,0.15)" }}>M!LK</div>
                    )}
                    {p.category && (
                      <span style={{ position: "absolute", top: 14, left: 14, padding: "5px 12px", borderRadius: 99, background: "rgba(26,20,16,0.85)", color: C.amber, fontSize: 11, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase" }}>{p.category}</span>
                    )}
                  </div>
                  <div style={{ padding: "20px 22px 22px", display: "flex", flexDirection: "column", flex: 1 }}>
                    <h2 style={{ margin: "0 0 8px", fontSize: "clamp(18px,2vw,22px)", fontWeight: 950, letterSpacing: -0.6, color: C.dark, lineHeight: 1.2 }}>{p.title}</h2>
                    {p.excerpt && <p style={{ margin: "0 0 14px", fontSize: 14, color: "rgba(26,20,16,0.6)", lineHeight: 1.6, flex: 1 }}>{p.excerpt}</p>}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                      <span style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", fontWeight: 600 }}>
                        {t("by")} {p.author ?? "Erika"} · {fmtDate(p.published_at, locale)}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 900, color: C.amber }}>{t("read")}</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Widget Instagram Behold */}
      <BeholdWidget />
    </div>
  );
}
