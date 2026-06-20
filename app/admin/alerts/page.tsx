"use client";
import { useIsNarrow } from "@/lib/useIsNarrow";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase-client";

type Product = {
  id:            string;
  name:          string;
  category_slug: string;
  stock:         number;
  image_url:     string | null;
};

type AlertConfig = {
  id:         string;
  product_id: string;
  threshold:  number;
  active:     boolean;
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
  return fetch(url, { ...options, headers: { ...(options.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...((options.body && !(options.body instanceof FormData)) ? { "Content-Type": "application/json" } : {}) } });
}

export default function AdminAlerts() {
  const narrow = useIsNarrow();
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts,   setAlerts]   = useState<AlertConfig[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState<string | null>(null);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState<"all" | "active" | "critical">("all");
  const [globalThreshold, setGlobalThreshold] = useState("5");
  const [applyingGlobal, setApplyingGlobal]   = useState(false);
  const [success,  setSuccess]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: prods }, { data: alrts }] = await Promise.all([
      supabase.from("products").select("id, name, category_slug, stock, image_url").order("name"),
      supabase.from("stock_alerts").select("*"),
    ]);
    setProducts(prods ?? []);
    setAlerts(alrts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function getAlert(productId: string): AlertConfig | undefined {
    return alerts.find(a => a.product_id === productId);
  }

  async function saveAlert(productId: string, threshold: number, active: boolean) {
    setSaving(productId);
    const existing = getAlert(productId);
    if (existing) {
      await supabase.from("stock_alerts").update({ threshold, active }).eq("product_id", productId);
    } else {
      await supabase.from("stock_alerts").insert([{ product_id: productId, threshold, active }]);
    }
    await load();
    setSaving(null);
  }

  async function applyGlobalThreshold() {
    setApplyingGlobal(true);
    const n = parseInt(globalThreshold);
    if (isNaN(n) || n < 0) { setApplyingGlobal(false); return; }

    for (const p of products) {
      const existing = getAlert(p.id);
      if (existing) {
        await supabase.from("stock_alerts").update({ threshold: n, active: true }).eq("product_id", p.id);
      } else {
        await supabase.from("stock_alerts").insert([{ product_id: p.id, threshold: n, active: true }]);
      }
    }
    await load();
    setApplyingGlobal(false);
    setSuccess(`Seuil de ${n} unités appliqué à tous les produits`);
    setTimeout(() => setSuccess(""), 3000);
  }

  const filtered = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    const a = getAlert(p.id);
    if (filter === "active"   && !a?.active) return false;
    if (filter === "critical" && p.stock > (a?.threshold ?? 5)) return false;
    return true;
  });

  const criticalCount = products.filter(p => {
    const a = getAlert(p.id);
    return a?.active && p.stock <= (a?.threshold ?? 5);
  }).length;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1000 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>
          Alertes stock
        </h1>
        <div style={{ fontSize: 15, color: "rgba(26,20,16,0.5)", marginTop: 4, fontWeight: 600 }}>
          Paramètre le seuil d'alerte pour chaque produit
        </div>
      </div>

      {/* Stats rapides */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", border: "1px solid rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(26,20,16,0.4)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Produits surveillés</div>
          <div style={{ fontSize: 32, fontWeight: 950, color: "#1a1410" }}>{alerts.filter(a => a.active).length}</div>
          <div style={{ fontSize: 13, color: "rgba(26,20,16,0.4)", marginTop: 2 }}>sur {products.length} produits</div>
        </div>
        <div style={{ background: criticalCount > 0 ? "#fef2f2" : "#f0fdf4", borderRadius: 16, padding: "20px 24px", border: `1px solid ${criticalCount > 0 ? "#fca5a5" : "#86efac"}` }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: criticalCount > 0 ? "#b91c1c" : "#15803d", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Stock critique</div>
          <div style={{ fontSize: 32, fontWeight: 950, color: criticalCount > 0 ? "#dc2626" : "#16a34a" }}>{criticalCount}</div>
          <div style={{ fontSize: 13, color: "rgba(26,20,16,0.4)", marginTop: 2 }}>en dessous du seuil</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", border: "1px solid rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(26,20,16,0.4)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Stock total</div>
          <div style={{ fontSize: 32, fontWeight: 950, color: "#1a1410" }}>{products.reduce((a, p) => a + (p.stock || 0), 0)}</div>
          <div style={{ fontSize: 13, color: "rgba(26,20,16,0.4)", marginTop: 2 }}>unités en stock</div>
        </div>
      </div>

      {/* Seuil global */}
      <div style={{ background: "#1a1410", borderRadius: 16, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#c49a4a", marginBottom: 2 }}>Seuil global</div>
          <div style={{ fontSize: 13, color: "rgba(242,237,230,0.5)" }}>Appliquer le même seuil d'alerte à tous les produits d'un coup</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "rgba(242,237,230,0.6)", fontWeight: 600 }}>Alerter si stock ≤</span>
          <input type="number" min="0" max="999" value={globalThreshold}
            onChange={e => setGlobalThreshold(e.target.value)}
            style={{ width: 70, padding: "9px 12px", borderRadius: 10, border: "none", fontSize: 16, fontWeight: 900, textAlign: "center", background: "rgba(255,255,255,0.1)", color: "#f2ede6" }} />
          <span style={{ fontSize: 13, color: "rgba(242,237,230,0.6)", fontWeight: 600 }}>unités</span>
          <button onClick={applyGlobalThreshold} disabled={applyingGlobal}
            style={{ padding: "10px 20px", borderRadius: 10, background: "#c49a4a", color: "#1a1410", fontWeight: 900, fontSize: 14, border: "none", cursor: applyingGlobal ? "not-allowed" : "pointer", opacity: applyingGlobal ? 0.7 : 1 }}>
            {applyingGlobal ? "..." : "Appliquer à tous"}
          </button>
        </div>
      </div>

      {success && (
        <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 12, background: "#dcfce7", color: "#166534", fontWeight: 700, fontSize: 14 }}>
          ✅ {success}
        </div>
      )}

      {/* Filtres + recherche */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un produit..."
          style={{ flex: 1, minWidth: 200, padding: "11px 16px", borderRadius: 12, border: "1.5px solid rgba(26,20,16,0.12)", fontSize: 15, background: "#fff" }} />
        {(["all", "active", "critical"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "11px 18px", borderRadius: 12, border: `2px solid ${filter === f ? "#1a1410" : "rgba(26,20,16,0.1)"}`, background: filter === f ? "#1a1410" : "#fff", color: filter === f ? "#c49a4a" : "rgba(26,20,16,0.6)", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
            {f === "all" ? "Tous" : f === "active" ? "⚡ Surveillés" : "🔴 Critiques"}
          </button>
        ))}
      </div>

      {/* Liste produits */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(26,20,16,0.35)" }}>Chargement...</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map(product => {
            const alert   = getAlert(product.id);
            const threshold = alert?.threshold ?? 5;
            const active    = alert?.active ?? false;
            const isCritical = active && product.stock <= threshold;
            const isSaving   = saving === product.id;

            return (
              <div key={product.id}
                style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", borderRadius: 16, background: "#fff", border: `1.5px solid ${isCritical ? "#fca5a5" : "rgba(0,0,0,0.07)"}` }}>

                {/* Image */}
                <div style={{ width: 52, height: 52, borderRadius: 10, overflow: "hidden", background: "#ede8df", flexShrink: 0 }}>
                  {product.image_url
                    ? <img src={product.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 900, color: "rgba(26,20,16,0.2)" }}>M!LK</div>
                  }
                </div>

                {/* Nom + catégorie */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1410", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {product.name}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", marginTop: 2, textTransform: "capitalize" }}>
                    {product.category_slug}
                  </div>
                </div>

                {/* Stock actuel */}
                <div style={{ flexShrink: 0, textAlign: "center", minWidth: 80 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,20,16,0.4)", marginBottom: 2 }}>Stock</div>
                  <div style={{ fontSize: 22, fontWeight: 950, color: isCritical ? "#dc2626" : product.stock <= 10 ? "#f59e0b" : "#16a34a" }}>
                    {product.stock}
                  </div>
                  {isCritical && (
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#dc2626" }}>⚠ CRITIQUE</div>
                  )}
                </div>

                {/* Seuil */}
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "rgba(26,20,16,0.5)", fontWeight: 600 }}>Alerter ≤</span>
                  <input type="number" min="0" max="999"
                    defaultValue={threshold}
                    key={`${product.id}-${threshold}`}
                    onBlur={e => saveAlert(product.id, parseInt(e.target.value) || 0, active)}
                    style={{ width: 64, padding: "8px 10px", borderRadius: 10, border: "2px solid rgba(26,20,16,0.12)", fontSize: 15, fontWeight: 900, textAlign: "center", background: "#faf8f4" }} />
                  <span style={{ fontSize: 13, color: "rgba(26,20,16,0.5)", fontWeight: 600 }}>u.</span>
                </div>

                {/* Toggle actif */}
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => saveAlert(product.id, threshold, !active)} disabled={isSaving}
                    style={{ padding: "9px 16px", borderRadius: 10, border: "none", fontWeight: 800, fontSize: 13, cursor: isSaving ? "not-allowed" : "pointer", background: active ? "#dcfce7" : "rgba(26,20,16,0.06)", color: active ? "#166534" : "rgba(26,20,16,0.4)", transition: "all 0.15s" }}>
                    {isSaving ? "..." : active ? "⚡ Active" : "Off"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}