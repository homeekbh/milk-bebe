/**
 * Géocodage ville → coordonnées, 100% LOCAL et PUR (zéro I/O runtime).
 *
 * Raison d'être : le tracking ne collecte volontairement AUCUNE coordonnée précise
 * (choix RGPD, cf. app/api/track-view/route.ts) — seul le NOM de ville est stocké.
 * On traduit ici ce nom (déjà public) en coordonnées de commune connues, sans jamais
 * collecter de géolocalisation précise à l'insert. Le jeu de données est un fichier
 * statique embarqué (lib/geo/fr-cities.json), dérivé de geo.api.gouv.fr — aucune
 * coordonnée n'est inventée.
 *
 * geocodeCity(city, region?) :
 *   1. lookup exact du nom normalisé dans le dataset communes.
 *   2. fallback : centroïde de la RÉGION (pondéré population) si la région est
 *      identifiable → aucun point perdu pour une commune absente du dataset.
 *   3. sinon null (le composant carte ignore les points sans coordonnées).
 */
import rawData from "./fr-cities.json";

type LngLat = [number, number];
const DATA = rawData as unknown as {
  cities: Record<string, LngLat>;
  regions: Record<string, LngLat>;
};

/**
 * Normalise un nom de ville en clé de lookup.
 * ⚠️ DOIT rester STRICTEMENT identique à la fonction `norm()` du script de
 * génération (scratchpad/gen-fr-cities.js) — sinon les clés ne correspondent plus.
 * minuscules, sans accents, apostrophes/ponctuation → séparateur, "st"/"ste" → "saint"/"sainte".
 */
export function normalizeCity(s: string): string {
  return String(s ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((t) => (t === "st" ? "saint" : t === "ste" ? "sainte" : t))
    .join(" ")
    .replace(/\s+/g, "-");
}

function normalizeRegion(s: string): string {
  return String(s ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Alias de région → codeRegion INSEE (clé présente dans DATA.regions).
 * Vercel `x-vercel-ip-country-region` renvoie le code ISO 3166-2 (ex. "IDF", "PAC").
 * On accepte ces codes lettres + les noms complets.
 * ⚠️ On NE mappe PAS les codes purement NUMÉRIQUES : un "75"/"93"/"11" peut être un code
 * DÉPARTEMENT (Paris / Seine-St-Denis / Aude) OU un code RÉGION (Nouvelle-Aquitaine /
 * PACA / Île-de-France) — ambiguïté insoluble sans le contexte, donc on préfère null
 * (point ignoré) plutôt qu'un centroïde faux. Cf. AMBIGUÏTÉS du rapport.
 */
const REGION_ALIASES: Record<string, string> = {
  idf: "11", "ile-de-france": "11",
  cvl: "24", "centre-val-de-loire": "24",
  bfc: "27", "bourgogne-franche-comte": "27",
  nor: "28", normandie: "28",
  hdf: "32", "hauts-de-france": "32",
  ges: "44", "grand-est": "44",
  pdl: "52", "pays-de-la-loire": "52",
  bre: "53", bretagne: "53",
  naq: "75", "nouvelle-aquitaine": "75",
  occ: "76", occitanie: "76",
  ara: "84", "auvergne-rhone-alpes": "84",
  pac: "93", paca: "93", "provence-alpes-cote-d-azur": "93",
  cor: "94", corse: "94",
  // Outre-mer (présents dans le dataset)
  guadeloupe: "01", martinique: "02", guyane: "03",
  reunion: "04", "la-reunion": "04", mayotte: "06",
};

/** Traduit un nom de ville (+ région optionnelle) en coordonnées, ou null. */
export function geocodeCity(city: string, region?: string): { lat: number; lng: number } | null {
  const key = normalizeCity(city);
  const hit = key ? DATA.cities[key] : undefined;
  if (hit) return { lat: hit[1], lng: hit[0] };

  if (region) {
    const insee = REGION_ALIASES[normalizeRegion(region)];
    const centroid = insee ? DATA.regions[insee] : undefined;
    if (centroid) return { lat: centroid[1], lng: centroid[0] };
  }
  return null;
}
