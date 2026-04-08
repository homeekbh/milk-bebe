"use client";

import { useEffect, useRef } from "react";

type Props = {
  imageUrl: string;
  backgroundPosition?: string;
  minHeight?: string;
  children: React.ReactNode;
};

export default function HeroTilt({
  imageUrl,
  backgroundPosition = "center 65%",
  minHeight = "90vh",
  children,
}: Props) {
  const layerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = layerRef.current;
    if (!el) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;

      el.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    };

    const reset = () => {
      el.style.transform =
        "perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)";
    };

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", reset);

    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", reset);
    };
  }, []);

  return (
    <section
      style={{
        position: "relative",
        minHeight,
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      {/* IMAGE (tilt) */}
      <div
        ref={layerRef}
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url('${imageUrl}')`,
          backgroundSize: "cover",
          backgroundPosition,
          transition: "transform 0.15s ease-out",
          willChange: "transform",
        }}
      />

      {/* Overlay sombre premium */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.9))",
          pointerEvents: "none",
        }}
      />

      {/* CONTENT */}
      <div style={{ position: "relative", width: "100%" }}>{children}</div>
    </section>
  );
}
