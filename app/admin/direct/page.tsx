"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";

export default function AdminDirect() {
  const [status, setStatus] = useState("Vérification de ta session...");

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setStatus("Pas de session — redirige vers le login...");
        setTimeout(() => { window.location.href = "/admin/login"; }, 1500);
        return;
      }

      setStatus(`Connecté : ${session.user.email} — vérification admin...`);

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .single();

      if (profile?.is_admin) {
        setStatus("✅ Admin confirmé ! Redirection...");
        setTimeout(() => { window.location.href = "/admin"; }, 500);
      } else {
        setStatus("❌ Pas admin. is_admin = " + profile?.is_admin);
      }
    }
    check();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#1a1410", display: "grid", placeItems: "center" }}>
      <div style={{ color: "#c49a4a", fontSize: 18, fontWeight: 700, textAlign: "center", padding: 40 }}>
        {status}
      </div>
    </div>
  );
}