"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

// Helper inline — lit le token Supabase depuis localStorage
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


// ═══════════════════════════════════════════════════════════════════
// Contenu hardcodé par catégorie/slug — utilisé pour pré-remplir
// l'admin quand fiche_cards est vide en base
// ═══════════════════════════════════════════════════════════════════
function HC_subtitle(cat: string, slug: string): string {
  if (slug.includes("bonnet"))   return "La vraie alternative au bonnet d\'hôpital qu\'on oublie dès la sortie.";
  if (slug.includes("lange"))    return "Le sommeil avant le style.";
  if (cat === "pyjamas")         return "Double zip + moufles intégrées = fin des batailles quotidiennes.";
  if (cat === "bodies")          return "Habillage en deux gestes. Mains protégées. Sans accessoires.";
  if (cat === "gigoteuses")      return "Change express. Zéro boutons. Zéro galère à 3h du matin.";
  return "";
}
function HC_features(cat: string, slug: string): string[] {
  if (slug.includes("bonnet")) return ["Ultra doux dès le premier contact","Respirant : idéal pour réguler la température","Respectueux des peaux sensibles","Coupe minimaliste : maintien parfait sans comprimer","Tailles disponibles : Naissance à 6 mois"];
  if (slug.includes("lange"))  return ["Taille XXL (120×120 cm) : assez grand pour un emmaillotage qui tient vraiment","Bambou respirant : régule la température, pas de surchauffe","Reproduit la pression du ventre maternel : effet calmant immédiat","Tissu avec grip : reste en place même quand bébé se débat","Devient plus doux à chaque lavage","Multi-usage : swaddle, couverture, drap d\'allaitement, protection poussette"];
  if (cat === "bodies")       return ["Col enveloppe élargi : passe sur la tête sans forcer, zéro pression sur la fontanelle","3 pressions seulement : pas 7, pas 12. Juste 3.","Moufles pliables intégrées : tu replies, tu déplies. Toujours là.","Bambou hypoallergénique : zéro irritation, même sur peau atopique","Extensible 4 sens : suit tous les mouvements, ne comprime pas","Coutures plates : zéro frottement, zéro marques"];
  if (cat === "pyjamas")      return ["Double zip inversé : change par le bas, habille par le haut","Zéro bouton : rien à aligner, rien à rater. Jamais.","Pieds pliables : chauds quand il faut, libres quand c\'est mieux","Moufles pliables intégrées : tu replies, tu déplies. Fini les moufles perdues.","Bambou stretch 95% : suit tous les mouvements sans tirer","Silencieux : zéro scratch, zéro bruit qui réveille"];
  if (cat === "gigoteuses")   return ["Bas nouable : ouvre/ferme d\'une main, sans regarder, dans le noir","Zéro bouton, zéro zip : rien à aligner, rien à coincer","Moufles pliables intégrées : tu replies, tu déplies. Toujours là.","Bambou ultra-souple : glisse sans frotter, ne réveille pas","Coupe ample : bébé bouge librement, zéro compression","Thermorégulant : chaud sans surchauffer. Été comme hiver."];
  return [];
}
function HC_why(cat: string, slug: string): string {
  if (slug.includes("bonnet"))  return "Premier contact avec la tête fragile de votre nouveau-né, ce bonnet a été pensé pour être aussi doux que rassurant. Confectionné en bambou, il est naturellement respirant, souple et adapté aux peaux les plus sensibles. Il garde la chaleur sans jamais étouffer, exactement ce qu\'il faut dans les premières heures de vie.";
  if (slug.includes("lange"))   return "Ton bébé sursaute, se réveille, pleure. Le réflexe de Moro le tire du sommeil toutes les 20 minutes. Tu as essayé d\'emmailloter avec une couverture classique — ça se défait au premier mouvement. Les swaddles à velcro ? Bruyants. Trop serrés. Ou pas assez. Ce swaddle existe pour une seule raison : calmer ton bébé plus vite et lui permettre de dormir plus longtemps. Et toi avec.";
  if (cat === "bodies")         return "Habiller un nouveau-né, c\'est stressant. La tête est fragile, le cou ne tient pas, il pleure dès que tu approches un vêtement de son visage. Et une fois habillé ? Il se griffe le visage parce que t\'as oublié les moufles. Ce body existe pour simplifier : un col qui glisse sans forcer, des moufles pliables intégrées déjà là, trois pressions et c\'est fini.";
  if (cat === "pyjamas")        return "L\'habillage d\'un bébé peut virer au cauchemar. Il gigote, il pleure, tu t\'énerves. Les boutons-pression ? 15 à aligner pendant qu\'il se débat. Les moufles séparées ? Elles disparaissent toujours au mauvais moment. Résultat : friction, tension, tout le monde finit épuisé. On a conçu ce pyjama pour supprimer le combat : un double zip qui simplifie tout + des moufles pliables intégrées pour éviter les griffures sans jamais avoir à les chercher. Un zip. Deux gestes. C\'est fait.";
  if (cat === "gigoteuses")     return "Tu te lèves pour la 4e fois. Il est 3h du mat\'. T\'as les yeux à moitié fermés. Tu dois changer une couche dans la pénombre sans réveiller complètement le bébé — ni toi-même. Les boutons-pression ? Impossible à aligner. Le zip ? Trop bruyant. Les moufles séparées ? Perdues quelque part dans le lit. Cette gigoteuse à nouer existe pour ça : un vêtement qu\'on ouvre et ferme sans réfléchir, sans regarder, sans bataille.";
  return "";
}
function HC_result(cat: string, slug: string): string {
  if (slug.includes("bonnet"))  return "Sa coupe minimaliste assure un maintien parfait sans comprimer. Votre bébé est au chaud, à l\'aise, sans pression inutile — dès les premières minutes.";
  if (slug.includes("lange"))   return "Bébé calmé en quelques minutes. Réflexe de Moro contenu. Moins de réveils en sursaut. Des plages de sommeil plus longues — pour lui et pour toi. Tu récupères un peu.";
  if (cat === "bodies")         return "Habillage en moins de 30 secondes. Pas de cris. Pas de stress sur la tête fragile. Mains protégées H24 sans accessoire à perdre. Tu passes à autre chose.";
  if (cat === "pyjamas")        return "Habillage en moins d\'une minute. Change de couche sans déshabiller. Zéro friction entre toi et ton bébé. Pas de moufles à retrouver au fond du salon : elles sont intégrées au poignet, prêtes quand tu veux protéger son visage. Les routines deviennent fluides, pas stressantes.";
  if (cat === "gigoteuses")     return "Change de couche en 30 secondes. Bébé reste calme, à moitié endormi. Mains protégées sans accessoire à retrouver. Tu retournes te coucher plus vite. Les réveils sont écourtés. Les nuits deviennent un peu moins chaotiques.";
  return "";
}
function HC_philosophy(cat: string, slug: string): string {
  if (cat === "pyjamas")    return "Les pyjamas à boutons ? Combat garanti à chaque change. Les combinaisons sans zip inversé ? Tu dois tout défaire pour une couche. Les moufles séparées ? Elles se perdent, tombent, disparaissent quand bébé en a le plus besoin. Ici : double zip inversé + bambou stretch + moufles pliables intégrées = moins de gestes, moins de lutte, moins d\'objets à gérer.";
  if (cat === "bodies")     return "Les bodies à col rond ? Bataille pour passer la tête, bébé hurle. Les bodies à boutons sur l\'épaule ? 6 pressions à aligner. Les moufles séparées ? Perdues en 24h. Le body express combine col facile + pressions minimum + moufles pliables intégrées.";
  if (cat === "gigoteuses") return "Les grenouillères à boutons ? 12 pressions à aligner dans le noir — t\'abandonnes au 3e essai. Les pyjamas zip ? Le bruit réveille le bébé. Les gigoteuses classiques ? Pas d\'accès direct à la couche. Les moufles séparées ? Perdues dans le lit à 3h du mat\'. La gigoteuse à nouer résout tout : accès immédiat, fermeture silencieuse, zéro manipulation complexe.";
  if (slug.includes("lange"))   return "Les swaddles à velcro ? Le scratch réveille le bébé quand tu l\'ouvres. Les couvertures classiques ? Trop petites, se défont. Les gigoteuses ? Pas adaptées aux nouveau-nés qui ont besoin de contention. La mousseline grand format offre le meilleur compromis : maintien efficace, ouverture silencieuse, respiration optimale.";
  return "";
}
function HC_entretien(slug: string): string[] {
  if (slug.includes("bonnet")) return ["Lavage en cycle délicat avec des couleurs similaires","Séchage à plat ou sur cintre","Éviter le sèche-linge pour préserver la matière"];
  return ["Lavage 40°C, cycle délicat","Sans adoucissant ni javel","Séchage à l\'air libre recommandé","Sèche-linge basse température"];
}
function HC_faqs(cat: string, slug: string): Array<{question:string;reponse:string}> {
  const base = [
    { question: "Pourquoi le bambou plutôt que le coton ?", reponse: "Parce qu\'il est plus doux, plus respirant et thermorégulateur. Il absorbe mieux l\'humidité, reste confortable dans le temps et garde sa qualité lavage après lavage." },
    { question: "Ça taille comment ?", reponse: "Coupe ajustée avec tissu stretch qui accompagne les mouvements. Si tu hésites entre deux tailles, prends la plus grande pour prolonger l\'usage.\n\nLe bambou stretch est extrêmement extensible — pas de risque de trop petit ou trop grand. En cas de doute, prenez la taille au-dessus." },
    { question: "Jusqu\'à quel âge ?", reponse: "Les produits M!LK sont actuellement conçus pour les bébés de la naissance jusqu\'à 6 mois. La gamme évoluera progressivement pour accompagner les étapes suivantes." },
  ];
  if (cat === "pyjamas") return [
    { question: "C\'est quoi le double zip inversé ?", reponse: "Un système d\'ouverture à double sens : par le bas pour changer la couche sans déshabiller bébé, par le haut pour l\'habiller rapidement. Moins de manipulation, moins de stress, surtout la nuit." },
    { question: "Les moufles pliables, ça sert à quoi ?", reponse: "À éviter les griffures sans gérer des moufles séparées que tu perds en permanence. Elles sont intégrées : tu replies, tu déplies, elles sont toujours là." },
    { question: "Mon bébé déteste être habillé. Ça change quoi ?", reponse: "Moins de gestes, moins de contraintes. Pas de boutons à aligner, pas de lutte inutile. Résultat : un habillage plus rapide, plus fluide, et un bébé moins irrité." },
    ...base,
  ];
  if (cat === "bodies") return [
    { question: "Le col enveloppe, ça passe vraiment sans forcer ?", reponse: "Oui — et surtout, il ne se passe pas par la tête. Le col enveloppe est conçu pour enfiler le vêtement par le bas, en remontant doucement sur le corps de bébé." },
    { question: "Les moufles pliables, ça sert à quoi ?", reponse: "À éviter les griffures sans gérer des moufles séparées que tu perds en permanence. Elles sont intégrées : tu replies, tu déplies, elles sont toujours là." },
    ...base,
  ];
  if (cat === "gigoteuses") return [
    { question: "C\'est quoi une gigoteuse à nouer ?", reponse: "Une fermeture simple par nœud, sans zip ni boutons. Tu défais, tu changes, tu renoues. Rapide, même dans le noir." },
    { question: "Les moufles pliables, ça sert à quoi ?", reponse: "À éviter les griffures sans gérer des moufles séparées. Elles sont intégrées : tu replies, tu déplies, elles sont toujours là." },
    ...base,
  ];
  if (slug.includes("lange")) return [
    { question: "L\'emmaillotage, ça sert à quoi ?", reponse: "À calmer et sécuriser bébé en recréant une sensation proche du ventre maternel. Résultat : moins de sursauts, un endormissement plus facile, et un sommeil plus stable." },
    { question: "Ça aide vraiment à calmer bébé ?", reponse: "Oui. La pression douce reproduit la sensation du ventre maternel. Le bambou amplifie cet effet grâce à sa souplesse." },
    ...base,
  ];
  return base;
}

// Pré-remplit les cards depuis le contenu hardcodé
function buildDefaultCards(cat: string, slug: string, withId: () => string): FicheCard[] {
  const cards: any[] = [];
  const sub = HC_subtitle(cat, slug);
  if (sub) cards.push({ id: withId(), type: "subtitle", title: "Phrase d\'accroche", content: sub });
  const feats = HC_features(cat, slug);
  if (feats.length) cards.push({ id: withId(), type: "features", title: "Points forts", content: JSON.stringify(feats) });
  const why = HC_why(cat, slug);
  const res = HC_result(cat, slug);
  if (why) cards.push({ id: withId(), type: "whyresult", title: "Pourquoi / Résultat", content: JSON.stringify({ why, result: res }) });
  const philo = HC_philosophy(cat, slug);
  if (philo) cards.push({ id: withId(), type: "philosophy", title: "Philosophie M!LK", content: philo });
  const entr = HC_entretien(slug);
  cards.push({ id: withId(), type: "entretien", title: "Conseils d\'entretien", content: JSON.stringify(entr) });
  return cards;
}
function buildDefaultFaqs(cat: string, slug: string, withId: () => string) {
  return HC_faqs(cat, slug).map(f => ({ id: withId(), question: f.question, reponse: f.reponse }));
}

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
      const res  = await adminFetch("/api/admin/upload", { method: "POST", body: fd });
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
      const res  = await adminFetch("/api/admin/upload", { method: "POST", body: fd });
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

const CARD_TYPES: { value: FicheCard["type"]; label: string; desc: string; icon: string; preview: string }[] = [
  { value: "subtitle",    label: "Phrase d'accroche",       icon: "💬", desc: "La phrase en gras sous le nom du produit",                  preview: "Double zip + moufles intégrées = fin des batailles quotidiennes." },
  { value: "features",    label: "Points forts ✓",          icon: "✅", desc: "La card avec les checkmarks ambrés",                        preview: "Double zip inversé : change par le bas \nZéro bouton : rien à aligner…" },
  { value: "motif",       label: "Info motif / coloris",    icon: "🎨", desc: "La ligne 'Motif Flash — éclairs blancs…' sous les points forts", preview: "Motif Flash — éclairs blancs minimalistes sur fond gris anthracite." },
  { value: "whyresult",   label: "Pourquoi + Résultat",     icon: "💡", desc: "2 cards : 'La vraie raison' + 'Ce que tu obtiens'",          preview: "Pourquoi : L'habillage d'un bébé peut virer… / Résultat : Habillage en moins d'une minute…" },
  { value: "philosophy",  label: "Philosophie M!LK",        icon: "🧠", desc: "La grande card sombre avec les Q/R et la conclusion en gras", preview: "Les pyjamas à boutons ? Combat garanti… / Ici : double zip…" },
  { value: "description", label: "Description libre",       icon: "📝", desc: "Paragraphe de texte libre (bonnet, lange, etc.)",             preview: "Premier contact avec la tête fragile de votre nouveau-né…" },
  { value: "coloris",     label: "Info coloris texte",      icon: "🌈", desc: "Texte coloris pour produits sans variante de motif",         preview: "Terre cuite — brun chaud aux nuances naturelles, à la fois doux et affirmé." },
  { value: "entretien",   label: "Conseils d'entretien",    icon: "🧺", desc: "Instructions de lavage affichées sous le bouton panier",     preview: "Lavage 40°C, cycle délicat \nSans adoucissant ni javel…" },
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

  let featuresArr: string[] = [];
  if (card.type === "features") { try { featuresArr = JSON.parse(card.content); } catch { featuresArr = []; } }
  let wrObj = { why: "", result: "" };
  if (card.type === "whyresult") { try { wrObj = JSON.parse(card.content); } catch {} }
  let entretienArr: string[] = [];
  if (card.type === "entretien") { try { entretienArr = JSON.parse(card.content); } catch { entretienArr = []; } }

  function updateFeature(idx: number, val: string) { const a = [...featuresArr]; a[idx] = val; onUpdate(card.id, "content", JSON.stringify(a)); }
  function addFeature() { onUpdate(card.id, "content", JSON.stringify([...featuresArr, ""])); }
  function removeFeature(idx: number) { onUpdate(card.id, "content", JSON.stringify(featuresArr.filter((_, i) => i !== idx))); }
  function updateWR(field: "why"|"result", val: string) { onUpdate(card.id, "content", JSON.stringify({ ...wrObj, [field]: val })); }
  function updateEntretienLine(idx: number, val: string) { const a = [...entretienArr]; a[idx] = val; onUpdate(card.id, "content", JSON.stringify(a)); }
  function addEntretienLine() { onUpdate(card.id, "content", JSON.stringify([...entretienArr, ""])); }
  function removeEntretienLine(idx: number) { onUpdate(card.id, "content", JSON.stringify(entretienArr.filter((_, i) => i !== idx))); }

  return (
    <div style={{ borderRadius: 16, border: `2px solid ${open ? "#c49a4a" : "rgba(196,154,74,0.25)"}`, overflow: "hidden", background: "#fffdf9", marginBottom: 0 }}>

      {/* ── Header accordéon ── */}
      <div onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: open ? "rgba(196,154,74,0.1)" : "#faf8f4", cursor: "pointer", userSelect: "none" }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, border: "none", background: open ? "#c49a4a" : "rgba(196,154,74,0.15)", display: "grid", placeItems: "center", flexShrink: 0, transition: "all 0.2s" }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
            <path d="M2 4l4 4 4-4" stroke={open ? "#fff" : "#c49a4a"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 14, color: "#1a1410", display: "flex", alignItems: "center", gap: 6 }}>
            <span>{typeDef?.icon}</span>
            <span>{typeDef?.label ?? card.type}</span>
            {card.content && card.content !== "[]" && card.content !== '{"why":"","result":""}' && (
              <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 99, background: "rgba(22,163,74,0.12)", color: "#16a34a" }}>✓ rempli</span>
            )}
          </div>
          {!open && card.content && card.type === "subtitle" && (
            <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.content}</div>
          )}
          {!open && card.type === "features" && featuresArr.length > 0 && (
            <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", marginTop: 2 }}>{featuresArr.length} point{featuresArr.length > 1 ? "s" : ""} — {featuresArr[0]?.split(" : ")[0]}{featuresArr.length > 1 ? "…" : ""}</div>
          )}
          {!open && card.type === "whyresult" && wrObj.why && (
            <div style={{ fontSize: 12, color: "rgba(26,20,16,0.4)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wrObj.why.slice(0, 60)}…</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
          <button type="button" onClick={() => onMoveUp(card.id)} disabled={isFirst}
            style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", cursor: isFirst ? "not-allowed" : "pointer", opacity: isFirst ? 0.3 : 1, fontSize: 12 }}>↑</button>
          <button type="button" onClick={() => onMoveDown(card.id)} disabled={isLast}
            style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", cursor: isLast ? "not-allowed" : "pointer", opacity: isLast ? 0.3 : 1, fontSize: 12 }}>↓</button>
          <button type="button" onClick={() => onRemove(card.id)}
            style={{ padding: "5px 8px", borderRadius: 6, border: "none", background: "#fee2e2", color: "#b91c1c", cursor: "pointer", fontSize: 12, fontWeight: 800 }}>✕</button>
        </div>
      </div>

      {/* ── Corps accordéon ouvert — layout 2 colonnes : édition + aperçu ── */}
      {open && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", borderTop: "1px solid rgba(196,154,74,0.15)" }}>

          {/* COLONNE GAUCHE — édition */}
          <div style={{ padding: "16px 18px 20px", display: "grid", gap: 12, borderRight: "1px solid rgba(196,154,74,0.15)" }}>

            {/* Subtitle / Description / Coloris / Motif / Philosophie */}
            {(card.type === "subtitle" || card.type === "description" || card.type === "coloris" || card.type === "motif" || card.type === "philosophy") && (
              <>
                {card.type === "subtitle" && <div style={{ fontSize: 11, color: "rgba(26,20,16,0.5)", background: "#f5f0e8", padding: "6px 10px", borderRadius: 8 }}>Phrase en gras juste sous le nom du produit</div>}
                {card.type === "motif"    && <div style={{ fontSize: 11, color: "rgba(26,20,16,0.5)", background: "#f5f0e8", padding: "6px 10px", borderRadius: 8 }}>Format : Motif [Nom] — [description]</div>}
                {card.type === "coloris"  && <div style={{ fontSize: 11, color: "rgba(26,20,16,0.5)", background: "#f5f0e8", padding: "6px 10px", borderRadius: 8 }}>Ex : Terre cuite — brun chaud aux nuances naturelles</div>}
                {card.type === "philosophy" && <div style={{ fontSize: 11, color: "rgba(26,20,16,0.5)", background: "#f5f0e8", padding: "6px 10px", borderRadius: 8, lineHeight: 1.5 }}>Phrases avec "?" = mises en valeur · "Ici :" = bloc encadré · La conclusion finale s'affiche auto.</div>}
                <label style={LS}>{typeDef?.label}</label>
                <textarea value={card.content} onChange={e => onUpdate(card.id, "content", e.target.value)}
                  rows={card.type === "philosophy" ? 9 : card.type === "description" ? 4 : 2}
                  style={{ ...IS, resize: "vertical", fontFamily: "inherit", lineHeight: 1.65 }} />
              </>
            )}

            {/* Features */}
            {card.type === "features" && (
              <>
                <div style={{ fontSize: 11, color: "rgba(26,20,16,0.5)", background: "#f5f0e8", padding: "6px 10px", borderRadius: 8 }}>Format : <strong>Titre</strong> : description · Ex : "Double zip inversé : change par le bas"</div>
                <label style={LS}>Points forts ({featuresArr.length})</label>
                {featuresArr.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#c49a4a", flexShrink: 0, width: 18, textAlign: "right" }}>{i+1}</span>
                    <input value={f} onChange={e => updateFeature(i, e.target.value)}
                      placeholder="Double zip inversé : change par le bas"
                      style={{ ...IS, flex: 1 }} />
                    <button type="button" onClick={() => removeFeature(i)}
                      style={{ padding: "0 10px", height: 38, borderRadius: 8, background: "#fee2e2", color: "#b91c1c", border: "none", cursor: "pointer", fontWeight: 800, flexShrink: 0 }}>✕</button>
                  </div>
                ))}
                <button type="button" onClick={addFeature}
                  style={{ padding: "9px", borderRadius: 8, border: "2px dashed rgba(196,154,74,0.4)", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "#c49a4a" }}>
                  + Ajouter un point
                </button>
              </>
            )}

            {/* WhyResult */}
            {card.type === "whyresult" && (
              <>
                <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(26,20,16,0.06)", borderLeft: "3px solid #c49a4a" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#c49a4a" }}>Card 1 — "La vraie raison / Pourquoi ce produit existe"</div>
                </div>
                <label style={LS}>Le problème du parent</label>
                <textarea value={wrObj.why} onChange={e => updateWR("why", e.target.value)}
                  rows={5} style={{ ...IS, resize: "vertical", fontFamily: "inherit", lineHeight: 1.7 }} />
                <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(196,154,74,0.08)", borderLeft: "3px solid #c49a4a", marginTop: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#c49a4a" }}>Card 2 — "Ce que tu obtiens / Le résultat"</div>
                </div>
                <label style={LS}>Le résultat concret</label>
                <textarea value={wrObj.result} onChange={e => updateWR("result", e.target.value)}
                  rows={3} style={{ ...IS, resize: "vertical", fontFamily: "inherit", lineHeight: 1.7 }} />
              </>
            )}

            {/* Entretien */}
            {card.type === "entretien" && (
              <>
                <label style={LS}>Instructions — une par ligne</label>
                {entretienArr.map((line, i) => (
                  <div key={i} style={{ display: "flex", gap: 8 }}>
                    <input value={line} onChange={e => updateEntretienLine(i, e.target.value)}
                      placeholder="Ex : Lavage 40°C, cycle délicat"
                      style={{ ...IS, flex: 1 }} />
                    <button type="button" onClick={() => removeEntretienLine(i)}
                      style={{ padding: "0 10px", height: 38, borderRadius: 8, background: "#fee2e2", color: "#b91c1c", border: "none", cursor: "pointer", fontWeight: 800 }}>✕</button>
                  </div>
                ))}
                <button type="button" onClick={addEntretienLine}
                  style={{ padding: "9px", borderRadius: 8, border: "2px dashed rgba(196,154,74,0.4)", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "#c49a4a" }}>
                  + Ajouter
                </button>
              </>
            )}
          </div>

          {/* COLONNE DROITE — aperçu de cette card exacte */}
          <div style={{ padding: "14px 14px", background: "#d8c8b0", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "rgba(26,20,16,0.4)" }}>Aperçu sur la fiche</div>

            {/* Subtitle */}
            {card.type === "subtitle" && card.content && (
              <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(26,20,16,0.75)", lineHeight: 1.5 }}>{card.content}</div>
            )}

            {/* Description */}
            {card.type === "description" && card.content && (
              <div style={{ fontSize: 12, color: "rgba(26,20,16,0.6)", lineHeight: 1.75 }}>{card.content}</div>
            )}

            {/* Coloris / Motif */}
            {(card.type === "coloris" || card.type === "motif") && card.content && (
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1410" }}>
                <span style={{ color: "#c49a4a", fontWeight: 900 }}>{card.type === "motif" ? "Motif" : "Coloris"}</span> — {card.content}
              </div>
            )}

            {/* Features */}
            {card.type === "features" && featuresArr.filter(Boolean).length > 0 && (
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(26,20,16,0.06)", border: "1px solid rgba(26,20,16,0.1)", display: "grid", gap: 8 }}>
                {featuresArr.filter(Boolean).map((feat, i) => {
                  const colonIdx = feat.indexOf(" : ");
                  const label = colonIdx > -1 ? feat.slice(0, colonIdx) : feat;
                  const desc  = colonIdx > -1 ? feat.slice(colonIdx + 3) : "";
                  return (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                        <circle cx="7" cy="7" r="6.5" fill="rgba(196,154,74,0.15)" stroke="rgba(196,154,74,0.4)"/>
                        <path d="M4 7l2 2 4-4" stroke="#c49a4a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div style={{ fontSize: 12, lineHeight: 1.4, color: "#1a1410" }}>
                        <strong>{label}</strong>{desc && <span style={{ fontWeight: 400, color: "rgba(26,20,16,0.5)" }}> : {desc}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* WhyResult */}
            {card.type === "whyresult" && (wrObj.why || wrObj.result) && (
              <div style={{ display: "grid", gap: 8 }}>
                {wrObj.why && (
                  <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(26,20,16,0.07)", border: "1px solid rgba(26,20,16,0.1)" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#c49a4a", marginBottom: 5 }}>La vraie raison</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(26,20,16,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Pourquoi ce produit existe</div>
                    <p style={{ margin: 0, fontSize: 11, color: "rgba(26,20,16,0.65)", lineHeight: 1.7 }}>{wrObj.why}</p>
                  </div>
                )}
                {wrObj.result && (
                  <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.2)" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#c49a4a", marginBottom: 5 }}>Ce que tu obtiens</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(26,20,16,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Le résultat</div>
                    <p style={{ margin: 0, fontSize: 11, color: "rgba(26,20,16,0.65)", lineHeight: 1.7, fontWeight: 600 }}>{wrObj.result}</p>
                  </div>
                )}
              </div>
            )}

            {/* Philosophy */}
            {card.type === "philosophy" && card.content && (
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "#2d1a0e" }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#c49a4a", marginBottom: 3 }}>Philosophie M!LK</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(242,237,230,0.3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Comment ça réduit ta charge mentale</div>
                <div style={{ fontSize: 11, color: "rgba(242,237,230,0.7)", lineHeight: 1.7 }}>{card.content}</div>
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(242,237,230,0.08)", fontSize: 11, fontWeight: 900, color: "#f2ede6", lineHeight: 1.5 }}>
                  Chaque produit M!LK répond à un problème réel. Pas de design pour le design. Pas de fonctionnalité inutile. Juste ce qui compte quand t'es épuisé.
                </div>
              </div>
            )}

            {/* Entretien */}
            {card.type === "entretien" && entretienArr.filter(Boolean).length > 0 && (
              <div style={{ display: "grid", gap: 6 }}>
                {entretienArr.filter(Boolean).map((line, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "#1a1410" }}>
                    <span style={{ color: "#c49a4a", fontSize: 16 }}>⬤</span>
                    {line}
                  </div>
                ))}
              </div>
            )}

            {!card.content || card.content === "[]" || card.content === '{"why":"","result":""}' ? (
              <div style={{ fontSize: 11, color: "rgba(26,20,16,0.3)", fontStyle: "italic" }}>Remplis le contenu pour voir l'aperçu</div>
            ) : null}
          </div>
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
  const [showPreview,  setShowPreview]  = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [allProducts,  setAllProducts]  = useState<any[]>([]);
  const [loadingProds, setLoadingProds] = useState(false);

  // Chargement produit existant
  useEffect(() => {
    if (isNew) {
      try { const s = localStorage.getItem(draftKey); if (s) setForm(f => ({ ...f, ...JSON.parse(s) })); } catch {}
      return;
    }
    adminFetch(`/api/admin/products?id=${id}`)
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
          // Charger cards et faqs — ou pré-remplir depuis contenu hardcodé
          const cat  = data.category_slug ?? "";
          const slg  = data.slug          ?? "";
          if (Array.isArray(data.fiche_cards) && data.fiche_cards.length > 0) {
            setFicheCards(data.fiche_cards);
          } else {
            // Pré-remplissage automatique depuis le contenu existant codé en dur
            setFicheCards(buildDefaultCards(cat, slg, newId));
          }
          if (Array.isArray(data.fiche_faqs) && data.fiche_faqs.length > 0) {
            setFaqs(data.fiche_faqs);
          } else {
            setFaqs(buildDefaultFaqs(cat, slg, newId));
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

  // Charger tous les produits pour la duplication
  async function loadAllProducts() {
    setLoadingProds(true);
    const res = await adminFetch("/api/admin/products");
    const data = await res.json();
    setAllProducts(Array.isArray(data) ? data : []);
    setLoadingProds(false);
  }

  // Dupliquer les cards + FAQs d'un produit source vers ce produit
  function duplicateFromProduct(source: any) {
    const cat = source.category_slug ?? "";
    const slg = source.slug ?? "";
    if (Array.isArray(source.fiche_cards) && source.fiche_cards.length > 0) {
      setFicheCards(source.fiche_cards.map((c: any) => ({ ...c, id: newId() })));
    } else {
      // Générer depuis le contenu hardcodé de ce produit
      setFicheCards(buildDefaultCards(cat, slg, newId));
    }
    if (Array.isArray(source.fiche_faqs) && source.fiche_faqs.length > 0) {
      setFaqs(source.fiche_faqs.map((f: any) => ({ ...f, id: newId() })));
    } else {
      setFaqs(buildDefaultFaqs(cat, slg, newId));
    }
    setShowDuplicateModal(false);
  }

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
    const res = await adminFetch("/api/admin/products", {
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

      const res  = await adminFetch("/api/admin/products", {
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
    await adminFetch("/api/admin/products", {
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

  // ── Données aperçu calculées en live ──
  const previewSubtitle  = ficheCards.find(c => c.type === "subtitle")?.content ?? "";
  const previewFeatures: string[] = (() => { try { return JSON.parse(ficheCards.find(c => c.type === "features")?.content ?? "[]"); } catch { return []; } })();
  const previewWR: { why: string; result: string } | null = (() => { try { const wr = JSON.parse(ficheCards.find(c => c.type === "whyresult")?.content ?? "null"); return wr?.why ? wr : null; } catch { return null; } })();
  const previewColoris   = ficheCards.find(c => c.type === "coloris")?.content ?? "";
  const previewDesc      = ficheCards.find(c => c.type === "description")?.content ?? "";
  const previewPhilo     = ficheCards.find(c => c.type === "philosophy")?.content ?? "";
  const priceDisplay     = form.promo_price ? Number(form.promo_price) : Number(form.price_ttc || 0);
  const hasPreviewContent = form.name || previewSubtitle || previewFeatures.length > 0 || previewWR || ficheCards.length > 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: showPreview ? "820px 1fr" : "1fr", gap: 0, minHeight: "100vh", alignItems: "start" }}>
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
        <button onClick={() => { setShowDuplicateModal(true); loadAllProducts(); }}
          style={{ padding: "10px 18px", borderRadius: 10, border: "2px solid rgba(0,0,0,0.12)", background: "#fff", color: "#1a1410", cursor: "pointer", fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 16 }}>📋</span>
          Copier depuis…
        </button>
        <button onClick={() => setShowPreview(v => !v)}
          style={{ padding: "10px 18px", borderRadius: 10, border: `2px solid ${showPreview ? "#c49a4a" : "rgba(0,0,0,0.12)"}`, background: showPreview ? "#1a1410" : "#fff", color: showPreview ? "#c49a4a" : "#1a1410", cursor: "pointer", fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 16 }}>👁</span>
          {showPreview ? "Masquer l'aperçu" : "Aperçu fiche"}
        </button>

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

          {/* Ajout de blocs — visuels avec preview */}
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ ...LS, color: "rgba(196,154,74,0.8)" }}>Ajouter un bloc à la fiche</label>
            <div style={{ display: "grid", gap: 8 }}>
              {CARD_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => addCard(t.value)}
                  style={{ display: "grid", gridTemplateColumns: "36px 1fr auto", gap: 10, alignItems: "center", padding: "12px 14px", borderRadius: 12, border: "1.5px dashed rgba(196,154,74,0.35)", background: "rgba(196,154,74,0.04)", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(196,154,74,0.1)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(196,154,74,0.6)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(196,154,74,0.04)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(196,154,74,0.35)"; }}>
                  <div style={{ fontSize: 20, textAlign: "center" }}>{t.icon}</div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 13, color: "#1a1410", marginBottom: 2 }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: "rgba(26,20,16,0.45)", lineHeight: 1.4 }}>{t.desc}</div>
                  </div>
                  <div style={{ fontSize: 18, color: "#c49a4a", fontWeight: 300, paddingRight: 4 }}>+</div>
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

    {/* ── MODALE DUPLICATION ── */}
    {showDuplicateModal && (
      <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        onClick={e => { if (e.target === e.currentTarget) setShowDuplicateModal(false); }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 560, width: "100%", maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1410" }}>Copier les cards depuis…</div>
              <div style={{ fontSize: 13, color: "rgba(26,20,16,0.5)", marginTop: 3 }}>Les blocs de contenu et FAQs seront copiés. Les photos et prix ne changent pas.</div>
            </div>
            <button onClick={() => setShowDuplicateModal(false)}
              style={{ width: 32, height: 32, borderRadius: 99, background: "#f5f0e8", border: "none", cursor: "pointer", fontSize: 16, display: "grid", placeItems: "center" }}>✕</button>
          </div>
          {loadingProds ? (
            <div style={{ padding: "30px", textAlign: "center", color: "rgba(26,20,16,0.4)" }}>Chargement…</div>
          ) : (
            <div style={{ overflowY: "auto", display: "grid", gap: 8 }}>
              {allProducts.filter(p => p.id !== id).length === 0 && (
                <div style={{ padding: 20, textAlign: "center", color: "rgba(26,20,16,0.4)", fontSize: 14 }}>
                  Aucun produit avec des blocs définis pour l'instant.
                </div>
              )}
              {allProducts
                .filter(p => p.id !== id)
                .map(p => (
                  <button key={p.id} onClick={() => duplicateFromProduct(p)}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14, border: "2px solid rgba(0,0,0,0.08)", background: "#fff", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#c49a4a"; (e.currentTarget as HTMLButtonElement).style.background = "#fffdf8"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,0,0,0.08)"; (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}>
                    {p.image_url && (
                      <div style={{ width: 52, height: 52, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
                        <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, fontSize: 15, color: "#1a1410", marginBottom: 3 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "rgba(26,20,16,0.45)" }}>
                        {Array.isArray(p.fiche_cards) && p.fiche_cards.length > 0
                          ? `${p.fiche_cards.length} bloc${p.fiche_cards.length > 1 ? "s" : ""} sauvegardés`
                          : "Contenu auto (catégorie)"}
                        {p.fiche_faqs?.length > 0 ? ` · ${p.fiche_faqs.length} FAQ` : ""}
                        {" · "}{p.category_slug}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#c49a4a", whiteSpace: "nowrap" }}>Copier →</div>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    )}

    {/* ── PANNEAU APERÇU STICKY ── */}
    {showPreview && (
      <div style={{ position: "sticky", top: 0, height: "100vh", overflowY: "auto", background: "#d8c8b0", borderLeft: "2px solid rgba(26,20,16,0.12)", boxSizing: "border-box", scrollbarWidth: "none" }}>
        {/* Header aperçu */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 14px", borderBottom: "1px solid rgba(26,20,16,0.12)", background: "#c4ae94", position: "sticky", top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#1a1410", marginBottom: 1 }}>Aperçu fiche produit</div>
            <div style={{ fontSize: 11, color: "rgba(26,20,16,0.5)", fontWeight: 600 }}>Temps réel — panneau droit</div>
          </div>
          <button onClick={() => setShowPreview(false)}
            style={{ width: 28, height: 28, borderRadius: 99, background: "rgba(26,20,16,0.1)", border: "none", cursor: "pointer", color: "#1a1410", fontSize: 14, display: "grid", placeItems: "center" }}>
            ✕
          </button>
        </div>

        {!hasPreviewContent ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "rgba(26,20,16,0.3)", fontSize: 13 }}>
            Remplis les champs pour voir l'aperçu
          </div>
        ) : (
          <div style={{ padding: "20px 16px", display: "grid", gap: 16 }}>

            {/* ── Image principale ── */}
            {form.image_url && (
              <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", aspectRatio: "3/4", background: "#c4ae94" }}>
                <img src={form.image_url} alt={form.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}

            {/* ── Catégorie + Nom + Prix ── */}
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#c49a4a" }}>
                {form.category_slug || "catégorie"} · Bambou OEKO-TEX
              </div>
              <div style={{ fontSize: 20, fontWeight: 950, letterSpacing: -0.5, lineHeight: 1.15, color: "#1a1410" }}>
                {form.name || <span style={{ opacity: 0.3 }}>Nom du produit</span>}
              </div>
              {Number(form.price_ttc) > 0 && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontSize: 22, fontWeight: 950, letterSpacing: -1, color: "#1a1410" }}>{priceDisplay.toFixed(2)} €</span>
                  {form.promo_price && <span style={{ fontSize: 14, textDecoration: "line-through", color: "rgba(26,20,16,0.35)", fontWeight: 700 }}>{Number(form.price_ttc).toFixed(2)} €</span>}
                </div>
              )}
            </div>

            {/* ── PHRASE D'ACCROCHE (subtitle) ── */}
            {previewSubtitle && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 4 }}>💬 Phrase d'accroche</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(26,20,16,0.75)", lineHeight: 1.5 }}>{previewSubtitle}</div>
              </div>
            )}

            {/* ── DESCRIPTION ── */}
            {previewDesc && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 4 }}>📝 Description</div>
                <div style={{ fontSize: 12, color: "rgba(26,20,16,0.6)", lineHeight: 1.75 }}>{previewDesc}</div>
              </div>
            )}

            {/* ── POINTS FORTS (features) — card exacte ── */}
            {previewFeatures.filter(Boolean).length > 0 && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 6 }}>✅ Points forts</div>
                <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(26,20,16,0.06)", border: "1px solid rgba(26,20,16,0.1)", display: "grid", gap: 10 }}>
                  {previewFeatures.filter(Boolean).map((feat: string, i: number) => {
                    const colonIdx = feat.indexOf(" : ");
                    const label = colonIdx > -1 ? feat.slice(0, colonIdx) : feat;
                    const desc  = colonIdx > -1 ? feat.slice(colonIdx + 3) : "";
                    return (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(196,154,74,0.15)", border: "1px solid rgba(196,154,74,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                          <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#c49a4a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <div style={{ fontSize: 12, lineHeight: 1.45, color: "#1a1410" }}>
                          <span style={{ fontWeight: 800 }}>{label}</span>
                          {desc && <span style={{ fontWeight: 400, color: "rgba(26,20,16,0.5)" }}> : {desc}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── COLORIS / MOTIF ── */}
            {previewColoris && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 4 }}>🌈 Coloris</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1410" }}><span style={{ color: "#c49a4a", fontWeight: 900 }}>Coloris</span> — {previewColoris}</div>
              </div>
            )}
            {ficheCards.find((c: any) => c.type === "motif")?.content && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 4 }}>🎨 Motif</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1410" }}>{ficheCards.find((c: any) => c.type === "motif")?.content}</div>
              </div>
            )}

            {/* ── TAILLES ── */}
            {sizes.length > 0 && (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(26,20,16,0.4)" }}>Taille</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {sizes.map(t => (
                    <div key={t} style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(26,20,16,0.08)", fontSize: 13, fontWeight: 800, color: "#1a1410" }}>{t}</div>
                  ))}
                </div>
              </div>
            )}

            {/* ── COULEURS ── */}
            {colors.length > 0 && (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(26,20,16,0.4)" }}>Couleur</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {colors.map((c, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 99, border: "2px solid rgba(26,20,16,0.15)", background: c.hex, overflow: "hidden" }}>
                        {c.image_url && <img src={c.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                      </div>
                      <span style={{ fontSize: 10, color: "rgba(26,20,16,0.5)", fontWeight: 700 }}>{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── POURQUOI — card exacte ── */}
            {previewWR?.why && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 6 }}>💡 "La vraie raison"</div>
                <div style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(26,20,16,0.06)", border: "1px solid rgba(26,20,16,0.1)" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 3 }}>La vraie raison</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(26,20,16,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Pourquoi ce produit existe</div>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(26,20,16,0.7)", lineHeight: 1.8 }}>{previewWR.why}</p>
                </div>
              </div>
            )}

            {/* ── RÉSULTAT — card exacte ── */}
            {previewWR?.result && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 6 }}>💡 "Ce que tu obtiens"</div>
                <div style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.2)" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 3 }}>Ce que tu obtiens</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(26,20,16,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Le résultat</div>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(26,20,16,0.7)", lineHeight: 1.8, fontWeight: 600 }}>{previewWR.result}</p>
                </div>
              </div>
            )}

            {/* ── PHILOSOPHIE — card exacte sombre ── */}
            {previewPhilo && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 6 }}>🧠 Philosophie M!LK</div>
                <div style={{ padding: "18px 18px", borderRadius: 18, background: "#2d1a0e", border: "1px solid rgba(196,154,74,0.15)" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 3 }}>Philosophie M!LK</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(242,237,230,0.3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Comment ça réduit ta charge mentale</div>
                  <div style={{ fontSize: 12, color: "rgba(242,237,230,0.7)", lineHeight: 1.7, whiteSpace: "pre-line" }}>{previewPhilo}</div>
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(242,237,230,0.08)", fontSize: 12, fontWeight: 900, color: "#f2ede6", lineHeight: 1.5 }}>
                    Chaque produit M!LK répond à un problème réel. Pas de design pour le design. Pas de fonctionnalité inutile. Juste ce qui compte quand t'es épuisé.
                  </div>
                </div>
              </div>
            )}

            {/* ── FAQ ── */}
            {faqs.filter(f => f.question).length > 0 && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "#c49a4a", marginBottom: 6 }}>❓ FAQ ({faqs.filter(f => f.question).length} questions)</div>
                <div style={{ padding: "14px 16px", borderRadius: 14, background: "#c4ae94", border: "1px solid rgba(26,20,16,0.1)", display: "grid", gap: 0 }}>
                  {faqs.filter(f => f.question).map((faq, i) => (
                    <div key={i} style={{ borderTop: i > 0 ? "1px solid rgba(26,20,16,0.1)" : "none", padding: "10px 0" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#1a1410", marginBottom: 4 }}>{faq.question}</div>
                      <div style={{ fontSize: 11, color: "rgba(26,20,16,0.55)", lineHeight: 1.6 }}>{faq.reponse.slice(0, 100)}{faq.reponse.length > 100 ? "…" : ""}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── CTA simulé ── */}
            <div style={{ padding: "15px", borderRadius: 14, background: "#1a1410", textAlign: "center", fontWeight: 900, fontSize: 14, color: "#f2ede6", marginTop: 4 }}>
              Ajouter — {priceDisplay > 0 ? `${priceDisplay.toFixed(2)} €` : "—"}
            </div>
            <div style={{ padding: "8px", borderRadius: 10, border: "2px solid #1a1410", textAlign: "center", fontWeight: 800, fontSize: 13, color: "#1a1410" }}>
              Voir le panier
            </div>

          </div>
        )}
      </div>
    )}
  </div>
  );
}