import type { Metadata } from "next";

// Page de désabonnement atteinte depuis un lien email tokenisé, sans valeur SEO.
// noindex : évite l'indexation + le canonical incohérent hérité du layout global (/fr).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DesabonnementLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
