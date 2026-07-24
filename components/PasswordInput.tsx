"use client";

import { useState } from "react";

/**
 * Champ mot de passe RÉUTILISABLE avec bouton œil (afficher/masquer).
 * - Le bouton est type="button" → ne soumet JAMAIS le formulaire.
 * - Accessible : aria-label + aria-pressed, focusable au clavier (c'est un <button>).
 * - Style-agnostique : `inputStyle` est fourni par la page (thème sombre auth / clair compte) ;
 *   on ne force que le paddingRight pour laisser la place à l'icône.
 * - `variant` ne pilote QUE la couleur de l'icône (accent ambre sur fond sombre, gris sur clair).
 */
export default function PasswordInput({
  value,
  onChange,
  placeholder,
  required = false,
  autoComplete,
  id,
  inputStyle,
  variant = "dark",
  labelShow = "Afficher le mot de passe",
  labelHide = "Masquer le mot de passe",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  id?: string;
  inputStyle?: React.CSSProperties;
  variant?: "dark" | "light";
  labelShow?: string;
  labelHide?: string;
}) {
  const [show, setShow] = useState(false);
  const iconColor = variant === "dark" ? "#c49a4a" : "rgba(26,20,16,0.55)";

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{ ...inputStyle, paddingRight: 44 }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? labelHide : labelShow}
        aria-pressed={show}
        title={show ? labelHide : labelShow}
        tabIndex={0}
        style={{
          position: "absolute",
          right: 6,
          top: "50%",
          transform: "translateY(-50%)",
          width: 32,
          height: 32,
          display: "grid",
          placeItems: "center",
          background: "transparent",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          padding: 0,
          color: iconColor,
          lineHeight: 0,
        }}
      >
        {show ? (
          // œil barré
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M2 2l20 20" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" />
            <path d="M6.7 6.9C4.6 8.2 3 10 2 12c1.6 3.3 5.3 6 10 6 1.9 0 3.6-.4 5.1-1.2M9.9 5.2A11 11 0 0 1 12 5c4.7 0 8.4 2.7 10 6a13 13 0 0 1-2.6 3.4"
              stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          // œil ouvert
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M2 12c1.6-3.3 5.3-6 10-6s8.4 2.7 10 6c-1.6 3.3-5.3 6-10 6s-8.4-2.7-10-6z"
              stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="3" stroke={iconColor} strokeWidth="1.8" />
          </svg>
        )}
      </button>
    </div>
  );
}
