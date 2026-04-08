// components/layout/Section.tsx
export default function Section({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "tight";
}) {
  const padY = variant === "tight" ? 26 : 44;
  return (
    <section style={{ paddingTop: padY, paddingBottom: padY }}>
      {children}
    </section>
  );
}
