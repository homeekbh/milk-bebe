"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
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
  const { user, signOut } = useAuth();

  const [scrolled,   setScrolled]   = useState(false);
  const [openUser,   setOpenUser]   = useState(false);
  const [theme,      setTheme]      = useState<"dark"|"light">("dark");
  const [mobileOpen, setMobileOpen] = useState(false);

  const userTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const compute = () => {
      const y = window.scrollY;
      setScrolled(y > 10);
      if (["/", "/qui-sommes-nous", "/pourquoi-bambou"].includes(pathname) && y < 320) {
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

  const C = useMemo(() => {
    const dark = theme === "dark";
    return {
      text:    dark ? "#f2ede6" : "#1a1410",
      muted:   dark ? "rgba(242,237,230,0.6)" : "rgba(26,20,16,0.55)",
      bg:      scrolled ? (dark ? "rgba(13,11,9,0.93)" : "rgba(245,240,232,0.96)") : "transparent",
      border:  scrolled ? (dark ? "1px solid rgba(242,237,230,0.08)" : "1px solid rgba(26,20,16,0.08)") : "1px solid transparent",
      dropBg:  dark ? "rgba(22,18,14,0.98)" : "rgba(253,250,246,0.98)",
      dropBdr: dark ? "1px solid rgba(242,237,230,0.1)" : "1px solid rgba(26,20,16,0.1)",
      amber:   "#c49a4a",
    };
  }, [theme, scrolled]);

  function cancel() { if (userTimer.current) clearTimeout(userTimer.current); }
  function delay(fn: () => void, ms = 180) { cancel(); userTimer.current = setTimeout(fn, ms); }

  async function handleSignOut() { await signOut(); setOpenUser(false); router.push("/"); }

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
        style={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 9999, overflowX: "hidden", background: C.bg, borderBottom: C.border, backdropFilter: scrolled ? "blur(16px) saturate(1.5)" : "none", transition: "background 0.25s, border-color 0.25s" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", padding: "0 clamp(8px,3vw,20px)", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68, gap: 16 }}>

          {/* ✅ Logo — clic scroll to top */}
          <Link
            href="/"
            aria-label="M!LK — Accueil"
            style={{ textDecoration: "none", flexShrink: 0 }}
            onClick={() => { if (typeof window !== "undefined" && window.scrollY > 0) window.scrollTo({ top: 0, behavior: "smooth" }); }}
          >
            <div style={{ display: "flex", alignItems: "baseline", background: "transparent", borderRadius: 10, padding: "4px 2px" }}>
              <span style={{ color: C.text, fontWeight: 950, fontSize: 22, letterSpacing: -1, lineHeight: 1 }}>M</span>
              <span style={{ color: C.text, fontWeight: 950, fontSize: 28, letterSpacing: -1, lineHeight: 1, display: "inline-block", transform: "translateY(-3px)" }}>!</span>
              <span style={{ color: C.text, fontWeight: 950, fontSize: 22, letterSpacing: -1, lineHeight: 1 }}>LK</span>
            </div>
          </Link>

          {/* Nav desktop */}
          <nav className="milk-nav" style={{ alignItems: "center", gap: 4, flex: 1, justifyContent: "center" }}>
            {[
              { label: "Notre collection",   href: "/produits",         active: pathname.startsWith("/produits") || pathname.startsWith("/categorie") },
              { label: "Qui sommes-nous",    href: "/qui-sommes-nous",  active: pathname === "/qui-sommes-nous" },
              { label: "Pourquoi le bambou", href: "/pourquoi-bambou",  active: pathname === "/pourquoi-bambou" },
            ].map(l => (
              <Link key={l.href} href={l.href} className="hdr-link"
                style={{ color: C.text, textDecoration: "none", fontWeight: 700, fontSize: 15, padding: "8px 16px", borderRadius: 10, opacity: l.active ? 1 : 0.85, borderBottom: l.active ? `2px solid ${C.amber}` : "2px solid transparent", transition: "all 0.15s", display: "inline-block", whiteSpace: "nowrap" }}>
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Actions desktop — ✅ SANS sélecteur de langue */}
          <div className="milk-desktop" style={{ alignItems: "center", gap: 8, flexShrink: 0 }}>
            <Link href="/recherche" aria-label="Recherche" className="hdr-icon"
              style={{ width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", textDecoration: "none" }}>
              <SearchIcon color={C.text} size={20} />
            </Link>

            <Link href="/panier" aria-label="Panier" className="hdr-icon"
              style={{ position: "relative", width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", textDecoration: "none" }}>
              <CartIcon color={C.text} size={22} />
              {totalItems > 0 && <span style={{ position: "absolute", top: 4, right: 4, fontSize: 10, fontWeight: 900, background: C.amber, color: "#fff", borderRadius: 99, padding: "2px 5px", minWidth: 16, textAlign: "center", lineHeight: 1.4 }}>{totalItems}</span>}
            </Link>

            <div style={{ position: "relative" }}
              onMouseEnter={() => { cancel(); setOpenUser(true); }}
              onMouseLeave={() => delay(() => setOpenUser(false))}>
              <button className="hdr-icon"
                style={{ width: 40, height: 40, borderRadius: 10, background: user ? "rgba(196,154,74,0.15)" : "none", border: user ? "1px solid rgba(196,154,74,0.3)" : "1px solid transparent", cursor: "pointer", display: "grid", placeItems: "center" }}>
                {user ? <span style={{ fontSize: 16, fontWeight: 900, color: C.amber }}>{(user.email ?? "?")[0].toUpperCase()}</span> : <ProfileIcon color={C.text} size={22} />}
              </button>

              {openUser && (
                <div
                  onMouseEnter={() => { cancel(); setOpenUser(true); }}
                  onMouseLeave={() => delay(() => setOpenUser(false))}
                  style={{ position: "absolute", top: 52, right: 0, width: 230, background: C.dropBg, border: C.dropBdr, borderRadius: 16, padding: 12, boxShadow: "0 24px 60px rgba(0,0,0,0.3)", display: "grid", gap: 4, zIndex: 100 }}>
                  {user ? (
                    <>
                      <div style={{ padding: "10px 12px 8px" }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>{user.email?.split("@")[0]}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{user.email}</div>
                      </div>
                      <div style={{ height: 1, background: "rgba(128,128,128,0.1)", margin: "2px 0" }} />
                      {[
                        { label: "Mon profil",    href: "/profil" },
                        { label: "Mes commandes", href: "/profil" },
                      ].map(item => (
                        <Link key={item.label} href={item.href} onClick={() => setOpenUser(false)}
                          style={{ display: "block", padding: "11px 12px", borderRadius: 10, textDecoration: "none", fontSize: 15, fontWeight: 700, color: C.text }}
                          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(128,128,128,0.08)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}>
                          {item.label}
                        </Link>
                      ))}
                      <div style={{ height: 1, background: "rgba(128,128,128,0.1)", margin: "2px 0" }} />
                      <button onClick={handleSignOut}
                        style={{ width: "100%", padding: "11px 12px", borderRadius: 10, background: "none", border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, color: "#ef4444", textAlign: "left" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
                        Se déconnecter
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ padding: "8px 12px 8px", fontSize: 13, color: C.muted }}>Connecte-toi pour suivre tes commandes</div>
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
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", marginBottom: 4 }}>Collection</div>
            <Link href="/produits" onClick={() => setMobileOpen(false)}
              style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.2)", textDecoration: "none", fontSize: 17, fontWeight: 900, color: "#c49a4a", display: "flex", alignItems: "center", gap: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h18" stroke="#c49a4a" strokeWidth="2" strokeLinecap="round"/></svg>
              Tous les produits
            </Link>
            {CATS.map(cat => (
              <Link key={cat.href} href={cat.href} onClick={() => setMobileOpen(false)}
                style={{ padding: "14px 18px", borderRadius: 14, background: "rgba(242,237,230,0.05)", textDecoration: "none", fontSize: 17, fontWeight: 800, color: "#f2ede6", display: "flex", alignItems: "center", gap: 12 }}>
                <cat.Icon c="rgba(242,237,230,0.6)" />
                {cat.label}
              </Link>
            ))}
            <div style={{ height: 1, background: "rgba(242,237,230,0.08)", margin: "8px 0" }} />
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", marginBottom: 4 }}>La marque</div>
            {[
              { label: "Qui sommes-nous",    href: "/qui-sommes-nous" },
              { label: "Pourquoi le bambou", href: "/pourquoi-bambou" },
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
                  Connecté : <strong style={{ color: "#f2ede6" }}>{user.email}</strong>
                </div>
                <Link href="/profil" onClick={() => setMobileOpen(false)}
                  style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(242,237,230,0.05)", textDecoration: "none", fontSize: 17, fontWeight: 800, color: "#f2ede6" }}>
                  Mon profil & commandes
                </Link>
                <button onClick={handleSignOut}
                  style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(239,68,68,0.1)", border: "none", cursor: "pointer", fontSize: 17, fontWeight: 800, color: "#ef4444", textAlign: "left", width: "100%" }}>
                  Se déconnecter
                </button>
              </>
            ) : (
              <>
                <Link href="/connexion" onClick={() => setMobileOpen(false)}
                  style={{ padding: "16px 18px", borderRadius: 14, background: "#f2ede6", textDecoration: "none", fontSize: 17, fontWeight: 900, color: "#1a1410", textAlign: "center" }}>
                  Se connecter
                </Link>
                <Link href="/inscription" onClick={() => setMobileOpen(false)}
                  style={{ padding: "16px 18px", borderRadius: 14, border: "1px solid rgba(242,237,230,0.15)", textDecoration: "none", fontSize: 17, fontWeight: 700, color: "#f2ede6", textAlign: "center" }}>
                  Créer un compte
                </Link>
              </>
            )}
            <Link href="/panier" onClick={() => setMobileOpen(false)}
              style={{ marginTop: "auto", padding: "18px 20px", borderRadius: 14, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.2)", textDecoration: "none", fontSize: 17, fontWeight: 800, color: "#c49a4a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}><CartIcon color="#c49a4a" size={20} />Mon panier</span>
              {totalItems > 0 && <span style={{ padding: "4px 12px", borderRadius: 99, background: "#c49a4a", color: "#fff", fontSize: 14, fontWeight: 900 }}>{totalItems}</span>}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}