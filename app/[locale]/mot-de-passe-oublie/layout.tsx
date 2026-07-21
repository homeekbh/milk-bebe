import type { Metadata } from "next";

// Page utilitaire de réinitialisation (formulaire), sans valeur SEO.
// noindex : évite l'indexation + le canonical incohérent hérité du layout global (/fr).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function MotDePasseOublieLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
