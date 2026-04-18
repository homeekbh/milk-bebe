"use client";

import { usePathname, useRouter } from "next/navigation";
import Link         from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import SearchGlobal from "@/components/admin/SearchGlobal";

const NAV = [
  { href: "/admin",              label: "Dashboard",    icon: "▦"  },
  { href: "/admin/produits",     label: "Produits",     icon: "🏷" },
  { href: "/admin/commandes",    label: "Commandes",    icon: "📦" },
  { href: "/admin/clients",      label: "Clients",      icon: "👥" },
  { href: "/admin/codes-promos", label: "Codes promos", icon: "🎟" },
  { href: "/admin/avis",         label: "Avis",         icon: "★"  },
  { href: "/admin/popups",       label: "Pop-ups",      icon: "💬" },
  { href: "/admin/newsletter",   label: "Newsletter",   icon: "📧" },
  { href: "/admin/comptabilite", label: "Comptabilité", icon: "📊" },
  { href: "/admin/logs",         label: "Activité",     icon: "📋" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [checking, setChecking] = useState(true);
  const [allowed,  setAllowed]  = useState(false);
  const [email,    setEmail]    = useState("");
  const [mobile,   setMobile]   = useState(false);
  const [open,     setOpen]     = useState(false);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setChecking(false);
      setAllowed(true);
      return;
    }

    async function verify() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/admin/login?redirect=" + encodeURIComponent(pathname);
        return;
      }

      // Vérifier is_admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .single();

      if (!profile?.is_admin) {
        window.location.href = "/admin/login";
        return;
      }

      setEmail(session.user.email ?? "");
      setAllowed(true);
      setChecking(false);
    }

    verify();
  }, [pathname]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // Page login — pas de layout
  if (pathname === "/admin/login") return <>{children}</>;

  // Vérification en cours
  if (checking) {
    return (
      <div style={{ minHeight: "100vh", background: "#1a1410", display: "grid", placeItems: "center" }}>
        <div style={{ color: "rgba(242,237,230,0.4)", fontSize: 16 }}>Vérification...</div>
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f0e8" }}>

      {/* ── Sidebar desktop ── */}
      <aside style={{ width: 240, flexShrink: 0, background: "#1a1410", display: mobile ? "none" : "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, bottom: 0, overflowY: "auto", zIndex: 100 }}>

        <div style={{ padding: "24px 20px", borderBottom: "1px solid rgba(242,237,230,0.08)" }}>
          <div style={{ background: "#c49a4a", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#1a1410", fontWeight: 950, fontSize: 22, letterSpacing: -1 }}>M!LK</span>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "rgba(26,20,16,0.6)" }}>ADMIN</span>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "16px 12px" }}>
          {NAV.map(item => {
            const active = item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 12, marginBottom: 4, textDecoration: "none", background: active ? "rgba(196,154,74,0.15)" : "transparent", color: active ? "#c49a4a" : "rgba(242,237,230,0.55)", fontWeight: 700, fontSize: 14, transition: "all 0.15s" }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(242,237,230,0.08)", display: "grid", gap: 6 }}>
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(242,237,230,0.06)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(242,237,230,0.4)", marginBottom: 2 }}>Admin connecté</div>
            <div style={{ fontSize: 11, color: "rgba(242,237,230,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>
          </div>
          <Link href="/" target="_blank"
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, textDecoration: "none", color: "rgba(242,237,230,0.35)", fontSize: 13, fontWeight: 700 }}>
            ↗ Voir le site
          </Link>
          <button onClick={handleSignOut}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)", color: "#f87171", fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%" }}>
            ⇥ Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Drawer mobile ── */}
      {mobile && open && (
        <div onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 260, height: "100%", background: "#1a1410", padding: "24px 12px", display: "flex", flexDirection: "column", overflowY: "auto" }}>
            <div style={{ background: "#c49a4a", borderRadius: 14, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#1a1410", fontWeight: 950, fontSize: 22 }}>M!LK</span>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "rgba(26,20,16,0.6)" }}>ADMIN</span>
            </div>
            {NAV.map(item => {
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 12, marginBottom: 4, textDecoration: "none", background: active ? "rgba(196,154,74,0.15)" : "transparent", color: active ? "#c49a4a" : "rgba(242,237,230,0.55)", fontWeight: 700, fontSize: 14 }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
            <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(242,237,230,0.08)", display: "grid", gap: 8 }}>
              <button onClick={handleSignOut}
                style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(220,38,38,0.1)", border: "none", color: "#f87171", fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
                ⇥ Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Contenu ── */}
      <div style={{ flex: 1, marginLeft: mobile ? 0 : 240, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

        <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(245,240,232,0.95)", backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(26,20,16,0.08)", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 16 }}>
          {mobile && (
            <button onClick={() => setOpen(true)}
              style={{ padding: "8px 12px", borderRadius: 10, background: "#1a1410", color: "#f2ede6", border: "none", cursor: "pointer", fontSize: 18, flexShrink: 0 }}>
              ☰
            </button>
          )}
          <SearchGlobal />
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
            <Link href="/produits" target="_blank"
              style={{ padding: "7px 14px", borderRadius: 8, background: "rgba(26,20,16,0.08)", color: "rgba(26,20,16,0.6)", fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
              ↗ Voir site
            </Link>
            <div style={{ width: 32, height: 32, borderRadius: 99, background: "#c49a4a", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 950, color: "#1a1410" }}>
              {email.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}