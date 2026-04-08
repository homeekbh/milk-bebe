// components/layout/Container.tsx
export default function Container({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1200,
        margin: "0 auto",
        paddingLeft: 18,
        paddingRight: 18,
      }}
    >
      {children}
    </div>
  );
}
