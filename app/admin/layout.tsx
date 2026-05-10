"use client";
import React from "react";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase-client";
import SearchGlobal from "@/components/admin/SearchGlobal";
import { MilkLogo } from "@/components/shared/MilkLogo";

const NAV = [
  { href: "/admin",              label: "Dashboard",    icon: "▦"  },
  { href: "/admin/homepage",     label: "Homepage",     icon: "🏠" },
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

const CLOCKS = [
  { city: "Paris",       tz: "Europe/Paris",       flag: "🇫🇷" },
  { city: "Shanghai",    tz: "Asia/Shanghai",       flag: "🇨🇳" },
  { city: "New York",    tz: "America/New_York",    flag: "🗽" },
  { city: "Los Angeles", tz: "America/Los_Angeles", flag: "🌴" },
];

// ── Horloge analogique ────────────────────────────────────────────────────────
function AnalogClock({ tz, size = 68 }: { tz: string; size?: number }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  const h = local.getHours() % 12;
  const m = local.getMinutes();
  const s = local.getSeconds();
  const hDeg = h * 30 + m * 0.5;
  const mDeg = m * 6;
  const sDeg = s * 6;
  const cx = size / 2;
  const r  = size / 2 - 3;

  function hand(deg: number, len: number, w: number, color: string) {
    const rad = (deg - 90) * Math.PI / 180;
    return <line x1={cx} y1={cx} x2={cx + len * Math.cos(rad)} y2={cx + len * Math.sin(rad)} stroke={color} strokeWidth={w} strokeLinecap="round" />;
  }

  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cx} r={r} fill="#1a1410" stroke="#c49a4a" strokeWidth={2} />
      {Array.from({ length: 12 }, (_, i) => {
        const rad = (i * 30 - 90) * Math.PI / 180;
        const r1 = r - 2; const r2 = r - (i % 3 === 0 ? 9 : 5);
        return <line key={i} x1={cx + r1 * Math.cos(rad)} y1={cx + r1 * Math.sin(rad)} x2={cx + r2 * Math.cos(rad)} y2={cx + r2 * Math.sin(rad)} stroke={i % 3 === 0 ? "#c49a4a" : "rgba(196,154,74,0.35)"} strokeWidth={i % 3 === 0 ? 2 : 1} />;
      })}
      {hand(hDeg, r * 0.50, 3.5, "#f2ede6")}
      {hand(mDeg, r * 0.72, 2.5, "#f2ede6")}
      {hand(sDeg, r * 0.82, 1.5, "#e8a020")}
      <circle cx={cx} cy={cx} r={3.5} fill="#c49a4a" />
    </svg>
  );
}

// ── Heure digitale ────────────────────────────────────────────────────────────
function DigitalTime({ tz }: { tz: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString("fr-FR", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return <span style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 900, color: "#1a1410", letterSpacing: 0.5 }}>{time}</span>;
}

// ── Calendrier avec stats ─────────────────────────────────────────────────────
function AdminCalendar({ onClose }: { onClose: () => void }) {
  const today = new Date();
  const [year,    setYear]    = useState(today.getFullYear());
  const [month,   setMonth]   = useState(today.getMonth());
  const [stats,   setStats]   = useState<Record<string, { orders: number; revenue: number }>>({});
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ day: number; x: number; y: number } | null>(null);

  const MOIS  = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const JOURS = ["L","M","M","J","V","S","D"];

  const loadStats = useCallback(async (y: number, mo: number) => {
    setLoading(true);
    const start = new Date(y, mo, 1).toISOString();
    const end   = new Date(y, mo + 1, 0, 23, 59, 59).toISOString();
    try {
      const { data } = await supabase
        .from("orders")
        .select("created_at, amount_total")
        .gte("created_at", start)
        .lte("created_at", end)
        .eq("payment_status", "paid");
      const map: Record<string, { orders: number; revenue: number }> = {};
      (data ?? []).forEach((o: any) => {
        const key = String(new Date(o.created_at).getDate());
        if (!map[key]) map[key] = { orders: 0, revenue: 0 };
        map[key].orders++;
        map[key].revenue += (o.amount_total ?? 0) / 100;
      });
      setStats(map);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadStats(year, month); }, [year, month, loadStats]);

  const firstDay    = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const cells: (number | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isThisMonth = today.getFullYear() === year && today.getMonth() === month;
  const totalOrders  = Object.values(stats).reduce((a, b) => a + b.orders, 0);
  const totalRevenue = Object.values(stats).reduce((a, b) => a + b.revenue, 0);

  function getColor(n: number) {
    if (!n) return "rgba(0,0,0,0.04)";
    if (n === 1) return "rgba(196,154,74,0.2)";
    if (n === 2) return "rgba(196,154,74,0.45)";
    if (n <= 4)  return "rgba(196,154,74,0.7)";
    return "#c49a4a";
  }

  return (
    <div onClick={e => e.stopPropagation()}
      style={{ position: "fixed", top: 78, right: 16, zIndex: 500, background: "#fff", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", width: 360, padding: 20 }}>

      {/* Navigation mois */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={() => { const d = new Date(year, month - 1); setYear(d.getFullYear()); setMonth(d.getMonth()); }}
          style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", cursor: "pointer", fontSize: 18 }}>‹</button>
        <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410" }}>{MOIS[month]} {year}</div>
        <button onClick={() => { const d = new Date(year, month + 1); setYear(d.getFullYear()); setMonth(d.getMonth()); }}
          style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", cursor: "pointer", fontSize: 18 }}>›</button>
        <button onClick={onClose}
          style={{ width: 32, height: 32, borderRadius: 99, background: "#f5f0e8", border: "none", cursor: "pointer", fontSize: 16, fontWeight: 900, marginLeft: 8 }}>✕</button>
      </div>

      {/* Jours de la semaine */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
        {JOURS.map((j, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: i >= 5 ? "#c49a4a" : "rgba(26,20,16,0.35)", paddingBottom: 6 }}>{j}</div>
        ))}
      </div>

      {/* Grille jours */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const s = stats[String(day)];
          const isToday = isThisMonth && day === today.getDate();
          return (
            <div key={i}
              onMouseEnter={e => s && setTooltip({ day, x: (e.target as HTMLElement).getBoundingClientRect().left, y: (e.target as HTMLElement).getBoundingClientRect().top })}
              onMouseLeave={() => setTooltip(null)}
              title={s ? `${s.orders} cmd · ${s.revenue.toFixed(2)} €` : ""}
              style={{
                aspectRatio: "1", borderRadius: 7, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: getColor(s?.orders ?? 0),
                border: isToday ? "2px solid #c49a4a" : "1px solid rgba(0,0,0,0.05)",
                cursor: s ? "pointer" : "default", position: "relative",
              }}>
              <span style={{ fontSize: 13, fontWeight: isToday ? 900 : 600, color: "#1a1410" }}>{day}</span>
              {s && <span style={{ fontSize: 8, fontWeight: 900, color: "rgba(26,20,16,0.55)", lineHeight: 1 }}>{s.orders}c</span>}
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,20,16,0.4)" }}>Intensité :</span>
        {[1,2,3,5].map((n, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: getColor(n) }} />
            <span style={{ fontSize: 10, color: "rgba(26,20,16,0.45)" }}>{["1","2","3-4","5+"][i]}</span>
          </div>
        ))}
      </div>

      {/* Total mois */}
      {!loading && (
        <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 12, background: "#f5f0e8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,20,16,0.4)", marginBottom: 2 }}>Ce mois</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#1a1410" }}>{totalOrders} commande{totalOrders !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,20,16,0.4)", marginBottom: 2 }}>Chiffre d'affaires</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#c49a4a" }}>{totalRevenue.toFixed(2)} €</div>
          </div>
        </div>
      )}
      {loading && <div style={{ marginTop: 12, textAlign: "center", fontSize: 13, color: "rgba(26,20,16,0.4)", padding: "12px 0" }}>Chargement...</div>}
    </div>
  );
}

// ── Layout Admin ──────────────────────────────────────────────────────────────
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [mobile,    setMobile]    = useState(false);
  const [open,      setOpen]      = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [checking,  setChecking]  = useState(true);
  const [showCal,   setShowCal]   = useState(false);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (pathname === "/admin/login") { setChecking(false); return; }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.replace(`/admin/login?redirect=${pathname}`); return; }
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single();
      if (!profile?.is_admin) { await supabase.auth.signOut(); router.replace("/admin/login"); return; }
      setUserEmail(session.user.email ?? "");
      setChecking(false);
    });
  }, [pathname, router]);

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
    <div style={{ display: "flex", minHeight: "100vh", background: "#ede8df" }}
      onClick={() => showCal && setShowCal(false)}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 220, flexShrink: 0, background: "#1a1410", display: mobile ? "none" : "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, bottom: 0, overflowY: "auto", zIndex: 100 }}>
        <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(242,237,230,0.08)" }}>
          <div style={{ background: "#c49a4a", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <MilkLogo color="#1a1410" size={20} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "rgba(26,20,16,0.6)" }}>ADMIN</span>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "14px 10px" }}>
          {NAV.map(item => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 10, marginBottom: 2, textDecoration: "none", background: active ? "rgba(196,154,74,0.15)" : "transparent", color: active ? "#c49a4a" : "rgba(242,237,230,0.55)", fontWeight: 700, fontSize: 14, transition: "all 0.15s" }}>
                <span style={{ fontSize: 15 }}>{item.icon}</span>{item.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: "14px 10px", borderTop: "1px solid rgba(242,237,230,0.08)", display: "grid", gap: 6 }}>
          {userEmail && (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(242,237,230,0.06)" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(242,237,230,0.4)", marginBottom: 2 }}>Admin</div>
              <div style={{ fontSize: 11, color: "rgba(242,237,230,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</div>
            </div>
          )}
          <Link href="/" target="_blank"
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, textDecoration: "none", color: "rgba(242,237,230,0.35)", fontSize: 13, fontWeight: 700 }}>
            ↗ Voir le site
          </Link>
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
            {NAV.map(item => {
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 10, marginBottom: 2, textDecoration: "none", background: active ? "rgba(196,154,74,0.15)" : "transparent", color: active ? "#c49a4a" : "rgba(242,237,230,0.55)", fontWeight: 700, fontSize: 14 }}>
                  <span>{item.icon}</span>{item.label}
                </Link>
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

        {/* ── HEADER avec horloges ── */}
        <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(245,240,232,0.97)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(26,20,16,0.1)", padding: "0 20px", minHeight: 78, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>

          {/* Bouton menu mobile */}
          {mobile && (
            <button onClick={() => setOpen(true)}
              style={{ padding: "8px 12px", borderRadius: 10, background: "#1a1410", color: "#f2ede6", border: "none", cursor: "pointer", fontSize: 18, flexShrink: 0 }}>
              ☰
            </button>
          )}

          {/* Recherche */}
          <div style={{ flex: 1, minWidth: 120 }}>
            <SearchGlobal />
          </div>

          {/* ── 4 HORLOGES ── */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {CLOCKS.map(clk => (
              <div key={clk.city}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 12, background: "rgba(26,20,16,0.05)", border: "1px solid rgba(26,20,16,0.08)" }}>
                {/* Horloge analogique */}
                <AnalogClock tz={clk.tz} size={64} />
                {/* Heure digitale */}
                <DigitalTime tz={clk.tz} />
                {/* Ville */}
                <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(26,20,16,0.45)", letterSpacing: 0.5, textAlign: "center" }}>
                  {clk.flag} {clk.city}
                </div>
              </div>
            ))}
          </div>

          {/* ── BOUTON CALENDRIER ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button
              onClick={e => { e.stopPropagation(); setShowCal(v => !v); }}
              style={{ padding: "8px 14px", borderRadius: 10, background: showCal ? "#1a1410" : "rgba(26,20,16,0.08)", color: showCal ? "#c49a4a" : "#1a1410", border: "none", cursor: "pointer", fontSize: 20, fontWeight: 900, display: "flex", alignItems: "center", gap: 6 }}>
              📅
              <span style={{ fontSize: 12, fontWeight: 800 }}>Stats</span>
            </button>
            <Link href="/produits" target="_blank"
              style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(26,20,16,0.08)", color: "rgba(26,20,16,0.6)", fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
              ↗ Site
            </Link>
            <div style={{ width: 34, height: 34, borderRadius: 99, background: "#c49a4a", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 950, color: "#1a1410", flexShrink: 0 }}>
              {userEmail.slice(0, 1).toUpperCase() || "A"}
            </div>
          </div>
        </header>

        {/* ── CALENDRIER ── */}
        {showCal && <AdminCalendar onClose={() => setShowCal(false)} />}

        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
}