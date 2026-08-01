"use client";
import { useWishlist } from "@/context/WishlistContext";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import ParrainageProfil from "@/components/ParrainageProfil";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase-client";
import CountrySelector from "@/components/checkout/CountrySelector";
import { getTrackingInfo } from "@/lib/sendcloud-utils";
import PasswordInput from "@/components/PasswordInput";

type Address = {
  line1: string; line2: string; city: string;
  postal_code: string; country: string;
};
type Profile = {
  email: string; first_name: string; last_name: string;
  phone: string; newsletter: boolean;
  shipping_address: Address | null; billing_address: Address | null; billing_same: boolean;
};
type Order = {
  id: string; created_at: string; amount_total: number;
  status: string; shipping_status: string; items: any[];
  shipping_address: any; tracking_number?: string;
  classification?: string | null; source?: string | null;
};

const BG = "#ede8df"; const DARK = "#1a1410"; const AMBER = "#c49a4a"; const WARM = "#f2ede6";

function getTrackingUrl(notes: string | undefined, tracking: string): string | null {
  if (!tracking) return null;
  // Source unique de vérité (Colissimo / Mondial Relay / FedEx) — plus de logique
  // dupliquée. Les notes contiennent « Transporteur: X » → getTrackingInfo matche
  // par sous-chaîne (et détecte Mondial Relay via le préfixe "MR" du numéro).
  return getTrackingInfo(notes, tracking).url;
}
const EMPTY_ADDRESS: Address = { line1: "", line2: "", city: "", postal_code: "", country: "FR" };

// Rendu monétaire côté cliente (décision lot 3b-3) — UNE fonction pour les DEUX spots (total commande
// ET prix par article). cadeau/influenceuse → « Vue avec Erika » à la place du montant ; vente_directe
// et toute commande web → montant normal. ⚠️ amount_total reste 0 en base : on masque UNIQUEMENT le rendu.
function courtesyMoney(order: { classification?: string | null }, euros: number): string {
  const c = String(order?.classification ?? "").toLowerCase();
  if (c === "cadeau" || c === "influenceuse") return "Vue avec Erika";
  return `${(Number(euros) || 0).toFixed(2)} €`;
}

const SHIPPING_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  en_preparation: { label: "En préparation", bg: "#fef3c7", text: "#92400e" },
  expediee:       { label: "Expédiée",       bg: "#dcfce7", text: "#166534" },
  livree:         { label: "Livrée",         bg: "#d1fae5", text: "#065f46" },
  annulee:        { label: "Annulée",        bg: "#fee2e2", text: "#7f1d1d" },
  retour:         { label: "Retour",         bg: "#fee2e2", text: "#b91c1c" },
};

const IS: React.CSSProperties = {
  padding: "12px 14px", borderRadius: 10,
  border: "1.5px solid rgba(26,20,16,0.12)", fontSize: 15,
  fontWeight: 600, background: "#fff", width: "100%",
  boxSizing: "border-box", outline: "none", color: DARK,
};
const LS: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, letterSpacing: 1.5,
  textTransform: "uppercase", color: "rgba(26,20,16,0.45)",
  marginBottom: 6, display: "block",
};

function isPromoActive(p: any) {
  if (!p?.promo_price) return false;
  if (!p.promo_start && !p.promo_end) return true;
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  if (p.promo_start && today < p.promo_start.slice(0,10)) return false;
  if (p.promo_end   && today > p.promo_end.slice(0,10))   return false;
  return true;
}

function AddressFields({ addr, onChange }: { addr: Address; onChange: (a: Address) => void }) {
  function set(k: keyof Address, v: string) { onChange({ ...addr, [k]: v }); }
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div><label style={LS}>Adresse</label>
        <input value={addr.line1} onChange={e => set("line1", e.target.value)} placeholder="12 rue de la Paix" style={IS} /></div>
      <div><label style={LS}>Complément (optionnel)</label>
        <input value={addr.line2} onChange={e => set("line2", e.target.value)} placeholder="Bâtiment A..." style={IS} /></div>
      {/* PAYS avant le CP : la validation du code postal dépend du pays (5 chiffres FR, 6 RO…).
          Composant UNIQUE partagé (source listDeliverableCountries → 22 pays). Ce code ISO-2 pré-remplit
          le pays au checkout. Label "Pays" porté par le <label> ci-dessus (hideLabel). */}
      <div><label style={LS}>Pays</label>
        <CountrySelector value={addr.country} onChange={(v) => set("country", v)} hideLabel variant="light" id="profil-country" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12 }}>
        <div><label style={LS}>Code postal</label>
          <input value={addr.postal_code} onChange={e => set("postal_code", e.target.value)} placeholder="75001" style={IS} /></div>
        <div><label style={LS}>Ville</label>
          <input value={addr.city} onChange={e => set("city", e.target.value)} placeholder="Paris" style={IS} /></div>
      </div>
    </div>
  );
}

export default function ProfilPage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const { ids: wishIds, toggle } = useWishlist();
  const { addToCart } = useCart();

  const [tab,      setTab]      = useState<"infos"|"adresses"|"commandes"|"favoris"|"parrainage">("commandes");
  // Ouvre directement un onglet via ?tab=… (ex. lien email « Voir mes récompenses »
  // → onglet Parrainage). Lecture client-only (pas de useSearchParams → pas de Suspense).
  useEffect(() => {
    try {
      const t = new URLSearchParams(window.location.search).get("tab");
      if (t && ["infos", "adresses", "commandes", "favoris", "parrainage"].includes(t)) {
        setTab(t as "infos" | "adresses" | "commandes" | "favoris" | "parrainage");
      }
    } catch {}
  }, []);
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState("");

  // États formulaire
  const [firstName,    setFirstName]    = useState("");
  const [lastName,     setLastName]     = useState("");
  const [phone,        setPhone]        = useState("");
  const [newsletter,   setNewsletter]   = useState(false);
  const [shippingAddr, setShippingAddr] = useState<Address>(EMPTY_ADDRESS);
  const [billingAddr,  setBillingAddr]  = useState<Address>(EMPTY_ADDRESS);
  const [billingSame,  setBillingSame]  = useState(true);

  // Sécurité — changement de mot de passe (utilisateur connecté). Supabase updateUser ne
  // redemande PAS l'ancien mot de passe nativement (session déjà valide) — cf. rapport.
  const [newPassword,        setNewPassword]        = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pwdSaving,          setPwdSaving]          = useState(false);
  const [pwdError,           setPwdError]           = useState("");
  const [pwdSaved,           setPwdSaved]           = useState(false);

  // Favoris — produits chargés depuis Supabase
  const [wishProducts, setWishProducts] = useState<any[]>([]);
  const [wishLoading,  setWishLoading]  = useState(false);
  const [mounted,      setMounted]      = useState(false);

  // S'assurer qu'on est côté client avant de lire localStorage via WishlistContext
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.push("/connexion?redirect=/profil");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const [pRes, oRes] = await Promise.all([
        fetch("/api/profil", { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/commandes/client?email=${encodeURIComponent(user!.email ?? "")}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const p = await pRes.json();
      const o = await oRes.json();
      if (p && !p.error) {
        setProfile(p);
        setFirstName(p.first_name ?? "");
        setLastName(p.last_name ?? "");
        setPhone(p.phone ?? "");
        setNewsletter(p.newsletter ?? false);
        setShippingAddr(p.shipping_address ?? EMPTY_ADDRESS);
        setBillingAddr(p.billing_address ?? EMPTY_ADDRESS);
        setBillingSame(p.billing_same ?? true);
      }
      setOrders(Array.isArray(o) ? o : []);
      setLoading(false);
    }
    load();
  }, [user]);

  // Charger les produits favoris quand l'onglet s'ouvre ou que wishIds change
  // mounted garantit que localStorage a été lu avant de vérifier wishIds
  useEffect(() => {
    if (!mounted) return;
    if (tab !== "favoris") return;
    if (wishIds.length === 0) { setWishProducts([]); return; }
    setWishLoading(true);
    supabase
      .from("products")
      .select("id, name, slug, price_ttc, promo_price, promo_start, promo_end, image_url, category_slug, stock, sizes, colors")
      .in("id", wishIds)
      .then(({ data }) => { setWishProducts(data ?? []); setWishLoading(false); });
  }, [tab, wishIds, mounted]);

  async function handleChangePassword() {
    setPwdError(""); setPwdSaved(false);
    if (newPassword.length < 8) { setPwdError("Le mot de passe doit faire au moins 8 caractères."); return; }
    if (newPassword !== confirmNewPassword) { setPwdError("Les mots de passe ne correspondent pas."); return; }
    setPwdSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwdError("Erreur lors de la mise à jour du mot de passe. Réessaie.");
      setPwdSaving(false);
      return;
    }
    setNewPassword(""); setConfirmNewPassword("");
    setPwdSaved(true);
    setPwdSaving(false);
    setTimeout(() => setPwdSaved(false), 4000);
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/profil", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          first_name: firstName.trim(), last_name: lastName.trim(),
          phone: phone.trim(), newsletter,
          shipping_address: shippingAddr, billing_same: billingSame,
          billing_address: billingSame ? null : billingAddr,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) return (
    <div style={{ minHeight: "100vh", background: BG, display: "grid", placeItems: "center" }}>
      <div style={{ opacity: 0.4, fontSize: 16, color: DARK }}>Chargement...</div>
    </div>
  );
  if (!user) return null;

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || user.email?.split("@")[0] || "Mon compte";
  const initials = firstName && lastName ? `${firstName[0]}${lastName[0]}`.toUpperCase() : (user.email?.[0] ?? "M").toUpperCase();

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: "10px 20px", borderRadius: 10, fontWeight: 800, fontSize: 14,
    cursor: "pointer", border: "none",
    background: active ? DARK : "rgba(26,20,16,0.07)",
    color: active ? WARM : "rgba(26,20,16,0.55)",
    transition: "all 0.15s",
  });

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingTop: 90, paddingBottom: 80 }}>
      <style>{`
        @media (max-width: 600px) {
          .profil-header { flex-direction: column !important; align-items: flex-start !important; gap: 14px !important; }
          .profil-tabs { gap: 6px !important; }
          .profil-tabs button { padding: 8px 12px !important; font-size: 13px !important; }
          .wish-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 clamp(12px,4vw,20px)" }}>

        {/* Header */}
        <div className="profil-header" style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 32, flexWrap: "wrap" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: DARK, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `3px solid ${AMBER}` }}>
            <span style={{ color: AMBER, fontWeight: 950, fontSize: 22, letterSpacing: -1 }}>{initials}</span>
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: "0 0 4px", fontSize: "clamp(22px,3vw,30px)", fontWeight: 950, letterSpacing: -1, color: DARK }}>{displayName}</h1>
            <div style={{ fontSize: 14, color: "rgba(26,20,16,0.5)", fontWeight: 600 }}>{user.email}</div>
            {newsletter && (
              <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, background: "rgba(196,154,74,0.15)", border: "1px solid rgba(196,154,74,0.3)" }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: AMBER }}>✦ Membre newsletter M!LK</span>
              </div>
            )}
          </div>
          <button onClick={async () => { await signOut(); router.push("/"); }}
            style={{ padding: "10px 20px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer" }}>
            Déconnexion
          </button>
        </div>

        {/* Onglets */}
        <div className="profil-tabs" style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          <button style={TAB_STYLE(tab === "commandes")} onClick={() => setTab("commandes")}>
            🛍 Mes commandes {orders.length > 0 && `(${orders.length})`}
          </button>
          <button style={TAB_STYLE(tab === "infos")} onClick={() => setTab("infos")}>
            👤 Mes informations
          </button>
          <button style={TAB_STYLE(tab === "adresses")} onClick={() => setTab("adresses")}>
            📍 Mes adresses
          </button>
          <button style={TAB_STYLE(tab === "favoris")} onClick={() => setTab("favoris")}>
            ❤️ Mes favoris {wishIds.length > 0 && `(${wishIds.length})`}
          </button>
          <button style={TAB_STYLE(tab === "parrainage")} onClick={() => setTab("parrainage")}>
            🎁 Parrainage
          </button>
        </div>

        {/* ══ PARRAINAGE ══ */}
        {tab === "parrainage" && <ParrainageProfil />}

        {/* ══ COMMANDES ══ */}
        {tab === "commandes" && (
          <div style={{ display: "grid", gap: 14 }}>
            {orders.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 20, padding: "48px 32px", textAlign: "center", border: "1px solid rgba(26,20,16,0.07)" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🛍</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, color: DARK }}>Aucune commande pour l'instant</div>
                <p style={{ opacity: 0.5, marginBottom: 28, fontSize: 15 }}>Découvrez nos essentiels en bambou pour nourrisson.</p>
                <Link href="/produits" style={{ padding: "14px 28px", borderRadius: 12, background: DARK, color: WARM, fontWeight: 900, fontSize: 16, textDecoration: "none" }}>
                  Voir les produits →
                </Link>
              </div>
            ) : orders.map(order => {
              const s = SHIPPING_STATUS[order.shipping_status ?? "en_preparation"] ?? SHIPPING_STATUS.en_preparation;
              const addr = order.shipping_address;
              return (
                <div key={order.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.07)", overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "rgba(26,20,16,0.03)", borderBottom: "1px solid rgba(26,20,16,0.06)", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 15, color: DARK }}>Commande #{order.id.slice(0, 8).toUpperCase()}</div>
                      <div style={{ fontSize: 13, color: "rgba(26,20,16,0.45)", marginTop: 2 }}>
                        {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ padding: "4px 12px", borderRadius: 99, background: s.bg, color: s.text, fontSize: 12, fontWeight: 800 }}>{s.label}</span>
                      <span style={{ fontSize: 18, fontWeight: 950, color: DARK }}>{courtesyMoney(order, order.amount_total)}</span>
                    </div>
                  </div>
                  <div style={{ padding: "14px 20px" }}>
                    {Array.isArray(order.items) && order.items.map((item: any, i: number) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < order.items.length - 1 ? "1px solid rgba(26,20,16,0.05)" : "none" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}>{item.name.split(" — ")[0]}</div>
                          {item.name.split(" — ").length > 1 && (
                            <div style={{ display: "flex", gap: 5, marginTop: 3, flexWrap: "wrap" }}>
                              {item.name.split(" — ").slice(1).map((part: string, pi: number) => (
                                <span key={pi} style={{ padding: "1px 8px", borderRadius: 99, background: pi === 0 ? "rgba(196,154,74,0.12)" : "rgba(26,20,16,0.06)", fontSize: 12, fontWeight: 800, color: pi === 0 ? "#92400e" : DARK }}>{part}</span>
                              ))}
                            </div>
                          )}
                          <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", marginTop: 1 }}>Qté : {item.quantity}</div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: DARK }}>{courtesyMoney(order, Number(item.price) * Number(item.quantity))}</div>
                      </div>
                    ))}
                  </div>
                  {(addr || order.tracking_number) && (
                    <div style={{ padding: "12px 20px 16px", borderTop: "1px solid rgba(26,20,16,0.06)", display: "grid", gap: 8 }}>
                      {addr && (
                        <div style={{ fontSize: 13, color: "rgba(26,20,16,0.55)", lineHeight: 1.5 }}>
                          <span style={{ fontWeight: 800, color: DARK, marginRight: 6 }}>📍 Livraison :</span>
                          {[addr.name, addr.line1, addr.line2, `${addr.postal_code} ${addr.city}`, addr.country].filter(Boolean).join(", ")}
                        </div>
                      )}
                      {order.tracking_number && (() => {
                        const url = getTrackingUrl((order as any).notes, order.tracking_number);
                        return (
                          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "#ede8df" }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: DARK }}>📦 Suivi :</span>
                            {url ? (
                              <a href={url} target="_blank" rel="noopener noreferrer"
                                style={{ fontFamily: "monospace", letterSpacing: 1, fontSize: 14, color: AMBER, fontWeight: 800, textDecoration: "underline" }}>
                                {order.tracking_number} →
                              </a>
                            ) : (
                              <span style={{ fontFamily: "monospace", letterSpacing: 1, fontSize: 14, color: DARK }}>{order.tracking_number}</span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ INFOS ══ */}
        {tab === "infos" && (
          <div style={{ display: "grid", gap: 20 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, border: "1px solid rgba(26,20,16,0.07)", display: "grid", gap: 20 }}>
            <div style={{ fontWeight: 900, fontSize: 18, color: DARK }}>Informations personnelles</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 16 }}>
              <div><label style={LS}>Prénom</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Erika" style={IS} /></div>
              <div><label style={LS}>Nom</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dupont" style={IS} /></div>
            </div>
            <div><label style={LS}>Email</label>
              <input value={user.email ?? ""} disabled style={{ ...IS, background: "#ede8df", color: "rgba(26,20,16,0.45)", cursor: "not-allowed" }} />
              <div style={{ fontSize: 11, color: "rgba(26,20,16,0.35)", marginTop: 5 }}>L'email ne peut pas être modifié ici.</div>
            </div>
            <div><label style={LS}>Téléphone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+33 6 12 34 56 78" type="tel" style={IS} /></div>
            <div style={{ padding: "18px 20px", borderRadius: 14, background: newsletter ? "rgba(196,154,74,0.08)" : "#f9f6f1", border: `1.5px solid ${newsletter ? "rgba(196,154,74,0.4)" : "rgba(26,20,16,0.08)"}` }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 14, cursor: "pointer" }}>
                <div style={{ position: "relative", flexShrink: 0, marginTop: 2 }}>
                  <input type="checkbox" checked={newsletter} onChange={e => setNewsletter(e.target.checked)} style={{ opacity: 0, position: "absolute", width: 0, height: 0 }} />
                  <div onClick={() => setNewsletter(v => !v)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${newsletter ? AMBER : "rgba(26,20,16,0.2)"}`, background: newsletter ? AMBER : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}>
                    {newsletter && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4.5L4.5 8L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: DARK, marginBottom: 3 }}>✦ Newsletter M!LK — offres & avant-premières</div>
                  <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)", lineHeight: 1.5 }}>Reçois en avant-première les nouveaux produits, codes promos exclusifs et conseils bambou.</div>
                </div>
              </label>
            </div>
            {error && <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: 14 }}>❌ {error}</div>}
            {saved && <div style={{ padding: "12px 16px", borderRadius: 10, background: "#dcfce7", color: "#166534", fontWeight: 700, fontSize: 14 }}>✅ Informations enregistrées !</div>}
            <button onClick={handleSave} disabled={saving}
              style={{ padding: "15px", borderRadius: 12, background: DARK, color: WARM, fontWeight: 900, fontSize: 16, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Enregistrement..." : "✅ Enregistrer"}
            </button>
          </div>

          {/* Sécurité — mot de passe */}
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, border: "1px solid rgba(26,20,16,0.07)", display: "grid", gap: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 18, color: DARK }}>🔒 Sécurité — mot de passe</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)", marginTop: -6 }}>Choisis un nouveau mot de passe (8 caractères minimum).</div>
            <div>
              <label style={LS}>Nouveau mot de passe</label>
              <PasswordInput value={newPassword} onChange={setNewPassword} autoComplete="new-password" placeholder="8 caractères minimum" variant="light" inputStyle={IS} />
            </div>
            <div>
              <label style={LS}>Confirmer le nouveau mot de passe</label>
              <PasswordInput value={confirmNewPassword} onChange={setConfirmNewPassword} autoComplete="new-password" placeholder="••••••••" variant="light" inputStyle={{ ...IS, borderColor: confirmNewPassword && confirmNewPassword !== newPassword ? "rgba(239,68,68,0.5)" : "rgba(26,20,16,0.12)" }} />
              {confirmNewPassword && confirmNewPassword !== newPassword && (
                <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700, marginTop: 5 }}>❌ Les mots de passe ne correspondent pas</div>
              )}
            </div>
            {pwdError && <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: 14 }}>❌ {pwdError}</div>}
            {pwdSaved && <div style={{ padding: "12px 16px", borderRadius: 10, background: "#dcfce7", color: "#166534", fontWeight: 700, fontSize: 14 }}>✅ Mot de passe mis à jour !</div>}
            <button onClick={handleChangePassword} disabled={pwdSaving || newPassword.length < 8 || newPassword !== confirmNewPassword}
              style={{ padding: "15px", borderRadius: 12, background: DARK, color: WARM, fontWeight: 900, fontSize: 16, border: "none", cursor: (pwdSaving || newPassword.length < 8 || newPassword !== confirmNewPassword) ? "not-allowed" : "pointer", opacity: (pwdSaving || newPassword.length < 8 || newPassword !== confirmNewPassword) ? 0.5 : 1 }}>
              {pwdSaving ? "Mise à jour..." : "🔒 Changer le mot de passe"}
            </button>
          </div>
          </div>
        )}

        {/* ══ ADRESSES ══ */}
        {tab === "adresses" && (
          <div style={{ display: "grid", gap: 20 }}>
            <div style={{ background: "#fff", borderRadius: 20, padding: 28, border: "1px solid rgba(26,20,16,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: DARK, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 18 }}>📦</span></div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16, color: DARK }}>Adresse de livraison</div>
                  <div style={{ fontSize: 12, color: "rgba(26,20,16,0.45)" }}>Utilisée par défaut au checkout</div>
                </div>
              </div>
              <AddressFields addr={shippingAddr} onChange={setShippingAddr} />
            </div>
            <div style={{ background: "#fff", borderRadius: 20, padding: 28, border: "1px solid rgba(26,20,16,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: DARK, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 18 }}>🧾</span></div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16, color: DARK }}>Adresse de facturation</div>
                  <div style={{ fontSize: 12, color: "rgba(26,20,16,0.45)" }}>Utilisée pour votre facturation</div>
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: billingSame ? 0 : 20, padding: "12px 16px", borderRadius: 12, background: "#f9f6f1", border: "1px solid rgba(26,20,16,0.08)" }}>
                <div onClick={() => setBillingSame(v => !v)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${billingSame ? AMBER : "rgba(26,20,16,0.2)"}`, background: billingSame ? AMBER : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.15s" }}>
                  {billingSame && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4.5L4.5 8L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: DARK }}>Identique à l'adresse de livraison</span>
              </label>
              {!billingSame && <AddressFields addr={billingAddr} onChange={setBillingAddr} />}
            </div>
            {error && <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: 14 }}>❌ {error}</div>}
            {saved && <div style={{ padding: "12px 16px", borderRadius: 10, background: "#dcfce7", color: "#166534", fontWeight: 700, fontSize: 14 }}>✅ Adresses enregistrées !</div>}
            <button onClick={handleSave} disabled={saving}
              style={{ padding: "15px", borderRadius: 12, background: DARK, color: WARM, fontWeight: 900, fontSize: 16, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Enregistrement..." : "✅ Enregistrer les adresses"}
            </button>
          </div>
        )}

        {/* ══ FAVORIS ══ */}
        {tab === "favoris" && (
          <div style={{ display: "grid", gap: 20 }}>
            {!mounted ? (
              <div style={{ textAlign: "center", padding: 40, color: "rgba(26,20,16,0.4)" }}>Chargement...</div>
            ) : wishIds.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 20, padding: "64px 32px", textAlign: "center", border: "1px solid rgba(26,20,16,0.07)" }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🤍</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: DARK, marginBottom: 10 }}>Aucun favori pour l'instant</div>
                <p style={{ color: "rgba(26,20,16,0.5)", marginBottom: 32, fontSize: 15, maxWidth: 400, margin: "0 auto 32px" }}>
                  Clique sur le cœur ❤️ sur les fiches produit pour sauvegarder tes coups de cœur.
                </p>
                <Link href="/produits" style={{ display: "inline-block", padding: "15px 32px", borderRadius: 12, background: DARK, color: AMBER, fontWeight: 900, fontSize: 16, textDecoration: "none" }}>
                  Découvrir les produits →
                </Link>
              </div>
            ) : mounted && wishIds.length > 0 ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ fontWeight: 900, fontSize: 18, color: DARK }}>
                    {wishIds.length} article{wishIds.length > 1 ? "s" : ""} sauvegardé{wishIds.length > 1 ? "s" : ""}
                  </div>
                  <Link href="/favoris" style={{ fontSize: 14, fontWeight: 700, color: AMBER, textDecoration: "none" }}>
                    Voir la page dédiée →
                  </Link>
                </div>

                {wishLoading ? (
                  <div style={{ textAlign: "center", padding: 40, color: "rgba(26,20,16,0.4)" }}>Chargement...</div>
                ) : (
                  <div className="wish-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                    {wishProducts.map(p => {
                      const promo = isPromoActive(p);
                      const price = promo ? p.promo_price : p.price_ttc;
                      return (
                        <div key={p.id} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(26,20,16,0.08)", position: "relative" }}>
                          {/* Bouton retirer */}
                          <button onClick={() => toggle(p.id)}
                            title="Retirer des favoris"
                            style={{ position: "absolute", top: 10, right: 10, zIndex: 10, width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, backdropFilter: "blur(4px)" }}>
                            ❤️
                          </button>
                          <Link href={`/produits/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                            <div style={{ aspectRatio: "3/4", background: "#ede8df", position: "relative", overflow: "hidden" }}>
                              {p.image_url ? (
                                <Image src={p.image_url} alt={p.name} fill sizes="300px" style={{ objectFit: "cover" }} />
                              ) : (
                                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 12, color: "rgba(26,20,16,0.2)", fontWeight: 900 }}>M!LK</div>
                              )}
                              {p.stock <= 0 && (
                                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "grid", placeItems: "center" }}>
                                  <span style={{ color: "#fff", fontWeight: 900, fontSize: 13, background: "rgba(0,0,0,0.6)", padding: "6px 14px", borderRadius: 99 }}>Épuisé</span>
                                </div>
                              )}
                            </div>
                            <div style={{ padding: "12px 14px 8px" }}>
                              <div style={{ fontSize: 10, fontWeight: 800, color: AMBER, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{p.category_slug}</div>
                              <div translate="no" style={{ fontSize: 14, fontWeight: 800, color: DARK, lineHeight: 1.3, marginBottom: 8 }}>{p.name}</div>
                              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                                <span style={{ fontSize: 16, fontWeight: 950, color: DARK }}>{Number(price).toFixed(2)} €</span>
                                {promo && <span style={{ fontSize: 12, textDecoration: "line-through", color: "rgba(26,20,16,0.35)" }}>{Number(p.price_ttc).toFixed(2)} €</span>}
                              </div>
                            </div>
                          </Link>
                          {p.stock > 0 && (
                            <div style={{ padding: "0 14px 14px" }}>
                              <Link href={`/produits/${p.slug}`}
                                style={{ display: "block", textAlign: "center", padding: "10px", borderRadius: 10, background: DARK, color: AMBER, fontWeight: 800, fontSize: 13, textDecoration: "none" }}>
                                Voir le produit
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

      </div>
    </div>
  );
}