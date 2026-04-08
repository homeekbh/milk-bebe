import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f6f5f3" }}>
      <aside style={{ width: 240, background: "#111", color: "#fff", display: "flex", flexDirection: "column", padding: "32px 0", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 100 }}>
        <div style={{ padding: "0 24px 32px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: -1 }}>M!LK</div>
          <div style={{ fontSize: 12, opacity: 0.4, marginTop: 4, fontWeight: 600, letterSpacing: 1 }}>ADMIN</div>
        </div>

        <nav style={{ padding: "20px 12px", display: "flex", flexDirection: "column", gap: 4, flex: 1, overflowY: "auto" }}>
          {[
            { label: "Dashboard",     href: "/admin" },
            { label: "Produits",      href: "/admin/produits" },
            { label: "Commandes",     href: "/admin/commandes" },
            { label: "Clients",       href: "/admin/clients" },
            { label: "Codes promos",  href: "/admin/promos" },
            { label: "Analytics",     href: "/admin/analytics" },
            { label: "Exports",       href: "/admin/exports" },
            { label: "Alertes stock", href: "/admin/alerts" },
          ].map(({ label, href }) => (
            <Link
              key={href} href={href}
              style={{ padding: "10px 14px", borderRadius: 10, color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 14, fontWeight: 700 }}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div style={{ padding: "20px 12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Link href="/" style={{ padding: "10px 14px", borderRadius: 10, color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: 13, fontWeight: 600, display: "block" }}>
            ← Retour au site
          </Link>
        </div>
      </aside>

      <main style={{ marginLeft: 240, flex: 1, minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}