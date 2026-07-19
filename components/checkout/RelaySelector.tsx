"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { isDomTom, domTomMessage, type Carrier, type DeliveryType } from "@/lib/delivery-config";

/**
 * Sélecteur de point relais / locker — EXTRAIT de /panier (refactoring pur, Lot
 * relais-1). Encapsule : recherche par CP (/api/servicepoints), filtre distance
 * 10 km, modale, saisie manuelle de secours, récap du relais choisi.
 *
 * API contrôlée (réutilisable panier + futur tunnel checkout) :
 *  - carrier / deliveryType : contexte de livraison courant.
 *  - value / onChange       : le relais sélectionné (PERSISTÉ par le parent).
 *  - open / onOpenChange     : ouverture de la modale (le parent la pilote aussi
 *                              au changement de mode de livraison).
 *  - postalSearch / onPostalSearchChange : CP saisi (PERSISTÉ par le parent).
 *  - resetKey : incrémenté par le parent quand il change de mode → réinitialise
 *               l'état de recherche (résultats + erreurs), comme l'ancien
 *               switchDelivery. L'ouverture simple (« Changer ») préserve, elle,
 *               les résultats — cf. openModal().
 *
 * ⚠️ Comportement STRICTEMENT identique à l'ancien code inline de /panier.
 */
export type ServicePoint = {
  id: string;
  name: string;
  street: string;
  city: string;
  postal_code: string;
  distance: number | null;
  opening_hours: string | null;
};

// Distance max (km) d'un point relais affiché dans le sélecteur.
const MAX_RELAY_DISTANCE_KM = 10;

export default function RelaySelector({
  carrier,
  deliveryType,
  value,
  onChange,
  open,
  onOpenChange,
  postalSearch,
  onPostalSearchChange,
  resetKey,
  blockDomTom = false,
}: {
  carrier: Carrier | null;
  deliveryType: DeliveryType | null;
  value: ServicePoint | null;
  onChange: (relay: ServicePoint) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postalSearch: string;
  onPostalSearchChange: (v: string) => void;
  resetKey: number;
  // Opt-in : refuser les CP DOM-TOM (97xxx / 98xxx) AVANT la recherche. Par défaut
  // FALSE → /panier (prod) reste STRICTEMENT inchangé ; le tunnel l'active.
  blockDomTom?: boolean;
}) {
  const en = useLocale() === "en";
  const [searching,      setSearching]      = useState(false);
  const [searchResults,  setSearchResults]  = useState<ServicePoint[]>([]);
  const [searchError,    setSearchError]    = useState("");
  const [searchEmpty,    setSearchEmpty]    = useState(false);
  const [manualRelay,    setManualRelay]    = useState({ name: "", address: "", city: "", postal_code: "" });
  const [fallbackManual, setFallbackManual] = useState(false);

  // Réinitialisation "changement de mode" (ancien switchDelivery) : vide résultats
  // + erreurs. resetKey change à CHAQUE clic d'un mode de livraison (même identique).
  useEffect(() => {
    setSearchResults([]);
    setSearchEmpty(false);
    setFallbackManual(false);
    setSearchError("");
  }, [resetKey]);

  async function searchServicePoints() {
    const cp = postalSearch.trim();
    if (!/^\d{4,5}$/.test(cp)) {
      setSearchError("Code postal invalide (4 ou 5 chiffres)");
      return;
    }
    // DOM-TOM (97xxx / 98xxx) : refus AVANT tout appel /api/servicepoints.
    if (blockDomTom && isDomTom(cp)) {
      setSearchError(domTomMessage(en));
      return;
    }
    if (!carrier) {
      setSearchError("Sélectionnez d'abord un transporteur");
      return;
    }
    setSearching(true);
    setSearchError("");
    setSearchEmpty(false);
    setSearchResults([]);
    setFallbackManual(false);
    try {
      const res = await fetch(`/api/servicepoints?postal_code=${encodeURIComponent(cp)}&carrier=${encodeURIComponent(carrier)}`);
      const data = await res.json();
      if (!res.ok || data.error === true) {
        setSearchError(data.message ?? "Impossible de charger les points relais. Réessayez.");
        setFallbackManual(true);
      } else {
        // Filtre côté client : distance max 10 km. Si Sendcloud ne fournit pas
        // de distance, on conserve le point (mieux vaut afficher que rien).
        const all: ServicePoint[] = data.results ?? [];
        const filtered = all.filter(sp => sp.distance == null || sp.distance <= MAX_RELAY_DISTANCE_KM);
        setSearchResults(filtered);
        setSearchEmpty(filtered.length === 0);
        if (filtered.length === 0 && all.length === 0 && data.fallback_manual) {
          setFallbackManual(true);
        }
      }
    } catch (e: any) {
      setSearchError("Erreur réseau : " + (e?.message ?? "inconnue"));
      setFallbackManual(true);
    } finally {
      setSearching(false);
    }
  }

  function selectServicePoint(sp: ServicePoint) {
    onChange(sp);
    setSearchError("");
    onOpenChange(false);
  }

  function applyManualRelay() {
    const { name, address, city, postal_code } = manualRelay;
    if (!name.trim() || !address.trim() || !city.trim() || !/^\d{4,5}$/.test(postal_code)) {
      setSearchError("Remplis tous les champs pour la saisie manuelle.");
      return;
    }
    onChange({
      id:            `manual:${postal_code}`,
      name:          name.trim(),
      street:        address.trim(),
      city:          city.trim(),
      postal_code:   postal_code.trim(),
      distance:      null,
      opening_hours: null,
    });
    setSearchError("");
    onOpenChange(false);
  }

  // Ouverture "Changer / choisir" (ancien openRelayModal) : reset erreurs mais
  // PRÉSERVE searchResults (contrairement au changement de mode).
  function openModal() {
    setSearchError("");
    setSearchEmpty(false);
    setFallbackManual(false);
    onOpenChange(true);
  }

  const isRelay = deliveryType === "point_relais" || deliveryType === "locker";

  return (
    <>
      {/* Récap relais sélectionné */}
      {isRelay && value && (
        <div style={{ background: "#dcfce7", borderRadius: 12, padding: 14, marginBottom: 10, border: "1px solid #86efac" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#166534", marginBottom: 4, letterSpacing: 0.5, textTransform: "uppercase" }}>
                📍 {deliveryType === "locker" ? "Locker" : "Point Relais"} sélectionné
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#166534", marginBottom: 4, wordBreak: "break-word" }}>{value.name}</div>
              <div style={{ fontSize: 12, color: "#1a1410", wordBreak: "break-word" }}>{value.street}, {value.postal_code} {value.city}</div>
              {typeof value.opening_hours === "string" && value.opening_hours && (
                <div style={{ fontSize: 11, color: "rgba(26,20,16,0.55)", marginTop: 4, fontStyle: "italic" }}>🕐 {value.opening_hours}</div>
              )}
            </div>
            <button
              onClick={openModal}
              style={{ background: "transparent", border: "1px solid #166534", fontSize: 12, fontWeight: 800, color: "#166534", padding: "10px 14px", minHeight: 44, borderRadius: 8, cursor: "pointer", flexShrink: 0 }}>
              Changer
            </button>
          </div>
        </div>
      )}

      {/* PR/Locker choisi mais aucun relais encore → rouvrir la modale */}
      {isRelay && !value && (
        <button
          onClick={openModal}
          style={{ width: "100%", padding: "14px 16px", borderRadius: 12, background: "#fef3c7", color: "#92400e", fontWeight: 800, fontSize: 13, border: "2px dashed #fde68a", cursor: "pointer", marginBottom: 10 }}>
          📍 Choisir votre {deliveryType === "locker" ? "locker" : "point relais"} →
        </button>
      )}

      {/* ══ MODALE — SÉLECTION POINT RELAIS / LOCKER ══ */}
      {open && carrier && isRelay && (
        <div
          onClick={() => onOpenChange(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 18, maxWidth: 560, width: "100%", maxHeight: "90vh", overflow: "auto", padding: 24, boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}
          >
            {/* Header modale */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 950, color: "#1a1410", letterSpacing: -0.5 }}>
                  Choisir votre {deliveryType === "locker" ? "locker" : "point relais"}
                </h2>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(26,20,16,0.5)", marginTop: 4 }}>
                  {carrier === "mondial_relay" ? "📦 Mondial Relay" : "🚀 Colissimo / La Poste"}
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                aria-label="Fermer"
                style={{ background: "none", border: "none", fontSize: 26, lineHeight: 1, cursor: "pointer", color: "rgba(26,20,16,0.4)", padding: 0, width: 32, height: 32 }}>
                ×
              </button>
            </div>

            {/* Recherche par code postal */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="Code postal"
                value={postalSearch}
                onChange={e => onPostalSearchChange(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && searchServicePoints()}
                style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1.5px solid rgba(26,20,16,0.15)", fontSize: 15, fontFamily: "monospace", letterSpacing: 1, outline: "none", background: "#faf8f4" }}
              />
              <button
                onClick={searchServicePoints}
                disabled={searching}
                style={{ padding: "11px 22px", borderRadius: 10, background: "#1a1410", color: "#c49a4a", border: "none", fontWeight: 800, fontSize: 14, cursor: searching ? "wait" : "pointer", opacity: searching ? 0.6 : 1, whiteSpace: "nowrap" }}>
                {searching ? "..." : "🔍 Rechercher"}
              </button>
            </div>

            {searchError && (
              <div style={{ padding: "10px 12px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
                ⚠ {searchError}
              </div>
            )}

            {searching && (
              <div style={{ padding: "24px 14px", fontSize: 13, color: "rgba(26,20,16,0.5)", textAlign: "center" }}>
                ⏳ Recherche {deliveryType === "locker" ? "des lockers" : "des Points Relais"} {carrier === "mondial_relay" ? "Mondial Relay" : "Colissimo"} à proximité...
              </div>
            )}

            {/* Liste des résultats */}
            {!searching && searchResults.length > 0 && (
              <div style={{ display: "grid", gap: 8, maxHeight: 380, overflowY: "auto", marginBottom: 10 }}>
                {searchResults.map(sp => (
                  <button
                    key={sp.id ?? `${sp.postal_code}-${sp.name}`}
                    onClick={() => selectServicePoint(sp)}
                    style={{ textAlign: "left", background: "#faf8f4", border: "1.5px solid rgba(26,20,16,0.08)", borderRadius: 10, padding: "12px 14px", cursor: "pointer", fontFamily: "inherit", display: "grid", gap: 4, transition: "all 0.15s" }}
                    onMouseOver={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#1a1410"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "#faf8f4"; e.currentTarget.style.borderColor = "rgba(26,20,16,0.08)"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: "#1a1410", lineHeight: 1.3 }}>{sp.name ?? "(sans nom)"}</div>
                      {sp.distance != null && (
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#c49a4a", whiteSpace: "nowrap", flexShrink: 0 }}>
                          {Number(sp.distance).toFixed(1)} km
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(26,20,16,0.65)", lineHeight: 1.5 }}>
                      {sp.street ?? ""}{sp.street ? ", " : ""}{sp.postal_code ?? ""} {sp.city ?? ""}
                    </div>
                    {typeof sp.opening_hours === "string" && sp.opening_hours && (
                      <div style={{ fontSize: 11, color: "rgba(26,20,16,0.45)", marginTop: 2, fontStyle: "italic" }}>
                        🕐 {sp.opening_hours}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Aucun résultat */}
            {!searching && searchEmpty && searchResults.length === 0 && (
              <div style={{ padding: "14px 16px", borderRadius: 8, background: "#fef3c7", color: "#92400e", fontSize: 13, fontWeight: 700, textAlign: "center", marginBottom: 10 }}>
                Aucun {deliveryType === "locker" ? "locker" : "Point Relais"} {carrier === "mondial_relay" ? "Mondial Relay" : "Colissimo"} trouvé à moins de {MAX_RELAY_DISTANCE_KM} km.
              </div>
            )}

            {/* Lien saisie manuelle */}
            <div style={{ marginTop: 12, padding: "8px 12px", fontSize: 12, color: "rgba(26,20,16,0.55)", textAlign: "center" }}>
              Pas de résultat satisfaisant ?
              {" "}
              <button onClick={() => setFallbackManual(v => !v)} style={{ background: "none", border: "none", color: "#c49a4a", fontWeight: 800, fontSize: 12, textDecoration: "underline", cursor: "pointer" }}>
                {fallbackManual ? "Masquer" : "Saisir manuellement"}
              </button>
            </div>

            {/* Mode saisie manuelle */}
            {fallbackManual && (
              <div style={{ marginTop: 12, padding: 14, borderRadius: 10, background: "#faf8f4", border: "1px solid rgba(26,20,16,0.1)" }}>
                <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 10, color: "#1a1410" }}>
                  ✍️ Entrez l'adresse de votre point relais préféré :
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <input type="text" placeholder="Nom du point relais (ex: Tabac de la Gare)"
                    value={manualRelay.name}
                    onChange={e => setManualRelay(r => ({ ...r, name: e.target.value }))}
                    style={{ padding: "9px 11px", borderRadius: 7, border: "1px solid rgba(26,20,16,0.15)", fontSize: 13, outline: "none", background: "#fff" }} />
                  <input type="text" placeholder="Adresse complète"
                    value={manualRelay.address}
                    onChange={e => setManualRelay(r => ({ ...r, address: e.target.value }))}
                    style={{ padding: "9px 11px", borderRadius: 7, border: "1px solid rgba(26,20,16,0.15)", fontSize: 13, outline: "none", background: "#fff" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 6 }}>
                    <input type="text" inputMode="numeric" maxLength={5} placeholder="CP"
                      value={manualRelay.postal_code}
                      onChange={e => setManualRelay(r => ({ ...r, postal_code: e.target.value.replace(/\D/g, "") }))}
                      style={{ padding: "9px 11px", borderRadius: 7, border: "1px solid rgba(26,20,16,0.15)", fontSize: 13, fontFamily: "monospace", outline: "none", background: "#fff" }} />
                    <input type="text" placeholder="Ville"
                      value={manualRelay.city}
                      onChange={e => setManualRelay(r => ({ ...r, city: e.target.value }))}
                      style={{ padding: "9px 11px", borderRadius: 7, border: "1px solid rgba(26,20,16,0.15)", fontSize: 13, outline: "none", background: "#fff" }} />
                  </div>
                  <button
                    onClick={() => applyManualRelay()}
                    style={{ padding: "10px", borderRadius: 7, background: "#1a1410", color: "#c49a4a", border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", marginTop: 4 }}>
                    Valider ce point relais
                  </button>
                </div>
              </div>
            )}

            {/* Bouton Annuler */}
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => onOpenChange(false)}
                style={{ padding: "10px 22px", borderRadius: 10, background: "transparent", color: "rgba(26,20,16,0.6)", fontWeight: 700, fontSize: 13, border: "1px solid rgba(26,20,16,0.15)", cursor: "pointer" }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
