import { CheckoutProvider } from "@/components/checkout/CheckoutContext";

// Layout du tunnel checkout (Lot 4a) : monte le CheckoutProvider (état partagé +
// persistance sessionStorage) autour de toutes les pages /checkout/*.
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#ede8df", minHeight: "100vh" }}>
      <CheckoutProvider>{children}</CheckoutProvider>
    </div>
  );
}
