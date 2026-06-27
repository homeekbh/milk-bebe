import type { Metadata } from "next";

// La page coming-soon est "use client" → le noindex passe par ce layout server.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ComingSoonLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
