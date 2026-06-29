import type { Metadata } from "next";
import { supabaseServer } from "@/lib/server/supabase";
import PackCard, { type Pack } from "@/components/packs/PackCard";
import { getAlternates } from "@/i18n/seo";
import { Link } from "@/i18n/navigation";

export const revalidate = 60;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
  // Title fourni "… | Cadeau bébé | M!LK" : on retire " | M!LK" (le template du
  // layout l'ajoute) → rendu "Coffrets de naissance bambou | Cadeau bébé | M!LK".
  title: "Coffrets de naissance bambou | Cadeau bébé",
  description:
    "Coffrets de naissance en bambou OEKO-TEX : le cadeau bébé qui sert vraiment. Doux, unisexe, emballé avec soin. Livraison offerte dès 60€.",
  alternates: getAlternates(locale, "/packs"),
  openGraph: {
    type:        "website",
    url:         `${BASE_URL}/${locale}/packs`,
    siteName:    "M!LK",
    title:       "Coffrets de naissance en bambou — M!LK",
    description: "Coffrets de naissance en bambou OEKO-TEX : le cadeau bébé qui sert vraiment. Doux, unisexe, emballé avec soin. Livraison offerte dès 60€.",
    images:      [{ url: `${BASE_URL}/images/og/milk-og-homepage.jpg`, width: 1200, height: 630 }],
  },
  };
}

const C = { dark: "#1a1410", amber: "#c49a4a", light: "#ede8df", cream: "#f2ede6" };

async function getPacks(): Promise<Pack[]> {
  const { data } = await supabaseServer
    .from("packs")
    .select(`*, pack_items ( position, product:products ( id, name, slug, price_ttc, image_url, sizes, sizes_stock, stock ) )`)
    .eq("active", true)
    .order("created_at", { ascending: false });
  return (data ?? []).map((p: any) => ({
    ...p,
    pack_items: (p.pack_items ?? []).sort((a: any, b: any) => a.position - b.position),
  }));
}

export default async function PacksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const packs = await getPacks();

  return (
    <div style={{ background: C.light, minHeight: "100vh" }}>
      <div style={{ padding: "120px 4vw 80px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 10 }}>Coffrets M!LK</div>
          <h1 style={{ margin: "0 0 14px", fontSize: "clamp(28px,5vw,52px)", fontWeight: 950, letterSpacing: -2, color: C.dark, lineHeight: 1 }}>Coffrets de naissance en bambou</h1>
          <p style={{ margin: 0, fontSize: "clamp(14px,1.5vw,16px)", color: "rgba(26,20,16,0.6)", lineHeight: 1.7, maxWidth: 680 }}>
            Un cadeau de naissance, ça devrait servir. Pas finir au fond d&apos;un tiroir. Nos coffrets réunissent les essentiels que les parents utilisent vraiment — bodies, pyjamas, accessoires — en bambou doux et certifié, dans des combos pensés pour la naissance. Unisexe, sans superflu, emballé avec soin.
          </p>
          {/* Maillage interne — parcourir par catégorie */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
            {[
              { label: "Bodies",      href: "/categorie/bodies" },
              { label: "Pyjamas",     href: "/categorie/pyjamas" },
              { label: "Gigoteuses",  href: "/categorie/gigoteuses" },
              { label: "Langes",      href: "/categorie/langes" },
              { label: "Accessoires", href: "/categorie/accessoires" },
            ].map(l => (
              <Link key={l.href} href={l.href} style={{ padding: "8px 16px", borderRadius: 99, background: C.cream, border: "1px solid rgba(26,20,16,0.1)", color: C.dark, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>{l.label}</Link>
            ))}
          </div>
        </div>

        {packs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px", background: C.cream, borderRadius: 20, border: "1px solid rgba(26,20,16,0.1)" }}>
            <div style={{ fontSize: 22, fontWeight: 950, color: C.dark, marginBottom: 8 }}>Bientôt disponible</div>
            <div style={{ fontSize: 15, color: "rgba(26,20,16,0.5)" }}>Nos coffrets arrivent très vite — reviens vite !</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
            {packs.map(pack => <PackCard key={pack.id} pack={pack} locale={locale} />)}
          </div>
        )}
      </div>
    </div>
  );
}
