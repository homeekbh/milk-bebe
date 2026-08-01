"use client";
import React from "react";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase-client";
import SearchGlobal from "@/components/admin/SearchGlobal";
import { MilkLogo } from "@/components/shared/MilkLogo";
import OrderAlerts from "@/components/admin/OrderAlerts";

// PURE RÉORGANISATION (lot 3a) : même ensemble de routes, regroupées en sections.
//   - `section` : titre de groupe rendu AU-DESSUS de cette entrée (1re de son groupe).
//   - `soon`    : entrée visible mais NON cliquable (route pas encore créée).
type NavItem = {
  href: string; label: string; icon: string;
  badgeKey?: "reviewsPending" | "commandesPending";
  section?: string;
  soon?: boolean;
};
const NAV: NavItem[] = [
  { href: "/admin",              label: "Accueil",      icon: "▦"  },

  { href: "/admin/commandes",    label: "Commandes",    icon: "📦", badgeKey: "commandesPending", section: "Ventes" },
  { href: "/admin/stock",        label: "Stock",        icon: "📦" },
  { href: "/admin/clients",      label: "Clients",      icon: "👥" },
  { href: "/admin/comptes",      label: "Comptes",      icon: "🆕" },

  { href: "/admin/produits",     label: "Produits",     icon: "🏷", section: "Catalogue" },
  { href: "/admin/packs",        label: "Packs",        icon: "🎁" },
  { href: "/admin/categories",   label: "Catégories",   icon: "📂" },

  { href: "/admin/codes-promos", label: "Codes promos", icon: "🎟", section: "Marketing" },
  { href: "/admin/parrainage",   label: "Parrainage",   icon: "🎁" },
  { href: "/admin/newsletter",   label: "Newsletter",   icon: "📧" },
  { href: "/admin/popups",       label: "Pop-ups",      icon: "💬" },

  { href: "/admin/homepage",     label: "Homepage",     icon: "🏠", section: "Contenu" },
  { href: "/admin/blog",         label: "Journal",      icon: "✍️" },
  { href: "/admin/avis",         label: "Avis",         icon: "★",  badgeKey: "reviewsPending" },

  { href: "/admin/analytics",    label: "Statistiques", icon: "📈", section: "Pilotage" },
  { href: "/admin/comptabilite", label: "Comptabilité", icon: "📊" },
  { href: "/admin/factures",     label: "Factures",     icon: "🧾" },
  { href: "/admin/logs",         label: "Activité",     icon: "📋" },
];

// Titre de section : discret, filet 1px au-dessus, non cliquable.
const SECTION_TITLE_STYLE: React.CSSProperties = {
  marginTop: 12, paddingTop: 12, paddingLeft: 12, paddingRight: 12, marginBottom: 4,
  borderTop: "1px solid rgba(242,237,230,0.08)",
  fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase",
  color: "rgba(242,237,230,0.35)",
};

// ── Layout Admin ──────────────────────────────────────────────────────────────
// TODO (C2 — backlog post-launch) : migrer l'auth admin vers @supabase/ssr
// (session en cookies httpOnly). Actuellement le JWT est en localStorage (lu par
// hooks/useAdminFetch.ts) → vol possible via XSS, et la protection server-side
// (proxy.ts) est désactivée car l'Edge ne voit pas la session localStorage.
// Migration cookies → réactiver le bloc /admin dans proxy.ts + sortir le token
// du localStorage. Réf : https://supabase.com/docs/guides/auth/server-side-rendering
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [mobile,    setMobile]    = useState(false);
  const [open,      setOpen]      = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [checking,  setChecking]  = useState(true);
  const [badges,    setBadges]    = useState<{ reviewsPending: number; commandesPending: number }>({ reviewsPending: 0, commandesPending: 0 });
  const headerRoRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    // Mobile si petit en largeur (<900) OU téléphone en paysage (hauteur ≤ 500 +
    // large > haut) — sinon un iPhone Pro Max paysage (~932px) garderait la sidebar
    // desktop. Tablettes/desktop (hauteur > 500) non affectés.
    const check = () => setMobile(window.innerWidth < 900 || (window.innerHeight <= 500 && window.innerWidth > window.innerHeight));
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => { window.removeEventListener("resize", check); window.removeEventListener("orientationchange", check); };
  }, []);

  // Mesure la hauteur RÉELLE du header et l'expose en variable CSS --admin-header-h,
  // que la barre période sticky de /admin/analytics lit (top: var(--admin-header-h)).
  // ⚠️ Callback ref (pas un useEffect à deps []) : il se déclenche au MONTAGE RÉEL
  // du <header> (après l'auth checking→false) et recalcule via ResizeObserver.
  const setHeaderRef = useCallback((el: HTMLElement | null) => {
    headerRoRef.current?.disconnect();
    headerRoRef.current = null;
    if (!el) return;
    const setVar = () => document.documentElement.style.setProperty("--admin-header-h", `${el.offsetHeight}px`);
    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    headerRoRef.current = ro;
  }, []);

  useEffect(() => {
    if (pathname === "/admin/login") { setChecking(false); return; }
    // 🛡 Try/catch obligatoire — sans ça, une RLS qui throw ou un signOut qui
    // échoue laisse checking=true → spinner 'Vérification des droits...' infini.
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          // Hard reload — purge le client Supabase mémoire pour éviter
          // que la login page re-détecte une session fantôme et reboucle.
          window.location.href = `/admin/login?redirect=${encodeURIComponent(pathname)}`;
          return;
        }
        const { data: profile } = await supabase
          .from("profiles").select("is_admin").eq("id", session.user.id).single();
        if (!profile?.is_admin) {
          await supabase.auth.signOut().catch(() => {});
          window.location.href = "/admin/login";
          return;
        }
        setUserEmail(session.user.email ?? "");
        setChecking(false);
      } catch (e) {
        // En cas d'erreur réseau / RLS : on coupe la session et on bounce
        // au login (qui dégradera vers le formulaire grâce à son propre try/catch).
        if (process.env.NODE_ENV !== "production") console.warn("[admin/layout] auth probe error:", e);
        await supabase.auth.signOut().catch(() => {});
        window.location.href = "/admin/login";
      }
    })();
  }, [pathname, router]);

  // Charge périodiquement les compteurs "à traiter" pour les badges NAV
  useEffect(() => {
    if (checking) return;
    const loadBadges = async () => {
      try {
        const { count: reviewsPending } = await supabase
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .eq("approved", false);
        const { count: commandesPending } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "payee")
          .in("shipping_status", ["en_preparation", "processing", ""]);
        setBadges({
          reviewsPending:   reviewsPending   ?? 0,
          commandesPending: commandesPending ?? 0,
        });
      } catch {}
    };
    loadBadges();
    const t = setInterval(loadBadges, 60_000);
    return () => clearInterval(t);
  }, [checking]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (pathname === "/admin/login") return <>{children}</>;
  if (checking) return (
    <div style={{ minHeight: "100vh", background: "#1a1410", display: "grid", placeItems: "center" }}>
      <div style={{ color: "#c49a4a", fontSize: 14, fontWeight: 700 }}>Vérification des droits...</div>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#ede8df" }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 220, flexShrink: 0, background: "#1a1410", display: mobile ? "none" : "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, bottom: 0, overflowY: "auto", zIndex: 100 }}>
        <div style={{ padding: "20px 16px 12px" }}>
          <div style={{ background: "#c49a4a", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <MilkLogo color="#1a1410" size={20} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "rgba(26,20,16,0.6)" }}>ADMIN</span>
          </div>
        </div>

        {/* ── Identité compte + lien site (A7.A2) ── */}
        <div style={{ padding: "0 16px 12px", borderBottom: "1px solid rgba(242,237,230,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 99, background: "#c49a4a", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 950, color: "#1a1410", flexShrink: 0 }}>
            {userEmail.slice(0, 1).toUpperCase() || "A"}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11, color: "rgba(242,237,230,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail || "Admin"}</div>
            <Link href="/" target="_blank" style={{ fontSize: 11, fontWeight: 700, color: "#c49a4a", textDecoration: "none" }}>↗ Voir le site</Link>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "14px 10px" }}>
          {NAV.map(item => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            const count = item.badgeKey ? badges[item.badgeKey] : 0;
            const title = item.section ? <div style={SECTION_TITLE_STYLE}>{item.section}</div> : null;
            // Stock (soon) : visible mais NON cliquable — aucune route, aucun 404 possible.
            if (item.soon) return (
              <React.Fragment key={item.href}>
                {title}
                <div aria-disabled="true" title="Bientôt disponible"
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 10, marginBottom: 2, color: "rgba(242,237,230,0.3)", fontWeight: 700, fontSize: 14, cursor: "default" }}>
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", border: "1px solid rgba(242,237,230,0.12)", borderRadius: 6, padding: "2px 6px" }}>Bientôt</span>
                </div>
              </React.Fragment>
            );
            return (
              <React.Fragment key={item.href}>
                {title}
                <Link href={item.href}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 10, marginBottom: 2, textDecoration: "none", background: active ? "rgba(196,154,74,0.15)" : "transparent", color: active ? "#c49a4a" : "rgba(242,237,230,0.55)", fontWeight: 700, fontSize: 14, transition: "all 0.15s" }}>
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {count > 0 && (
                    <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 99, background: "#dc2626", color: "#fff", fontSize: 11, fontWeight: 900, display: "grid", placeItems: "center" }}>
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </Link>
              </React.Fragment>
            );
          })}
        </nav>
        <div style={{ padding: "14px 10px", borderTop: "1px solid rgba(242,237,230,0.08)" }}>
          <button onClick={handleSignOut}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)", color: "#f87171", fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%" }}>
            ⇥ Déconnexion
          </button>
        </div>
      </aside>

      {/* ── SIDEBAR MOBILE ── */}
      {mobile && open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 260, height: "100%", background: "#1a1410", padding: "20px 12px", display: "flex", flexDirection: "column", overflowY: "auto" }}>
            <div style={{ background: "#c49a4a", borderRadius: 12, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <MilkLogo color="#1a1410" size={20} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "rgba(26,20,16,0.6)" }}>ADMIN</span>
            </div>
            <div style={{ marginBottom: 12, fontSize: 11, color: "rgba(242,237,230,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userEmail || "Admin"} · <Link href="/" target="_blank" style={{ color: "#c49a4a", textDecoration: "none" }}>↗ Voir le site</Link>
            </div>
            {NAV.map(item => {
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              const count = item.badgeKey ? badges[item.badgeKey] : 0;
              const title = item.section ? <div style={SECTION_TITLE_STYLE}>{item.section}</div> : null;
              // Stock (soon) : visible mais NON cliquable — aucune route, aucun 404 possible.
              if (item.soon) return (
                <React.Fragment key={item.href}>
                  {title}
                  <div aria-disabled="true" title="Bientôt disponible"
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 10, marginBottom: 2, color: "rgba(242,237,230,0.3)", fontWeight: 700, fontSize: 14, cursor: "default" }}>
                    <span>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(242,237,230,0.3)", border: "1px solid rgba(242,237,230,0.12)", borderRadius: 6, padding: "2px 6px" }}>Bientôt</span>
                  </div>
                </React.Fragment>
              );
              return (
                <React.Fragment key={item.href}>
                  {title}
                  <Link href={item.href} onClick={() => setOpen(false)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 10, marginBottom: 2, textDecoration: "none", background: active ? "rgba(196,154,74,0.15)" : "transparent", color: active ? "#c49a4a" : "rgba(242,237,230,0.55)", fontWeight: 700, fontSize: 14 }}>
                    <span>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {count > 0 && (
                      <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 99, background: "#dc2626", color: "#fff", fontSize: 11, fontWeight: 900, display: "grid", placeItems: "center" }}>
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </Link>
                </React.Fragment>
              );
            })}
            <button onClick={handleSignOut}
              style={{ marginTop: "auto", padding: "10px 14px", borderRadius: 10, background: "rgba(220,38,38,0.1)", border: "none", color: "#f87171", fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
              ⇥ Déconnexion
            </button>
          </div>
        </div>
      )}

      {/* ── CONTENU ── */}
      <div style={{ flex: 1, marginLeft: mobile ? 0 : 220, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

        {/* ── HEADER SOMBRE SLIM : recherche uniquement (Lot A7.A) ── */}
        <header ref={setHeaderRef} style={{ position: "sticky", top: 0, zIndex: 50, background: "#0d0b09", borderBottom: "1px solid rgba(242,237,230,0.08)", padding: "0 20px", minHeight: 60, display: "flex", alignItems: "center", gap: 16 }}>
          {mobile && (
            <button onClick={() => setOpen(true)}
              style={{ padding: "8px 12px", borderRadius: 10, background: "#c49a4a", color: "#1a1410", border: "none", cursor: "pointer", fontSize: 18, flexShrink: 0 }}>
              ☰
            </button>
          )}
          <div style={{ flex: 1, minWidth: 120 }}>
            <SearchGlobal dark />
          </div>
        </header>

        <OrderAlerts />
        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
