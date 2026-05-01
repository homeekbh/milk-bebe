"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

const CATEGORIES = ["bodies", "pyjamas", "gigoteuses", "accessoires"];

const TAILLES_SUGGESTIONS = [
  "Naissance", "0-3 mois", "3-6 mois", "6-12 mois",
  "0-6 mois", "Taille unique", "120×120 cm",
];

const HIGHLIGHTS = [
  { value: "",                label: "Aucune mise en avant"   },
  { value: "meilleure_vente", label: "Meilleure vente"        },
  { value: "selection",       label: "Sélection du moment"    },
  { value: "nouveaute",       label: "Nouveauté"              },
];
const LABELS = [
  { value: "",              label: "Aucun badge"          },
  { value: "nouveau",       label: "Nouveau"              },
  { value: "bestseller",    label: "Bestseller"           },
  { value: "exclusif",      label: "Exclusif"             },
  { value: "last",          label: "Dernières pièces"     },
  { value: "bientot",       label: "Bientôt disponible"   },
  { value: "promo",         label: "Promo"                },
  { value: "coup_de_coeur", label: "Coup de cœur"         },
];

const EMPTY: Record<string, string> = {
  name: "", slug: "", price_ttc: "", promo_price: "",
  promo_start: "", promo_end: "", stock: "0",
  category_slug: "bodies",
  image_url: "", image_url_2: "", image_url_3: "", image_url_4: "",
  description: "", main_image_index: "0",
  label: "", highlight: "",
  position: "0", weight_g: "",
  seo_title: "", seo_description: "",
  supplier_ref: "",
};

type ColorEntry = {
  name:       string;
  hex:        string;
  stock:      string;
  image_url?: string;
};

// ── Nouvelles structures pour cards et FAQs éditables ──
type FicheCard = {
  id:       string;
  type:     "subtitle" | "description" | "coloris" | "features" | "whyresult" | "philosophy" | "entretien" | "motif";
  title:    string;
  content:  string; // JSON stringifié selon le type
};

type FaqItem = {
  id:      string;
  question: string;
  reponse:  string;
};

function newId() { return Math.random().toString(36).slice(2, 9); }

function slugify(s: string) {
  return s.trim().toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const IS: React.CSSProperties = {
  padding: "12px 14px", borderRadius: 10,
  border: "2px solid rgba(0,0,0,0.1)", fontSize: 15,
  fontWeight: 600, background: "#fff", width: "100%",
  boxSizing: "border-box", outline: "none",
};
const LS: React.CSSProperties = {
  fontSize: 12, fontWeight: 800, letterSpacing: 1,
  textTransform: "uppercase", color: "rgba(26,20,16,0.5)",
};
const SECTION: React.CSSProperties = {
  background: "#fff", borderRadius: 16,
  border: "1px solid rgba(0,0,0,0.08)", padding: 28, display: "grid", gap: 18,
};

// ── PhotoField ────────────────────────────────────────────────────────────────
function PhotoField({ label, fieldKey, value, isMain, onSetMain, onChange }: {
  label: string; fieldKey: string; value: string;
  isMain: boolean; onSetMain: () => void;
  onChange: (k: string, v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [ok,  setOk]  = useState(false);
  const [err, setErr] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setErr(""); setOk(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur upload");
      onChange(fieldKey, data.url);
      setOk(true);
    } catch (e: any) { setErr(e.message); }
    finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
        <label style={LS}>{label}</label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, fontWeight: 800, color: isMain ? "#c49a4a" : "rgba(0,0,0,0.4)" }}>
          <input type="radio" name="main_photo" checked={isMain} onChange={onSetMain} style={{ accentColor: "#c49a4a" }} />
          ⭐ Photo principale
        </label>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input value={value} onChange={e => onChange(fieldKey, e.target.value)}
          placeholder="URL de l'image..." style={{ ...IS, flex: 1 }} />
        <input ref={ref} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
          style={{ padding: "11px 14px", borderRadius: 10, background: uploading ? "#f3f4f6" : "#1a1410", color: uploading ? "#9ca3af" : "#f2ede6", fontWeight: 800, fontSize: 13, border: "none", cursor: uploading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
          {uploading ? "Upload..." : "⬆ Uploader"}
        </button>
        {value && (
          <div style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", flexShrink: 0, border: "1px solid rgba(0,0,0,0.1)" }}>
            <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          </div>
        )}
      </div>
      {err && <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700 }}>❌ {err}</div>}
      {ok  && <div style={{ fontSize: 12, color: "#166534", fontWeight: 700 }}>✅ Uploadée</div>}
    </div>
  );
}

// ── Field générique ───────────────────────────────────────────────────────────
function Field({ label, fieldKey, value, onChange, placeholder, type = "text", hint }: {
  label: string; fieldKey: string; value: string;
  onChange: (k: string, v: string) => void;
  placeholder?: string; type?: string; hint?: string;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={LS}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(fieldKey, e.target.value)}
        placeholder={placeholder} style={IS} />
      {hint && <div style={{ fontSize: 11, color: "rgba(26,20,16,0.4)", lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

// ── ColorEntryRow ─────────────────────────────────────────────────────────────
function ColorEntryRow({ color, index, onUpdate, onRemove }: {
  color: ColorEntry; index: number;
  onUpdate: (i: number, k: keyof ColorEntry, v: string) => void;
  onRemove: (i: number) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploadErr, setUploadErr] = useState("");
  const hasImage = !!color.image_url;

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadErr("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const res  = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      onUpdate(index, "image_url", data.url);
    } catch (e: any) { setUploadErr(e.message); }
    finally { if (ref.current) ref.current.value = ""; }
  }

  return (
    <div style={{ display: "grid", gap: 14, padding: "18px 20px", borderRadius: 14, background: "#f5f0e8", border: "2px solid #1a1410" }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 14, alignItems: "start" }}>
        {/* Pastille */}
        <div>
          <input ref={ref} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
          <button type="button" onClick={() => ref.current?.click()} title="Uploader une image de motif"
            style={{ position: "relative", width: 56, height: 56, borderRadius: 14, border: `2px solid ${hasImage ? "#c49a4a" : "rgba(0,0,0,0.12)"}`, overflow: "hidden", background: color.hex, cursor: "pointer" }}
          >
            {color.image_url && (
              <img src={color.image_url} alt={color.name}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.5)", padding: "3px 0", textAlign: "center" }}>
              <span style={{ color: "#fff", fontSize: 18, lineHeight: 1 }}>⬆</span>
            </div>
            <div style={{ position: "absolute", bottom: 2, right: 2, fontSize: 9, fontWeight: 900, background: hasImage ? "#c49a4a" : "#1a1410", color: "#fff", padding: "1px 4px", borderRadius: 4, lineHeight: 1.4 }}>
              {hasImage ? "IMG" : "HEX"}
            </div>
          </button>
        </div>

        {/* Nom */}
        <div style={{ display: "grid", gap: 6 }}>
          <label style={LS}>Nom du coloris / motif</label>
          <input type="text" value={color.name}
            onChange={e => onUpdate(index, "name", e.target.value)}
            placeholder="Ex : Noir damier, Caramel uni..." style={IS} />
        </div>

        {/* Stock */}
        <div style={{ display: "grid", gap: 6 }}>
          <label style={LS}>Stock</label>
          <input type="number" value={color.stock} min="0"
            onChange={e => onUpdate(index, "stock", e.target.value)}
            style={{ ...IS, width: 80, textAlign: "center" }} />
        </div>

        {/* Supprimer */}
        <button type="button" onClick={() => onRemove(index)}
          style={{ padding: "12px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer", alignSelf: "end", marginBottom: 0 }}>
          ✕
        </button>
      </div>

      {/* Hex + image URL */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr auto", gap: 10, alignItems: "end" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={LS}>
            Couleur hex {hasImage && <span style={{ color: "#c49a4a" }}>(image chargée ✓)</span>}
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="color" value={color.hex}
              onChange={e => onUpdate(index, "hex", e.target.value)}
              style={{ width: 44, height: 44, borderRadius: 8, border: "2px solid rgba(0,0,0,0.1)", padding: 2, cursor: "pointer" }} />
            <input type="text" value={color.hex}
              onChange={e => onUpdate(index, "hex", e.target.value)}
              style={{ ...IS, width: 110 }} />
          </div>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={LS}>URL image motif (optionnel)</label>
          <input type="text" value={color.image_url ?? ""}
            onChange={e => onUpdate(index, "image_url", e.target.value)}
            placeholder="https://..." style={IS} />
        </div>
        {color.image_url && (
          <button type="button" onClick={() => onUpdate(index, "image_url", "")}
            style={{ padding: "10px 12px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 12, border: "none", cursor: "pointer", flexShrink: 0 }}>
            Retirer l'image
          </button>
        )}
      </div>

      {uploadErr && <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700 }}>❌ {uploadErr}</div>}

      {color.name && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "#fff", border: "1px solid rgba(0,0,0,0.07)" }}>
          <div style={{ width: 26, height: 26, borderRadius: 99, overflow: "hidden", border: "1px solid rgba(0,0,0,0.12)", background: color.hex, flexShrink: 0 }}>
            {hasImage && <img src={color.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
          </div>
          <span style={{ fontWeight: 800, fontSize: 13, color: "#1a1410" }}>{color.name}</span>
          <span style={{ fontSize: 13, color: "rgba(26,20,16,0.45)" }}>— {color.stock} unité{parseInt(color.stock) !== 1 ? "s" : ""}</span>
          {hasImage && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800, color: "#c49a4a", background: "rgba(196,154,74,0.1)", padding: "3px 8px", borderRadius: 99 }}>Motif image ✓</span>}
        </div>
      )}
    </div>
  );
}

// ── CARDS FICHE PRODUIT ÉDITABLES ─────────────────────────────────────────────

const CARD_TYPES: { value: FicheCard["type"]; label: string; desc: string }[] = [
  { value: "subtitle",    label: "Sous-titre produit",   desc: "Phrase d'accroche sous le nom (ex : Double zip + moufles…)" },
  { value: "description", label: "Description",          desc: "Paragraphe de description libre" },
  { value: "coloris",     label: "Info coloris",         desc: "Ex : Terre cuite — brun chaud aux nuances naturelles" },
  { value: "motif",       label: "Info motif",           desc: "Ex : Motif Flash — éclairs blancs minimalistes" },
  { value: "features",    label: "Points forts (liste)", desc: "Liste de points clés du produit" },
  { value: "whyresult",   label: "Pourquoi / Résultat",  desc: "Bloc narratif en 2 parties : Pourquoi + Résultat" },
  { value: "philosophy",  label: "Philosophie M!LK",     desc: "Bloc philosophie (texte long avec mise en forme auto)" },
  { value: "entretien",   label: "Conseils d'entretien", desc: "Instructions de lavage/séchage" },
];

function FicheCardEditor({ card, onUpdate, onRemove, onMoveUp, onMoveDown, isFirst, isLast }: {
  card: FicheCard;
  onUpdate: (id: string, field: keyof FicheCard, value: string) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isFirst: boolean; isLast: boolean;
}) {
  const [open, setOpen] = useState(true);
  const typeDef = CARD_TYPES.find(t => t.value === card.type);

  // Parse features as array
  let featuresArr: string[] = [];
  if (card.type === "features") {
    try { featuresArr = JSON.parse(card.content); } catch { featuresArr = []; }
  }

  // Parse whyresult
  let wrObj = { why: "", result: "" };
  if (card.type === "whyresult") {
    try { wrObj = JSON.parse(card.content); } catch {}
  }

  // Parse entretien
  let entretienArr: string[] = [];
  if (card.type === "entretien") {
    try { entretienArr = JSON.parse(card.content); } catch { entretienArr = []; }
  }

  function updateFeature(idx: number, val: string) {
    const arr = [...featuresArr]; arr[idx] = val;
    onUpdate(card.id, "content", JSON.stringify(arr));
  }
  function addFeature() {
    onUpdate(card.id, "content", JSON.stringify([...featuresArr, ""]));
  }
  function removeFeature(idx: number) {
    onUpdate(card.id, "content", JSON.stringify(featuresArr.filter((_, i) => i !== idx)));
  }
  function updateWR(field: "why"|"result", val: string) {
    onUpdate(card.id, "content", JSON.stringify({ ...wrObj, [field]: val }));
  }
  function updateEntretienLine(idx: number, val: string) {
    const arr = [...entretienArr]; arr[idx] = val;
    onUpdate(card.id, "content", JSON.stringify(arr));
  }
  function addEntretienLine() {
    onUpdate(card.id, "content", JSON.stringify([...entretienArr, ""]));
  }
  function removeEntretienLine(idx: number) {
    onUpdate(card.id, "content", JSON.stringify(entretienArr.filter((_, i) => i !== idx)));
  }

  return (
    <div style={{ borderRadius: 14, border: "2px solid rgba(196,154,74,0.3)", overflow: "hidden", background: "#fffdf9" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", background: "rgba(196,154,74,0.08)", borderBottom: open ? "1px solid rgba(196,154,74,0.2)" : "none" }}>
        <button type="button" onClick={() => setOpen(v => !v)}
          style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(196,154,74,0.15)", cursor: "pointer", fontSize: 14, display: "grid", placeItems: "center", color: "#c49a4a", flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "none" }}>
          +
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 14, color: "#1a1410" }}>{typeDef?.label ?? card.type}</div>
          {card.title && <div style={{ fontSize: 12, color: "rgba(26,20,16,0.45)", marginTop: 1 }}>{card.title}</div>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={() => onMoveUp(card.id)} disabled={isFirst}
            style={{ padding: "5px 9px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", cursor: isFirst ? "not-allowed" : "pointer", opacity: isFirst ? 0.3 : 1, fontSize: 13 }}>↑</button>
          <button type="button" onClick={() => onMoveDown(card.id)} disabled={isLast}
            style={{ padding: "5px 9px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", cursor: isLast ? "not-allowed" : "pointer", opacity: isLast ? 0.3 : 1, fontSize: 13 }}>↓</button>
          <button type="button" onClick={() => onRemove(card.id)}
            style={{ padding: "5px 9px", borderRadius: 6, border: "none", background: "#fee2e2", color: "#b91c1c", cursor: "pointer", fontSize: 13, fontWeight: 800 }}>✕</button>
        </div>
      </div>

      {/* Body */}
      {open && (
        <div style={{ padding: "16px 16px 18px", display: "grid", gap: 12 }}>
          {/* Titre interne optionnel */}
          {(card.type === "philosophy" || card.type === "whyresult") && (
            <div style={{ display: "grid", gap: 6 }}>
              <label style={LS}>Titre interne (optionnel)</label>
              <input value={card.title} onChange={e => onUpdate(card.id, "title", e.target.value)}
                placeholder="Ex : Philosophie pour Bodies" style={IS} />
            </div>
          )}

          {/* Contenu selon type */}
          {(card.type === "subtitle" || card.type === "description" || card.type === "coloris" || card.type === "motif" || card.type === "philosophy") && (
            <div style={{ display: "grid", gap: 6 }}>
              <label style={LS}>{typeDef?.desc}</label>
              <textarea value={card.content} onChange={e => onUpdate(card.id, "content", e.target.value)}
                rows={card.type === "philosophy" ? 8 : card.type === "description" ? 4 : 2}
                placeholder={typeDef?.desc}
                style={{ ...IS, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
              <div style={{ fontSize: 11, color: "rgba(26,20,16,0.4)", lineHeight: 1.6 }}>
                {card.type === "philosophy" && "Sépare les paragraphes par une ligne vide (\\n\\n). Le 1er \\n\\n sépare texte principal et conclusion en gras."}
                {(card.type === "subtitle" || card.type === "description") && "Texte affiché tel quel sur la fiche produit."}
                {card.type === "coloris" && "Ex : Terre cuite — brun chaud aux nuances naturelles, à la fois doux et affirmé."}
                {card.type === "motif" && "Format : Motif [Nom] — [description]. Ex : Motif Flash — éclairs blancs minimalistes sur fond gris."}
              </div>
            </div>
          )}

          {card.type === "features" && (
            <div style={{ display: "grid", gap: 10 }}>
              <label style={LS}>Points forts — un par ligne (le texte avant " : " sera en gras)</label>
              {featuresArr.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <input value={f} onChange={e => updateFeature(i, e.target.value)}
                    placeholder={`Point ${i+1} (ex : Col enveloppe élargi : passe sur la tête sans forcer)`}
                    style={{ ...IS, flex: 1 }} />
                  <button type="button" onClick={() => removeFeature(i)}
                    style={{ padding: "0 12px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", border: "none", cursor: "pointer", fontWeight: 800 }}>✕</button>
                </div>
              ))}
              <button type="button" onClick={addFeature}
                style={{ padding: "10px", borderRadius: 8, border: "2px dashed rgba(196,154,74,0.4)", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "#c49a4a" }}>
                + Ajouter un point fort
              </button>
            </div>
          )}

          {card.type === "whyresult" && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={LS}>Pourquoi — texte narratif (problème parent)</label>
                <textarea value={wrObj.why} onChange={e => updateWR("why", e.target.value)}
                  rows={5} placeholder="Ex : Tu te lèves pour la 4e fois. Il est 3h du mat'..."
                  style={{ ...IS, resize: "vertical", fontFamily: "inherit", lineHeight: 1.7 }} />
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={LS}>Résultat — ce que ça change concrètement</label>
                <textarea value={wrObj.result} onChange={e => updateWR("result", e.target.value)}
                  rows={3} placeholder="Ex : Change de couche en 30 secondes. Bébé reste calme..."
                  style={{ ...IS, resize: "vertical", fontFamily: "inherit", lineHeight: 1.7 }} />
              </div>
            </div>
          )}

          {card.type === "entretien" && (
            <div style={{ display: "grid", gap: 10 }}>
              <label style={LS}>Instructions d'entretien — une par ligne</label>
              {entretienArr.map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <input value={line} onChange={e => updateEntretienLine(i, e.target.value)}
                    placeholder={`Ex : Lavage 40°C, cycle délicat`}
                    style={{ ...IS, flex: 1 }} />
                  <button type="button" onClick={() => removeEntretienLine(i)}
                    style={{ padding: "0 12px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", border: "none", cursor: "pointer", fontWeight: 800 }}>✕</button>
                </div>
              ))}
              <button type="button" onClick={addEntretienLine}
                style={{ padding: "10px", borderRadius: 8, border: "2px dashed rgba(196,154,74,0.4)", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "#c49a4a" }}>
                + Ajouter une instruction
              </button>
            </div>
          )}

          {/* Aperçu minimaliste */}
          {card.content && card.type === "features" && featuresArr.length > 0 && (
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "#f5f0e8", border: "1px solid rgba(196,154,74,0.2)" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.35)", marginBottom: 8 }}>Aperçu</div>
              {featuresArr.map((f, i) => {
                const colonIdx = f.indexOf(" : ");
                const label = colonIdx > -1 ? f.slice(0, colonIdx) : f;
                const desc  = colonIdx > -1 ? f.slice(colonIdx + 3) : "";
                return (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                    <span style={{ color: "#c49a4a", fontWeight: 900, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 13 }}>
                      <strong>{label}</strong>{desc && ` : ${desc}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── FAQ ÉDITABLES ──────────────────────────────────────────────────────────────
function FaqEditor({ faq, onUpdate, onRemove, onMoveUp, onMoveDown, isFirst, isLast }: {
  faq: FaqItem;
  onUpdate: (id: string, field: keyof FaqItem, value: string) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isFirst: boolean; isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)", overflow: "hidden", background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer", background: "#f9f6f1" }} onClick={() => setOpen(v => !v)}>
        <span style={{ fontSize: 18, color: "#c49a4a", fontWeight: 300, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "none", flexShrink: 0 }}>+</span>
        <div style={{ flex: 1, fontWeight: 700, fontSize: 14, color: "#1a1410" }}>
          {faq.question || <span style={{ color: "rgba(26,20,16,0.35)" }}>Question non renseignée…</span>}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button type="button" onClick={e => { e.stopPropagation(); onMoveUp(faq.id); }} disabled={isFirst}
            style={{ padding: "4px 7px", borderRadius: 5, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", cursor: isFirst ? "not-allowed" : "pointer", opacity: isFirst ? 0.3 : 1, fontSize: 11 }}>↑</button>
          <button type="button" onClick={e => { e.stopPropagation(); onMoveDown(faq.id); }} disabled={isLast}
            style={{ padding: "4px 7px", borderRadius: 5, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", cursor: isLast ? "not-allowed" : "pointer", opacity: isLast ? 0.3 : 1, fontSize: 11 }}>↓</button>
          <button type="button" onClick={e => { e.stopPropagation(); onRemove(faq.id); }}
            style={{ padding: "4px 7px", borderRadius: 5, border: "none", background: "#fee2e2", color: "#b91c1c", cursor: "pointer", fontSize: 11, fontWeight: 800 }}>✕</button>
        </div>
      </div>
      {open && (
        <div style={{ padding: "14px 14px 16px", display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>Question</label>
            <input value={faq.question} onChange={e => onUpdate(faq.id, "question", e.target.value)}
              placeholder="Ex : C'est quoi le double zip inversé ?" style={IS} />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>Réponse (\\n pour sauter une ligne)</label>
            <textarea value={faq.reponse} onChange={e => onUpdate(faq.id, "reponse", e.target.value)}
              rows={4} placeholder="Ex : Un système d'ouverture à double sens..."
              style={{ ...IS, resize: "vertical", fontFamily: "inherit", lineHeight: 1.7 }} />
          </div>
          {faq.reponse && (
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "#f5f0e8", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-line" }}>
              {faq.reponse}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminProductForm() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const isNew    = id === "new";
  const draftKey = `milk_draft_product_${id}`;

  const [form,         setForm]         = useState<Record<string, string>>(EMPTY);
  const [published,    setPublished]    = useState(true);
  const [sizes,        setSizes]        = useState<string[]>([]);
  const [sizesStock,   setSizesStock]   = useState<Record<string, string>>({});
  const [colors,       setColors]       = useState<ColorEntry[]>([]);
  const [customTaille, setCustomTaille] = useState("");
  const [loading,      setLoading]      = useState(!isNew);
  const [saving,       setSaving]       = useState(false);
  const [publishing,   setPublishing]   = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState("");
  const [autoSaved,    setAutoSaved]    = useState(false);
  const [lastSaved,    setLastSaved]    = useState<Date | null>(null);

  // ── Nouvelles states : cards fiche + FAQs ──
  const [ficheCards,   setFicheCards]   = useState<FicheCard[]>([]);
  const [faqs,         setFaqs]         = useState<FaqItem[]>([]);

  // Chargement produit existant
  useEffect(() => {
    if (isNew) {
      try { const s = localStorage.getItem(draftKey); if (s) setForm(f => ({ ...f, ...JSON.parse(s) })); } catch {}
      return;
    }
    fetch(`/api/admin/products?id=${id}`)
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setForm({
            name:             data.name              ?? "",
            slug:             data.slug              ?? "",
            price_ttc:        String(data.price_ttc  ?? ""),
            promo_price:      data.promo_price  ? String(data.promo_price)       : "",
            promo_start:      data.promo_start  ? data.promo_start.slice(0, 10)  : "",
            promo_end:        data.promo_end    ? data.promo_end.slice(0, 10)    : "",
            stock:            String(data.stock      ?? 0),
            category_slug:    data.category_slug     ?? "bodies",
            image_url:        data.image_url         ?? "",
            image_url_2:      data.image_url_2       ?? "",
            image_url_3:      data.image_url_3       ?? "",
            image_url_4:      data.image_url_4       ?? "",
            description:      data.description       ?? "",
            main_image_index: String(data.main_image_index ?? 0),
            label:            data.label             ?? "",
            highlight:        data.highlight         ?? "",
            position:         String(data.position   ?? 0),
            weight_g:         data.weight_g ? String(data.weight_g) : "",
            seo_title:        data.seo_title         ?? "",
            seo_description:  data.seo_description   ?? "",
            supplier_ref:     data.supplier_ref       ?? "",
          });
          setPublished(data.published !== false);
          setSizes(Array.isArray(data.sizes) ? data.sizes : []);
          setSizesStock(
            data.sizes_stock && typeof data.sizes_stock === "object"
              ? Object.fromEntries(Object.entries(data.sizes_stock).map(([k, v]) => [k, String(v)]))
              : {}
          );
          setColors(
            Array.isArray(data.colors)
              ? data.colors.map((c: any) => ({
                  name:      c.name      ?? "",
                  hex:       c.hex       ?? "#f2ede6",
                  stock:     String(c.stock ?? 0),
                  image_url: c.image_url ?? "",
                }))
              : []
          );
          // Charger cards et faqs sauvegardés
          if (Array.isArray(data.fiche_cards)) {
            setFicheCards(data.fiche_cards);
          }
          if (Array.isArray(data.fiche_faqs)) {
            setFaqs(data.fiche_faqs);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, isNew]);

  // Auto-save brouillon
  useEffect(() => {
    if (!form.name && !form.price_ttc) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(form));
        setAutoSaved(true); setLastSaved(new Date());
        setTimeout(() => setAutoSaved(false), 2000);
      } catch {}
    }, 10000);
    return () => clearTimeout(t);
  }, [form, draftKey]);

  function set(k: string, v: string) {
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === "name" && isNew) next.slug = slugify(v);
      return next;
    });
  }

  function toggleSize(t: string) {
    setSizes(prev => {
      if (prev.includes(t)) {
        setSizesStock(s => { const n = { ...s }; delete n[t]; return n; });
        return prev.filter(s => s !== t);
      }
      setSizesStock(s => ({ ...s, [t]: s[t] ?? "0" }));
      return [...prev, t];
    });
  }
  function addCustomTaille() {
    const t = customTaille.trim(); if (!t) return;
    if (!sizes.includes(t)) { setSizes(prev => [...prev, t]); setSizesStock(prev => ({ ...prev, [t]: "0" })); }
    setCustomTaille("");
  }
  function removeSize(t: string) {
    setSizes(prev => prev.filter(s => s !== t));
    setSizesStock(prev => { const n = { ...prev }; delete n[t]; return n; });
  }
  function setSizeStock(t: string, v: string) { setSizesStock(prev => ({ ...prev, [t]: v })); }

  const totalFromSizes  = sizes.length > 0 ? sizes.reduce((s, t) => s + (parseInt(sizesStock[t] ?? "0") || 0), 0) : null;
  const totalFromColors = colors.length > 0 ? colors.reduce((s, c) => s + (parseInt(c.stock) || 0), 0) : null;
  const computedStock   = totalFromSizes ?? totalFromColors;

  function addColor() { setColors(p => [...p, { name: "", hex: "#f2ede6", stock: "0", image_url: "" }]); }
  function removeColor(i: number) { setColors(p => p.filter((_, idx) => idx !== i)); }
  function updateColor(i: number, k: keyof ColorEntry, v: string) {
    setColors(p => p.map((c, idx) => idx === i ? { ...c, [k]: v } : c));
  }

  // ── Cards fiche produit ──
  function addCard(type: FicheCard["type"]) {
    const typeDef = CARD_TYPES.find(t => t.value === type);
    let defaultContent = "";
    if (type === "features")  defaultContent = JSON.stringify([""]);
    if (type === "whyresult") defaultContent = JSON.stringify({ why: "", result: "" });
    if (type === "entretien") defaultContent = JSON.stringify(["Lavage 40°C, cycle délicat", "Sans adoucissant ni javel", "Séchage à l'air libre recommandé", "Sèche-linge basse température"]);
    setFicheCards(prev => [...prev, { id: newId(), type, title: typeDef?.label ?? type, content: defaultContent }]);
  }
  function updateCard(id: string, field: keyof FicheCard, value: string) {
    setFicheCards(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  }
  function removeCard(id: string) { setFicheCards(prev => prev.filter(c => c.id !== id)); }
  function moveCard(id: string, dir: "up"|"down") {
    setFicheCards(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  // ── FAQs ──
  function addFaq() { setFaqs(prev => [...prev, { id: newId(), question: "", reponse: "" }]); }
  function updateFaq(id: string, field: keyof FaqItem, value: string) {
    setFaqs(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  }
  function removeFaq(id: string) { setFaqs(prev => prev.filter(f => f.id !== id)); }
  function moveFaq(id: string, dir: "up"|"down") {
    setFaqs(prev => {
      const idx = prev.findIndex(f => f.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  async function togglePublish() {
    if (isNew) return;
    setPublishing(true);
    const newPub = !published;
    const res = await fetch("/api/admin/products", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, published: newPub }),
    });
    if (res.ok) {
      setPublished(newPub);
      setSuccess(newPub ? "✅ Produit publié !" : "⏸ Produit dépublié");
      setTimeout(() => setSuccess(""), 3000);
    }
    setPublishing(false);
  }

  async function handleSave() {
    setSaving(true); setError(""); setSuccess("");
    try {
      if (!form.name.trim()) throw new Error("Le nom est obligatoire");
      if (!form.price_ttc)   throw new Error("Le prix est obligatoire");

      const body = {
        ...form,
        published,
        price_ttc:        parseFloat(form.price_ttc),
        promo_price:      form.promo_price ? parseFloat(form.promo_price) : null,
        promo_start:      form.promo_start  || null,
        promo_end:        form.promo_end    || null,
        stock:            computedStock !== null ? computedStock : (parseInt(form.stock) || 0),
        main_image_index: parseInt(form.main_image_index) || 0,
        label:            form.label      || null,
        highlight:        form.highlight  || null,
        position:         parseInt(form.position) || 0,
        weight_g:         form.weight_g ? parseInt(form.weight_g) : null,
        seo_title:        form.seo_title        || null,
        seo_description:  form.seo_description  || null,
        supplier_ref:     form.supplier_ref      || null,
        sizes,
        sizes_stock: Object.fromEntries(sizes.map(t => [t, parseInt(sizesStock[t] ?? "0") || 0])),
        colors: colors.map(c => ({
          name:      c.name,
          hex:       c.hex,
          stock:     parseInt(c.stock) || 0,
          image_url: c.image_url || null,
        })),
        // Nouvelles données fiche produit
        fiche_cards: ficheCards,
        fiche_faqs:  faqs,
      };

      const res  = await fetch("/api/admin/products", {
        method:  isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(isNew ? body : { id, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");

      try { localStorage.removeItem(draftKey); } catch {}
      setSuccess(isNew ? "✅ Produit créé !" : "✅ Enregistré !");
      setLastSaved(new Date());
      if (isNew) router.push("/admin/produits");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer "${form.name}" définitivement ?`)) return;
    await fetch("/api/admin/products", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    try { localStorage.removeItem(draftKey); } catch {}
    router.push("/admin/produits");
  }

  const photoKeys   = ["image_url", "image_url_2", "image_url_3", "image_url_4"] as const;
  const photoLabels = ["Photo 1", "Photo 2", "Photo 3", "Photo 4"];
  const hasPromo    = !!form.promo_price;

  if (loading) return <div style={{ padding: 60, opacity: 0.4, fontSize: 16 }}>Chargement...</div>;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 820 }}>

      {/* ── En-tête ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        <button onClick={() => router.push("/admin/produits")}
          style={{ padding: "10px 16px", borderRadius: 10, border: "2px solid rgba(0,0,0,0.12)", background: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 800 }}>
          ← Retour
        </button>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 950, letterSpacing: -0.5, color: "#1a1410", flex: 1 }}>
          {isNew ? "Nouveau produit" : `Modifier : ${form.name || "..."}`}
        </h1>

        {!isNew && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 99, background: published ? "rgba(22,163,74,0.1)" : "rgba(107,114,128,0.1)", border: `1px solid ${published ? "rgba(22,163,74,0.3)" : "rgba(107,114,128,0.2)"}` }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: published ? "#16a34a" : "#9ca3af", boxShadow: published ? "0 0 8px rgba(22,163,74,0.6)" : "none" }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: published ? "#16a34a" : "#9ca3af" }}>
                {published ? "En ligne" : "Hors ligne"}
              </span>
            </div>
            <button onClick={togglePublish} disabled={publishing}
              style={{ padding: "12px 22px", borderRadius: 12, border: "none", fontWeight: 900, fontSize: 14, cursor: publishing ? "not-allowed" : "pointer", background: published ? "#fee2e2" : "#1a1410", color: published ? "#b91c1c" : "#c49a4a", opacity: publishing ? 0.6 : 1, boxShadow: published ? "none" : "0 4px 16px rgba(0,0,0,0.2)" }}>
              {publishing ? "..." : published ? "⏸ Dépublier" : "🚀 Publier"}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: 20 }}>

        {/* ── 1. GÉNÉRAL ── */}
        <div style={SECTION}>
          <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410" }}>Informations générales</div>

          <Field label="Nom du produit *" fieldKey="name"
            placeholder="Ex : Pyjama Bambou — Tropical" value={form.name} onChange={set} />
          <Field label="Slug (URL)" fieldKey="slug"
            placeholder="pyjama-bambou-tropical" value={form.slug} onChange={set}
            hint="Généré depuis le nom. Convention : type-bambou — motif" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <Field label="Prix TTC (€) *" fieldKey="price_ttc" type="number" placeholder="29.90" value={form.price_ttc} onChange={set} />
            <Field label="Stock total" fieldKey="stock" type="number" placeholder="0"
              value={computedStock !== null ? String(computedStock) : form.stock} onChange={set}
              hint={computedStock !== null ? `Calculé : ${computedStock} u.` : undefined} />
            <Field label="Position" fieldKey="position" type="number" placeholder="0" value={form.position} onChange={set}
              hint="0 = premier" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={LS}>Catégorie</label>
              <select value={form.category_slug} onChange={e => set("category_slug", e.target.value)} style={IS}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Field label="Référence fournisseur" fieldKey="supplier_ref" placeholder="ES-001" value={form.supplier_ref} onChange={set} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={LS}>Badge produit</label>
              <select value={form.label} onChange={e => set("label", e.target.value)} style={IS}>
                {LABELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={LS}>Mise en avant homepage</label>
              <select value={form.highlight} onChange={e => set("highlight", e.target.value)} style={IS}>
                {HIGHLIGHTS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>
          </div>

          <Field label="Poids (grammes)" fieldKey="weight_g" type="number" placeholder="120" value={form.weight_g} onChange={set} />

          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>Description courte (interne / fallback SEO)</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Description courte interne..."
              rows={3} style={{ ...IS, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
          </div>
        </div>

        {/* ── 2. PHOTOS ── */}
        <div style={SECTION}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410", marginBottom: 4 }}>Photos (4 max)</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)" }}>Coche ⭐ pour définir la photo principale</div>
          </div>
          {photoKeys.map((k, i) => (
            <PhotoField key={k} label={photoLabels[i]} fieldKey={k}
              value={form[k] ?? ""}
              isMain={parseInt(form.main_image_index) === i}
              onSetMain={() => set("main_image_index", String(i))}
              onChange={set} />
          ))}
        </div>

        {/* ── 3. TAILLES ── */}
        <div style={SECTION}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410", marginBottom: 4 }}>Tailles disponibles</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)" }}>
              Coche les tailles suggérées ou crée une taille libre
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TAILLES_SUGGESTIONS.map(t => {
              const checked = sizes.includes(t);
              return (
                <button key={t} onClick={() => toggleSize(t)}
                  style={{ padding: "9px 16px", borderRadius: 99, border: `2px solid ${checked ? "#1a1410" : "rgba(0,0,0,0.12)"}`, background: checked ? "#1a1410" : "#fff", color: checked ? "#c49a4a" : "rgba(26,20,16,0.5)", fontWeight: 800, fontSize: 14, cursor: "pointer", transition: "all 0.15s" }}>
                  {checked ? "✓ " : ""}{t}
                </button>
              );
            })}
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>Ajouter une taille personnalisée</label>
            <div style={{ display: "flex", gap: 10 }}>
              <input type="text" value={customTaille}
                onChange={e => setCustomTaille(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomTaille(); } }}
                placeholder="Ex : 6-9 mois, 4 ans, XS, 50 cm..."
                style={{ ...IS, flex: 1 }} />
              <button onClick={addCustomTaille}
                style={{ padding: "12px 20px", borderRadius: 10, background: "#1a1410", color: "#f2ede6", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                + Ajouter
              </button>
            </div>
            <div style={{ fontSize: 11, color: "rgba(26,20,16,0.4)" }}>
              Appuie sur Entrée ou clique "+ Ajouter" pour créer n'importe quelle taille
            </div>
          </div>

          {sizes.length > 0 && (
            <div style={{ display: "grid", gap: 10 }}>
              <label style={LS}>Stock par taille</label>
              {sizes.map(t => {
                const stockVal = parseInt(sizesStock[t] ?? "0") || 0;
                const isSuggested = TAILLES_SUGGESTIONS.includes(t);
                return (
                  <div key={t} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12, alignItems: "center", padding: "14px 18px", borderRadius: 12, background: "#f5f0e8", border: "2px solid #1a1410" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 900, fontSize: 15, color: "#1a1410" }}>{t}</span>
                      {!isSuggested && (
                        <span style={{ fontSize: 10, fontWeight: 800, background: "rgba(196,154,74,0.2)", color: "#c49a4a", padding: "2px 7px", borderRadius: 99 }}>
                          personnalisée
                        </span>
                      )}
                    </div>
                    <div style={{ width: 100, height: 6, background: "rgba(0,0,0,0.08)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 99, background: stockVal === 0 ? "#9ca3af" : stockVal <= 5 ? "#f59e0b" : "#c49a4a", width: `${Math.min(100, (stockVal / 100) * 100)}%`, transition: "width 0.3s" }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(26,20,16,0.4)" }}>Stock :</span>
                      <input type="number" min="0" value={sizesStock[t] ?? "0"}
                        onChange={e => setSizeStock(t, e.target.value)}
                        style={{ width: 72, padding: "8px 10px", borderRadius: 8, border: "2px solid rgba(0,0,0,0.1)", fontSize: 16, fontWeight: 900, textAlign: "center", outline: "none", background: "#fff" }} />
                    </div>
                    <button onClick={() => removeSize(t)}
                      style={{ padding: "8px 10px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer" }}>
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {totalFromSizes !== null && (
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "#dcfce7", border: "1px solid #86efac", fontSize: 14, fontWeight: 700, color: "#166534" }}>
              Stock total tailles : <strong>{totalFromSizes} unités</strong>
              <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginLeft: 8 }}>
                ({sizes.map(t => `${t}: ${sizesStock[t] ?? 0}`).join(" · ")})
              </span>
            </div>
          )}
        </div>

        {/* ── 4. COULEURS / MOTIFS ── */}
        <div style={SECTION}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410", marginBottom: 4 }}>Couleurs & motifs</div>
              <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)", lineHeight: 1.6, maxWidth: 420 }}>
                Ajoute une couleur ou un motif. Clique sur la pastille pour uploader l'image du motif coloré.
              </div>
            </div>
            <button onClick={addColor}
              style={{ padding: "10px 18px", borderRadius: 10, background: "#1a1410", color: "#f2ede6", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
              + Ajouter une couleur
            </button>
          </div>

          {colors.length === 0 ? (
            <div style={{ padding: "20px 24px", borderRadius: 12, background: "#f5f0e8", textAlign: "center", fontSize: 14, color: "rgba(26,20,16,0.5)" }}>
              Aucune couleur définie — le stock global sera utilisé
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {colors.map((c, i) => (
                <ColorEntryRow key={i} color={c} index={i} onUpdate={updateColor} onRemove={removeColor} />
              ))}
            </div>
          )}

          {colors.length > 0 && (
            <div style={{ padding: "16px 18px", borderRadius: 12, background: "#fafafa", border: "1px solid rgba(0,0,0,0.07)" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", marginBottom: 12 }}>
                Aperçu pastilles (affichage fiche produit)
              </div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {colors.map((c, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 99, overflow: "hidden", border: "2px solid rgba(0,0,0,0.12)", background: c.hex }}>
                      {c.image_url && (
                        <img src={c.image_url} alt={c.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(26,20,16,0.5)", maxWidth: 54, textAlign: "center", lineHeight: 1.3, wordBreak: "break-word" }}>
                      {c.name || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalFromColors !== null && (
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "#dcfce7", border: "1px solid #86efac", fontSize: 14, fontWeight: 700, color: "#166534" }}>
              Stock couleurs : <strong>{totalFromColors} unités</strong>
            </div>
          )}
        </div>

        {/* ── 5. PROMO ── */}
        <div style={{ padding: 24, borderRadius: 16, background: "#fffbeb", border: `2px solid ${hasPromo ? "#f59e0b" : "#fde68a"}`, display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410" }}>
                Prix promotionnel
                {hasPromo && <span style={{ marginLeft: 10, padding: "3px 10px", borderRadius: 99, background: "#f59e0b", color: "#fff", fontSize: 12, fontWeight: 800 }}>ACTIVE</span>}
              </div>
              <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)", marginTop: 4 }}>S'applique automatiquement entre les dates</div>
            </div>
            {hasPromo && (
              <button onClick={() => setForm(f => ({ ...f, promo_price: "", promo_start: "", promo_end: "" }))}
                style={{ padding: "9px 18px", borderRadius: 10, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer" }}>
                Supprimer la promo
              </button>
            )}
          </div>
          <Field label="Prix promo (€)" fieldKey="promo_price" type="number" placeholder="24.90" value={form.promo_price} onChange={set} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Début" fieldKey="promo_start" type="date" value={form.promo_start} onChange={set} />
            <Field label="Fin"   fieldKey="promo_end"   type="date" value={form.promo_end}   onChange={set} />
          </div>
        </div>

        {/* ── 6. CONTENU FICHE PRODUIT ── */}
        <div style={{ ...SECTION, border: "2px solid rgba(196,154,74,0.25)", background: "#fffdf8" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410", marginBottom: 4 }}>
              🎨 Contenu de la fiche produit
            </div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.55)", lineHeight: 1.6 }}>
              Crée et ordonne les blocs qui s'afficheront sur la fiche produit. Chaque bloc a son propre style sur le site.
              <br />Ces données remplacent le contenu généré automatiquement depuis la catégorie/slug.
            </div>
          </div>

          {ficheCards.length === 0 ? (
            <div style={{ padding: "20px 24px", borderRadius: 12, background: "#f5f0e8", textAlign: "center", fontSize: 14, color: "rgba(26,20,16,0.5)" }}>
              Aucun bloc défini — la fiche affichera le contenu par défaut selon la catégorie
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {ficheCards.map((card, idx) => (
                <FicheCardEditor
                  key={card.id}
                  card={card}
                  onUpdate={updateCard}
                  onRemove={removeCard}
                  onMoveUp={(id) => moveCard(id, "up")}
                  onMoveDown={(id) => moveCard(id, "down")}
                  isFirst={idx === 0}
                  isLast={idx === ficheCards.length - 1}
                />
              ))}
            </div>
          )}

          {/* Ajout de blocs */}
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ ...LS, color: "rgba(196,154,74,0.8)" }}>Ajouter un bloc</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CARD_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => addCard(t.value)}
                  title={t.desc}
                  style={{ padding: "9px 14px", borderRadius: 99, border: "2px dashed rgba(196,154,74,0.4)", background: "rgba(196,154,74,0.05)", color: "#c49a4a", fontWeight: 800, fontSize: 13, cursor: "pointer", transition: "all 0.15s" }}>
                  + {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── 7. FAQ ── */}
        <div style={{ ...SECTION, border: "2px solid rgba(26,20,16,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410", marginBottom: 4 }}>
                ❓ FAQ — Questions fréquentes
              </div>
              <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)", lineHeight: 1.6 }}>
                Ajoute les questions/réponses spécifiques à ce produit. Elles s'afficheront dans l'accordéon FAQ de la fiche.
              </div>
            </div>
            <button type="button" onClick={addFaq}
              style={{ padding: "10px 18px", borderRadius: 10, background: "#1a1410", color: "#f2ede6", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
              + Ajouter une question
            </button>
          </div>

          {faqs.length === 0 ? (
            <div style={{ padding: "20px 24px", borderRadius: 12, background: "#f5f0e8", textAlign: "center", fontSize: 14, color: "rgba(26,20,16,0.5)" }}>
              Aucune FAQ — les questions par défaut selon la catégorie seront utilisées
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {faqs.map((faq, idx) => (
                <FaqEditor
                  key={faq.id}
                  faq={faq}
                  onUpdate={updateFaq}
                  onRemove={removeFaq}
                  onMoveUp={(id) => moveFaq(id, "up")}
                  onMoveDown={(id) => moveFaq(id, "down")}
                  isFirst={idx === 0}
                  isLast={idx === faqs.length - 1}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── 8. SEO ── */}
        <div style={SECTION}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1410", marginBottom: 4 }}>SEO — Référencement Google</div>
            <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)" }}>Optionnel — si vide, le nom et la description sont utilisés</div>
          </div>
          <Field label="Titre SEO" fieldKey="seo_title"
            placeholder="Ex : Pyjama bambou nourrisson motif éclair — M!LK"
            value={form.seo_title} onChange={set}
            hint={`${form.seo_title.length}/60 caractères`} />
          <div style={{ display: "grid", gap: 6 }}>
            <label style={LS}>Description SEO</label>
            <textarea value={form.seo_description} onChange={e => set("seo_description", e.target.value)}
              placeholder="Ex : Pyjama nourrisson en bambou certifié OEKO-TEX..."
              rows={2} style={{ ...IS, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
            <div style={{ fontSize: 11, color: "rgba(26,20,16,0.4)" }}>{form.seo_description.length}/155 caractères</div>
          </div>
          {(form.seo_title || form.name) && (
            <div style={{ padding: 16, borderRadius: 12, background: "#f8f9fa", border: "1px solid rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(0,0,0,0.35)", marginBottom: 8 }}>Aperçu Google</div>
              <div style={{ fontSize: 14, color: "#1a0dab", fontWeight: 600, marginBottom: 2 }}>{form.seo_title || form.name} | M!LK</div>
              <div style={{ fontSize: 12, color: "#006621", marginBottom: 4 }}>milkbebe.fr › produits › {form.slug || "..."}</div>
              <div style={{ fontSize: 13, color: "#545454", lineHeight: 1.5 }}>{form.seo_description || form.description || "Aucune description."}</div>
            </div>
          )}
        </div>

        {/* Messages */}
        {error   && <div style={{ padding: "14px 18px", borderRadius: 12, background: "#fee2e2", color: "#b91c1c", fontSize: 15, fontWeight: 700 }}>❌ {error}</div>}
        {success && <div style={{ padding: "14px 18px", borderRadius: 12, background: "#dcfce7", color: "#166534", fontSize: 15, fontWeight: 700 }}>{success}</div>}

        {/* Auto-save indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(26,20,16,0.35)", fontWeight: 600 }}>
          <div style={{ width: 6, height: 6, borderRadius: 99, background: autoSaved ? "#22c55e" : "rgba(26,20,16,0.2)", transition: "background 0.3s", flexShrink: 0 }} />
          {autoSaved
            ? "Brouillon sauvegardé automatiquement"
            : lastSaved
              ? `Dernier enregistrement : ${lastSaved.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
              : "Modifications non enregistrées"}
        </div>

        {/* ── Actions sticky ── */}
        <div style={{ display: "flex", gap: 12, position: "sticky", bottom: 20 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, padding: "16px", borderRadius: 14, background: "#1a1410", color: "#c49a4a", fontWeight: 900, fontSize: 16, border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
            {saving ? "Enregistrement..." : isNew ? "✅ Créer le produit" : "✅ Enregistrer les modifications"}
          </button>
          {!isNew && (
            <button onClick={handleDelete}
              style={{ padding: "16px 22px", borderRadius: 14, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer" }}>
              🗑 Supprimer
            </button>
          )}
        </div>

      </div>
    </div>
  );
}