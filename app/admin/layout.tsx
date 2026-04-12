"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const s: React.CSSProperties = { width: size, height: size, display: "inline-block", flexShrink: 0 };
  const stroke = "currentColor";
  const sw = "2";
  const sc = "round";

  const icons: Record<string, React.ReactElement> = {
    dashboard: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap={sc} strokeLinejoin={sc}>
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
    ),
    products: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap={sc} strokeLinejoin={sc}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
    orders: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap={sc} strokeLinejoin={sc}>
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
    ),
    clients: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap={sc} strokeLinejoin={sc}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    promos: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap={sc} strokeLinejoin={sc}>
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
        <line x1="7" y1="7" x2="7.01" y2="7"/>
      </svg>
    ),
    popups: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap={sc} strokeLinejoin={sc}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    newsletter: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap={sc} strokeLinejoin={sc}>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
    analytics: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap={sc} strokeLinejoin={sc}>
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6"  y1="20" x2="6"  y2="14"/>
      </svg>
    ),
    exports: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap={sc} strokeLinejoin={sc}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    ),
    alerts: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap={sc} strokeLinejoin={sc}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9"  x2="12"    y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    back: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap={sc} strokeLinejoin={sc}>
        <line x1="19" y1="12" x2="5" y2="12"/>
        <polyline points="12 19 5 12 12 5"/>
      </svg>
    ),
    menu: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap={sc} strokeLinejoin={sc}>
        <line x1="3" y1="6"  x2="21" y2="6"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    ),
    close: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap={sc} strokeLinejoin={sc}>
        <line x1="18" y1="6"  x2="6"  y2="18"/>
        <line x1="6"  y1="6"  x2="18" y2="18"/>
      </svg>
    ),
  };

  return icons[name] ?? null;
}

const NAV = [
  { label: "Dashboard",     href: "/admin",            icon: "dashboard"  },
  { label: "Produits",      href: "/admin/produits",   icon: "products"   },
  { label: "Commandes",     href: "/admin/commandes",  icon: "orders"     },
  { label: "Clients",       href: "/admin/clients",    icon: "clients"    },
  { label: "Codes promos",  href: "/admin/promos",     icon: "promos"     },
  { label: "Pop-ups",       href: "/admin/popups",     icon: "popups"     },
  { label: "Newsletter",    href: "/admin/newsletter", icon: "newsletter" },
  { label: "Analytics",     href: "/admin/analytics",  icon: "analytics"  },
  { label: "Exports",       href: "/admin/exports",    icon: "exports"    },
  { label: "Alertes stock", href: "/admin/alerts",     icon: "alerts"     },
];

function NavContent({ path, onClose }: { path: string; onClose?: () => void }) {
  return (
    <>
      {/* Logo */}
      <div style={{
        padding: "24px 20px 20px",
        borderBottom: "1px solid rgba(242,237,230,0.08)",
      }}>
        <div style={{
          background: "#c49a4a",
          borderRadius: 18,
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}>
          <div style={{ fontSize: 38, fontWeight: 950, letterSpacing: -2, color: "#1a1410", lineHeight: 1 }}>
            M!LK
          </div>
          <div style={{
            background: "#1a1410", color: "#c49a4a",
            fontSize: 10, fontWeight: 900, letterSpacing: 3,
            padding: "3px 10px", borderRadius: 5,
            textTransform: "uppercase", width: "fit-content",
          }}>
            ADMIN
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2, flex: 1, overflowY: "auto" }}
        className="admin-nav">
        {NAV.map(({ label, href, icon }) => {
          const active = path === href || (href !== "/admin" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              style={{
                padding: "13px 16px",
                borderRadius: 12,
                color:      active ? "#1a1410"              : "rgba(242,237,230,0.7)",
                background: active ? "#c49a4a"              : "transparent",
                textDecoration: "none",
                fontSize: 16,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: 12,
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={e => {
                if (!active) {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = "rgba(196,154,74,0.15)";
                  el.style.color = "#f2ede6";
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = "transparent";
                  el.style.color = "rgba(242,237,230,0.7)";
                }
              }}
            >
              <Icon name={icon} size={20} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Retour au site */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(242,237,230,0.08)" }}>
        <Link href="/" onClick={onClose} style={{
          padding: "12px 16px", borderRadius: 12,
          color: "rgba(242,237,230,0.4)", textDecoration: "none",
          fontSize: 15, fontWeight: 700,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <Icon name="back" size={18} />
          Retour au site
        </Link>
      </div>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Nom de la page active pour la topbar mobile
  const activePage = NAV.find(n => n.href === path || (n.href !== "/admin" && path.startsWith(n.href)))?.label ?? "Admin";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f0e8" }}>

      <style>{`
        /* Scrollbar invisible */
        .admin-nav::-webkit-scrollbar { display: none; }
        .admin-nav { -ms-overflow-style: none; scrollbar-width: none; }

        /* Desktop : sidebar fixe visible */
        .admin-sidebar-desktop {
          display: flex;
          flex-direction: column;
          width: 260px;
          background: #1a1410;
          color: #f2ede6;
          position: fixed;
          top: 0; left: 0;
          height: 100vh;
          z-index: 100;
          box-shadow: 4px 0 24px rgba(0,0,0,0.25);
        }

        /* Mobile topbar */
        .admin-topbar-mobile {
          display: none;
        }

        /* Mobile overlay menu */
        .admin-drawer {
          display: none;
        }

        /* Main content */
        .admin-main {
          margin-left: 260px;
          flex: 1;
          min-height: 100vh;
          background: #f5f0e8;
        }

        @media (max-width: 768px) {
          /* Cache la sidebar desktop */
          .admin-sidebar-desktop {
            display: none !important;
          }

          /* Affiche la topbar mobile */
          .admin-topbar-mobile {
            display: flex !important;
            position: fixed;
            top: 0; left: 0; right: 0;
            height: 60px;
            background: #1a1410;
            z-index: 200;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.3);
          }

          /* Main content sans marge latérale, avec padding top pour la topbar */
          .admin-main {
            margin-left: 0 !important;
            padding-top: 60px;
          }

          /* Drawer menu mobile */
          .admin-drawer {
            display: flex !important;
            flex-direction: column;
            position: fixed;
            top: 0; left: 0;
            width: 280px;
            height: 100vh;
            background: #1a1410;
            z-index: 300;
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(.22,1,.36,1);
            box-shadow: 4px 0 32px rgba(0,0,0,0.4);
          }
          .admin-drawer.open {
            transform: translateX(0) !important;
          }

          /* Overlay sombre derrière le drawer */
          .admin-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            z-index: 250;
          }
          .admin-overlay.open {
            display: block !important;
          }
        }
      `}</style>

      {/* ── SIDEBAR DESKTOP ── */}
      <aside className="admin-sidebar-desktop">
        <NavContent path={path} />
      </aside>

      {/* ── TOPBAR MOBILE ── */}
      <div className="admin-topbar-mobile">
        {/* Bouton burger */}
        <button
          onClick={() => setMenuOpen(true)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#c49a4a", padding: 4, display: "flex", alignItems: "center" }}
        >
          <Icon name="menu" size={26} />
        </button>

        {/* Logo centré */}
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          <div style={{
            background: "#c49a4a", borderRadius: 10,
            padding: "6px 14px",
            fontSize: 20, fontWeight: 950, letterSpacing: -1, color: "#1a1410",
          }}>
            M!LK
          </div>
        </div>

        {/* Nom de la page */}
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(242,237,230,0.5)" }}>
          {activePage}
        </div>
      </div>

      {/* ── OVERLAY MOBILE ── */}
      <div
        className={`admin-overlay${menuOpen ? " open" : ""}`}
        onClick={() => setMenuOpen(false)}
      />

      {/* ── DRAWER MOBILE ── */}
      <div className={`admin-drawer${menuOpen ? " open" : ""}`}>
        {/* Bouton fermer */}
        <div style={{ position: "absolute", top: 14, right: 14, zIndex: 10 }}>
          <button
            onClick={() => setMenuOpen(false)}
            style={{ background: "rgba(242,237,230,0.1)", border: "none", borderRadius: 10, cursor: "pointer", color: "#f2ede6", padding: 8, display: "flex", alignItems: "center" }}
          >
            <Icon name="close" size={22} />
          </button>
        </div>
        <NavContent path={path} onClose={() => setMenuOpen(false)} />
      </div>

      {/* ── CONTENU PRINCIPAL ── */}
      <main className="admin-main">
        {children}
      </main>

    </div>
  );
}