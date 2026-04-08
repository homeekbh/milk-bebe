"use client";

import { usePathname } from "next/navigation";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { IntroProvider } from "@/context/IntroContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ChatWidget from "@/components/bot/ChatWidget";
import IntroScreen from "@/components/intro/IntroScreen";

export default function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return (
      <AuthProvider>
        <CartProvider>{children}</CartProvider>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <CartProvider>
        <IntroProvider>
          <IntroScreen />
          <Header />
          <main>{children}</main>
          <Footer />
          <ChatWidget />
        </IntroProvider>
      </CartProvider>
    </AuthProvider>
  );
}