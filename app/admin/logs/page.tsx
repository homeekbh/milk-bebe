"use client";

import { useEffect, useState, useCallback } from "react";

type LogEntry = {
  id:          string;
  created_at:  string;
  type:        string;
  message:     string;
  entity_name: string | null;
  entity_id:   string | null;
  user_email:  string | null;
  meta:        Record<string, unknown> | null;
};

const TYPE_STYLE: Record<string, { bg: string; color: string; icon: string; label: string }> = {
  // Produits (legacy + FR)
  product_create:  { bg: "#dcfce7", color: "#166534", icon: "✚", label: "Création" },
  product_update:  { bg: "#fef3c7", color: "#92400e", icon: "✎", label: "Modification" },
  product_delete:  { bg: "#fee2e2", color: "#b91c1c", icon: "✕", label: "Suppression" },
  product_publish: { bg: "#e0f2fe", color: "#0369a1", icon: "↑", label: "Publication" },
  product_photo:   { bg: "#faf5ff", color: "#7c3aed", icon: "📷", label: "Photo" },
  product_stock:   { bg: "#fff7ed", color: "#c2410c", icon: "📦", label: "Stock" },
  product_promo:   { bg: "#fef9c3", color: "#854d0e", icon: "🏷", label: "Promo" },
  product_text:    { bg: "#f0fdf4", color: "#15803d", icon: "✏️", label: "Texte" },
  produit_cree:    { bg: "#dcfce7", color: "#166534", icon: "✚", label: "Produit créé" },
  produit_modifie: { bg: "#fef3c7", color: "#92400e", icon: "✎", label: "Produit modifié" },
  produit_supprime:{ bg: "#fee2e2", color: "#b91c1c", icon: "✕", label: "Produit supprimé" },

  // Catégories
  categorie_creee:     { bg: "#dcfce7", color: "#166534", icon: "📁", label: "Catégorie créée" },
  categorie_modifiee:  { bg: "#fef3c7", color: "#92400e", icon: "📁", label: "Catégorie modifiée" },
  categorie_supprimee: { bg: "#fee2e2", color: "#b91c1c", icon: "📁", label: "Catégorie supprimée" },

  // Commandes (legacy + FR)
  order_shipped:    { bg: "#ede9fe", color: "#6d28d9", icon: "🚚", label: "Expédition" },
  order_status:     { bg: "#f1f5f9", color: "#475569", icon: "🔄", label: "Statut" },
  commande_expediee:             { bg: "#dbeafe", color: "#1e40af", icon: "🚚", label: "Expédiée" },
  commande_livree:               { bg: "#dcfce7", color: "#166534", icon: "✅", label: "Livrée" },
  commande_retour:               { bg: "#fee2e2", color: "#b91c1c", icon: "↩", label: "Retour" },
  commande_statut_modifie:       { bg: "#f1f5f9", color: "#475569", icon: "🔄", label: "Statut" },
  commande_annulee:              { bg: "#fee2e2", color: "#dc2626", icon: "↺", label: "Annulée" },
  commande_remboursee:           { bg: "#fecaca", color: "#991b1b", icon: "💸", label: "Remboursée" },
  commande_remboursee_partielle: { bg: "#ffedd5", color: "#c2410c", icon: "💰", label: "Remb. partiel" },
  commande_echec_paiement:       { bg: "#fee2e2", color: "#b91c1c", icon: "❌", label: "Échec paiement" },
  commande_cancel_email_sent:    { bg: "#f1f5f9", color: "#475569", icon: "✉", label: "Email annulation" },

  // Promos & stock
  promo_create:    { bg: "#fff1f2", color: "#be123c", icon: "🎟", label: "Code promo" },
  promo_delete:    { bg: "#fee2e2", color: "#b91c1c", icon: "🗑", label: "Code promo" },
  stock_alert:     { bg: "#fef3c7", color: "#b45309", icon: "⚠️", label: "Alerte stock" },
};

function adminFetch(url: string, options: RequestInit = {}) {
  let token = "";
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? "";
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const p = JSON.parse(localStorage.getItem(key) ?? "{}");
        token = p.access_token ?? ""; if (token) break;
      }
    }
  } catch {}
  return fetch(url, { ...options, headers: { ...(options.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return "À l'instant";
  if (diff < 3600)  return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminLogs() {
  const [logs,    setLogs]    = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("");
  const [search,  setSearch]  = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/admin/activity?limit=200${filter ? `&type=${filter}` : ""}`;
      const res  = await adminFetch(url);
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }, [filter]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filtered = logs.filter(l =>
    !search ||
    l.message.toLowerCase().includes(search.toLowerCase()) ||
    (l.entity_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // Grouper par jour
  const groups: Record<string, LogEntry[]> = {};
  filtered.forEach(l => {
    const day = new Date(l.created_at).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    if (!groups[day]) groups[day] = [];
    groups[day].push(l);
  });

  const FILTERS = [
    { value: "",                       label: "Tout" },
    { value: "commande_expediee",      label: "🚚 Expéditions" },
    { value: "commande_livree",        label: "✅ Livrées" },
    { value: "commande_annulee",       label: "↺ Annulations" },
    { value: "commande_remboursee",    label: "💸 Remboursements" },
    { value: "commande_retour",        label: "↩ Retours" },
    { value: "produit_cree",           label: "✚ Produits créés" },
    { value: "produit_modifie",        label: "✎ Produits modifiés" },
    { value: "produit_supprime",       label: "✕ Produits supprimés" },
    { value: "categorie_creee",        label: "📁 Catégories" },
    { value: "product_photo",          label: "📷 Photos" },
    { value: "product_stock",          label: "📦 Stock" },
  ];

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>Journal d'activité</h1>
        <div style={{ fontSize: 15, color: "rgba(26,20,16,0.5)", marginTop: 4, fontWeight: 600 }}>
          Historique complet de toutes les modifications
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            style={{ padding: "8px 14px", borderRadius: 99, border: `2px solid ${filter === f.value ? "#1a1410" : "rgba(26,20,16,0.1)"}`, background: filter === f.value ? "#1a1410" : "#fff", color: filter === f.value ? "#c49a4a" : "rgba(26,20,16,0.6)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Recherche */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Rechercher dans le journal..."
        style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1.5px solid rgba(26,20,16,0.12)", fontSize: 15, background: "#fff", marginBottom: 24, boxSizing: "border-box" }} />

      {/* Bouton refresh */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button onClick={loadLogs}
          style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid rgba(26,20,16,0.1)", background: "#fff", color: "#1a1410", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          🔄 Actualiser
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(26,20,16,0.35)", fontSize: 15 }}>Chargement...</div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(26,20,16,0.35)", fontSize: 15 }}>
          Aucune activité enregistrée
        </div>
      )}

      {/* Logs groupés par jour */}
      {!loading && Object.entries(groups).map(([day, entries]) => (
        <div key={day} style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(26,20,16,0.4)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid rgba(26,20,16,0.08)" }}>
            {day}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {entries.map(log => {
              const style = TYPE_STYLE[log.type] ?? { bg: "#f5f5f5", color: "#666", icon: "•", label: log.type };
              return (
                <div key={log.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderRadius: 14, background: "#fff", border: "1px solid rgba(26,20,16,0.07)" }}>
                  {/* Badge type */}
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: style.bg, color: style.color, display: "grid", placeItems: "center", fontSize: 16, flexShrink: 0 }}>
                    {style.icon}
                  </div>
                  {/* Contenu */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 99, background: style.bg, color: style.color, letterSpacing: 0.5, textTransform: "uppercase" }}>
                        {style.label}
                      </span>
                      {log.entity_name && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1410" }}>{log.entity_name}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, color: "rgba(26,20,16,0.75)", lineHeight: 1.5 }}>{log.message}</div>
                    {log.user_email && (
                      <div style={{ fontSize: 11, color: "rgba(26,20,16,0.35)", marginTop: 4 }}>par {log.user_email}</div>
                    )}
                  </div>
                  {/* Heure */}
                  <div style={{ fontSize: 12, color: "rgba(26,20,16,0.35)", fontWeight: 600, flexShrink: 0, textAlign: "right" }}>
                    <div>{timeAgo(log.created_at)}</div>
                    <div style={{ fontSize: 11, marginTop: 2 }}>
                      {new Date(log.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}