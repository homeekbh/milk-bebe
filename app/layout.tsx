import "./globals.css";

// Root layout "passthrough" — il NE rend PAS de <html>/<body>. Ceux-ci sont
// fournis par les layouts enfants : app/[locale]/layout.tsx (routes publiques,
// avec providers + analytics + SEO), app/admin/layout.tsx (admin), et
// app/not-found.tsx (404). On centralise ici l'import du CSS global, qui
// s'applique à tout l'arbre.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
