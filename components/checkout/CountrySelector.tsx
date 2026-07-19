"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import { listDeliverableCountries } from "@/lib/delivery-config";

/**
 * Sélecteur de pays de livraison — RÉUTILISABLE (checkout international).
 *
 * Peuplé UNIQUEMENT depuis listDeliverableCountries() (source : COUNTRY_TO_ZONE) :
 * aucun pays non livrable (US, RU, DOM-TOM…) n'apparaît. La France est toujours
 * en tête ; les autres pays sont triés par nom localisé lisible (Intl.DisplayNames,
 * fallback = code ISO). Composant contrôlé : `value` + `onChange(code)`.
 */
export type CountrySelectorProps = {
  value?: string;
  onChange?: (country: string) => void;
  id?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export default function CountrySelector({
  value = "FR",
  onChange,
  id = "country-selector",
  label,
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
    const rest = all
      .filter(c => c.code !== "FR")
      .sort((a, b) => a.name.localeCompare(b.name, locale));
    return [...fr, ...rest]; // France TOUJOURS en premier
  }, [locale]);

  return (
    <div className={className} style={style}>
      <label
        htmlFor={id}
        style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)", marginBottom: 6 }}
      >
        {effectiveLabel}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-label={effectiveLabel}
        onChange={e => onChange?.(e.target.value)}
        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(26,20,16,0.15)", background: "#fff", fontSize: 15, fontWeight: 600, color: "#1a1410", cursor: disabled ? "not-allowed" : "pointer" }}
      >
        {options.map(o => (
          <option key={o.code} value={o.code}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
