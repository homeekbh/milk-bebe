import type { Metadata } from "next";

// /profil est une page privée (compte client) qui s'est retrouvée INDEXÉE par
// Google malgré le Disallow robots.txt (cas classique "disallowed-but-indexed").
// robots.txt ne fait PAS de noindex. Le bon fix RGPD = <meta robots noindex> ici
// + retrait de /profil du Disallow (robot.ts) pour que Googlebot puisse crawler
// la page, voir le noindex, et la DÉSINDEXER. La page reste sous auth : Googlebot
// n'obtient que le shell, jamais les données personnelles (chargées client-side).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ProfilLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
