"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export default function ScrollMarquee() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  const topText = useMemo(() => "M!LK RÉDUIT LES GALÈRES", []);
  const topText2 = useMemo(() => "DU QUOTIDIEN", []);

  const bottomText = useMemo(() => "MOINS D’IRRITATIONS.", []);
  const bottomText2 = useMemo(() => "PLUS DE CALME.", []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

const bigTextStyle = {
  fontSize: "clamp(46px, 6vw, 100px)",
  fontWeight: 950,
  letterSpacing: "-1.2px",
  lineHeight: 1.05,
  textTransform: "uppercase" as const,
  transition: "transform 0.9s cubic-bezier(.22,1,.36,1)",
  willChange: "transform",

  // ✅ gris plus clair et plus contrasté
  color: "rgba(0,0,0,0.12)",

  // ✅ ombre nette (pas floue, pas trouble)
  textShadow: "0 3px 0 rgba(0,0,0,0.06)",

  textAlign: "center" as const,
};

  const lineStyle = {
    display: "block",
    marginTop: 18,
  } as const;

  const Card = ({
    image,
    title,
    desc,
    href,
  }: {
    image: string;
    title: string;
    desc: string;
    href: string;
  }) => {
    return (
      <div
        style={{
          borderRadius: 20,
          overflow: "hidden",
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            height: 230,
            backgroundImage: `url(${image})`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundColor: "#f6f2ea",
          }}
        />

        <div style={{ padding: 22 }}>
          <h3 style={{ margin: 0, fontWeight: 900, fontSize: 20 }}>
            {title}
          </h3>

          <p style={{ opacity: 0.8, marginTop: 8, lineHeight: 1.5 }}>
            {desc}
          </p>

          <Link
            href={href}
            style={{
              display: "inline-block",
              marginTop: 16,
              padding: "10px 18px",
              background: "#000",
              color: "#fff",
              fontWeight: 900,
              textDecoration: "none",
              borderRadius: 8,
            }}
          >
            Découvrir →
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={sectionRef}
      style={{
        // 🔥 texture bambou beige
        background:
          "linear-gradient(rgba(243,239,232,0.94), rgba(243,239,232,0.94)), url('/images/bambou/bambou-texture.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* 🔥 espace réduit */}
      <div style={{ padding: "80px 6vw" }}>

        {/* ===== TOP TEXT ===== */}
        <div style={{ overflow: "hidden", marginBottom: 60 }}>
          <div
            style={{
              ...bigTextStyle,
              transform: visible
                ? "translateX(0) rotateX(0deg)"
                : "translateX(100vw) rotateX(25deg)",
              opacity: visible ? 1 : 0,
            }}
          >
            {topText}
          </div>

          <div
            style={{
              ...bigTextStyle,
              ...lineStyle,
              transform: visible
                ? "translateX(0) rotateX(0deg)"
                : "translateX(-100vw) rotateX(-25deg)",
              opacity: visible ? 1 : 0,
            }}
          >
            {topText2}
          </div>
        </div>

        {/* ===== CARDS ===== */}
        <div
          style={{
            marginBottom: 60,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))",
            gap: 30,
          }}
        >
          <Card
            image="/images/products/body-damier-noir-blanc/milk-body-damier-fin-noir-blanc-bebe-fille-jeu-sol-lifestyle-01.png"
            title="Bodies"
            desc="L’essentiel quotidien, coupe maîtrisée."
            href="/categorie/bodies"
          />
          <Card
            image="/images/products/pyjama-terracotta/milk-pyjama-zip-bambou-terracotta-nouveau-ne-endormi-lifestyle-01.png"
            title="Pyjamas"
            desc="Nuit plus calme, gestes plus simples."
            href="/categorie/pyjamas"
          />
          <Card
            image="/images/bambou/bambou-texture.png"
            title="Gigoteuses"
            desc="Sommeil sécurisé et chaleur maîtrisée."
            href="/categorie/gigoteuses"
          />
          <Card
            image="/images/bambou/bambou-texture.png"
            title="Accessoires"
            desc="Les détails qui simplifient le quotidien."
            href="/categorie/accessoires"
          />
        </div>

        {/* ===== BOTTOM TEXT ===== */}
        <div style={{ overflow: "hidden" }}>
          <div
            style={{
              ...bigTextStyle,
              transform: visible
                ? "translateX(0) rotateX(0deg)"
                : "translateX(-100vw) rotateX(25deg)",
              opacity: visible ? 1 : 0,
            }}
          >
            {bottomText}
          </div>

          <div
            style={{
              ...bigTextStyle,
              ...lineStyle,
              transform: visible
                ? "translateX(0) rotateX(0deg)"
                : "translateX(100vw) rotateX(-25deg)",
              opacity: visible ? 1 : 0,
            }}
          >
            {bottomText2}
          </div>
        </div>

      </div>
    </div>
  );
}