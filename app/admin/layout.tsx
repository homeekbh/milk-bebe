import type { Metadata } from "next";
import AdminShell from "./AdminShell";

// L'admin vit hors du routing [locale] : il possède son propre shell
// <html>/<body> et n'utilise AUCUN provider public (vérifié). noindex.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
