"use client";

// ═══════════════════════════════════════════════════════════════════════════
// components/ParrainageBareme.tsx — Visuel SVG DYNAMIQUE du barème parrainage.
//
// Lit les vraies valeurs de parrainage_settings via /api/parrainage/settings-public
// (route publique, lecture seule) → un changement de seuil dans /admin/parrainage
// se répercute automatiquement partout où ce composant est utilisé (profil, CGV).
//
// AUCUN chiffre codé en dur : montant, seuils, durée, nombre de paliers sont tous
// dérivés des données. Si l'admin passe seuils_parrain à [50,70,85,100], le schéma
// affiche ces valeurs sans modification de code.
//
// `initial` (optionnel) : valeurs déjà connues côté serveur (CGV) → rendu immédiat
// sans flash ni requête. Sans `initial` (profil), le composant fetch la route lui-même.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";

export type ParrainageBaremePublic = {
  actif:                boolean;
  montant_recompense:   number;
  seuil_filleul:        number;
  seuils_parrain:       number[];
  duree_validite_jours: number;
};

const AMBER = "#c49a4a";

// € sans décimale si entier, sinon 2 décimales (ex. 5 → "5", 5.5 → "5.50").
function euro(n: number): string {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

function palette(variant: "dark" | "light") {
  return variant === "dark"
    ? {
        textMain:   "#f2ede6",
        textSoft:   "rgba(242,237,230,0.55)",
        track:      "rgba(242,237,230,0.13)",
        fill:       AMBER,
        bandBg:     "rgba(196,154,74,0.10)",
        bandStroke: "rgba(196,154,74,0.45)",
      }
    : {
        textMain:   "#1a1410",
        textSoft:   "rgba(26,20,16,0.55)",
        track:      "rgba(26,20,16,0.09)",
        fill:       AMBER,
        bandBg:     "#faf6ec",
        bandStroke: "rgba(196,154,74,0.5)",
      };
}

export default function ParrainageBareme({
  initial,
  variant = "light",
}: {
  initial?: ParrainageBaremePublic;
  variant?: "dark" | "light";
}) {
  const [data,    setData]    = useState<ParrainageBaremePublic | null>(initial ?? null);
  const [loading, setLoading] = useState<boolean>(!initial);
  const c = palette(variant);

  useEffect(() => {
    if (initial) return; // rendu direct, pas de fetch
    let cancelled = false;
    fetch("/api/parrainage/settings-public")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d) setData(d as ParrainageBaremePublic); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [initial]);

  if (loading) {
    return (
      <div style={{ padding: "28px 8px", textAlign: "center", fontSize: 13, color: c.textSoft }}>
        Chargement du barème…
      </div>
    );
  }
  if (!data) return null; // échec réseau silencieux → on n'affiche rien de cassé

  if (!data.actif) {
    return (
      <div style={{ fontSize: 13.5, fontWeight: 700, color: c.textSoft, lineHeight: 1.6, padding: "4px 0" }}>
        Le programme de parrainage est temporairement suspendu.
      </div>
    );
  }

  const montant = Number(data.montant_recompense) || 0;
  const seuilF  = Number(data.seuil_filleul) || 0;
  const seuils  = (Array.isArray(data.seuils_parrain) ? data.seuils_parrain : [])
    .map(Number)
    .filter(Number.isFinite);
  const n       = seuils.length;
  const duree   = Number(data.duree_validite_jours) || 0;

  // ── Géométrie SVG (viewBox → scale fluide, jamais de débordement) ──────────
  const VB_W     = 400;
  const bandH    = 62;
  const midY     = bandH + 30;          // libellé "Pour toi"
  const barsTop  = bandH + 44;
  const rowH     = 46;
  const barH     = 30;
  const barX     = 86;
  const barMaxW  = 250;                  // piste : 86 → 336
  const barMinW  = 46;
  const VB_H     = n > 0 ? barsTop + n * rowH + 6 : bandH + 6;

  const maxCumul = montant * Math.max(1, n);

  return (
    <div style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label={`Barème parrainage : ton filleul profite de ${euro(montant)}€ dès ${euro(seuilF)}€ d'achat, et tu gagnes ${euro(montant)}€ par filleul jusqu'à ${n} récompenses.`}
        style={{ display: "block", width: "100%", maxWidth: 460, margin: "0 auto", height: "auto" }}
      >
        {/* ── Partie FILLEUL : encart remise offerte à l'ami ── */}
        <rect x={4} y={4} width={VB_W - 8} height={bandH} rx={14}
          fill={c.bandBg} stroke={c.bandStroke} strokeWidth={1.5} />
        <text x={22} y={26} fontSize={11.5} fontWeight={800} letterSpacing={1.5} fill={c.textSoft}>
          POUR TON FILLEUL
        </text>
        <text x={22} y={50} fontSize={19} fontWeight={900} fill={c.textMain}>
          −{euro(montant)}€ dès {euro(seuilF)}€ d'achat
        </text>

        {/* ── Partie PARRAIN : escalier progressif des paliers ── */}
        {n > 0 && (
          <>
            <text x={6} y={midY} fontSize={11.5} fontWeight={800} letterSpacing={1.5} fill={c.textSoft}>
              POUR TOI — À CHAQUE FILLEUL QUI ACHÈTE
            </text>
            {seuils.map((seuil, i) => {
              const cumul = montant * (i + 1);
              const w     = barMinW + (cumul / maxCumul) * (barMaxW - barMinW);
              const yTop  = barsTop + i * rowH;
              const yTxt  = yTop + barH / 2 + 5;
              return (
                <g key={i}>
                  {/* seuil requis (colonne gauche) */}
                  <text x={10} y={yTxt} fontSize={13} fontWeight={700} fill={c.textSoft}>
                    dès {euro(seuil)}€
                  </text>
                  {/* piste + barre ambre proportionnelle au cumul */}
                  <rect x={barX} y={yTop} width={barMaxW} height={barH} rx={8} fill={c.track} />
                  <rect x={barX} y={yTop} width={w} height={barH} rx={8} fill={c.fill} />
                  {/* réduction cumulée à ce palier (colonne droite) */}
                  <text x={VB_W - 8} y={yTxt} fontSize={15} fontWeight={900} textAnchor="end" fill={c.textMain}>
                    −{euro(cumul)}€
                  </text>
                </g>
              );
            })}
          </>
        )}
      </svg>

      {/* Durée de validité — en texte sous le schéma (valeur dynamique) */}
      {duree > 0 && (
        <p style={{ margin: "12px 4px 0", fontSize: 12.5, color: c.textSoft, lineHeight: 1.6, textAlign: "center" }}>
          Chaque récompense gagnée est valable {duree} jours.
        </p>
      )}
    </div>
  );
}
