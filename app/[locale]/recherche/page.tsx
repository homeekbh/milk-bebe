import { Suspense } from "react";
import RechercheClient from "./RechercheClient";

export default function RecherchePage() {
  return (
    <Suspense fallback={
      <div style={{ background: "#1a1410", minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ color: "rgba(242,237,230,0.3)", fontSize: 14 }}>Chargement...</div>
      </div>
    }>
      <RechercheClient />
    </Suspense>
  );
}