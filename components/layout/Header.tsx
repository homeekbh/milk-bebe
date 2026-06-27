"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LangSwitcher } from "@/components/i18n/LangSwitcher";
import { MilkLogo } from "@/components/shared/MilkLogo";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart }     from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";

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

/* ── Icônes catégories ───────────────────────────────────────────────────── */
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

const CATS = [
  { label: "Bodies",      href: "/categorie/bodies",      Icon: BodiesIcon      },
  { label: "Pyjamas",     href: "/categorie/pyjamas",     Icon: PyjamaIcon      },
  { label: "Gigoteuses",  href: "/categorie/gigoteuses",  Icon: GigoteuseIcon   },
  { label: "Accessoires", href: "/categorie/accessoires", Icon: AccessoiresIcon },
];

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

export default function Header() {
  const pathname          = usePathname();
  const router            = useRouter();
  const { items }         = useCart();
  const { ids: wishIds }  = useWishlist();
  const { user, signOut } = useAuth();
  const t                 = useTranslations("nav");

  const [scrolled,   setScrolled]   = useState(false);
  const [theme,      setTheme]      = useState<"dark"|"light">("dark");
  const [mobileOpen, setMobileOpen] = useState(false);

  const userTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fermer le dropdown si clic en dehors
  const headerRef = useRef<HTMLElement | null>(null);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

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
        .hdr-icon:hover { background: rgba(128,128,128,0.1) !important; }
      `}</style>

      <header ref={el => { headerRef.current = el; }}
        style={{ position: "fixed", top: "var(--milk-topbar-h, 0px)", left: 0, width: "100%", zIndex: 9999, overflowX: "hidden", background: C.bg, borderBottom: C.border, backdropFilter: opaque ? "blur(16px) saturate(1.5)" : "none", transition: "background 0.25s, border-color 0.25s, top 0.3s cubic-bezier(0.4,0,0.2,1)" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", padding: "0 clamp(8px,3vw,20px)", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68, gap: 16 }}>

          {/* ✅ Logo — clic scroll to top */}
          <Link
            href="/"
            aria-label="M!LK — Accueil"
            style={{ textDecoration: "none", flexShrink: 0 }}
            onClick={() => { if (typeof window !== "undefined" && window.scrollY > 0) window.scrollTo({ top: 0, behavior: "smooth" }); }}
          >
            <div style={{ display: "flex", alignItems: "center", background: "transparent", borderRadius: 10, padding: "4px 2px" }}>
              <MilkLogo color={C.text} size={30} />
            </div>
          </Link>

          {/* Nav desktop */}
          <nav className="milk-nav" style={{ alignItems: "center", gap: 4, flex: 1, justifyContent: "center" }}>
            {[
              { label: t("collection"), href: "/produits",         active: pathname.startsWith("/produits") || pathname.startsWith("/categorie") },
              { label: t("about"),      href: "/qui-sommes-nous",  active: pathname === "/qui-sommes-nous" },
              { label: t("bamboo"),     href: "/pourquoi-bambou",  active: pathname === "/pourquoi-bambou" },
            ].map(l => (
              <Link key={l.href} href={l.href} className="hdr-link"
                style={{ color: C.text, textDecoration: "none", fontWeight: 700, fontSize: 15, padding: "8px 16px", borderRadius: 10, opacity: l.active ? 1 : 0.85, borderBottom: l.active ? `2px solid ${C.amber}` : "2px solid transparent", transition: "all 0.15s", display: "inline-block", whiteSpace: "nowrap" }}>
                {l.label}
              </Link>
            ))}
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
              style={{ position: "relative", width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", textDecoration: "none" }}>
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
            <Link href="/panier" style={{ position: "relative", display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 10, textDecoration: "none" }}>
              <CartIcon color={C.text} size={22} />
              {totalItems > 0 && <span style={{ position: "absolute", top: 4, right: 4, fontSize: 10, fontWeight: 900, background: C.amber, color: "#fff", borderRadius: 99, padding: "2px 5px", minWidth: 16, textAlign: "center" }}>{totalItems}</span>}
            </Link>
            <button onClick={() => setMobileOpen(v => !v)}
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
        <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "#0d0b09", paddingTop: 80, overflowY: "auto" }}>
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6, minHeight: "calc(100vh - 80px)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", marginBottom: 4 }}>{t("collection_section")}</div>
            <Link href="/produits" onClick={() => setMobileOpen(false)}
              style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.2)", textDecoration: "none", fontSize: 17, fontWeight: 900, color: "#c49a4a", display: "flex", alignItems: "center", gap: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h18" stroke="#c49a4a" strokeWidth="2" strokeLinecap="round"/></svg>
              {t("all_products")}
            </Link>
            {CATS.map(cat => (
              <Link key={cat.href} href={cat.href} onClick={() => setMobileOpen(false)}
                style={{ padding: "14px 18px", borderRadius: 14, background: "rgba(242,237,230,0.05)", textDecoration: "none", fontSize: 17, fontWeight: 800, color: "#f2ede6", display: "flex", alignItems: "center", gap: 12 }}>
                <cat.Icon c="rgba(242,237,230,0.6)" />
                {cat.label}
              </Link>
            ))}
            <div style={{ height: 1, background: "rgba(242,237,230,0.08)", margin: "8px 0" }} />
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", marginBottom: 4 }}>{t("brand_section")}</div>
            {[
              { label: t("about"),  href: "/qui-sommes-nous" },
              { label: t("bamboo"), href: "/pourquoi-bambou" },
            ].map(l => (
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
              style={{ marginTop: "auto", padding: "18px 20px", borderRadius: 14, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.2)", textDecoration: "none", fontSize: 17, fontWeight: 800, color: "#c49a4a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}><CartIcon color="#c49a4a" size={20} />{t("my_cart")}</span>
              {totalItems > 0 && <span style={{ padding: "4px 12px", borderRadius: 99, background: "#c49a4a", color: "#fff", fontSize: 14, fontWeight: 900 }}>{totalItems}</span>}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}