"use client";

import Link from "next/link";

export default function CategoryPills() {
  const pillBase: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: 999,
    background: "#0f0f0f",
    color: "#ffffff",
    fontWeight: 700,
    textDecoration: "none",
    fontSize: 13,
    letterSpacing: 0.2,
    border: "1px solid rgba(0,0,0,0.08)",
    transition: "all 0.2s ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const pills = [
    { label: "Tous les produits", href: "/produits" },
    { label: "Bodies", href: "/categorie/bodies" },
    { label: "Pyjamas", href: "/categorie/pyjamas" },
    { label: "Gigoteuses", href: "/categorie/gigoteuses" },
    { label: "Accessoires", href: "/categorie/accessoires" },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        marginTop: 20,
        marginBottom: 10,
      }}
    >
      {pills.map((p) => (
        <Link
          key={p.href}
          href={p.href}
          style={pillBase}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#e5b700";
            e.currentTarget.style.color = "#000";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#0f0f0f";
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.transform = "translateY(0px)";
          }}
        >
          {p.label}
        </Link>
      ))}
    </div>
  );
}
