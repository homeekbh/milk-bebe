"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase-client";
import { useAuth } from "@/context/AuthContext";

type Profile = {
  prenom: string; nom: string; email: string; telephone: string;
  adresse_livraison: string; ville: string; code_postal: string; pays: string;
  newsletter: boolean;
};

type Order = {
  id: string; created_at: string; amount_total: number;
  status: string; items: any[];
};

const inputStyle: React.CSSProperties = {
  padding: "11px 14px", borderRadius: 10,
  border: "1px solid rgba(242,237,230,0.12)",
  background: "rgba(242,237,230,0.05)",
  color: "#f2ede6", fontSize: 14, fontWeight: 600,
  outline: "none", width: "100%", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, letterSpacing: 1,
  textTransform: "uppercase", color: "rgba(242,237,230,0.4)",
};

export default function ProfilPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [tab,      setTab]      = useState<"profil" | "commandes" | "adresses">("profil");
  const [profile,  setProfile]  = useState<Partial<Profile>>({});
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Redirect si pas connecté
  useEffect(() => {
    if (!user && !loading) router.push("/connexion");
  }, [user, loading]);

  // Charger profil
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single()
      .then(({ data }) => {
        if (data) setProfile(data);
        setLoading(false);
      });
  }, [user]);

  // Charger commandes
  useEffect(() => {
    if (tab !== "commandes" || !user) return;
    setOrdersLoading(true);
    supabase.from("orders")
      .select("*")
      .eq("customer_email", user.email)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders(data ?? []);
        setOrdersLoading(false);
      });
  }, [tab, user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").upsert({ id: user.id, ...profile });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  function set(key: string, val: any) {
    setProfile(p => ({ ...p, [key]: val }));
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#1a1410", display: "grid", placeItems: "center" }}>
      <div style={{ color: "rgba(242,237,230,0.4)", fontSize: 14 }}>Chargement...</div>
    </div>
  );

  if (!user) return null;

  const initials = ((profile.prenom?.[0] ?? "") + (profile.nom?.[0] ?? "")).toUpperCase() || user.email?.[0]?.toUpperCase() || "?";

  const TABS = [
    { key: "profil",    label: "Mon profil"     },
    { key: "commandes", label: "Mes commandes"  },
    { key: "adresses",  label: "Mes adresses"   },
  ] as const;

  return (
    <div style={{ background: "#1a1410", minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 32px" }}>

        {/* ── En-tête profil ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* Avatar */}
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(196,154,74,0.15)", border: "2px solid rgba(196,154,74,0.3)", display: "grid", placeItems: "center" }}>
              <span style={{ fontSize: 22, fontWeight: 950, color: "#c49a4a" }}>{initials}</span>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: -0.5, color: "#f2ede6" }}>
                {profile.prenom ? `${profile.prenom} ${profile.nom ?? ""}` : user.email?.split("@")[0]}
              </div>
              <div style={{ fontSize: 13, color: "rgba(242,237,230,0.4)", marginTop: 3 }}>{user.email}</div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            style={{ padding: "10px 20px", borderRadius: 12, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontWeight: 800, fontSize: 14, cursor: "pointer" }}
          >
            Se déconnecter
          </button>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, background: "#221c16", borderRadius: 14, padding: 4, border: "1px solid rgba(242,237,230,0.06)" }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: "10px 16px", borderRadius: 11, border: "none",
                background: tab === t.key ? "#f2ede6" : "transparent",
                color: tab === t.key ? "#1a1410" : "rgba(242,237,230,0.5)",
                fontWeight: 800, fontSize: 14, cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════
            TAB PROFIL
        ══════════════════════════════════ */}
        {tab === "profil" && (
          <div style={{ background: "#221c16", borderRadius: 20, border: "1px solid rgba(242,237,230,0.07)", padding: 28, display: "grid", gap: 20 }}>
            <div style={{ fontWeight: 900, fontSize: 17, color: "#f2ede6" }}>Informations personnelles</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle}>Prénom</label>
                <input type="text" value={profile.prenom ?? ""} onChange={e => set("prenom", e.target.value)} placeholder="Marie" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle}>Nom</label>
                <input type="text" value={profile.nom ?? ""} onChange={e => set("nom", e.target.value)} placeholder="Dupont" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={profile.email ?? user.email ?? ""} disabled style={{ ...inputStyle, opacity: 0.4, cursor: "not-allowed" }} />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Téléphone</label>
              <input type="tel" value={profile.telephone ?? ""} onChange={e => set("telephone", e.target.value)} placeholder="+33 6 00 00 00 00" style={inputStyle} />
            </div>

            {/* Newsletter */}
            <div style={{ padding: 18, borderRadius: 14, background: "rgba(196,154,74,0.06)", border: "1px solid rgba(196,154,74,0.15)" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                <div
                  onClick={() => set("newsletter", !profile.newsletter)}
                  style={{ width: 44, height: 24, borderRadius: 99, background: profile.newsletter ? "#c49a4a" : "rgba(242,237,230,0.1)", position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}
                >
                  <div style={{ position: "absolute", top: 3, left: profile.newsletter ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#f2ede6" }}>Newsletter M!LK</div>
                  <div style={{ fontSize: 12, color: "rgba(242,237,230,0.4)", marginTop: 2 }}>Nouveautés, offres exclusives, conseils bébé</div>
                </div>
              </label>
            </div>

            {/* Messages */}
            {saved && <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e", fontSize: 14, fontWeight: 700 }}>✅ Profil mis à jour !</div>}

            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: "14px", borderRadius: 12, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 15, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Enregistrement..." : "Enregistrer les modifications"}
            </button>
          </div>
        )}

        {/* ══════════════════════════════════
            TAB COMMANDES
        ══════════════════════════════════ */}
        {tab === "commandes" && (
          <div style={{ display: "grid", gap: 14 }}>
            {ordersLoading ? (
              <div style={{ padding: 60, textAlign: "center", color: "rgba(242,237,230,0.3)", fontSize: 14 }}>
                Chargement de vos commandes...
              </div>
            ) : orders.length === 0 ? (
              <div style={{ background: "#221c16", borderRadius: 20, border: "1px solid rgba(242,237,230,0.07)", padding: "60px 40px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📦</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#f2ede6", marginBottom: 10 }}>Aucune commande pour l'instant</div>
                <div style={{ fontSize: 14, color: "rgba(242,237,230,0.4)", marginBottom: 28, lineHeight: 1.7 }}>
                  Tes commandes apparaîtront ici après ton premier achat.
                </div>
                <Link href="/produits" style={{ padding: "13px 28px", borderRadius: 12, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 15, textDecoration: "none" }}>
                  Découvrir la collection →
                </Link>
              </div>
            ) : (
              orders.map(order => {
                const items = Array.isArray(order.items) ? order.items : [];
                const date  = new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
                return (
                  <div key={order.id} style={{ background: "#221c16", borderRadius: 20, border: "1px solid rgba(242,237,230,0.07)", overflow: "hidden" }}>
                    {/* Header commande */}
                    <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(242,237,230,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 12, color: "rgba(242,237,230,0.4)", fontWeight: 700, marginBottom: 4 }}>
                          Commande du {date}
                        </div>
                        <div style={{ fontSize: 12, fontFamily: "monospace", color: "rgba(242,237,230,0.3)" }}>
                          #{order.id.slice(0, 8).toUpperCase()}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ fontWeight: 950, fontSize: 20, color: "#c49a4a" }}>
                          {Number(order.amount_total).toFixed(2)} €
                        </div>
                        <span style={{ padding: "5px 12px", borderRadius: 99, background: "rgba(34,197,94,0.12)", color: "#22c55e", fontSize: 12, fontWeight: 800 }}>
                          {order.status === "paid" ? "✓ Payée" : order.status}
                        </span>
                      </div>
                    </div>

                    {/* Articles */}
                    <div style={{ padding: "16px 22px", display: "grid", gap: 10 }}>
                      {items.length === 0 ? (
                        <div style={{ fontSize: 13, color: "rgba(242,237,230,0.3)" }}>Détails non disponibles</div>
                      ) : (
                        items.map((item: any, i: number) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              {/* Mini pastille quantité */}
                              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(196,154,74,0.12)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 900, color: "#c49a4a", flexShrink: 0 }}>
                                ×{item.quantity ?? 1}
                              </div>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#f2ede6" }}>{item.name}</div>
                                {item.category_slug && (
                                  <div style={{ fontSize: 11, color: "rgba(242,237,230,0.35)", marginTop: 2, textTransform: "uppercase", letterSpacing: 1 }}>{item.category_slug}</div>
                                )}
                              </div>
                            </div>
                            <div style={{ fontWeight: 800, fontSize: 15, color: "#f2ede6", flexShrink: 0 }}>
                              {((item.price ?? 0) * (item.quantity ?? 1)).toFixed(2)} €
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer commande */}
                    <div style={{ padding: "14px 22px", borderTop: "1px solid rgba(242,237,230,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 12, color: "rgba(242,237,230,0.3)" }}>
                        {items.reduce((s: number, i: any) => s + (i.quantity ?? 1), 0)} article{items.length > 1 ? "s" : ""}
                      </div>
                      <Link href="/produits" style={{ fontSize: 13, fontWeight: 800, color: "#c49a4a", textDecoration: "none" }}>
                        Commander à nouveau →
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ══════════════════════════════════
            TAB ADRESSES
        ══════════════════════════════════ */}
        {tab === "adresses" && (
          <div style={{ background: "#221c16", borderRadius: 20, border: "1px solid rgba(242,237,230,0.07)", padding: 28, display: "grid", gap: 20 }}>
            <div style={{ fontWeight: 900, fontSize: 17, color: "#f2ede6" }}>Adresse de livraison</div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Adresse</label>
              <input type="text" value={profile.adresse_livraison ?? ""} onChange={e => set("adresse_livraison", e.target.value)} placeholder="12 rue des Fleurs" style={inputStyle} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle}>Code postal</label>
                <input type="text" value={profile.code_postal ?? ""} onChange={e => set("code_postal", e.target.value)} placeholder="75001" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={labelStyle}>Ville</label>
                <input type="text" value={profile.ville ?? ""} onChange={e => set("ville", e.target.value)} placeholder="Paris" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={labelStyle}>Pays</label>
              <select value={profile.pays ?? "France"} onChange={e => set("pays", e.target.value)} style={{ ...inputStyle, appearance: "none" as const }}>
                {["France", "Belgique", "Suisse", "Luxembourg", "Monaco"].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(196,154,74,0.06)", border: "1px solid rgba(196,154,74,0.15)", fontSize: 13, color: "rgba(242,237,230,0.5)", lineHeight: 1.6 }}>
              💡 Cette adresse est utilisée automatiquement lors du checkout pour pré-remplir ta livraison.
            </div>

            {saved && <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e", fontSize: 14, fontWeight: 700 }}>✅ Adresse mise à jour !</div>}

            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: "14px", borderRadius: 12, background: "#f2ede6", color: "#1a1410", fontWeight: 900, fontSize: 15, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Enregistrement..." : "Enregistrer l'adresse"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}