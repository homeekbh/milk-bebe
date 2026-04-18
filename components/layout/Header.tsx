"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart }  from "@/context/CartContext";
import { useAuth }  from "@/context/AuthContext";
import { useLang }  from "@/context/LangContext";

// ─── Icônes SVG au trait ──────────────────────────────────────────────────────
function CartIcon({ size = 22, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.5 9.5h14l-1.2 10H7.7L6.5 9.5Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 9.5V7.2C9 5.432 10.432 4 12.2 4h.6C14.568 4 16 5.432 16 7.2v2.3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ProfileIcon({ size = 22, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5Z" stroke={color} strokeWidth="1.8" />
      <path d="M4 22c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon({ size = 20, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke={color} strokeWidth="1.8" />
      <path d="m16.5 16.5 3.5 3.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ size = 12, color = "#fff", rotate = false }: { size?: number; color?: string; rotate?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"
      style={{ transition: "transform 0.2s", transform: rotate ? "rotate(180deg)" : "none" }}>
      <path d="M6 9l6 6 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BodiesIcon({ size = 20, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3c-1.5 0-2.5.8-2.5 2v1H7L5 8v4h2v8h10v-8h2V8l-2-2h-2.5V5c0-1.2-1-2-2.5-2Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function PyjamaIcon({ size = 20, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 3h8M8 3C6 3 5 4.5 5 6v16h14V6c0-1.5-1-3-3-3" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 3v4l3 2 3-2V3" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function GigoteuseIcon({ size = 20, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3c-3.5 0-6 2-6 5v8c0 2.5 2.5 5 6 5s6-2.5 6-5V8c0-3-2.5-5-6-5Z" stroke={color} strokeWidth="1.6" />
      <path d="M9 3.5c0-1 1.3-1.5 3-1.5s3 .5 3 1.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function AccessoiresIcon({ size = 20, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C8.5 2 6 4 6 7v1H5a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-1V7c0-3-2.5-5-6-5Z" stroke={color} strokeWidth="1.6" />
      <path d="M6 11v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

// ─── Détection thème selon contenu sous le header ─────────────────────────────
function findThemeAtHeaderPoint(headerEl: HTMLElement | null): "dark" | "light" {
  try {
    const x   = Math.floor(window.innerWidth / 2);
    const y   = 90;
    const els = document.elementsFromPoint(x, y) as HTMLElement[];
    const target = els.find(el => {
      if (!el) return false;
      if (!headerEl) return true;
      return !headerEl.contains(el);
    });
    if (!target) return "light";
    const themed = target.closest("[data-theme]") as HTMLElement | null;
    const t      = themed?.getAttribute("data-theme");
    if (t === "dark" || t === "light") return t;
    return "light";
  } catch {
    return "light";
  }
}

// ─── Catégories ───────────────────────────────────────────────────────────────
const CATS = [
  { label: "Bodies",      href: "/categorie/bodies",      desc: "L'essentiel du quotidien",      Icon: BodiesIcon      },
  { label: "Pyjamas",     href: "/categorie/pyjamas",     desc: "Pour des nuits sereines",       Icon: PyjamaIcon      },
  { label: "Gigoteuses",  href: "/categorie/gigoteuses",  desc: "Sommeil sécurisé",              Icon: GigoteuseIcon   },
  { label: "Accessoires", href: "/categorie/accessoires", desc: "Les détails qui changent tout", Icon: AccessoiresIcon },
];

const LANGS = [
  { code: "fr" as const, flag: "FR" },
  { code: "en" as const, flag: "EN" },
  { code: "it" as const, flag: "IT" },
  { code: "hu" as const, flag: "HU" },
];

// ─── Sélecteur de langue ──────────────────────────────────────────────────────
function LangSwitcher({ textColor }: { textColor: string }) {
  const { locale, setLocale } = useLang();
  const [open, setOpen]       = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid rgba(128,128,128,0.2)", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, color: textColor, display: "flex", alignItems: "center", gap: 4 }}
      >
        {locale.toUpperCase()}
        <ChevronIcon size={10} color={textColor} rotate={open} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: 44, right: 0, background: "rgba(22,18,14,0.98)", border: "1px solid rgba(242,237,230,0.1)", borderRadius: 12, padding: 6, minWidth: 90, boxShadow: "0 20px 40px rgba(0,0,0,0.4)", zIndex: 100 }}>
          {LANGS.map(lang => (
            <button key={lang.code} onClick={() => { setLocale(lang.code); setOpen(false); }}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "none", background: lang.code === locale ? "rgba(196,154,74,0.15)" : "transparent", cursor: "pointer", fontSize: 13, fontWeight: 700, color: lang.code === locale ? "#c49a4a" : "rgba(242,237,230,0.7)", textAlign: "left" }}>
              {lang.flag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileLangButtons({ onClose }: { onClose: () => void }) {
  const { locale, setLocale } = useLang();
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "4px 0" }}>
      {LANGS.map(lang => (
        <button key={lang.code} onClick={() => { setLocale(lang.code); onClose(); }}
          style={{ padding: "10px 16px", borderRadius: 10, background: lang.code === locale ? "rgba(196,154,74,0.15)" : "rgba(242,237,230,0.06)", border: lang.code === locale ? "1px solid rgba(196,154,74,0.3)" : "1px solid rgba(242,237,230,0.08)", fontSize: 14, fontWeight: 700, color: lang.code === locale ? "#c49a4a" : "rgba(242,237,230,0.6)", cursor: "pointer" }}>
          {lang.flag}
        </button>
      ))}
    </div>
  );
}

// ─── Header principal ─────────────────────────────────────────────────────────
export default function Header() {
  const pathname = usePathname();
  const router   = useRouter();
  const { items }         = useCart();
  const { user, signOut } = useAuth();

  const [scrolled,   setScrolled]   = useState(false);
  const [openUser,   setOpenUser]   = useState(false);
  const [theme,      setTheme]      = useState<"dark" | "light">("dark");
  const [mobileOpen, setMobileOpen] = useState(false);

  const userTimer = useRef<any>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const compute = () => {
      const y      = window.scrollY;
      setScrolled(y > 10);
      const isHome = pathname === "/";
      // Pages avec header toujours sombre au début
      const forceDarkStart = ["/qui-sommes-nous", "/pourquoi-bambou"];
      if ((isHome || forceDarkStart.includes(pathname)) && y < 320) {
        setTheme("dark");
        return;
      }
      setTheme(findThemeAtHeaderPoint(headerRef.current));
    };
    compute();
    const raf = requestAnimationFrame(compute);
    const t   = window.setTimeout(compute, 120);
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [pathname]);

  const C = useMemo(() => {
    const dark = theme === "dark";
    return {
      text:    dark ? "#f2ede6" : "#1a1410",
      muted:   dark ? "rgba(242,237,230,0.6)" : "rgba(26,20,16,0.55)",
      bg:      scrolled ? (dark ? "rgba(13,11,9,0.92)" : "rgba(245,240,232,0.95)") : "transparent",
      border:  scrolled ? (dark ? "1px solid rgba(242,237,230,0.08)" : "1px solid rgba(26,20,16,0.08)") : "1px solid transparent",
      dropBg:  dark ? "rgba(22,18,14,0.98)" : "rgba(253,250,246,0.98)",
      dropBdr: dark ? "1px solid rgba(242,237,230,0.1)" : "1px solid rgba(26,20,16,0.1)",
      amber:   "#c49a4a",
    };
  }, [theme, scrolled]);

  function cancel(ref: React.MutableRefObject<any>) { clearTimeout(ref.current); }
  function delay(fn: () => void, ref: React.MutableRefObject<any>, ms = 180) {
    clearTimeout(ref.current);
    ref.current = setTimeout(fn, ms);
  }

  async function handleSignOut() {
    await signOut();
    setOpenUser(false);
    router.push("/");
  }

  if (pathname.startsWith("/admin")) return null;

  // Menu utilisateur connecté — clés uniques
  const userMenuItems = [
    { label: "Mon profil",    href: "/profil",            key: "profil"    },
    { label: "Mes commandes", href: "/profil#commandes",  key: "commandes" },
  ];

  return (
    <>
      <style>{`
        .milk-nav     { display: flex !important; }
        .milk-desktop { display: flex !important; }
        .milk-burger  { display: none !important; }
        @media (max-width: 768px) {
          .milk-nav     { display: none !important; }
          .milk-desktop { display: none !important; }
          .milk-burger  { display: flex !important; }
        }
        .header-link:hover { opacity: 1 !important; background: rgba(128,128,128,0.1) !important; }
        .drop-item:hover { background: rgba(128,128,128,0.08) !important; }
      `}</style>

      <header
        ref={el => { headerRef.current = el; }}
        style={{
          position: "fixed", top: 0, left: 0, width: "100%", zIndex: 9999,
          background: C.bg, borderBottom: C.border,
          backdropFilter: scrolled ? "blur(16px) saturate(1.5)" : "none",
          transition: "background 0.25s ease, border-color 0.25s ease",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68, gap: 16 }}>

          {/* ── Logo ── */}
          <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }} aria-label="M!LK">
            <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
              <span style={{ color: C.text, fontWeight: 950, fontSize: 22, letterSpacing: -1, lineHeight: 1, fontFamily: "inherit" }}>
                M
              </span>
              <span style={{ color: C.amber, fontWeight: 950, fontSize: 28, letterSpacing: -1, lineHeight: 1, fontFamily: "inherit", display: "inline-block", transform: "translateY(-3px)" }}>
                !
              </span>
              <span style={{ color: C.text, fontWeight: 950, fontSize: 22, letterSpacing: -1, lineHeight: 1, fontFamily: "inherit" }}>
                LK
              </span>
            </div>
          </Link>

          {/* ── Nav desktop ── */}
          <nav className="milk-nav" style={{ alignItems: "center", gap: 4, flex: 1, justifyContent: "center" }}>

            {/* ✅ Notre collection → direct /produits sans sous-menu */}
            <Link href="/produits"
              style={{ color: C.text, textDecoration: "none", fontWeight: 700, fontSize: 16, padding: "8px 16px", borderRadius: 10, opacity: pathname.startsWith("/produits") || pathname.startsWith("/categorie") ? 1 : 0.85, borderBottom: pathname.startsWith("/produits") || pathname.startsWith("/categorie") ? `2px solid ${C.amber}` : "2px solid transparent", transition: "all 0.15s", display: "inline-block" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(128,128,128,0.1)"; (e.currentTarget as HTMLAnchorElement).style.opacity = "1"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; (e.currentTarget as HTMLAnchorElement).style.opacity = pathname.startsWith("/produits") || pathname.startsWith("/categorie") ? "1" : "0.85"; }}
            >
              Notre collection
            </Link>

            {[
              { label: "Qui sommes-nous",    href: "/qui-sommes-nous" },
              { label: "Pourquoi le bambou", href: "/pourquoi-bambou" },
            ].map(l => (
              <Link key={l.href} href={l.href}
                style={{ color: C.text, textDecoration: "none", fontWeight: 700, fontSize: 16, padding: "8px 16px", borderRadius: 10, opacity: pathname === l.href ? 1 : 0.85, borderBottom: pathname === l.href ? `2px solid ${C.amber}` : "2px solid transparent", transition: "all 0.15s", display: "inline-block" }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(128,128,128,0.1)"; (e.currentTarget as HTMLAnchorElement).style.opacity = "1"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; (e.currentTarget as HTMLAnchorElement).style.opacity = pathname === l.href ? "1" : "0.85"; }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* ── Actions droite desktop ── */}
          <div className="milk-desktop" style={{ alignItems: "center", gap: 8, flexShrink: 0 }}>
            <LangSwitcher textColor={C.text} />

            <Link href="/recherche" aria-label="Recherche"
              style={{ width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", textDecoration: "none" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(128,128,128,0.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
            >
              <SearchIcon color={C.text} size={20} />
            </Link>

            <Link href="/panier" aria-label="Panier"
              style={{ position: "relative", display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 10, textDecoration: "none" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(128,128,128,0.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
            >
              <CartIcon color={C.text} size={22} />
              {totalItems > 0 && (
                <span style={{ position: "absolute", top: 4, right: 4, fontSize: 10, fontWeight: 900, background: C.amber, color: "#fff", borderRadius: 99, padding: "2px 5px", minWidth: 16, textAlign: "center" }}>
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Menu profil */}
            <div style={{ position: "relative" }}
              onMouseEnter={() => { cancel(userTimer); setOpenUser(true); }}
              onMouseLeave={() => delay(() => setOpenUser(false), userTimer)}
            >
              <button
                style={{ width: 40, height: 40, borderRadius: 10, background: user ? "rgba(196,154,74,0.15)" : "none", border: user ? "1px solid rgba(196,154,74,0.3)" : "1px solid transparent", cursor: "pointer", display: "grid", placeItems: "center" }}
              >
                {user
                  ? <span style={{ fontSize: 16, fontWeight: 900, color: C.amber }}>{(user.email ?? "?")[0].toUpperCase()}</span>
                  : <ProfileIcon color={C.text} size={22} />
                }
              </button>

              {openUser && (
                <div
                  style={{ position: "absolute", top: 52, right: 0, width: 230, background: C.dropBg, border: C.dropBdr, borderRadius: 16, padding: 12, boxShadow: "0 24px 60px rgba(0,0,0,0.3)", display: "grid", gap: 4, zIndex: 100 }}
                  onMouseEnter={() => { cancel(userTimer); setOpenUser(true); }}
                  onMouseLeave={() => delay(() => setOpenUser(false), userTimer)}
                >
                  {user ? (
                    <>
                      <div style={{ padding: "10px 12px", marginBottom: 4 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>{user.email?.split("@")[0]}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{user.email}</div>
                      </div>
                      <div style={{ height: 1, background: "rgba(128,128,128,0.1)" }} />

                      {/* ✅ Keys uniques */}
                      {userMenuItems.map(l => (
                        <Link key={l.key} href={l.href} onClick={() => setOpenUser(false)}
                          style={{ display: "block", padding: "11px 12px", borderRadius: 10, textDecoration: "none", fontSize: 15, fontWeight: 700, color: C.text, transition: "background 0.15s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(128,128,128,0.08)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                        >
                          {l.label}
                        </Link>
                      ))}

                      <div style={{ height: 1, background: "rgba(128,128,128,0.1)" }} />
                      <button onClick={handleSignOut}
                        style={{ width: "100%", padding: "11px 12px", borderRadius: 10, background: "none", border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, color: "#ef4444", textAlign: "left" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                      >
                        Se déconnecter
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ padding: "8px 12px 10px", fontSize: 14, color: C.muted }}>
                        Connecte-toi pour suivre tes commandes
                      </div>
                      <Link href="/connexion" onClick={() => setOpenUser(false)}
                        style={{ display: "block", padding: "12px", borderRadius: 10, background: "#1a1410", color: "#f2ede6", textDecoration: "none", fontSize: 15, fontWeight: 900, textAlign: "center" }}>
                        Se connecter
                      </Link>
                      <Link href="/inscription" onClick={() => setOpenUser(false)}
                        style={{ display: "block", padding: "12px", borderRadius: 10, border: "1px solid rgba(128,128,128,0.15)", textDecoration: "none", fontSize: 15, fontWeight: 700, color: C.text, textAlign: "center" }}>
                        Créer un compte
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Actions mobile (panier + burger) ── */}
          <div className="milk-burger" style={{ alignItems: "center", gap: 6, flexShrink: 0 }}>
            <Link href="/panier" aria-label="Panier"
              style={{ position: "relative", display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 10, textDecoration: "none" }}>
              <CartIcon color={C.text} size={22} />
              {totalItems > 0 && (
                <span style={{ position: "absolute", top: 4, right: 4, fontSize: 10, fontWeight: 900, background: C.amber, color: "#fff", borderRadius: 99, padding: "2px 5px", minWidth: 16, textAlign: "center" }}>
                  {totalItems}
                </span>
              )}
            </Link>
            <button onClick={() => setMobileOpen(v => !v)} aria-label="Menu"
              style={{ width: 40, height: 40, borderRadius: 10, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: 5, alignItems: "center", justifyContent: "center" }}>
              <span style={{ width: 22, height: 2, background: C.text, borderRadius: 2, transition: "all 0.2s", transform: mobileOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
              <span style={{ width: 22, height: 2, background: C.text, borderRadius: 2, opacity: mobileOpen ? 0 : 1, transition: "opacity 0.2s" }} />
              <span style={{ width: 22, height: 2, background: C.text, borderRadius: 2, transition: "all 0.2s", transform: mobileOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Menu mobile fullscreen ── */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "#0d0b09", paddingTop: 80, overflowY: "auto" }}>
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6, minHeight: "calc(100vh - 80px)" }}>

            <MobileLangButtons onClose={() => setMobileOpen(false)} />
            <div style={{ height: 1, background: "rgba(242,237,230,0.08)", margin: "10px 0" }} />

            {/* Collection */}
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", marginBottom: 6 }}>
              Collection
            </div>

            {/* ✅ Tous les produits en premier — direct sans sous-menu */}
            <Link href="/produits" onClick={() => setMobileOpen(false)}
              style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.2)", textDecoration: "none", fontSize: 17, fontWeight: 900, color: "#c49a4a", display: "flex", alignItems: "center", gap: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="#c49a4a" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Tous les produits
            </Link>

            {CATS.map(cat => (
              <Link key={cat.href} href={cat.href} onClick={() => setMobileOpen(false)}
                style={{ padding: "14px 18px", borderRadius: 14, background: "rgba(242,237,230,0.06)", textDecoration: "none", fontSize: 17, fontWeight: 800, color: "#f2ede6", display: "flex", alignItems: "center", gap: 12 }}>
                <cat.Icon size={20} color="rgba(242,237,230,0.7)" />
                {cat.label}
              </Link>
            ))}

            <div style={{ height: 1, background: "rgba(242,237,230,0.08)", margin: "10px 0" }} />

            {/* La marque */}
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", marginBottom: 6 }}>
              La marque
            </div>
            {[
              { label: "Qui sommes-nous",    href: "/qui-sommes-nous" },
              { label: "Pourquoi le bambou", href: "/pourquoi-bambou" },
            ].map(l => (
              <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                style={{ padding: "14px 18px", borderRadius: 14, background: "rgba(242,237,230,0.04)", textDecoration: "none", fontSize: 17, fontWeight: 700, color: "rgba(242,237,230,0.7)", display: "block" }}>
                {l.label}
              </Link>
            ))}

            <div style={{ height: 1, background: "rgba(242,237,230,0.08)", margin: "10px 0" }} />

            {/* Compte */}
            {user ? (
              <>
                <div style={{ padding: "12px 18px", fontSize: 14, color: "rgba(242,237,230,0.45)", background: "rgba(242,237,230,0.03)", borderRadius: 12 }}>
                  Connecté : <strong style={{ color: "#f2ede6" }}>{user.email}</strong>
                </div>
                <Link href="/profil" onClick={() => setMobileOpen(false)}
                  style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(242,237,230,0.06)", textDecoration: "none", fontSize: 17, fontWeight: 800, color: "#f2ede6", display: "block" }}>
                  Mon profil &amp; commandes
                </Link>
                <button onClick={handleSignOut}
                  style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(239,68,68,0.1)", border: "none", cursor: "pointer", fontSize: 17, fontWeight: 800, color: "#ef4444", textAlign: "left", width: "100%" }}>
                  Se déconnecter
                </button>
              </>
            ) : (
              <>
                <Link href="/connexion" onClick={() => setMobileOpen(false)}
                  style={{ padding: "16px 18px", borderRadius: 14, background: "#f2ede6", textDecoration: "none", fontSize: 17, fontWeight: 900, color: "#1a1410", textAlign: "center", display: "block" }}>
                  Se connecter
                </Link>
                <Link href="/inscription" onClick={() => setMobileOpen(false)}
                  style={{ padding: "16px 18px", borderRadius: 14, border: "1px solid rgba(242,237,230,0.15)", textDecoration: "none", fontSize: 17, fontWeight: 700, color: "#f2ede6", textAlign: "center", display: "block" }}>
                  Créer un compte
                </Link>
              </>
            )}

            {/* Panier */}
            <Link href="/panier" onClick={() => setMobileOpen(false)}
              style={{ marginTop: "auto", padding: "18px 20px", borderRadius: 14, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.2)", textDecoration: "none", fontSize: 17, fontWeight: 800, color: "#c49a4a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CartIcon color="#c49a4a" size={20} />
                Mon panier
              </span>
              {totalItems > 0 && (
                <span style={{ padding: "4px 12px", borderRadius: 99, background: "#c49a4a", color: "#fff", fontSize: 14, fontWeight: 900 }}>
                  {totalItems}
                </span>
              )}
            </Link>

          </div>
        </div>
      )}
    </>
  );
}