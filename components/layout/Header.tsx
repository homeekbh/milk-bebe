"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

// ─── Icônes ───────────────────────────────────────────────────────────────────
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

// ─── Détection thème ──────────────────────────────────────────────────────────
function findThemeAtHeaderPoint(headerEl: HTMLElement | null): "dark" | "light" {
  try {
    const x = Math.floor(window.innerWidth / 2);
    const y = 90;
    const els = document.elementsFromPoint(x, y) as HTMLElement[];
    const target = els.find(el => {
      if (!el) return false;
      if (!headerEl) return true;
      return !headerEl.contains(el);
    });
    if (!target) return "light";
    const themed = target.closest("[data-theme]") as HTMLElement | null;
    const t = themed?.getAttribute("data-theme");
    if (t === "dark" || t === "light") return t;
    return "light";
  } catch {
    return "light";
  }
}

// ─── Catégories mega menu ─────────────────────────────────────────────────────
const CATS = [
  { label: "Bodies",      href: "/categorie/bodies",      desc: "L'essentiel du quotidien",      emoji: "👶" },
  { label: "Pyjamas",     href: "/categorie/pyjamas",     desc: "Pour des nuits sereines",       emoji: "🌙" },
  { label: "Gigoteuses",  href: "/categorie/gigoteuses",  desc: "Sommeil sécurisé",              emoji: "✦"  },
  { label: "Accessoires", href: "/categorie/accessoires", desc: "Les détails qui changent tout", emoji: "🌿" },
];

// ─── Header ───────────────────────────────────────────────────────────────────
export default function Header() {
  const pathname = usePathname();
  const router   = useRouter();
  const { items }       = useCart();
  const { user, signOut } = useAuth();

  const [scrolled,   setScrolled]   = useState(false);
  const [openCat,    setOpenCat]    = useState(false);
  const [openUser,   setOpenUser]   = useState(false);
  const [theme,      setTheme]      = useState<"dark" | "light">("dark");
  const [mobileOpen, setMobileOpen] = useState(false);

  const catTimer  = useRef<any>(null);
  const userTimer = useRef<any>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const compute = () => {
      const y = window.scrollY;
      setScrolled(y > 10);
      const isHome = pathname === "/";
      if (isHome && y < 320) { setTheme("dark"); return; }
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
      bg:      scrolled ? (dark ? "rgba(13,11,9,0.88)" : "rgba(245,240,232,0.92)") : "transparent",
      border:  scrolled ? (dark ? "1px solid rgba(242,237,230,0.08)" : "1px solid rgba(26,20,16,0.08)") : "1px solid transparent",
      dropBg:  dark ? "rgba(22,18,14,0.98)" : "rgba(253,250,246,0.98)",
      dropBdr: dark ? "1px solid rgba(242,237,230,0.1)" : "1px solid rgba(26,20,16,0.1)",
      amber:   "#c49a4a",
    };
  }, [theme, scrolled]);

  function delay(fn: () => void, ref: React.MutableRefObject<any>, ms = 180) {
    clearTimeout(ref.current);
    ref.current = setTimeout(fn, ms);
  }
  function cancel(ref: React.MutableRefObject<any>) { clearTimeout(ref.current); }

  async function handleSignOut() {
    await signOut();
    setOpenUser(false);
    router.push("/");
  }

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <header
        ref={el => { headerRef.current = el; }}
        style={{
          position: "fixed", top: 0, left: 0, width: "100%", zIndex: 9999,
          background: C.bg, borderBottom: C.border,
          backdropFilter: scrolled ? "blur(16px) saturate(1.5)" : "none",
          transition: "background 0.25s ease, border-color 0.25s ease",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 72, gap: 24 }}>

          {/* ── Logo ── */}
          <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }} aria-label="M!LK">
            <div style={{ width: 52, height: 52, borderRadius: 999, background: "#1a1410", border: "1px solid rgba(242,237,230,0.15)", display: "grid", placeItems: "center", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
              <span style={{ color: "#f2ede6", fontWeight: 950, letterSpacing: -1.2, fontSize: 16, lineHeight: 1 }}>M!LK</span>
            </div>
          </Link>

          {/* ── Nav desktop ── */}
          <nav style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, justifyContent: "center" }}>

            {/* Mega menu */}
            <div
              style={{ position: "relative" }}
              onMouseEnter={() => { cancel(catTimer); setOpenCat(true); }}
              onMouseLeave={() => delay(() => setOpenCat(false), catTimer)}
            >
              <button
                style={{ background: "none", border: "none", cursor: "pointer", padding: "8px 14px", borderRadius: 10, color: C.text, fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(128,128,128,0.1)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
              >
                Notre collection
                <span style={{ fontSize: 10, opacity: 0.6, transition: "transform 0.2s", transform: openCat ? "rotate(180deg)" : "none" }}>▼</span>
              </button>

              {openCat && (
                <div
                  style={{ position: "absolute", top: 52, left: "50%", transform: "translateX(-50%)", width: 520, background: C.dropBg, border: C.dropBdr, borderRadius: 20, padding: 20, boxShadow: "0 40px 80px rgba(0,0,0,0.35)", display: "grid", gap: 8 }}
                  onMouseEnter={() => { cancel(catTimer); setOpenCat(true); }}
                  onMouseLeave={() => delay(() => setOpenCat(false), catTimer)}
                >
                  <Link href="/produits" onClick={() => setOpenCat(false)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 12, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.2)", textDecoration: "none", marginBottom: 4 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 14, color: C.amber }}>Voir tous les produits</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Bodies · Pyjamas · Gigoteuses · Accessoires</div>
                    </div>
                    <span style={{ color: C.amber, fontSize: 18 }}>→</span>
                  </Link>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {CATS.map(cat => (
                      <Link key={cat.href} href={cat.href} onClick={() => setOpenCat(false)} style={{ textDecoration: "none", display: "block" }}>
                        <div
                          style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(128,128,128,0.06)", border: "1px solid rgba(128,128,128,0.08)", transition: "all 0.15s ease", cursor: "pointer" }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(196,154,74,0.08)"; el.style.borderColor = "rgba(196,154,74,0.2)"; el.style.transform = "translateY(-2px)"; }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(128,128,128,0.06)"; el.style.borderColor = "rgba(128,128,128,0.08)"; el.style.transform = "translateY(0)"; }}
                        >
                          <div style={{ fontSize: 20, marginBottom: 6 }}>{cat.emoji}</div>
                          <div style={{ fontWeight: 900, fontSize: 14, color: C.text, marginBottom: 3 }}>{cat.label}</div>
                          <div style={{ fontSize: 12, color: C.muted }}>{cat.desc}</div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                    {[
                      { label: "Pourquoi le bambou ?", href: "/pourquoi-bambou" },
                      { label: "Qui sommes-nous ?",    href: "/qui-sommes-nous" },
                    ].map(l => (
                      <Link key={l.href} href={l.href} onClick={() => setOpenCat(false)} style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(128,128,128,0.04)", textDecoration: "none", fontSize: 13, fontWeight: 700, color: C.muted, display: "block" }}>
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Liens directs */}
            {[
              { label: "Qui sommes-nous",  href: "/qui-sommes-nous" },
              { label: "Pourquoi le bambou", href: "/pourquoi-bambou" },
            ].map(l => (
              <Link key={l.href} href={l.href} style={{ color: C.text, textDecoration: "none", fontWeight: 700, fontSize: 15, padding: "8px 14px", borderRadius: 10, opacity: pathname === l.href ? 1 : 0.8, borderBottom: pathname === l.href ? `2px solid ${C.amber}` : "2px solid transparent", transition: "all 0.15s" }}>
                {l.label}
              </Link>
            ))}
          </nav>

          {/* ── Actions droite ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>

            {/* Recherche */}
            <Link
              href="/recherche"
              aria-label="Recherche"
              style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", textDecoration: "none", transition: "background 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(128,128,128,0.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
            >
              <SearchIcon color={C.text} size={20} />
            </Link>

            {/* Panier */}
            <Link
              href="/panier"
              aria-label="Panier"
              style={{ position: "relative", display: "grid", placeItems: "center", width: 42, height: 42, borderRadius: 12, textDecoration: "none", transition: "background 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(128,128,128,0.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
            >
              <CartIcon color={C.text} size={22} />
              {totalItems > 0 && (
                <span style={{ position: "absolute", top: 4, right: 4, fontSize: 10, fontWeight: 900, lineHeight: 1, background: C.amber, color: "#fff", borderRadius: 99, padding: "2px 5px", minWidth: 16, textAlign: "center" }}>
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Compte */}
            <div
              style={{ position: "relative" }}
              onMouseEnter={() => { cancel(userTimer); setOpenUser(true); }}
              onMouseLeave={() => delay(() => setOpenUser(false), userTimer)}
            >
              <button style={{ width: 42, height: 42, borderRadius: 12, background: user ? "rgba(196,154,74,0.15)" : "none", border: user ? "1px solid rgba(196,154,74,0.3)" : "1px solid transparent", cursor: "pointer", display: "grid", placeItems: "center", transition: "all 0.15s" }}>
                {user ? (
                  <span style={{ fontSize: 16, fontWeight: 900, color: C.amber }}>{(user.email ?? "?")[0].toUpperCase()}</span>
                ) : (
                  <ProfileIcon color={C.text} size={22} />
                )}
              </button>

              {openUser && (
                <div
                  style={{ position: "absolute", top: 52, right: 0, width: 220, background: C.dropBg, border: C.dropBdr, borderRadius: 16, padding: 12, boxShadow: "0 24px 60px rgba(0,0,0,0.3)", display: "grid", gap: 4 }}
                  onMouseEnter={() => { cancel(userTimer); setOpenUser(true); }}
                  onMouseLeave={() => delay(() => setOpenUser(false), userTimer)}
                >
                  {user ? (
                    <>
                      <div style={{ padding: "10px 12px", marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: C.text }}>{user.email?.split("@")[0]}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{user.email}</div>
                      </div>
                      <div style={{ height: 1, background: "rgba(128,128,128,0.1)", margin: "2px 0" }} />
                      {[
                        { label: "Mon profil",    href: "/profil"    },
                        { label: "Mes commandes", href: "/commandes" },
                        { label: "Mes adresses",  href: "/profil"    },
                      ].map(l => (
                        <Link key={l.href} href={l.href} onClick={() => setOpenUser(false)}
                          style={{ display: "block", padding: "10px 12px", borderRadius: 10, textDecoration: "none", fontSize: 14, fontWeight: 700, color: C.text, transition: "background 0.12s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(128,128,128,0.08)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                        >
                          {l.label}
                        </Link>
                      ))}
                      <div style={{ height: 1, background: "rgba(128,128,128,0.1)", margin: "2px 0" }} />
                      <button
                        onClick={handleSignOut}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#ef4444", textAlign: "left", transition: "background 0.12s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                      >
                        Se déconnecter
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ padding: "8px 12px 10px", fontSize: 13, color: C.muted }}>
                        Connecte-toi pour suivre tes commandes
                      </div>
                      <Link href="/connexion" onClick={() => setOpenUser(false)} style={{ display: "block", padding: "11px 12px", borderRadius: 10, background: "#1a1410", color: "#f2ede6", textDecoration: "none", fontSize: 14, fontWeight: 900, textAlign: "center" }}>
                        Se connecter
                      </Link>
                      <Link href="/inscription" onClick={() => setOpenUser(false)} style={{ display: "block", padding: "11px 12px", borderRadius: 10, border: "1px solid rgba(128,128,128,0.15)", textDecoration: "none", fontSize: 14, fontWeight: 700, color: C.text, textAlign: "center" }}>
                        Créer un compte
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Burger mobile */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="mobile-burger"
              aria-label="Menu"
              style={{ display: "none", width: 42, height: 42, borderRadius: 12, background: "none", border: "none", cursor: "pointer", flexDirection: "column", gap: 5, alignItems: "center", justifyContent: "center" }}
            >
              <span style={{ width: 20, height: 2, background: C.text, borderRadius: 2, transition: "all 0.2s", transform: mobileOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
              <span style={{ width: 20, height: 2, background: C.text, borderRadius: 2, opacity: mobileOpen ? 0 : 1, transition: "opacity 0.2s" }} />
              <span style={{ width: 20, height: 2, background: C.text, borderRadius: 2, transition: "all 0.2s", transform: mobileOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Menu mobile ── */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(13,11,9,0.97)", paddingTop: 90, paddingLeft: 24, paddingRight: 24, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>

          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", marginBottom: 8, marginTop: 8 }}>Collection</div>
          {[
            { label: "Tous les produits",  href: "/produits"               },
            { label: "Bodies",             href: "/categorie/bodies"       },
            { label: "Pyjamas",            href: "/categorie/pyjamas"      },
            { label: "Gigoteuses",         href: "/categorie/gigoteuses"   },
            { label: "Accessoires",        href: "/categorie/accessoires"  },
          ].map(l => (
            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(242,237,230,0.06)", textDecoration: "none", fontSize: 16, fontWeight: 800, color: "#f2ede6" }}>
              {l.label}
            </Link>
          ))}

          <div style={{ height: 1, background: "rgba(242,237,230,0.08)", margin: "8px 0" }} />
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", marginBottom: 8 }}>La marque</div>
          {[
            { label: "Qui sommes-nous",    href: "/qui-sommes-nous" },
            { label: "Pourquoi le bambou", href: "/pourquoi-bambou" },
          ].map(l => (
            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(242,237,230,0.04)", textDecoration: "none", fontSize: 16, fontWeight: 700, color: "rgba(242,237,230,0.7)" }}>
              {l.label}
            </Link>
          ))}

          <div style={{ height: 1, background: "rgba(242,237,230,0.08)", margin: "8px 0" }} />

          {/* Recherche mobile */}
          <Link href="/recherche" onClick={() => setMobileOpen(false)} style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(242,237,230,0.04)", textDecoration: "none", fontSize: 16, fontWeight: 700, color: "rgba(242,237,230,0.7)", display: "flex", alignItems: "center", gap: 10 }}>
            <SearchIcon color="rgba(242,237,230,0.7)" size={18} />
            Rechercher un produit
          </Link>

          <div style={{ height: 1, background: "rgba(242,237,230,0.08)", margin: "8px 0" }} />

          {user ? (
            <>
              <div style={{ padding: "12px 16px", fontSize: 14, color: "rgba(242,237,230,0.45)" }}>
                Connecté en tant que <strong style={{ color: "#f2ede6" }}>{user.email}</strong>
              </div>
              <Link href="/profil" onClick={() => setMobileOpen(false)} style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(242,237,230,0.06)", textDecoration: "none", fontSize: 16, fontWeight: 800, color: "#f2ede6" }}>
                Mon profil
              </Link>
              <button onClick={handleSignOut} style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(239,68,68,0.1)", border: "none", cursor: "pointer", fontSize: 16, fontWeight: 800, color: "#ef4444", textAlign: "left" }}>
                Se déconnecter
              </button>
            </>
          ) : (
            <>
              <Link href="/connexion" onClick={() => setMobileOpen(false)} style={{ padding: "14px 16px", borderRadius: 12, background: "#f2ede6", textDecoration: "none", fontSize: 16, fontWeight: 900, color: "#1a1410", textAlign: "center", display: "block" }}>
                Se connecter
              </Link>
              <Link href="/inscription" onClick={() => setMobileOpen(false)} style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(242,237,230,0.15)", textDecoration: "none", fontSize: 16, fontWeight: 700, color: "#f2ede6", textAlign: "center", display: "block" }}>
                Créer un compte
              </Link>
            </>
          )}

          <Link href="/panier" onClick={() => setMobileOpen(false)} style={{ marginTop: 8, padding: "14px 16px", borderRadius: 12, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.2)", textDecoration: "none", fontSize: 16, fontWeight: 800, color: "#c49a4a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Mon panier</span>
            {totalItems > 0 && (
              <span style={{ padding: "3px 10px", borderRadius: 99, background: "#c49a4a", color: "#fff", fontSize: 13, fontWeight: 900 }}>{totalItems}</span>
            )}
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .mobile-burger { display: flex !important; }
          nav { display: none !important; }
        }
      `}</style>
    </>
  );
}