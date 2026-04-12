"use client";
import { useState } from "react";

export default function ContactPage() {
  const [form,    setForm]    = useState({ nom: "", email: "", sujet: "", message: "" });
  const [sending, setSending] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit() {
    if (!form.nom || !form.email || !form.message) { setError("Merci de remplir tous les champs obligatoires."); return; }
    setSending(true); setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setError("Une erreur est survenue. Réessaie ou écris-nous à contact@milkbebe.fr");
    } finally {
      setSending(false);
    }
  }

  const IS: React.CSSProperties = {
    padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(242,237,230,0.15)",
    background: "rgba(242,237,230,0.07)", color: "#f2ede6", fontSize: 15,
    fontWeight: 600, outline: "none", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ background: "#1a1410", minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px" }}>

        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: "#c49a4a", marginBottom: 14 }}>Nous contacter</div>
          <h1 style={{ margin: 0, fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 950, letterSpacing: -1.5, color: "#f2ede6", lineHeight: 1.1 }}>
            Une question ? On répond.
          </h1>
          <p style={{ margin: "16px 0 0", fontSize: 16, color: "rgba(242,237,230,0.5)", lineHeight: 1.7 }}>
            On répond généralement sous 24h en jours ouvrés. Pour une commande en cours, pensez à inclure votre email de commande.
          </p>
        </div>

        {done ? (
          <div style={{ background: "#2a2018", borderRadius: 20, border: "1px solid rgba(196,154,74,0.2)", padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
            <div style={{ fontSize: 22, fontWeight: 950, color: "#f2ede6", marginBottom: 10 }}>Message envoyé !</div>
            <div style={{ fontSize: 15, color: "rgba(242,237,230,0.5)", lineHeight: 1.7 }}>
              On revient vers toi sous 24h. Merci {form.nom} !
            </div>
          </div>
        ) : (
          <div style={{ background: "#2a2018", borderRadius: 20, border: "1px solid rgba(242,237,230,0.08)", padding: "36px 32px", display: "grid", gap: 18 }}>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(242,237,230,0.4)" }}>Nom *</label>
                <input type="text" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Votre nom" style={IS} />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(242,237,230,0.4)" }}>Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="votre@email.com" style={IS} />
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(242,237,230,0.4)" }}>Sujet</label>
              <select value={form.sujet} onChange={e => setForm(f => ({ ...f, sujet: e.target.value }))}
                style={{ ...IS, colorScheme: "dark" }}>
                <option value="">Choisir un sujet</option>
                <option value="commande">Ma commande</option>
                <option value="retour">Retour / remboursement</option>
                <option value="produit">Question produit</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(242,237,230,0.4)" }}>Message *</label>
              <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Décris ta demande..." rows={5}
                style={{ ...IS, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
            </div>

            {error && <div style={{ fontSize: 14, color: "#fca5a5", fontWeight: 700 }}>❌ {error}</div>}

            <button onClick={handleSubmit} disabled={sending}
              style={{ padding: "16px", borderRadius: 12, background: "#c49a4a", color: "#1a1410", fontWeight: 900, fontSize: 16, border: "none", cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1 }}>
              {sending ? "Envoi..." : "Envoyer le message →"}
            </button>

            <div style={{ fontSize: 12, color: "rgba(242,237,230,0.25)", textAlign: "center" }}>
              Ou directement : contact@milkbebe.fr
            </div>
          </div>
        )}
      </div>
    </div>
  );
}