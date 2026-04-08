export default function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 14px",
        borderRadius: 999,
        background: "rgba(196,154,74,0.15)",
        color: "#c49a4a",
        fontWeight: 800,
        fontSize: 13,
        letterSpacing: 0.3,
        border: "1px solid rgba(196,154,74,0.3)",
      }}
    >
      {children}
    </span>
  );
}