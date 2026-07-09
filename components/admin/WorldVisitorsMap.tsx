"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior } from "d3-zoom";
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
const MAX_ZOOM = 12;

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
 * Zoom : d3-zoom (molette = zoom, glisser = pan, scaleExtent [1, 12]) appliqué à
 * UN SEUL <g> contenant pays + villes → ils restent alignés. Le transform est posé
 * impérativement sur le <g> (fluidité du pan) ; on ne re-render React que quand
 * l'échelle k change, pour recalculer le rayon des villes (r / k → taille visuelle
 * constante). Les <title> restent des tooltips natifs, fonctionnels après zoom.
 */
export default function WorldVisitorsMap({
  countries: countryData,
  cities,
}: {
  countries: Country[];
  cities: City[];
}) {
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);
  const [k, setK] = useState(1); // échelle de zoom courante (compense le rayon des villes)

  const svgRef  = useRef<SVGSVGElement | null>(null);
  const gRef    = useRef<SVGGElement | null>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

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

  // ── d3-zoom : molette + pan, appliqué au <g> conteneur (pays + villes) ──────
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const zb = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, MAX_ZOOM])
      .extent([[0, 0], [W, H]])
      .translateExtent([[0, 0], [W, H]]) // empêche de perdre la carte hors cadre
      .on("zoom", (e: D3ZoomEvent<SVGSVGElement, unknown>) => {
        // Transform posé impérativement → pan fluide sans re-render.
        gRef.current?.setAttribute("transform", e.transform.toString());
        // On ne re-render (recalcul rayon villes) QUE si l'échelle change.
        setK((prev) => (prev === e.transform.k ? prev : e.transform.k));
      });

    const sel = select(svg);
    sel.call(zb);
    zoomRef.current = zb;

    // Cleanup : retire les listeners d3-zoom au démontage.
    return () => {
      sel.on(".zoom", null);
      zoomRef.current = null;
    };
  }, []);

  function handleReset() {
    const svg = svgRef.current;
    if (!svg || !zoomRef.current) return;
    // Applique l'identité → déclenche l'event "zoom" (reset du <g> + setK(1)).
    select(svg).call(zoomRef.current.transform, zoomIdentity);
  }

  return (
    <div style={{ width: "100%", background: PANEL, borderRadius: 16, padding: 12, position: "relative", border: "1px solid rgba(242,237,230,0.08)" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block", cursor: "grab", touchAction: "none" }}
        role="img"
        aria-label="Carte du monde des visiteurs (zoom molette, glisser pour déplacer)"
      >
        {/* Un seul <g> zoomable : pays + villes restent alignés au zoom/pan.
            Le transform est posé par d3-zoom (ref), pas par React. */}
        <g ref={gRef}>
          {/* Pays (choroplèthe) */}
          {paths.map((p) => (
            <path key={p.key} d={p.d} fill={p.fill} stroke={STROKE} strokeWidth={0.4} vectorEffect="non-scaling-stroke">
              {p.sessions > 0 && <title>{p.name} : {p.sessions} sessions</title>}
            </path>
          ))}

          {/* Villes — rayon divisé par k pour rester visuellement constant au zoom */}
          {points.map((pt, i) => {
            const active = hover?.label === pt.label;
            return (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={pt.r / k}
                fill={AMBER}
                fillOpacity={active ? 0.85 : 0.5}
                stroke={AMBER}
                strokeWidth={active ? 1.4 : 0.8}
                vectorEffect="non-scaling-stroke"
                style={{ cursor: "pointer", transition: "fill-opacity 0.12s" }}
                onMouseEnter={() => setHover({ x: pt.x, y: pt.y, label: pt.label })}
                onMouseLeave={() => setHover(null)}
              >
                <title>{pt.label} sessions</title>
              </circle>
            );
          })}

          {/* Tooltip in-SVG — DANS le <g> zoomable (reste ancré au point), mais
              contre-scalé (1/k) pour garder une taille constante malgré le zoom. */}
          {hover && (
            <g transform={`translate(${hover.x},${hover.y}) scale(${1 / k})`} pointerEvents="none">
              <rect x={-90} y={-34} width={180} height={22} rx={5} fill="#0d0b09" opacity={0.94} />
              <text x={0} y={-19} fill={TEXT} fontSize={12} textAnchor="middle" fontFamily="system-ui" fontWeight={700}>
                {hover.label} sessions
              </text>
            </g>
          )}
        </g>
      </svg>

      {/* Bouton Reset (revient à la vue monde) */}
      {hasData && (
        <button
          type="button"
          onClick={handleReset}
          title="Réinitialiser la vue"
          style={{
            position: "absolute", top: 18, right: 18, zIndex: 2,
            background: PANEL, color: AMBER, border: "1px solid rgba(196,154,74,0.4)",
            borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer",
          }}
        >
          ⟳ Reset
        </button>
      )}

      {!hasData && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "rgba(242,237,230,0.45)", fontSize: 13, fontStyle: "italic", textAlign: "center", padding: 24 }}>
          Carte disponible avec des données de géolocalisation<br />(remplie en production Vercel).
        </div>
      )}
    </div>
  );
}
