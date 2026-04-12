"use client";
import React from "react";
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f0e8" }}>

      <style>{`
        /* ✅ Supprime la scrollbar de la sidebar sans bloquer le scroll */
        .admin-nav::-webkit-scrollbar { display: none; }
        .admin-nav { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ── Sidebar — fond NOIR ── */}
      <aside style={{
        width: 260,
        background: "#1a1410",
        color: "#f2ede6",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0, left: 0,
        height: "100vh",
        zIndex: 100,
        boxShadow: "4px 0 24px rgba(0,0,0,0.25)",
        overflow: "hidden",
      }}>

        {/* ── Logo — fond JAUNE, texte NOIR, grand, rond ── */}
        <div style={{
          padding: "24px 20px 22px",
          borderBottom: "1px solid rgba(242,237,230,0.08)",
          background: "#1a1410",
        }}>
          <div style={{
            background: "#c49a4a",
            borderRadius: 20,
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 6,
          }}>
            <div style={{
              fontSize: 42,
              fontWeight: 950,
              letterSpacing: -2,
              color: "#1a1410",
              lineHeight: 1,
            }}>
              M!LK
            </div>
            <div style={{
              background: "#1a1410",
              color: "#c49a4a",
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: 3,
              padding: "3px 10px",
              borderRadius: 6,
              textTransform: "uppercase",
            }}>
              ADMIN
            </div>
          </div>
        </div>

        {/* ── Navigation — sans scrollbar ── */}
        <nav className="admin-nav" style={{
          padding: "12px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          flex: 1,
          overflowY: "auto",
        }}>
          {NAV.map(({ label, href, icon }) => {
            const active = path === href || (href !== "/admin" && path.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                style={{
                  padding: "11px 14px",
                  borderRadius: 12,
                  color:      active ? "#1a1410"           : "rgba(242,237,230,0.65)",
                  background: active ? "#c49a4a"           : "transparent",
                  textDecoration: "none",
                  fontSize: 15,
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
                    el.style.color = "rgba(242,237,230,0.65)";
                  }
                }}
              >
                <Icon name={icon} size={20} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* ── Retour au site ── */}
        <div style={{
          padding: "12px 10px",
          borderTop: "1px solid rgba(242,237,230,0.08)",
        }}>
          <Link href="/" style={{
            padding: "11px 14px",
            borderRadius: 12,
            color: "rgba(242,237,230,0.4)",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <Icon name="back" size={18} />
            Retour au site
          </Link>
        </div>
      </aside>

      {/* ── Contenu principal ── */}
      <main style={{
        marginLeft: 260,
        flex: 1,
        minHeight: "100vh",
        background: "#f5f0e8",
      }}>
        {children}
      </main>
    </div>
  );
}