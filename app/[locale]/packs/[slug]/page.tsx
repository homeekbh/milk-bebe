import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/server/supabase";
import type { Pack } from "@/components/packs/PackCard";
import PackDetailClient from "./PackDetailClient";
import { getAlternates } from "@/i18n/seo";

export const revalidate = 60;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.milkbebe.fr";
const SELECT = `*, pack_items ( position, product:products ( id, name, slug, price_ttc, image_url, sizes, sizes_stock, stock ) )`;

async function getPack(slug: string): Promise<Pack | null> {
  const { data } = await supabaseServer
    .from("packs").select(SELECT).eq("slug", slug).eq("active", true).maybeSingle();
  if (!data) return null;
  return { ...data, pack_items: (data.pack_items ?? []).sort((a: any, b: any) => a.position - b.position) };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const pack = await getPack(slug);
  if (!pack) return { title: "Pack introuvable | M!LK" };
  return {
    title: `${pack.title} | Packs M!LK`,
    description: pack.description ?? `Le coffret ${pack.title} — essentiels bébé bambou OEKO-TEX M!LK.`,
    alternates: getAlternates(locale, `/packs/${pack.slug}`),
  };
}

export default async function PackDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pack = await getPack(slug);
  if (!pack) notFound();
  return <PackDetailClient pack={pack} />;
}
