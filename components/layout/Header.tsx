"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { LangSwitcher } from "@/components/i18n/LangSwitcher";
import { routing } from "@/i18n/routing";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart }     from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import CategoryNav from "@/components/category/CategoryNav";
import HeaderDropdown from "@/components/layout/HeaderDropdown";

/* ── Icônes SVG ──────────────────────────────────────────────────────────── */
function CartIcon({ size = 22, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6.5 9.5h14l-1.2 10H7.7L6.5 9.5Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M9 9.5V7.2C9 5.432 10.432 4 12.2 4h.6C14.568 4 16 5.432 16 7.2v2.3" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function ProfileIcon({ size = 22, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5Z" stroke={color} strokeWidth="1.8"/>
      <path d="M4 22c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function SearchIcon({ size = 20, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke={color} strokeWidth="1.8"/>
      <path d="m16.5 16.5 3.5 3.5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function HeartIcon({ size = 22, color = "#fff", filled = false }: { size?: number; color?: string; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} aria-hidden>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  );
}

// Icônes catégories + tableau CATS (codé en dur, sans « Langes ») DÉPLACÉS dans le composant
// partagé components/category/CategoryNav.tsx (Lot 4). Le Header reçoit désormais la liste des
// catégories (dérivée des produits publiés) via la prop `categorySlugs` et délègue le rendu.

/* ── Détection thème ─────────────────────────────────────────────────────── */
function findTheme(headerEl: HTMLElement | null): "dark" | "light" {
  try {
    const els    = document.elementsFromPoint(Math.floor(window.innerWidth / 2), 90) as HTMLElement[];
    const target = els.find(el => el?.tagName && !(headerEl?.contains(el)));
    if (!target) return "dark";
    let el: HTMLElement | null = target;
    while (el && el !== document.body) {
      const bg = window.getComputedStyle(el).backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
        const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m) return (0.299*+m[1] + 0.587*+m[2] + 0.114*+m[3]) / 255 < 0.45 ? "dark" : "light";
      }
      el = el.parentElement;
    }
    return "dark";
  } catch { return "dark"; }
}

export default function Header({ categorySlugs = [] }: { categorySlugs?: string[] }) {
  const pathname          = usePathname();
  const router            = useRouter();
  const { items }         = useCart();
  const { ids: wishIds }  = useWishlist();
  const { user, signOut } = useAuth();
  const t                 = useTranslations("nav");
  const tf                = useTranslations("footer"); // libellés « La marque » (mêmes qu'au pied de page)
  const locale            = useLocale();

  const [scrolled,   setScrolled]   = useState(false);
  const [theme,      setTheme]      = useState<"dark"|"light">("dark");
  const [mobileOpen, setMobileOpen] = useState(false);
  // Les menus déroulants desktop (« Notre collection », « La marque ») gèrent leur propre état
  // ouvert/fermé dans la coquille partagée HeaderDropdown (Lot 4b) — plus d'état ici.

  const userTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fermer le dropdown si clic en dehors
  const headerRef = useRef<HTMLElement | null>(null);
  // Compteur packs (store séparé milk_pack_cart) — relu à chaque navigation ET en
  // direct via l'event "milk-pack-cart-changed" (émis par le panier quand on retire
  // un pack ou vide le panier) + "storage" (autres onglets). Badge resync sans reload.
  const [packCount, setPackCount] = useState(0);
  useEffect(() => {
    const read = () => { try { const raw = JSON.parse(localStorage.getItem("milk_pack_cart") ?? "[]"); setPackCount(Array.isArray(raw) ? raw.length : 0); } catch {} };
    read();
    window.addEventListener("milk-pack-cart-changed", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("milk-pack-cart-changed", read);
      window.removeEventListener("storage", read);
    };
  }, [pathname]);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0) + packCount;
  // Rappel visuel : tant qu'il reste au moins un article/pack, l'icône panier pulse.
  const cartPulse = totalItems > 0 ? "milk-cart-pulse 1.8s ease-in-out infinite" : undefined;
  const cartGlow  = totalItems > 0 ? "milk-cart-glow 1.8s ease-in-out infinite"  : undefined;

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const compute = () => {
      const y = window.scrollY;
      setScrolled(y > 10);
      // Forçage thème sombre (texte crème) UNIQUEMENT sur la homepage, qui a un
      // hero sombre plein écran. Les autres pages détectent leur vrai fond
      // (sinon texte crème sur fond clair = invisible, cf. /qui-sommes-nous).
      if (pathname === "/" && y < 320) {
        setTheme("dark"); return;
      }
      setTheme(findTheme(headerRef.current));
    };
    compute();
    const raf = requestAnimationFrame(compute);
    const t   = setTimeout(compute, 150);
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      cancelAnimationFrame(raf); clearTimeout(t);
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [pathname]);

  // Header opaque dès le mount sur TOUTES les pages sauf la homepage (qui reste
  // transparente sur son hero, puis opaque au scroll).
  const opaque = scrolled || pathname !== "/";

  // Catégorie active pour surligner dans le menu « collection » : slug si /categorie/[slug],
  // "" (→ « Tous les produits ») si /produits, sinon undefined (rien de surligné).
  const collectionCurrentSlug = pathname.startsWith("/categorie/")
    ? (pathname.split("/")[2] || undefined)
    : pathname === "/produits" ? "" : undefined;

  // Deux entrées de nav déroulantes (Lot 4b). « La marque » calque la colonne « LA MARQUE » du
  // pied de page (mêmes libellés, mêmes URL) — brandLinks est la source unique (desktop + drawer).
  const collectionActive = pathname.startsWith("/produits") || pathname.startsWith("/categorie");
  const brandActive = pathname === "/qui-sommes-nous" || pathname === "/pourquoi-bambou"
    || pathname.startsWith("/blog") || pathname.startsWith("/avis-clients");
  const brandLinks = [
    { label: tf("link_story"),   href: "/qui-sommes-nous" },
    { label: tf("link_bamboo"),  href: "/pourquoi-bambou" },
    { label: t("blog"),          href: "/blog" },
    { label: tf("link_reviews"), href: "/avis-clients" },
  ];

  const C = useMemo(() => {
    const dark = theme === "dark";
    return {
      text:    dark ? "#f2ede6" : "#1a1410",
      muted:   dark ? "rgba(242,237,230,0.6)" : "rgba(26,20,16,0.55)",
      bg:      opaque ? (dark ? "rgba(13,11,9,0.93)" : "rgba(245,240,232,0.96)") : "transparent",
      border:  opaque ? (dark ? "1px solid rgba(242,237,230,0.08)" : "1px solid rgba(26,20,16,0.08)") : "1px solid transparent",
      dropBg:  dark ? "rgba(22,18,14,0.98)" : "rgba(253,250,246,0.98)",
      dropBdr: dark ? "1px solid rgba(242,237,230,0.1)" : "1px solid rgba(26,20,16,0.1)",
      amber:   "#c49a4a",
    };
  }, [theme, opaque]);

  function cancel() { if (userTimer.current) clearTimeout(userTimer.current); }
  function delay(fn: () => void, ms = 400) { cancel(); userTimer.current = setTimeout(fn, ms); }

  async function handleSignOut() { await signOut(); router.push("/"); }

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <style>{`
        .milk-nav     { display: flex !important; }
        .milk-desktop { display: flex !important; }
        .milk-burger  { display: none !important; }
        @media (max-width: 900px) {
          .milk-nav     { display: none !important; }
          .milk-desktop { display: none !important; }
          .milk-burger  { display: flex !important; }
        }
        .hdr-link:hover { background: rgba(128,128,128,0.1) !important; opacity: 1 !important; }
        /* Entrée « collection »/« la marque » = libellé + chevron : le survol s'applique au conteneur entier. */
        .hdr-collection:hover { background: rgba(128,128,128,0.1) !important; opacity: 1 !important; }
        /* Liens à l'intérieur d'un panneau déroulant (ex. « La marque ») — survol sobre : texte ambre. */
        .hdr-menulink:hover { color: #c49a4a !important; }
        .hdr-icon:hover { background: rgba(128,128,128,0.1) !important; }
        /* keyframes milk-cart-pulse / milk-cart-glow → définis dans globals.css */
      `}</style>

      <header ref={el => { headerRef.current = el; }}
        // clip et NON hidden : hidden force le navigateur à calculer overflow-y:auto, ce qui rogne
        // tout enfant dépassant la hauteur du header (ici le menu déroulant « collection »). Même
        // convention que html/body dans globals.css:48-50 et 286-289, où le piège est documenté.
        style={{ position: "fixed", top: "calc(var(--milk-promo-h, 0px) + var(--milk-topbar-h, 0px))", left: 0, width: "100%", zIndex: 9999, overflowX: "clip", background: C.bg, borderBottom: C.border, backdropFilter: opaque ? "blur(16px) saturate(1.5)" : "none", transition: "background 0.25s, border-color 0.25s, top 0.3s cubic-bezier(0.4,0,0.2,1)" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", padding: "0 clamp(8px,3vw,20px)", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68, gap: 16 }}>

          {/* ✅ Logo — clic scroll to top */}
          <Link
            href="/"
            aria-label="M!LK — Accueil"
            style={{ textDecoration: "none", flexShrink: 0 }}
            onClick={() => { if (typeof window !== "undefined" && window.scrollY > 0) window.scrollTo({ top: 0, behavior: "smooth" }); }}
          >
            {/* Logo M!LK figé : asset PNG (glyphes noirs transparents) recoloré
                à la couleur du thème via CSS mask. Zéro dépendance à BoldinBold
                → s'affiche correctement même si la police n'a pas (encore) chargé,
                et s'adapte au thème dark/light (cream sur fond sombre, encre sur
                fond clair). Identique sur /fr et /en. */}
            <div style={{ display: "flex", alignItems: "center", background: "transparent", borderRadius: 10, padding: "4px 2px" }}>
              <span
                role="img"
                aria-label="M!LK"
                style={{
                  display:            "block",
                  width:              50,
                  height:             28,
                  backgroundColor:    C.text,
                  transition:         "background-color 0.25s",
                  WebkitMaskImage:    "url(/logo-milk-white.png)",
                  maskImage:          "url(/logo-milk-white.png)",
                  WebkitMaskRepeat:   "no-repeat",
                  maskRepeat:         "no-repeat",
                  WebkitMaskPosition: "left center",
                  maskPosition:       "left center",
                  WebkitMaskSize:     "contain",
                  maskSize:           "contain",
                }}
              />
            </div>
          </Link>

          {/* Nav desktop — deux déroulants SYMÉTRIQUES via la coquille partagée HeaderDropdown (Lot 4b) :
              « Notre collection » (panneau = CategoryNav) et « La marque » (panneau = liste de liens,
              mêmes entrées que la colonne « LA MARQUE » du pied de page). Le libellé de chacun reste un
              lien (/produits, /qui-sommes-nous) ; le chevron déplie. */}
          <nav className="milk-nav" style={{ alignItems: "center", gap: 4, flex: 1, justifyContent: "center" }}>
            <HeaderDropdown label={t("collection")} href="/produits" active={collectionActive}
              menuId="milk-collection-menu" colors={{ text: C.text, amber: C.amber, dropBg: C.dropBg, dropBdr: C.dropBdr }}>
              <CategoryNav variant="list" tone={theme} dense slugs={categorySlugs} currentSlug={collectionCurrentSlug} showAll />
            </HeaderDropdown>
            <HeaderDropdown label={t("brand_section")} href="/qui-sommes-nous" active={brandActive}
              menuId="milk-brand-menu" colors={{ text: C.text, amber: C.amber, dropBg: C.dropBg, dropBdr: C.dropBdr }}>
              <nav aria-label={t("brand_section")} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {brandLinks.map(l => (
                  <Link key={l.href} href={l.href} className="hdr-menulink"
                    style={{ padding: "9px 12px", borderRadius: 8, textDecoration: "none", fontSize: 14.5, fontWeight: 600, color: C.text, transition: "color 0.15s" }}>
                    {l.label}
                  </Link>
                ))}
              </nav>
            </HeaderDropdown>
          </nav>

          {/* Actions desktop — avec sélecteur de langue FR | EN */}
          <div className="milk-desktop" style={{ alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ color: C.text, marginRight: 2 }}><LangSwitcher /></span>
            <Link href="/recherche" aria-label="Recherche" className="hdr-icon"
              style={{ width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", textDecoration: "none" }}>
              <SearchIcon color={C.text} size={20} />
            </Link>

            <Link href="/favoris" aria-label="Mes favoris" className="hdr-icon"
              style={{ position: "relative", width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", textDecoration: "none" }}>
              <HeartIcon color={C.text} size={22} filled={wishIds.length > 0} />
              {wishIds.length > 0 && <span style={{ position: "absolute", top: 4, right: 4, fontSize: 10, fontWeight: 900, background: "#dc2626", color: "#fff", borderRadius: 99, padding: "2px 5px", minWidth: 16, textAlign: "center", lineHeight: 1.4 }}>{wishIds.length}</span>}
            </Link>

            <Link href="/panier" aria-label="Panier" className="hdr-icon"
              style={{ position: "relative", width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", textDecoration: "none", animation: cartPulse }}>
              <CartIcon color={C.text} size={22} />
              {totalItems > 0 && <span style={{ position: "absolute", top: 4, right: 4, fontSize: 10, fontWeight: 900, background: C.amber, color: "#fff", borderRadius: 99, padding: "2px 5px", minWidth: 16, textAlign: "center", lineHeight: 1.4 }}>{totalItems}</span>}
            </Link>

            <Link href={user ? "/profil" : "/connexion"}
              aria-label={user ? "Mon profil" : "Se connecter"}
              style={{ width: 40, height: 40, borderRadius: 10, background: user ? "rgba(196,154,74,0.15)" : "none", border: user ? "1px solid rgba(196,154,74,0.3)" : "1px solid transparent", display: "grid", placeItems: "center", textDecoration: "none" }}>
              {user
                ? <span style={{ fontSize: 16, fontWeight: 900, color: C.amber }}>{(user.email ?? "?")[0].toUpperCase()}</span>
                : <ProfileIcon color={C.text} size={22} />}
            </Link>
          </div>

          {/* Mobile burger */}
          <div className="milk-burger" style={{ alignItems: "center", gap: 6, flexShrink: 0 }}>
            {/* Favoris — absent de la barre mobile ET du drawer jusqu'ici : les visiteurs
                mobile (54 % du trafic) n'avaient AUCUN accès à /favoris. Parité desktop. */}
            <Link href="/favoris" aria-label="Mes favoris" style={{ position: "relative", display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 10, textDecoration: "none" }}>
              <HeartIcon color={C.text} size={22} filled={wishIds.length > 0} />
              {wishIds.length > 0 && <span style={{ position: "absolute", top: 4, right: 4, fontSize: 10, fontWeight: 900, background: "#dc2626", color: "#fff", borderRadius: 99, padding: "2px 5px", minWidth: 16, textAlign: "center", lineHeight: 1.4 }}>{wishIds.length}</span>}
            </Link>

            <Link href="/panier" style={{ position: "relative", display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 10, textDecoration: "none", animation: cartPulse }}>
              <CartIcon color={C.text} size={22} />
              {totalItems > 0 && <span style={{ position: "absolute", top: 4, right: 4, fontSize: 10, fontWeight: 900, background: C.amber, color: "#fff", borderRadius: 99, padding: "2px 5px", minWidth: 16, textAlign: "center" }}>{totalItems}</span>}
            </Link>

            {/* Sélecteur de langue compact — visible directement dans le header
                mobile (entre panier et burger), sans ouvrir le drawer. Même
                logique que le LangSwitcher desktop : router.replace sur le chemin
                courant en changeant uniquement la locale. */}
            <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
              {routing.locales.map((l, i) => {
                const active = locale === l;
                return (
                  <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    {i > 0 && <span aria-hidden style={{ color: C.text, opacity: 0.3, fontSize: 11 }}>|</span>}
                    <button
                      onClick={() => router.replace(pathname, { locale: l })}
                      aria-current={active ? "true" : undefined}
                      aria-label={l === "fr" ? "Français" : "English"}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        minWidth: 26,
                        height: 36,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 3px",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        lineHeight: 1,
                        color: active ? C.amber : C.text,
                        opacity: active ? 1 : 0.5,
                      }}
                    >
                      {l.toUpperCase()}
                    </button>
                  </span>
                );
              })}
            </div>

            <button onClick={() => setMobileOpen(v => !v)}
              aria-label="Menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              style={{ width: 40, height: 40, borderRadius: 10, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: 5, alignItems: "center", justifyContent: "center" }}>
              <span style={{ width: 22, height: 2, background: C.text, borderRadius: 2, transition: "all 0.2s", transform: mobileOpen ? "rotate(45deg) translate(5px,5px)" : "none" }} />
              <span style={{ width: 22, height: 2, background: C.text, borderRadius: 2, opacity: mobileOpen ? 0 : 1, transition: "opacity 0.2s" }} />
              <span style={{ width: 22, height: 2, background: C.text, borderRadius: 2, transition: "all 0.2s", transform: mobileOpen ? "rotate(-45deg) translate(5px,-5px)" : "none" }} />
            </button>
          </div>
        </div>
      </header>

      {/* Menu mobile */}
      {mobileOpen && (
        <div id="mobile-nav" role="navigation" aria-label="Menu principal" style={{ position: "fixed", inset: 0, zIndex: 9998, background: "#0d0b09", paddingTop: 80, overflowY: "auto" }}>
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6, minHeight: "calc(100vh - 80px)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", marginBottom: 4 }}>{t("collection_section")}</div>
            <Link href="/produits" onClick={() => setMobileOpen(false)}
              style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.2)", textDecoration: "none", fontSize: 17, fontWeight: 900, color: "#c49a4a", display: "flex", alignItems: "center", gap: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h18" stroke="#c49a4a" strokeWidth="2" strokeLinecap="round"/></svg>
              {t("all_products")}
            </Link>
            <CategoryNav variant="list" tone="dark" withIcons slugs={categorySlugs}
              currentSlug={collectionCurrentSlug} onNavigate={() => setMobileOpen(false)} />
            <div style={{ height: 1, background: "rgba(242,237,230,0.08)", margin: "8px 0" }} />
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", marginBottom: 4 }}>{t("brand_section")}</div>
            {brandLinks.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                style={{ padding: "14px 18px", borderRadius: 14, background: "rgba(242,237,230,0.04)", textDecoration: "none", fontSize: 17, fontWeight: 700, color: "rgba(242,237,230,0.7)" }}>
                {l.label}
              </Link>
            ))}
            <div style={{ height: 1, background: "rgba(242,237,230,0.08)", margin: "8px 0" }} />
            {user ? (
              <>
                <div style={{ padding: "12px 18px", fontSize: 13, color: "rgba(242,237,230,0.4)", background: "rgba(242,237,230,0.03)", borderRadius: 12 }}>
                  {t("connected")} <strong style={{ color: "#f2ede6" }}>{user.email}</strong>
                </div>
                <Link href="/profil" onClick={() => setMobileOpen(false)}
                  style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(242,237,230,0.05)", textDecoration: "none", fontSize: 17, fontWeight: 800, color: "#f2ede6" }}>
                  {t("my_profile_orders")}
                </Link>
                <button onClick={handleSignOut}
                  style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(239,68,68,0.1)", border: "none", cursor: "pointer", fontSize: 17, fontWeight: 800, color: "#ef4444", textAlign: "left", width: "100%" }}>
                  {t("logout")}
                </button>
              </>
            ) : (
              <>
                <Link href="/connexion" onClick={() => setMobileOpen(false)}
                  style={{ padding: "16px 18px", borderRadius: 14, background: "#f2ede6", textDecoration: "none", fontSize: 17, fontWeight: 900, color: "#1a1410", textAlign: "center" }}>
                  {t("login")}
                </Link>
                <Link href="/inscription" onClick={() => setMobileOpen(false)}
                  style={{ padding: "16px 18px", borderRadius: 14, border: "1px solid rgba(242,237,230,0.15)", textDecoration: "none", fontSize: 17, fontWeight: 700, color: "#f2ede6", textAlign: "center" }}>
                  {t("register")}
                </Link>
              </>
            )}
            <Link href="/panier" onClick={() => setMobileOpen(false)}
              style={{ marginTop: "auto", padding: "18px 20px", borderRadius: 14, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.2)", textDecoration: "none", fontSize: 17, fontWeight: 800, color: "#c49a4a", display: "flex", justifyContent: "space-between", alignItems: "center", animation: cartGlow }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}><CartIcon color="#c49a4a" size={20} />{t("my_cart")}</span>
              {totalItems > 0 && <span style={{ padding: "4px 12px", borderRadius: 99, background: "#c49a4a", color: "#fff", fontSize: 14, fontWeight: 900 }}>{totalItems}</span>}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}