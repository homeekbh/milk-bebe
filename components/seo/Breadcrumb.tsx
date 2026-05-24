import Link from "next/link";

export type Crumb = {
  label: string;
  href?: string; // dernier item : pas de href (page courante)
};

const C = {
  warm:  "#f2ede6",
  amber: "#c49a4a",
  muted: "rgba(242,237,230,0.55)",
  dark:  "#1a1410",
};

/**
 * Fil d'Ariane accessible + SEO.
 * - <nav aria-label="Breadcrumb"> pour les screen readers
 * - Lien Accueil systématique
 * - Dernier item : pas de href (page courante), aria-current="page"
 * - Le schéma BreadcrumbList JSON-LD est géré séparément par chaque page
 *
 * Variant : "light" (fond sombre) ou "dark" (fond clair)
 */
export function Breadcrumb({
  items,
  variant = "light",
}: {
  items: Crumb[];
  variant?: "light" | "dark";
}) {
  const onDark   = variant === "light";
  const textCol  = onDark ? C.muted : "rgba(26,20,16,0.55)";
  const lastCol  = onDark ? C.warm  : C.dark;
  const sepCol   = C.amber;

  // Toujours commencer par Accueil sauf si déjà présent
  const trail: Crumb[] = items[0]?.href === "/" || items[0]?.label === "Accueil"
    ? items
    : [{ label: "Accueil", href: "/" }, ...items];

  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        padding:    "14px clamp(12px,4vw,5vw)",
        fontSize:   13,
        background: "transparent",
      }}
    >
      <ol style={{
        listStyle:  "none",
        margin:     0,
        padding:    0,
        display:    "flex",
        flexWrap:   "wrap",
        alignItems: "center",
        gap:        8,
      }}>
        {trail.map((c, i) => {
          const isLast = i === trail.length - 1;
          return (
            <li key={`${c.label}-${i}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {!isLast && c.href ? (
                <Link
                  href={c.href}
                  style={{
                    color:          textCol,
                    fontWeight:     700,
                    textDecoration: "none",
                    transition:     "color 0.15s",
                  }}
                >
                  {c.label}
                </Link>
              ) : (
                <span
                  aria-current="page"
                  style={{
                    color:      lastCol,
                    fontWeight: 800,
                  }}
                >
                  {c.label}
                </span>
              )}
              {!isLast && (
                <span aria-hidden="true" style={{ color: sepCol, fontWeight: 900 }}>
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
