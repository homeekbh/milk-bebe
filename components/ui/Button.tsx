"use client";

import Link from "next/link";
import React from "react";

type Props = {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
};

export default function Button({
  children,
  href,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
}: Props) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "13px 22px",
    borderRadius: 12,
    fontWeight: 900,
    fontSize: 15,
    transition: "all 250ms ease",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: "var(--milk-warm, #f2ede6)",
      color: "var(--milk-night, #1a1410)",
      border: "1px solid transparent",
    },
    secondary: {
      background: "transparent",
      color: "var(--milk-warm, #f2ede6)",
      border: "1px solid rgba(242,237,230,0.25)",
    },
    ghost: {
      background: "transparent",
      color: "var(--milk-text)",
      border: "none",
    },
  };

  const style = { ...base, ...variants[variant] };

  const content = (
    <span
      style={style}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={(e) => {
        if (variant === "primary") {
          e.currentTarget.style.background = "var(--milk-amber, #c49a4a)";
          e.currentTarget.style.color = "#fff";
        }
        if (variant === "secondary") {
          e.currentTarget.style.background = "rgba(242,237,230,0.1)";
          e.currentTarget.style.borderColor = "rgba(242,237,230,0.5)";
        }
      }}
      onMouseLeave={(e) => {
        if (variant === "primary") {
          e.currentTarget.style.background = "var(--milk-warm, #f2ede6)";
          e.currentTarget.style.color = "var(--milk-night, #1a1410)";
        }
        if (variant === "secondary") {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = "rgba(242,237,230,0.25)";
        }
      }}
    >
      {children}
    </span>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return (
    <button type={type} disabled={disabled} style={{ all: "unset" }}>
      {content}
    </button>
  );
}