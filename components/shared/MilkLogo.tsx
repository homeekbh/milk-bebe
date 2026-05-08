"use client";
import React from "react";

/**
 * MilkLogo — identique au logo officiel M!LK (police ssboldin-Bold / boldin-bold.otf)
 *
 * La police boldin-bold.otf est déclarée dans globals.css via @font-face "BoldinBold".
 * Ce composant remplace TOUS les "M!LK" texte partout dans le site.
 *
 * Usage :
 *   <MilkLogo color="#f2ede6" size={24} />   ← header dark
 *   <MilkLogo color="#1a1410" size={22} />   ← header light / footer
 *   <MilkLogo color="#c49a4a" size={28} />   ← amber accent
 *   <MilkLogoAdmin color="#f2ede6" size={20} />
 */

interface MilkLogoProps {
  color?: string;
  /** Taille en px du texte — contrôle la hauteur visuelle du logo */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function MilkLogo({ color = "#f2ede6", size = 26, className, style }: MilkLogoProps) {
  return (
    <span
      className={`milk-logo-text${className ? ` ${className}` : ""}`}
      style={{
        fontSize: size,
        color,
        display: "inline-block",
        userSelect: "none",
        ...style,
      }}
      aria-label="M!LK"
    >
      M!LK
    </span>
  );
}

/** Variante avec badge ADMIN */
export function MilkLogoAdmin({
  color = "#f2ede6",
  size = 22,
  adminColor,
  className,
  style,
}: MilkLogoProps & { adminColor?: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        ...style,
      }}
      className={className}
    >
      <MilkLogo color={color} size={size} />
      <span
        style={{
          fontWeight: 800,
          fontSize: Math.max(9, size * 0.45),
          letterSpacing: 2,
          textTransform: "uppercase",
          color: adminColor ?? color,
          opacity: 0.5,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        ADMIN
      </span>
    </span>
  );
}

export default MilkLogo;