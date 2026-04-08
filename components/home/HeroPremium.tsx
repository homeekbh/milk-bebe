"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

export default function HeroPremium() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!heroRef.current) return;

    gsap.fromTo(
      heroRef.current.querySelector(".hero-content"),
      { opacity: 0, y: 60 },
      { opacity: 1, y: 0, duration: 1.2, ease: "power3.out" }
    );
  }, []);

  return (
    <section
      ref={heroRef}
      style={{
        position: "relative",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        padding: "0 8%",
        color: "#F6F3EE",
        backgroundImage: `
          linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)),
          url('/hero-papa.jpg')
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="hero-content" style={{ maxWidth: 680 }}>
        <div
          style={{
            fontSize: 14,
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 16,
            color: "#C2A65A",
          }}
        >
          Maison M!LK
        </div>

        <h1
          style={{
            fontSize: "clamp(42px, 6vw, 80px)",
            lineHeight: 1.05,
            margin: 0,
            fontWeight: 900,
          }}
        >
          Le confort bébé.
          <br />
          Sans compromis.
        </h1>

        <div
          style={{
            height: 2,
            width: 120,
            background: "#C2A65A",
            margin: "24px 0",
          }}
        />

        <p
          style={{
            fontSize: 18,
            lineHeight: 1.6,
            opacity: 0.85,
            marginBottom: 32,
          }}
        >
          Bambou premium. Stock réel. Livraison maîtrisée.
        </p>

        <Link
          href="/produits"
          style={{
            background: "#111111",
            color: "#F6F3EE",
            padding: "16px 32px",
            fontWeight: 700,
            textDecoration: "none",
            display: "inline-block",
            transition: "all 0.3s ease",
          }}
        >
          Découvrir la collection
        </Link>
      </div>
    </section>
  );
}
