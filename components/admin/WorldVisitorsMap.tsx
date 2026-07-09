"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior } from "d3-zoom";
import worldData from "world-atlas/countries-110m.json";

// ── Props ───────────────────────────────────────────────────────────────────
type City = { city: string; region?: string; sessions: number; lat: number | null; lng: number | null };

// ── Palette (cohérente dashboard) ───────────────────────────────────────────
const AMBER        = "#c49a4a";
const COUNTRY_FILL = "#1c1814";                 // fond neutre des pays (pas de choroplèthe)
const COUNTRY_STK  = "rgba(242,237,230,0.08)";  // contour discret des pays
const POINT_STK    = "#1a1410";                 // contour foncé des points villes
const PANEL        = "#161210";
const TEXT         = "#f2ede6";

const W = 960, H = 500; // ratio ~geoNaturalEarth1
const MAX_ZOOM = 12;

/**
 * Carte du monde SVG pur (d3-geo geoNaturalEarth1 + topojson world-atlas) — mode
 * POINTS SEULS : les pays sont un simple fond neutre (#1c1814, contour discret),
 * la donnée est portée UNIQUEMENT par les points villes (ambre, rayon ∝ √sessions).
 * Plus de choroplèthe → plus de jointure ISO2→numeric ni de i18n-iso-countries.
 *
 * Zoom : d3-zoom (molette = zoom, glisser = pan, scaleExtent [1,12]) sur UN <g>
 * (fond pays + points). Transform impératif (pan fluide) ; re-render seulement au
 * changement d'échelle k pour recalculer le rayon des points (r / k → taille
 * visuelle constante). Points au premier plan, tooltip fonctionnel même zoomé.
 */
export default function WorldVisitorsMap({ cities }: { cities: City[] }) {
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);
  const [k, setK] = useState(1);

  const svgRef  = useRef<SVGSVGElement | null>(null);
  const gRef    = useRef<SVGGElement | null>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const { countryPaths, points, hasData } = useMemo(() => {
    const fc: any = feature(worldData as any, (worldData as any).objects.countries);
    const features: any[] = Array.isArray(fc?.features) ? fc.features : [];

    const projection = geoNaturalEarth1().fitSize([W, H], fc as any);
    const pathGen = geoPath(projection);

    // Fond neutre : un seul chemin par pays, aucune couleur liée aux données.
    const countryPaths = features.map((f, i) => ({ key: String(f.id ?? i), d: pathGen(f as any) ?? "" }));

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

    return { countryPaths, points, hasData: points.length > 0 };
  }, [cities]);

  // ── d3-zoom (molette + pan) sur le <g> conteneur (fond pays + points) ───────
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const zb = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, MAX_ZOOM])
      .extent([[0, 0], [W, H]])
      .translateExtent([[0, 0], [W, H]])
      .on("zoom", (e: D3ZoomEvent<SVGSVGElement, unknown>) => {
        gRef.current?.setAttribute("transform", e.transform.toString());
        setK((prev) => (prev === e.transform.k ? prev : e.transform.k));
      });
    const sel = select(svg);
    sel.call(zb);
    zoomRef.current = zb;
    return () => { sel.on(".zoom", null); zoomRef.current = null; };
  }, []);

  function handleReset() {
    const svg = svgRef.current;
    if (!svg || !zoomRef.current) return;
    select(svg).call(zoomRef.current.transform, zoomIdentity);
  }

  return (
    <div style={{ width: "100%", background: PANEL, borderRadius: 16, padding: 12, position: "relative", border: "1px solid rgba(242,237,230,0.08)" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block", cursor: "grab", touchAction: "none" }}
        role="img"
        aria-label="Carte des visiteurs par ville (zoom molette, glisser pour déplacer)"
      >
        {/* Un seul <g> zoomable : fond pays + points restent alignés. Transform posé
            par d3-zoom (ref), pas par React. */}
        <g ref={gRef}>
          {/* Fond neutre des pays (aucune couleur liée aux données) */}
          {countryPaths.map((p) => (
            <path key={p.key} d={p.d} fill={COUNTRY_FILL} stroke={COUNTRY_STK} strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
          ))}

          {/* Points villes AU PREMIER PLAN — rayon / k pour rester constant au zoom */}
          {points.map((pt, i) => {
            const active = hover?.label === pt.label;
            return (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={pt.r / k}
                fill={AMBER}
                fillOpacity={active ? 0.95 : 0.72}
                stroke={POINT_STK}
                strokeWidth={active ? 1.4 : 0.9}
                vectorEffect="non-scaling-stroke"
                style={{ cursor: "pointer", transition: "fill-opacity 0.12s" }}
                onMouseEnter={() => setHover({ x: pt.x, y: pt.y, label: pt.label })}
                onMouseLeave={() => setHover(null)}
              >
                <title>{pt.label} sessions</title>
              </circle>
            );
          })}

          {/* Tooltip in-SVG contre-scalé (1/k) → taille constante, ancré au point */}
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
