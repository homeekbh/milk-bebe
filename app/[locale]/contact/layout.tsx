import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAlternates } from "@/i18n/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return {
    title:       t("meta_title"),
    description: t("meta_description"),
    openGraph: {
      title:       t("og_title"),
      description: t("og_description"),
    },
    alternates: getAlternates(locale, "/contact"),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
