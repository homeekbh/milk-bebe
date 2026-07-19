import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import LivraisonPreviewClient from "./LivraisonPreviewClient";

// Page de DÉMO ISOLÉE (Lot 2) — teste le CountrySelector + l'affichage prix de
// zone sur la preview Vercel, sans toucher au vrai panier. noindex : ne doit pas
// être référencée. Sera retirée/remplacée au lot d'intégration finale.
export const metadata: Metadata = {
  title:   "Livraison internationale — aperçu (test)",
  robots:  { index: false, follow: false },
};

export default async function LivraisonPreviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div style={{ background: "#ede8df", minHeight: "100vh" }}>
      <LivraisonPreviewClient />
    </div>
  );
}
