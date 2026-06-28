import type { Metadata } from "next";
import { supabaseServer } from "@/lib/server/supabase";
import PackCard, { type Pack } from "@/components/packs/PackCard";
import { getAlternates } from "@/i18n/seo";

export const revalidate = 60;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
  title: "Nos packs | M!LK",
  description:
    "Coffrets et packs M!LK : nos essentiels bébé bambou OEKO-TEX réunis à prix doux. Parfait pour une liste de naissance ou un cadeau.",
  alternates: getAlternates(locale, "/packs"),
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
          <h1 style={{ margin: "0 0 10px", fontSize: "clamp(28px,5vw,52px)", fontWeight: 950, letterSpacing: -2, color: C.dark, lineHeight: 1 }}>Nos packs</h1>
          <p style={{ margin: 0, fontSize: "clamp(14px,1.5vw,16px)", color: "rgba(26,20,16,0.55)", lineHeight: 1.6 }}>
            Nos essentiels réunis à prix doux — parfait pour une liste de naissance ou un cadeau 🎁
          </p>
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
