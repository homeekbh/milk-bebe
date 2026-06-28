"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function adminFetch(url: string, options: RequestInit = {}) {
  let token = "";
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? "";
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const parsed = JSON.parse(localStorage.getItem(key) ?? "{}");
        token = parsed.access_token ?? "";
        if (token) break;
      }
    }
  } catch {}
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    },
  });
}

type Post = {
  id: string; title: string; slug: string; category?: string | null;
  status?: string | null; published_at?: string | null; created_at?: string | null; author?: string | null;
};

function fmt(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
}

export default function AdminBlogListe() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await adminFetch("/api/admin/blog");
    const data = await res.json();
    setPosts(Array.isArray(data) ? data : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Supprimer "${title}" définitivement ?`)) return;
    setDeleting(id);
    await adminFetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    await load();
    setDeleting(null);
  }

  const published = posts.filter(p => p.status === "published").length;
  const drafts    = posts.length - published;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1120 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>Journal</h1>
          <p style={{ margin: "4px 0 0", color: "rgba(26,20,16,0.5)", fontSize: 15, fontWeight: 600 }}>
            {posts.length} article{posts.length !== 1 ? "s" : ""} · <span style={{ color: "#16a34a" }}>{published} publié{published !== 1 ? "s" : ""}</span>
            {drafts > 0 && <> · <span style={{ color: "#9ca3af" }}>{drafts} brouillon{drafts !== 1 ? "s" : ""}</span></>}
          </p>
        </div>
        <button onClick={() => router.push("/admin/blog/new")}
          style={{ padding: "12px 22px", borderRadius: 12, background: "#1a1410", color: "#c49a4a", fontWeight: 900, fontSize: 15, border: "none", cursor: "pointer" }}>
          + Nouvel article
        </button>
      </div>

      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.4 }}>Chargement…</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.4, fontSize: 16 }}>
            Aucun article — clique sur « + Nouvel article »
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9f7f4" }}>
                {["Statut", "Titre", "Catégorie", "Date", "Actions"].map(h => (
                  <th key={h} style={{ padding: "13px 14px", textAlign: "left", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", borderBottom: "2px solid rgba(0,0,0,0.07)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posts.map((p, idx) => {
                const isPub = p.status === "published";
                return (
                  <tr key={p.id} style={{ borderBottom: idx < posts.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", opacity: isPub ? 1 : 0.7 }}>
                    <td style={{ padding: "13px 14px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 99, background: isPub ? "#dcfce7" : "#f3f4f6" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: isPub ? "#16a34a" : "#9ca3af" }} />
                        <span style={{ fontSize: 11, fontWeight: 800, color: isPub ? "#166534" : "#6b7280", whiteSpace: "nowrap" }}>{isPub ? "Publié" : "Brouillon"}</span>
                      </span>
                    </td>
                    <td style={{ padding: "13px 14px", maxWidth: 360 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#1a1410", lineHeight: 1.3 }}>{p.title || "(sans titre)"}</div>
                      <div style={{ fontSize: 10, color: "rgba(26,20,16,0.3)", fontFamily: "monospace", marginTop: 2 }}>{p.slug}</div>
                    </td>
                    <td style={{ padding: "13px 14px" }}>
                      {p.category && <span style={{ padding: "4px 10px", borderRadius: 99, background: "#ede8df", fontSize: 12, fontWeight: 700, color: "#1a1410" }}>{p.category}</span>}
                    </td>
                    <td style={{ padding: "13px 14px", fontSize: 13, color: "rgba(26,20,16,0.55)", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {fmt(p.published_at ?? p.created_at)}
                    </td>
                    <td style={{ padding: "13px 14px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => router.push(`/admin/blog/${p.id}`)}
                          style={{ padding: "7px 14px", borderRadius: 8, background: "#ede8df", color: "#1a1410", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer" }}>Modifier</button>
                        <button onClick={() => handleDelete(p.id, p.title)} disabled={deleting === p.id}
                          style={{ padding: "7px 11px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 13, border: "none", cursor: deleting === p.id ? "not-allowed" : "pointer", opacity: deleting === p.id ? 0.4 : 1 }}>✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
