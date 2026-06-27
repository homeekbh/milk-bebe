import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// ⚠️ PILOTE — PAS de <html>/<body> ici : ils sont fournis par le root layout
// (app/layout.tsx) → providers (Cart/Auth/…), analytics (GTM/GA4/Pixel) et SEO
// restent actifs sur les pages pilotes. NextIntlClientProvider hérite des
// messages/locale depuis i18n/request.ts (pas besoin de prop messages en v4).
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return <NextIntlClientProvider>{children}</NextIntlClientProvider>;
}
