"use client";

import { useLocale } from "next-intl";
import { isDomTom, domTomMessage } from "@/lib/delivery-config";
import { postalInputMode, postalMaxLength } from "@/lib/postal";

/**
 * Formulaire d'adresse du tunnel (FR domicile + international). Contrôlé :
 * `value` + `onChange(patch)`. Le pays est imposé par le CountrySelector (affiché
 * en lecture seule ici, nom localisé). Adresse internationale volontairement
 * BASIQUE en Lot 4c — affinage (états/régions, validations pays) prévu Lot 6.
 */
export type CheckoutAddress = {
  name?:        string;
  line1?:       string;
  line2?:       string;
  postal_code?: string;
  city?:        string;
  country?:     string;
};

export function isAddressComplete(a: CheckoutAddress | null | undefined): boolean {
  if (!(a && a.name?.trim() && a.line1?.trim() && a.postal_code?.trim() && a.city?.trim())) return false;
  // DOM-TOM (CP 97xxx / 98xxx) non livrés → adresse INVALIDE tant que le CP l'est.
  // (Ce formulaire n'est utilisé que pour le domicile FRANCE ; l'international n'a
  //  plus de saisie d'adresse dans le tunnel.)
  return !isDomTom(a.postal_code ?? "");
}

const LBL: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)", marginBottom: 6 };
const INP: React.CSSProperties = { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(26,20,16,0.15)", fontSize: 15, fontWeight: 600, background: "#fff", boxSizing: "border-box" };

export default function CheckoutAddressForm({
  value,
  onChange,
  country,
}: {
  value: CheckoutAddress | null;
  onChange: (patch: Partial<CheckoutAddress>) => void;
  country: string;
}) {
  const en = useLocale() === "en";
  const v = value ?? {};
  const cpDomTom = isDomTom(v.postal_code ?? "");

  let countryName = country;
  try { countryName = new Intl.DisplayNames([en ? "en" : "fr"], { type: "region" }).of(country) ?? country; } catch {}

  const field = (key: keyof CheckoutAddress, label: string) => (
    <div>
      <label style={LBL} htmlFor={`addr-${key}`}>{label}</label>
      <input
        id={`addr-${key}`}
        value={(v[key] as string) ?? ""}
        onChange={e => onChange({ [key]: e.target.value })}
        style={INP}
      />
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {field("name",  en ? "Full name" : "Nom complet")}
      {field("line1", en ? "Address" : "Adresse")}
      {field("line2", en ? "Address line 2 (optional)" : "Complément (optionnel)")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, alignItems: "start" }}>
        <div>
          <label style={LBL} htmlFor="addr-postal_code">{en ? "Postal code" : "Code postal"}</label>
          <input
            id="addr-postal_code"
            inputMode={postalInputMode(country)}
            maxLength={postalMaxLength(country)}
            value={(v.postal_code as string) ?? ""}
            onChange={e => onChange({ postal_code: e.target.value })}
            style={{ ...INP, ...(cpDomTom ? { borderColor: "#ef4444" } : {}) }}
          />
          {cpDomTom && (
            <div style={{ marginTop: 6, fontSize: 12, color: "#b91c1c", fontWeight: 700, lineHeight: 1.4 }}>
              {domTomMessage(en)}
            </div>
          )}
        </div>
        {field("city", en ? "City" : "Ville")}
      </div>
      <div>
        <label style={LBL}>{en ? "Country" : "Pays"}</label>
        <div style={{ ...INP, color: "rgba(26,20,16,0.6)", background: "#f7f5f1" }}>{countryName}</div>
      </div>
    </div>
  );
}
