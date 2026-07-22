import type { Metadata } from "next";

// Page transactionnelle atteinte depuis un lien email (?order_id=…&email=…), contenu fin.
// noindex : sinon elle hérite du canonical global (/fr) → canonical incohérent + page utilitaire
// indexée. robots.txt ne fait pas de noindex ; c'est le bon endroit pour l'exprimer.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AvisLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
