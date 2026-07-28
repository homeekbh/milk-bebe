import { Link } from "@/i18n/navigation";

export type Crumb = {
  label: string;
  href?: string; // dernier item : pas de href (page courante)
  noTranslate?: boolean; // E — protège le libellé de la traduction auto (ex. nom de produit)
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
  padding,
}: {
  items: Crumb[];
  variant?: "light" | "dark";
  /** Override le padding par défaut. Utile quand le breadcrumb est dans un
   *  container avec sa propre marge. */
  padding?: string;
}) {
  const onDark   = variant === "light";
  // Couleurs alignées sur l'ancien fil d'Ariane natif fiche produit :
  // gris doux pour items, foncé pour la page courante, séparateur "/"
  // de la même teinte que les items (pas d'ambre vif).
  const textCol  = onDark ? "rgba(242,237,230,0.45)" : "rgba(26,20,16,0.4)";
  const lastCol  = onDark ? C.warm                    : C.dark;
  const sepCol   = textCol;

  // Toujours commencer par Accueil sauf si déjà présent
  const trail: Crumb[] = items[0]?.href === "/" || items[0]?.label === "Accueil"
    ? items
    : [{ label: "Accueil", href: "/" }, ...items];

  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        padding:    padding ?? "14px clamp(12px,4vw,5vw)",
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
                    fontWeight:     500,
                    textDecoration: "none",
                    transition:     "color 0.15s",
                  }}
                >
                  {c.label}
                </Link>
              ) : (
                <span
                  aria-current="page"
                  translate={c.noTranslate ? "no" : undefined}
                  style={{
                    color:      lastCol,
                    fontWeight: 600,
                  }}
                >
                  {c.label}
                </span>
              )}
              {!isLast && (
                <span aria-hidden="true" style={{ color: sepCol, fontWeight: 500 }}>
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
