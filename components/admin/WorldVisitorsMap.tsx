"use client";

import { useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import countries from "i18n-iso-countries";
import worldData from "world-atlas/countries-110m.json";

// ── Props ───────────────────────────────────────────────────────────────────
type Country = { country: string; sessions: number };
type City = { city: string; region?: string; sessions: number; lat: number | null; lng: number | null };

// ── Palette (cohérente dashboard) ───────────────────────────────────────────
const AMBER     = "#c49a4a";
const BASE_FILL = "#1c1814"; // pays sans données
const STROKE    = "#0d0b09";
const PANEL     = "#161210";
const TEXT      = "#f2ede6";

const W = 960, H = 500; // ratio ~geoNaturalEarth1

// Interpolation linéaire entre deux couleurs hex → "rgb(...)".
function lerpColor(a: string, b: string, t: number): string {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/**
 * Carte du monde SVG pur (d3-geo geoNaturalEarth1 + topojson world-atlas).
 *
 * Choroplèthe : chaque pays coloré #1c1814 → #c49a4a selon ses sessions.
 * ⚠️ Jointure : Vercel fournit de l'ISO2 ("FR"), le topojson des IDs numériques
 * ISO 3166 (250). On convertit ISO2 → numeric (i18n-iso-countries) et on compare
 * en NOMBRES (Number()) des DEUX côtés — alpha2ToNumeric renvoie parfois des
 * zéros de tête ("004") absents du topojson ("4"). Sans ça, aucun pays ne colore.
 *
 * Points villes : un cercle projeté [lng, lat], rayon ∝ √sessions, tooltip au survol.
 */
export default function WorldVisitorsMap({
  countries: countryData,
  cities,
}: {
  countries: Country[];
  cities: City[];
}) {
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);

  const { paths, points, hasData } = useMemo(() => {
    const fc: any = feature(worldData as any, (worldData as any).objects.countries);
    const features: any[] = Array.isArray(fc?.features) ? fc.features : [];

    // ISO2 → numeric (normalisé en NOMBRE) → sessions cumulées.
    const numericSessions = new Map<number, number>();
    let maxCountry = 0;
    for (const c of countryData ?? []) {
      const num = countries.alpha2ToNumeric(String(c.country ?? "").toUpperCase());
      if (!num) continue;
      const key = Number(num);
      if (!Number.isFinite(key)) continue;
      const next = (numericSessions.get(key) ?? 0) + (Number(c.sessions) || 0);
      numericSessions.set(key, next);
      if (next > maxCountry) maxCountry = next;
    }

    const projection = geoNaturalEarth1().fitSize([W, H], fc as any);
    const pathGen = geoPath(projection);

    const paths = features.map((f, i) => {
      const sessions = numericSessions.get(Number(f.id)) ?? 0;
      // Échelle racine : rend visibles les petits pays malgré un pays dominant.
      const t = maxCountry > 0 && sessions > 0 ? Math.sqrt(sessions / maxCountry) : 0;
      const fill = sessions > 0 ? lerpColor(BASE_FILL, AMBER, 0.18 + 0.82 * t) : BASE_FILL;
      return {
        key: String(f.id ?? i),
        d: pathGen(f as any) ?? "",
        fill,
        sessions,
        name: f?.properties?.name ?? "",
      };
    });

    // Points villes (ignore lat/lng absents ou hors-projection).
    const maxCity = Math.max(1, ...(cities ?? []).map((c) => Number(c.sessions) || 0));
    const points = (cities ?? [])
      .filter((c) => c.lat != null && c.lng != null && Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lng)))
      .map((c) => {
        const xy = projection([Number(c.lng), Number(c.lat)]);
        if (!xy || !Number.isFinite(xy[0]) || !Number.isFinite(xy[1])) return null;
        const r = 2.5 + Math.sqrt((Number(c.sessions) || 0) / maxCity) * 11;
        const region = c.region ? ` · ${c.region}` : "";
        return { x: xy[0], y: xy[1], r, sessions: Number(c.sessions) || 0, label: `${c.city}${region} — ${c.sessions}` };
      })
      .filter(Boolean) as { x: number; y: number; r: number; sessions: number; label: string }[];

    const hasData = numericSessions.size > 0 || points.length > 0;
    return { paths, points, hasData };
  }, [countryData, cities]);

  return (
    <div style={{ width: "100%", background: PANEL, borderRadius: 16, padding: 12, position: "relative", border: "1px solid rgba(242,237,230,0.08)" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Carte du monde des visiteurs">
        {/* Pays (choroplèthe) */}
        <g>
          {paths.map((p) => (
            <path key={p.key} d={p.d} fill={p.fill} stroke={STROKE} strokeWidth={0.4}>
              {p.sessions > 0 && <title>{p.name} : {p.sessions} sessions</title>}
            </path>
          ))}
        </g>
        {/* Villes */}
        <g>
          {points.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={pt.r}
              fill={AMBER}
              fillOpacity={hover && hover.label === pt.label ? 0.85 : 0.5}
              stroke={AMBER}
              strokeWidth={hover && hover.label === pt.label ? 1.4 : 0.8}
              style={{ cursor: "pointer", transition: "fill-opacity 0.12s" }}
              onMouseEnter={() => setHover({ x: pt.x, y: pt.y, label: pt.label })}
              onMouseLeave={() => setHover(null)}
            >
              <title>{pt.label} sessions</title>
            </circle>
          ))}
        </g>
        {/* Tooltip in-SVG (scale avec le viewBox) */}
        {hover && (
          <g pointerEvents="none">
            <rect
              x={Math.min(Math.max(hover.x - 90, 4), W - 184)}
              y={Math.max(hover.y - 30, 4)}
              width={180}
              height={22}
              rx={5}
              fill="#0d0b09"
              opacity={0.94}
            />
            <text
              x={Math.min(Math.max(hover.x, 94), W - 90)}
              y={Math.max(hover.y - 30, 4) + 15}
              fill={TEXT}
              fontSize={12}
              textAnchor="middle"
              fontFamily="system-ui"
              fontWeight={700}
            >
              {hover.label} sessions
            </text>
          </g>
        )}
      </svg>

      {!hasData && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "rgba(242,237,230,0.45)", fontSize: 13, fontStyle: "italic", textAlign: "center", padding: 24 }}>
          Carte disponible avec des données de géolocalisation<br />(remplie en production Vercel).
        </div>
      )}
    </div>
  );
}
