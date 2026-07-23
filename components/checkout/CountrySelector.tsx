"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import { listDeliverableCountries } from "@/lib/delivery-config";

/**
 * Sélecteur de pays de livraison — COMPOSANT UNIQUE réutilisé partout (tunnel checkout, création de
 * compte, inscription, profil).
 *
 * Peuplé UNIQUEMENT depuis listDeliverableCountries() (source : COUNTRY_TO_ZONE) : aucun pays non
 * livrable n'apparaît (22 = FR + 21 UE). La France est toujours en tête ; les autres pays sont triés
 * par nom localisé (Intl.DisplayNames, fallback = code ISO). Composant contrôlé : `value` + `onChange(code)`.
 *
 * Contraste : les <option> sont TOUJOURS stylées explicitement (fond + texte) — un <select> natif rend
 * ses options avec le fond blanc de l'OS et ignore la couleur héritée du <select>, d'où le « texte gris
 * pâle illisible » quand la couleur du select est claire. `variant` adapte la palette :
 *   - "light" (défaut) : fond blanc, texte foncé — pour un formulaire clair.
 *   - "dark" : fond translucide + texte crème, options #1a1410/#f2ede6 — pour un formulaire sombre.
 */
export type CountrySelectorProps = {
  value?: string;
  onChange?: (country: string) => void;
  id?: string;
  label?: string;
  hideLabel?: boolean;
  variant?: "light" | "dark";
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export default function CountrySelector({
  value = "FR",
  onChange,
  id = "country-selector",
  label,
  hideLabel = false,
  variant = "light",
  disabled,
  className,
  style,
}: CountrySelectorProps) {
  const locale = useLocale();
  const defaultLabel = locale === "en" ? "Delivery country" : "Pays de livraison";
  const effectiveLabel = label ?? defaultLabel;

  const options = useMemo(() => {
    let display: Intl.DisplayNames | null = null;
    try {
      display = new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      display = null;
    }
    const nameOf = (code: string): string => {
      try {
        return display?.of(code) ?? code;
      } catch {
        return code;
      }
    };

    const all  = listDeliverableCountries().map(({ code }) => ({ code, name: nameOf(code) }));
    const fr   = all.filter(c => c.code === "FR");
    const mc   = all.filter(c => c.code === "MC"); // Monaco JUSTE après la France (métropole FR, pas l'UE)
    const rest = all
      .filter(c => c.code !== "FR" && c.code !== "MC")
      .sort((a, b) => a.name.localeCompare(b.name, locale));
    return [...fr, ...mc, ...rest]; // France, puis Monaco, puis l'UE triée par nom
  }, [locale]);

  const dark = variant === "dark";
  const optionStyle: React.CSSProperties = dark
    ? { background: "#1a1410", color: "#f2ede6" }
    : { background: "#fff", color: "#1a1410" };
  const selectStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: 10, fontSize: 15, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    border:     dark ? "1px solid rgba(242,237,230,0.14)" : "1px solid rgba(26,20,16,0.15)",
    background: dark ? "rgba(242,237,230,0.06)"           : "#fff",
    color:      dark ? "#f2ede6"                          : "#1a1410",
  };

  return (
    <div className={className} style={style}>
      {!hideLabel && (
        <label
          htmlFor={id}
          style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: dark ? "rgba(242,237,230,0.6)" : "rgba(26,20,16,0.5)", marginBottom: 6 }}
        >
          {effectiveLabel}
        </label>
      )}
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-label={effectiveLabel}
        onChange={e => onChange?.(e.target.value)}
        style={selectStyle}
      >
        {options.map(o => (
          <option key={o.code} value={o.code} style={optionStyle}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
