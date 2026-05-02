"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase-client";

// ── Types ──────────────────────────────────────────────────────────────────
type Address = {
  line1:       string;
  line2:       string;
  city:        string;
  postal_code: string;
  country:     string;
};

type Profile = {
  email:            string;
  first_name:       string;
  last_name:        string;
  phone:            string;
  newsletter:       boolean;
  shipping_address: Address | null;
  billing_address:  Address | null;
  billing_same:     boolean;
};

type Order = {
  id:               string;
  created_at:       string;
  amount_total:     number;
  status:           string;
  shipping_status:  string;
  items:            any[];
  shipping_address: any;
  tracking_number?: string;
};

// ── Constantes ─────────────────────────────────────────────────────────────
const BG    = "#f5f0e8";
const DARK  = "#1a1410";
const AMBER = "#c49a4a";
const WARM  = "#f2ede6";
const TAUPE = "#d8c8b0";

const EMPTY_ADDRESS: Address = { line1: "", line2: "", city: "", postal_code: "", country: "FR" };

const SHIPPING_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  pending:   { label: "En préparation", bg: "#fef3c7", text: "#92400e" },
  shipped:   { label: "Expédiée",       bg: "#dcfce7", text: "#166534" },
  delivered: { label: "Livrée",         bg: "#d1fae5", text: "#065f46" },
  returned:  { label: "Retour",         bg: "#fee2e2", text: "#b91c1c" },
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

// ── Composant champ adresse ────────────────────────────────────────────────
function AddressFields({ addr, onChange, prefix }: {
  addr: Address;
  onChange: (a: Address) => void;
  prefix: string;
}) {
  function set(k: keyof Address, v: string) { onChange({ ...addr, [k]: v }); }
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <label style={LS}>Adresse</label>
        <input value={addr.line1} onChange={e => set("line1", e.target.value)}
          placeholder="12 rue de la Paix" style={IS} />
      </div>
      <div>
        <label style={LS}>Complément (optionnel)</label>
        <input value={addr.line2} onChange={e => set("line2", e.target.value)}
          placeholder="Bâtiment A, Appartement 3..." style={IS} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12 }}>
        <div>
          <label style={LS}>Code postal</label>
          <input value={addr.postal_code} onChange={e => set("postal_code", e.target.value)}
            placeholder="75001" style={IS} />
        </div>
        <div>
          <label style={LS}>Ville</label>
          <input value={addr.city} onChange={e => set("city", e.target.value)}
            placeholder="Paris" style={IS} />
        </div>
      </div>
      <div>
        <label style={LS}>Pays</label>
        <select value={addr.country} onChange={e => set("country", e.target.value)} style={IS}>
          <option value="FR">🇫🇷 France</option>
          <option value="BE">🇧🇪 Belgique</option>
          <option value="CH">🇨🇭 Suisse</option>
          <option value="LU">🇱🇺 Luxembourg</option>
          <option value="MC">🇲🇨 Monaco</option>
        </select>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────
export default function ProfilPage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab,      setTab]      = useState<"infos"|"adresses"|"commandes">("commandes");
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

  // Redirect si non connecté
  useEffect(() => {
    if (authLoading) return;
    if (!user) router.push("/connexion?redirect=/profil");
  }, [user, authLoading, router]);

  // Charger profil + commandes
  useEffect(() => {
    if (!user) return;

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      // Profil
      const [pRes, oRes] = await Promise.all([
        fetch("/api/profil", { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/commandes/client?email=${encodeURIComponent(user!.email ?? "")}`),
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
          first_name:       firstName.trim(),
          last_name:        lastName.trim(),
          phone:            phone.trim(),
          newsletter,
          shipping_address: shippingAddr,
          billing_same:     billingSame,
          billing_address:  billingSame ? null : billingAddr,
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

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "grid", placeItems: "center" }}>
        <div style={{ opacity: 0.4, fontSize: 16, color: DARK }}>Chargement...</div>
      </div>
    );
  }
  if (!user) return null;

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || user.email?.split("@")[0] || "Mon compte";
  const initials = firstName && lastName ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : (user.email?.[0] ?? "M").toUpperCase();

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: "10px 20px", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", border: "none",
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
          .profil-card { padding: 20px 16px !important; }
          .profil-order-header { flex-direction: column !important; align-items: flex-start !important; }
        }
      `}</style>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 clamp(12px,4vw,20px)" }}>

        {/* ── Header profil ── */}
        <div className="profil-header" style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 32, flexWrap: "wrap" }}>
          {/* Avatar */}
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: DARK, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `3px solid ${AMBER}` }}>
            <span style={{ color: AMBER, fontWeight: 950, fontSize: 22, letterSpacing: -1 }}>{initials}</span>
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: "0 0 4px", fontSize: "clamp(22px,3vw,30px)", fontWeight: 950, letterSpacing: -1, color: DARK }}>
              {displayName}
            </h1>
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

        {/* ── Onglets ── */}
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
        </div>

        {/* ══ ONGLET COMMANDES ══ */}
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
            ) : (
              orders.map(order => {
                const s = SHIPPING_STATUS[order.shipping_status ?? "pending"] ?? SHIPPING_STATUS.pending;
                const addr = order.shipping_address;
                return (
                  <div key={order.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(26,20,16,0.07)", overflow: "hidden" }}>
                    {/* Header commande */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "rgba(26,20,16,0.03)", borderBottom: "1px solid rgba(26,20,16,0.06)", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 15, color: DARK }}>
                          Commande #{order.id.slice(0, 8).toUpperCase()}
                        </div>
                        <div style={{ fontSize: 13, color: "rgba(26,20,16,0.45)", marginTop: 2 }}>
                          {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ padding: "4px 12px", borderRadius: 99, background: s.bg, color: s.text, fontSize: 12, fontWeight: 800 }}>
                          {s.label}
                        </span>
                        <span style={{ fontSize: 18, fontWeight: 950, color: DARK }}>
                          {Number(order.amount_total).toFixed(2)} €
                        </span>
                      </div>
                    </div>

                    {/* Articles */}
                    <div style={{ padding: "14px 20px" }}>
                      {Array.isArray(order.items) && order.items.map((item: any, i: number) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < order.items.length - 1 ? "1px solid rgba(26,20,16,0.05)" : "none" }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}>{item.name}</div>
                            <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", marginTop: 1 }}>Qté : {item.quantity}</div>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: DARK }}>
                            {(Number(item.price) * Number(item.quantity)).toFixed(2)} €
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Adresse + suivi */}
                    {(addr || order.tracking_number) && (
                      <div style={{ padding: "12px 20px 16px", borderTop: "1px solid rgba(26,20,16,0.06)", display: "grid", gap: 8 }}>
                        {addr && (
                          <div style={{ fontSize: 13, color: "rgba(26,20,16,0.55)", lineHeight: 1.5 }}>
                            <span style={{ fontWeight: 800, color: DARK, marginRight: 6 }}>📍 Livraison :</span>
                            {[addr.name, addr.line1, addr.line2, `${addr.postal_code} ${addr.city}`, addr.country].filter(Boolean).join(", ")}
                          </div>
                        )}
                        {order.tracking_number && (
                          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "#f5f0e8" }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: DARK }}>📦 Suivi :</span>
                            <span style={{ fontFamily: "monospace", letterSpacing: 1, fontSize: 14, color: DARK }}>{order.tracking_number}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ══ ONGLET INFOS PERSONNELLES ══ */}
        {tab === "infos" && (
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, border: "1px solid rgba(26,20,16,0.07)", display: "grid", gap: 20 }}>
            <div style={{ fontWeight: 900, fontSize: 18, color: DARK }}>Informations personnelles</div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 16 }}>
              <div>
                <label style={LS}>Prénom</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)}
                  placeholder="Erika" style={IS} />
              </div>
              <div>
                <label style={LS}>Nom</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)}
                  placeholder="Dupont" style={IS} />
              </div>
            </div>

            <div>
              <label style={LS}>Email</label>
              <input value={user.email ?? ""} disabled
                style={{ ...IS, background: "#f5f0e8", color: "rgba(26,20,16,0.45)", cursor: "not-allowed" }} />
              <div style={{ fontSize: 11, color: "rgba(26,20,16,0.35)", marginTop: 5 }}>
                L'email ne peut pas être modifié ici. Contacte-nous si besoin.
              </div>
            </div>

            <div>
              <label style={LS}>Téléphone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+33 6 12 34 56 78" type="tel" style={IS} />
            </div>

            {/* Newsletter */}
            <div style={{ padding: "18px 20px", borderRadius: 14, background: newsletter ? "rgba(196,154,74,0.08)" : "#f9f6f1", border: `1.5px solid ${newsletter ? "rgba(196,154,74,0.4)" : "rgba(26,20,16,0.08)"}` }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 14, cursor: "pointer" }}>
                <div style={{ position: "relative", flexShrink: 0, marginTop: 2 }}>
                  <input type="checkbox" checked={newsletter} onChange={e => setNewsletter(e.target.checked)}
                    style={{ opacity: 0, position: "absolute", width: 0, height: 0 }} />
                  <div onClick={() => setNewsletter(v => !v)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${newsletter ? AMBER : "rgba(26,20,16,0.2)"}`, background: newsletter ? AMBER : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}>
                    {newsletter && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4.5L4.5 8L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: DARK, marginBottom: 3 }}>
                    ✦ Newsletter M!LK — offres & avant-premières
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)", lineHeight: 1.5 }}>
                    Reçois en avant-première les nouveaux produits, les codes promos exclusifs et les conseils bambou pour les parents. Désabonnement en un clic.
                  </div>
                </div>
              </label>
            </div>

            {error && <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: 14 }}>❌ {error}</div>}
            {saved && <div style={{ padding: "12px 16px", borderRadius: 10, background: "#dcfce7", color: "#166534", fontWeight: 700, fontSize: 14 }}>✅ Informations enregistrées !</div>}

            <button onClick={handleSave} disabled={saving}
              style={{ padding: "15px", borderRadius: 12, background: DARK, color: WARM, fontWeight: 900, fontSize: 16, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
              {saving ? "Enregistrement..." : "✅ Enregistrer"}
            </button>
          </div>
        )}

        {/* ══ ONGLET ADRESSES ══ */}
        {tab === "adresses" && (
          <div style={{ display: "grid", gap: 20 }}>

            {/* Adresse de livraison */}
            <div style={{ background: "#fff", borderRadius: 20, padding: 28, border: "1px solid rgba(26,20,16,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: DARK, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 18 }}>📦</span>
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16, color: DARK }}>Adresse de livraison</div>
                  <div style={{ fontSize: 12, color: "rgba(26,20,16,0.45)" }}>Utilisée par défaut au checkout</div>
                </div>
              </div>
              <AddressFields
                addr={shippingAddr}
                onChange={setShippingAddr}
                prefix="shipping"
              />
            </div>

            {/* Adresse de facturation */}
            <div style={{ background: "#fff", borderRadius: 20, padding: 28, border: "1px solid rgba(26,20,16,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: DARK, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 18 }}>🧾</span>
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16, color: DARK }}>Adresse de facturation</div>
                  <div style={{ fontSize: 12, color: "rgba(26,20,16,0.45)" }}>Apparaît sur la facture</div>
                </div>
              </div>

              {/* Toggle même adresse */}
              <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: billingSame ? 0 : 20, padding: "12px 16px", borderRadius: 12, background: "#f9f6f1", border: "1px solid rgba(26,20,16,0.08)" }}>
                <div onClick={() => setBillingSame(v => !v)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${billingSame ? AMBER : "rgba(26,20,16,0.2)"}`, background: billingSame ? AMBER : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.15s" }}>
                  {billingSame && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4.5L4.5 8L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: DARK }}>Identique à l'adresse de livraison</span>
              </label>

              {!billingSame && (
                <AddressFields
                  addr={billingAddr}
                  onChange={setBillingAddr}
                  prefix="billing"
                />
              )}
            </div>

            {error && <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: 14 }}>❌ {error}</div>}
            {saved && <div style={{ padding: "12px 16px", borderRadius: 10, background: "#dcfce7", color: "#166534", fontWeight: 700, fontSize: 14 }}>✅ Adresses enregistrées !</div>}

            <button onClick={handleSave} disabled={saving}
              style={{ padding: "15px", borderRadius: 12, background: DARK, color: WARM, fontWeight: 900, fontSize: 16, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
              {saving ? "Enregistrement..." : "✅ Enregistrer les adresses"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}