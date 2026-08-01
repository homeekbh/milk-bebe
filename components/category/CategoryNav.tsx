"use client";

// components/category/CategoryNav.tsx — COMPOSANT UNIQUE de navigation par catégories (Lot 4).
//
// Remplace et absorbe : le tableau CATS codé en dur du Header (drawer mobile) ET l'ancien
// components/category/CategoryPills.tsx (orphelin, supprimé). Une SEULE source de vérité :
//   - ordre + dédup      → lib/categories-nav (orderCategorySlugs / CATEGORY_ORDER)
//   - libellés localisés → i18n (catalog.cat_*) + fallback slug capitalisé
//   - icônes             → ci-dessous (déplacées du Header) ; fallback neutre si absente
//
// La LISTE des slugs est fournie par l'appelant (dérivée des produits publiés → jamais de
// catégorie vide). Le composant sait rendre deux formes : `row` (rangée horizontale, barre) et
// `list` (liste verticale, drawer / menu déroulant).

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { orderCategorySlugs } from "@/lib/categories-nav";
import { capitalizeSlug } from "@/lib/category-labels";

/* ── Icônes catégories (source unique — déplacées de Header.tsx) ─────────────── */
function BodiesIcon({ c }: { c: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3c-1.5 0-2.5.8-2.5 2v1H7L5 8v4h2v8h10v-8h2V8l-2-2h-2.5V5c0-1.2-1-2-2.5-2Z" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/></svg>;
}
function PyjamaIcon({ c }: { c: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M8 3h8M8 3C6 3 5 4.5 5 6v16h14V6c0-1.5-1-3-3-3" stroke={c} strokeWidth="1.6" strokeLinecap="round"/><path d="M9 3v4l3 2 3-2V3" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/></svg>;
}
function GigoteuseIcon({ c }: { c: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3c-3.5 0-6 2-6 5v8c0 2.5 2.5 5 6 5s6-2.5 6-5V8c0-3-2.5-5-6-5Z" stroke={c} strokeWidth="1.6"/><path d="M9 3.5c0-1 1.3-1.5 3-1.5s3 .5 3 1.5" stroke={c} strokeWidth="1.6" strokeLinecap="round"/></svg>;
}
function AccessoiresIcon({ c }: { c: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.5 2 6 4 6 7v1H5a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-1V7c0-3-2.5-5-6-5Z" stroke={c} strokeWidth="1.6"/><path d="M6 11v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" stroke={c} strokeWidth="1.6"/></svg>;
}
// Fallback NEUTRE (pas d'invention d'icône dédiée) : langes / bonnet / catégories futures
// n'ont pas d'icône spécifique. Un simple carré-étiquette générique, jamais une métaphore inventée.
function FallbackIcon({ c }: { c: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="4" stroke={c} strokeWidth="1.6"/></svg>;
}
const ICONS: Record<string, (p: { c: string }) => React.ReactElement> = {
  bodies: BodiesIcon, pyjamas: PyjamaIcon, gigoteuses: GigoteuseIcon, accessoires: AccessoiresIcon,
};

const KNOWN_LABEL_SLUGS = ["bodies", "pyjamas", "gigoteuses", "accessoires", "bonnet", "langes"];

type Props = {
  slugs: string[];
  variant: "row" | "list";
  tone?: "dark" | "light";      // couleur du texte selon le fond (dark = fond sombre)
  currentSlug?: string;          // surligne la catégorie active (ex. page catégorie)
  showAll?: boolean;             // ajoute « Tous les produits » (→ /produits) en tête
  withIcons?: boolean;           // variant list : affiche les icônes (drawer)
  dense?: boolean;               // variant list : lignes fines sans carte (menu déroulant desktop)
  onNavigate?: () => void;       // ferme le menu / drawer au clic
};

export default function CategoryNav({
  slugs, variant, tone = "light", currentSlug, showAll = false, withIcons = false, dense = false, onNavigate,
}: Props) {
  const tc = useTranslations("catalog");
  const tn = useTranslations("nav");
  const dark = tone === "dark";

  const label = (slug: string) => (KNOWN_LABEL_SLUGS.includes(slug) ? tc(`cat_${slug}`) : capitalizeSlug(slug));
  const ordered = orderCategorySlugs(slugs);

  // { slug:"" → Tous les produits } d'abord si showAll, puis les catégories ordonnées.
  const entries: { slug: string; href: string; label: string }[] = [
    ...(showAll ? [{ slug: "", href: "/produits", label: tn("all_products") }] : []),
    ...ordered.map(slug => ({ slug, href: `/categorie/${slug}`, label: label(slug) })),
  ];

  const isActive = (slug: string) => currentSlug != null && currentSlug === slug;

  if (variant === "row") {
    const activeBg   = dark ? "#f2ede6" : "#1a1410";
    const activeCol  = dark ? "#1a1410" : "#f2ede6";
    const idleBg     = dark ? "rgba(242,237,230,0.08)" : "rgba(26,20,16,0.08)";
    const idleCol    = dark ? "#f2ede6" : "rgba(26,20,16,0.7)";
    return (
      <nav aria-label="Catégories" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <style>{`.milk-catnav-pill:hover{background:rgba(128,128,128,0.14)!important}`}</style>
        {entries.map(e => {
          const active = isActive(e.slug);
          return (
            <Link key={e.href} href={e.href} onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={active ? undefined : "milk-catnav-pill"}
              style={{ padding: "9px 18px", borderRadius: 99, textDecoration: "none", fontWeight: 800,
                fontSize: "clamp(12px,1.2vw,14px)", whiteSpace: "nowrap", transition: "all 0.15s",
                background: active ? activeBg : idleBg, color: active ? activeCol : idleCol }}>
              {e.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  // variant === "list" — deux densités :
  //  • dense (menu déroulant desktop) : lignes fines ~38px, SANS carte, survol = texte ambre → liste élégante.
  //  • défaut (drawer mobile plein écran) : zones de touche généreuses, léger fond, icônes.
  const textCol  = dark ? "#f2ede6" : "#1a1410";
  const itemBg   = dark ? "rgba(242,237,230,0.05)" : "transparent";
  const iconCol  = dark ? "rgba(242,237,230,0.6)" : "rgba(26,20,16,0.55)";
  return (
    <nav aria-label="Catégories" style={{ display: "flex", flexDirection: "column", gap: dense ? 1 : 6 }}>
      <style>{`
        .milk-catnav-item:hover{ background:rgba(128,128,128,0.12)!important }
        .milk-catnav-item-dense:hover{ color:#c49a4a!important }
      `}</style>
      {entries.map(e => {
        const active = isActive(e.slug);
        const Icon = e.slug ? (ICONS[e.slug] ?? FallbackIcon) : null;
        return (
          <Link key={e.href} href={e.href} onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={dense ? "milk-catnav-item-dense" : "milk-catnav-item"}
            style={dense
              ? { display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8,
                  textDecoration: "none", fontSize: 14.5, fontWeight: active ? 800 : 600,
                  background: "transparent", color: active ? "#c49a4a" : textCol, transition: "color 0.15s" }
              : { display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 14,
                  textDecoration: "none", fontSize: 17, fontWeight: active ? 900 : 800,
                  background: itemBg, color: active ? "#c49a4a" : textCol, transition: "background 0.15s" }}>
            {withIcons && Icon && <Icon c={active ? "#c49a4a" : iconCol} />}
            {e.label}
          </Link>
        );
      })}
    </nav>
  );
}
