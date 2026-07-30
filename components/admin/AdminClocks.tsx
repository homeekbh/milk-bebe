"use client";
// components/admin/AdminClocks.tsx (Lot A6)
// Horloges admin déplacées À L'IDENTIQUE depuis AdminShell.tsx (AnalogClock,
// DigitalTime, ClocksBar + CITY_OPTIONS / DEFAULT_CLOCKS / getUtcOffsetLabel).
// Seul ajout : une prop `size` à ClocksBar (pour l'agrandissement sur l'accueil).
// La logique horaire et le SVG ne sont PAS réécrits.
import { useEffect, useState } from "react";

type CityOption = { city: string; tz: string; flag: string };

const CITY_OPTIONS: CityOption[] = [
  { city: "Paris",       tz: "Europe/Paris",         flag: "🇫🇷" },
  { city: "Londres",     tz: "Europe/London",        flag: "🇬🇧" },
  { city: "Berlin",      tz: "Europe/Berlin",        flag: "🇩🇪" },
  { city: "Madrid",      tz: "Europe/Madrid",        flag: "🇪🇸" },
  { city: "Rome",        tz: "Europe/Rome",          flag: "🇮🇹" },
  { city: "Moscou",      tz: "Europe/Moscow",        flag: "🇷🇺" },
  { city: "Dubaï",       tz: "Asia/Dubai",           flag: "🇦🇪" },
  { city: "Mumbai",      tz: "Asia/Kolkata",         flag: "🇮🇳" },
  { city: "Bangkok",     tz: "Asia/Bangkok",         flag: "🇹🇭" },
  { city: "Shanghai",    tz: "Asia/Shanghai",        flag: "🇨🇳" },
  { city: "Tokyo",       tz: "Asia/Tokyo",           flag: "🇯🇵" },
  { city: "Sydney",      tz: "Australia/Sydney",     flag: "🇦🇺" },
  { city: "Auckland",    tz: "Pacific/Auckland",     flag: "🇳🇿" },
  { city: "New York",    tz: "America/New_York",     flag: "🗽" },
  { city: "Chicago",     tz: "America/Chicago",      flag: "🌆" },
  { city: "Mexico",      tz: "America/Mexico_City",  flag: "🇲🇽" },
  { city: "Los Angeles", tz: "America/Los_Angeles",  flag: "🌴" },
  { city: "São Paulo",   tz: "America/Sao_Paulo",    flag: "🇧🇷" },
  { city: "Buenos Aires", tz: "America/Argentina/Buenos_Aires", flag: "🇦🇷" },
  { city: "Le Cap",      tz: "Africa/Johannesburg",  flag: "🇿🇦" },
];

const DEFAULT_CLOCKS: CityOption[] = [
  CITY_OPTIONS[0],  // Paris
  CITY_OPTIONS[9],  // Shanghai
  CITY_OPTIONS[13], // New York
  CITY_OPTIONS[16], // Los Angeles
];

// Calcule l'offset UTC d'un fuseau (en heures), via Intl
function getUtcOffsetLabel(tz: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" });
    const parts = fmt.formatToParts(new Date());
    const tzPart = parts.find(p => p.type === "timeZoneName");
    if (tzPart && tzPart.value) {
      // tzPart.value: "GMT+2", "GMT-5", "GMT" → on retourne "UTC+2" etc.
      return tzPart.value.replace(/^GMT/, "UTC").replace(/^UTC$/, "UTC+0");
    }
  } catch {}
  return "UTC";
}

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

// ── Barre d'horloges modifiables ──────────────────────────────────────────────
export default function ClocksBar({ size = 64 }: { size?: number }) {
  const [clocks, setClocks] = useState<CityOption[]>(DEFAULT_CLOCKS);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("milk_admin_clocks");
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length === 4) {
          // Reprend la définition complète depuis CITY_OPTIONS (au cas où le tz a changé)
          const restored = saved.map((s: any) =>
            CITY_OPTIONS.find(c => c.tz === s.tz) ?? DEFAULT_CLOCKS[0]
          );
          setClocks(restored);
        }
      }
    } catch {}
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem("milk_admin_clocks", JSON.stringify(clocks)); } catch {}
  }, [clocks, mounted]);

  // Fermer le dropdown si clic en dehors
  useEffect(() => {
    if (openIdx === null) return;
    const handler = () => setOpenIdx(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [openIdx]);

  function selectCity(idx: number, city: CityOption) {
    setClocks(prev => prev.map((c, i) => i === idx ? city : c));
    setOpenIdx(null);
  }

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      {clocks.map((clk, idx) => {
        const utcLabel = getUtcOffsetLabel(clk.tz);
        return (
          <div key={idx} style={{ position: "relative" }}>
            <button
              onClick={e => { e.stopPropagation(); setOpenIdx(openIdx === idx ? null : idx); }}
              title="Changer de ville"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "6px 10px", borderRadius: 12,
                background: "rgba(26,20,16,0.05)", border: "1px solid rgba(26,20,16,0.08)",
                cursor: "pointer", fontFamily: "inherit",
              }}>
              <AnalogClock tz={clk.tz} size={size} />
              <DigitalTime tz={clk.tz} />
              <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(26,20,16,0.55)", letterSpacing: 0.3, textAlign: "center", lineHeight: 1.3 }}>
                <div>🌍 {clk.city}</div>
                <div style={{ fontSize: 9, opacity: 0.7 }}>{utcLabel}</div>
              </div>
            </button>
            {openIdx === idx && (
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: "absolute", top: "100%", left: 0, marginTop: 6, zIndex: 100,
                  background: "#fff", borderRadius: 10, border: "1px solid rgba(26,20,16,0.15)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  maxHeight: 280, overflow: "auto", minWidth: 200,
                }}>
                {CITY_OPTIONS.map(opt => {
                  const isCurrent = opt.tz === clk.tz;
                  return (
                    <button
                      key={opt.tz}
                      onClick={() => selectCity(idx, opt)}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                        width: "100%", padding: "8px 12px",
                        background: isCurrent ? "rgba(196,154,74,0.15)" : "transparent",
                        border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                        fontSize: 13, fontWeight: 700, color: "#1a1410",
                      }}>
                      <span>{opt.flag} {opt.city}</span>
                      <span style={{ fontSize: 11, color: "rgba(26,20,16,0.5)", fontFamily: "monospace" }}>
                        {getUtcOffsetLabel(opt.tz)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
