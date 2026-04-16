import { supabaseServer } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

async function getLogs() {
  const { data } = await supabaseServer
    .from("admin_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  return data ?? [];
}

const ACTION_STYLE: Record<string, { bg: string; color: string; icon: string }> = {
  create:  { bg: "#dcfce7", color: "#166534", icon: "✚" },
  update:  { bg: "#fef3c7", color: "#92400e", icon: "✎" },
  delete:  { bg: "#fee2e2", color: "#b91c1c", icon: "✕" },
  publish: { bg: "#e0f2fe", color: "#0369a1", icon: "↑" },
  ship:    { bg: "#ede9fe", color: "#7c3aed", icon: "🚚" },
  login:   { bg: "#f3f4f6", color: "#6b7280", icon: "→" },
};

export default async function AdminLogs() {
  const logs = await getLogs();

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>Journal d'activité</h1>
        <div style={{ fontSize: 15, color: "rgba(26,20,16,0.5)", marginTop: 4, fontWeight: 600 }}>
          {logs.length} action{logs.length > 1 ? "s" : ""} enregistrée{logs.length > 1 ? "s" : ""}
        </div>
      </div>

      {logs.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: 60, textAlign: "center", color: "rgba(26,20,16,0.4)" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Aucune activité enregistrée</div>
          <div style={{ fontSize: 14, marginTop: 8, opacity: 0.6 }}>Le journal sera alimenté automatiquement dès les premières actions admin</div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden" }}>
          {logs.map((log: any, i: number) => {
            const s = ACTION_STYLE[log.action] ?? ACTION_STYLE.update;
            return (
              <div key={log.id} style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "16px 20px", borderBottom: i < logs.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                <div style={{ width: 32, height: 32, borderRadius: 99, background: s.bg, color: s.color, display: "grid", placeItems: "center", fontSize: 14, fontWeight: 900, flexShrink: 0, marginTop: 2 }}>
                  {s.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#1a1410" }}>{log.description}</div>
                  {log.meta && (
                    <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", marginTop: 2, fontFamily: "monospace" }}>
                      {typeof log.meta === "object" ? JSON.stringify(log.meta).slice(0, 80) : log.meta}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "rgba(26,20,16,0.35)", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {new Date(log.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}