import type { Metadata } from "next";

// Page de définition d'un nouveau mot de passe (lien tokenisé), sensible et sans valeur SEO.
// noindex : évite l'indexation + le canonical incohérent hérité du layout global (/fr).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NouveauMotDePasseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
