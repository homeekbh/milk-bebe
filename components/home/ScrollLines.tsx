"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const phrases = [
  "Bambou ultra-doux",
  "Stock réel après paiement",
  "Livraison premium maîtrisée",
  "Confort sans compromis",
];

export default function ScrollLines() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const lines = containerRef.current.querySelectorAll(".line");

    lines.forEach((line, index) => {
      const direction = index % 2 === 0 ? 1 : -1;

      gsap.to(line, {
        x: direction * 300,
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    });
  }, []);

  return (
    <section
      ref={containerRef}
      style={{
        background: "#111111",
        color: "#F6F3EE",
        padding: "120px 0",
        overflow: "hidden",
      }}
    >
      {phrases.map((text, i) => (
        <div
          key={i}
          className="line"
          style={{
            fontSize: "clamp(28px, 4vw, 60px)",
            fontWeight: 800,
            whiteSpace: "nowrap",
            padding: "20px 8%",
          }}
        >
          {text}
        </div>
      ))}
    </section>
  );
}
