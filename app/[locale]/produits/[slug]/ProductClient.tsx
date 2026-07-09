"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale }  from "next-intl";
import { getSizeLabel }                from "@/lib/size-labels";
import Image                           from "next/image";
import { Link } from "@/i18n/navigation";
import { useCart }                     from "@/context/CartContext";
import { useWishlist }                 from "@/context/WishlistContext";
import { Breadcrumb }                  from "@/components/seo/Breadcrumb";
import ProductRecommendations          from "@/components/product/ProductRecommendations";
import ShareButtons                    from "@/components/shared/ShareButtons";
import { trackViewItem, metaViewContent, trackAddToCart, metaAddToCart, metaInitiateCheckout } from "@/lib/analytics";

// ── Palette unifiée ──
const BG    = "#ede8df"; // taupe pastel = fond principal fiche
const TAUPE = "#c4ae94"; // taupe moyen
const AMBER = "#c49a4a";
const DARK  = "#1a1410";
const WARM  = "#f2ede6";
const MARON = "#2d1a0e";

function isPromoActive(p: any) {
  if (!p?.promo_price) return false;
  if (!p.promo_start && !p.promo_end) return true;
  // Date locale (pas UTC) pour éviter le décalage horaire
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const startStr = p.promo_start ? String(p.promo_start).slice(0, 10) : null;
  const endStr   = p.promo_end   ? String(p.promo_end).slice(0, 10)   : null;
  if (startStr && todayStr < startStr) return false;
  if (endStr   && todayStr > endStr)   return false;
  return true;
}
type TFn = ((key: string, values?: Record<string, any>) => string) & { raw: (key: string) => any };

function getMotifDetails(t: TFn, slug: string) {
  if (slug.includes("eclair"))  return { motif: t("m_flash_name"), desc: t("m_flash_desc") };
  if (slug.includes("smileys")) return { motif: t("m_smile_name"), desc: t("m_smile_desc") };
  if (slug.includes("damier"))  return { motif: t("m_check_name"), desc: t("m_check_desc") };
  if (slug.includes("uni"))     return { motif: t("m_uni_name"),   desc: t("m_uni_desc")   };
  return null;
}

function getProductSubtitle(t: TFn, category: string, slug: string): string {
  if (slug.includes("bonnet"))    return t("sub_bonnet");
  if (slug.includes("lange"))     return t("sub_lange");
  if (category === "pyjamas")     return t("sub_pyjamas");
  if (category === "bodies")      return t("sub_bodies");
  if (category === "gigoteuses")  return t("sub_gigoteuses");
  return "";
}

function getProductDesc(t: TFn, slug: string): string {
  if (slug.includes("bonnet")) return t("desc_bonnet");
  return "";
}

function getColoris(t: TFn, slug: string): string | null {
  if (slug.includes("bonnet")) return t("coloris_bonnet");
  return null;
}

function getProductFeatures(t: TFn, category: string, slug: string): string[] {
  if (slug.includes("bonnet")) return t.raw("feat_bonnet");
  if (slug.includes("lange"))  return t.raw("feat_lange");
  if (category === "bodies")     return t.raw("feat_bodies");
  if (category === "pyjamas")    return t.raw("feat_pyjamas");
  if (category === "gigoteuses") return t.raw("feat_gigoteuses");
  return [];
}

function getWhyResult(t: TFn, category: string, slug: string): { why: string; result: string } | null {
  if (slug.includes("bonnet")) return { why: t("why_bonnet"), result: t("res_bonnet") };
  if (slug.includes("lange"))  return { why: t("why_lange"),  result: t("res_lange")  };
  if (category === "bodies")     return { why: t("why_bodies"),     result: t("res_bodies")     };
  if (category === "pyjamas")    return { why: t("why_pyjamas"),    result: t("res_pyjamas")    };
  if (category === "gigoteuses") return { why: t("why_gigoteuses"), result: t("res_gigoteuses") };
  return null;
}

function getPhilosophy(t: TFn, category: string, slug: string): string {
  if (slug.includes("bonnet"))    return t("philo_bonnet");
  if (slug.includes("lange"))     return t("philo_lange");
  if (category === "bodies")      return t("philo_bodies");
  if (category === "pyjamas")     return t("philo_pyjamas");
  if (category === "gigoteuses")  return t("philo_gigoteuses");
  return "";
}

function getProductFAQ(t: TFn, category: string, slug: string): { q: string; r: string }[] {
  if (slug.includes("bonnet")) return [];
  if (category === "pyjamas"    || slug.includes("pyjama"))    return t.raw("faq_pyjamas");
  if (category === "bodies"     || slug.includes("body"))      return t.raw("faq_bodies");
  if (category === "gigoteuses" || slug.includes("gigoteuse")) return t.raw("faq_gigoteuses");
  if (slug.includes("lange"))                                  return t.raw("faq_lange");
  return [];
}

function getProductEntretien(t: TFn, slug: string) {
  if (slug.includes("bonnet")) {
    const txt = t.raw("care_bonnet") as string[];
    return [
      { Icon: IconBan,  text: txt[0] },
      { Icon: IconFlat, text: txt[1] },
      { Icon: IconHeat, text: txt[2] },
    ];
  }
  const txt = t.raw("care_default") as string[];
  return [
    { Icon: IconThermometer, text: txt[0] },
    { Icon: IconBan,         text: txt[1] },
    { Icon: IconFlat,        text: txt[2] },
    { Icon: IconHeat,        text: txt[3] },
  ];
}

function PhilosophyCard({ text }: { text: string }) {
  const t = useTranslations("product");
  // Normalise les sauts de ligne : \\n\\n (depuis admin) → \n\n réel
  const norm = text.split("\\n\\n").join("\n\n").split("\\n").join("\n");
  const sepIdx = norm.indexOf("\n\n");
  const main       = sepIdx > -1 ? norm.slice(0, sepIdx) : norm;
  const conclusion = sepIdx > -1 ? norm.slice(sepIdx + 2) : "";
    const sentences: string[] = [];
  let buf = "";
  for (let i = 0; i < main.length; i++) {
    buf += main[i];
    if (main[i] === "." && (i + 1 >= main.length || main[i + 1] === " ")) {
      sentences.push(buf.trim()); buf = "";
    }
  }
  if (buf.trim()) sentences.push(buf.trim());
  const blocks: Array<{ q?: string; a: string; hero?: boolean }> = [];
  sentences.forEach(s => {
    const qi = s.indexOf("?");
    if (qi > -1) { blocks.push({ q: s.slice(0, qi + 1).trim(), a: s.slice(qi + 1).trim() }); }
    else if (s.startsWith("Ici") || s.startsWith("La ") || s.startsWith("Le ")) { blocks.push({ a: s, hero: true }); }
    else { blocks.push({ a: s }); }
  });
  const cLines: string[] = conclusion ? conclusion.replace(/\\. /g, ".|").split("|").map((s: string) => s.trim()).filter(Boolean) : [];
  return (
    <div style={{ padding: "26px 26px", borderRadius: 20, background: MARON, height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: AMBER, marginBottom: 5 }}>{t("philo_eyebrow")}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(242,237,230,0.3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 22 }}>{t("philo_sub")}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        {blocks.map((block, i) =>
          block.hero ? (
            <div key={i} style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.22)" }}>
              <div style={{ fontSize: "clamp(13px,1.1vw,15px)", color: WARM, fontWeight: 800, lineHeight: 1.5 }}>{block.a}</div>
            </div>
          ) : (
            <div key={i} style={{ borderLeft: "2px solid rgba(196,154,74,0.25)", paddingLeft: 14 }}>
              {block.q && <div style={{ fontSize: "clamp(11px,0.9vw,12px)", color: AMBER, fontWeight: 800, letterSpacing: 0.4, marginBottom: 3 }}>{block.q}</div>}
              <div style={{ fontSize: "clamp(13px,1.1vw,14px)", color: "rgba(242,237,230,0.8)", fontWeight: 700, lineHeight: 1.45 }}>{block.a}</div>
            </div>
          )
        )}
      </div>
      {cLines.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(242,237,230,0.08)", display: "flex", flexDirection: "column", gap: 4 }}>
          {cLines.map((line: string, i: number) => (
            <div key={i} style={{ fontSize: i === cLines.length - 1 ? "clamp(14px,1.2vw,16px)" : "clamp(11px,0.9vw,12px)", fontWeight: i === cLines.length - 1 ? 900 : 500, color: i === cLines.length - 1 ? WARM : "rgba(242,237,230,0.35)", lineHeight: 1.5 }}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TAILLES_ORDER = ["Nouveau-né","0-3 mois","3-6 mois","6-12 mois","0-6 mois","Taille unique","120×120 cm"];
const GUIDE_TAILLES = [
  { taille: "Nouveau-né", poids: "2,5 – 4 kg", poitrine: "21 cm", longueur: "50 cm" },
  { taille: "0-3 mois",   poids: "3,5 – 6 kg", poitrine: "22 cm", longueur: "54 cm" },
  { taille: "3-6 mois",   poids: "6 – 8 kg",   poitrine: "24 cm", longueur: "57 cm" },
  { taille: "6-12 mois",  poids: "8 – 11 kg",  poitrine: "26 cm", longueur: "62 cm" },
];

const IconThermometer = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2v10m0 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" stroke={AMBER} strokeWidth="1.8" strokeLinecap="round"/><path d="M12 6h2M12 9h1" stroke={AMBER} strokeWidth="1.5" strokeLinecap="round"/></svg>;
const IconBan         = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={AMBER} strokeWidth="1.8"/><path d="M6 6l12 12" stroke={AMBER} strokeWidth="1.8" strokeLinecap="round"/></svg>;
const IconFlat        = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 12h16M4 8h8M4 16h8" stroke={AMBER} strokeWidth="1.8" strokeLinecap="round"/></svg>;
const IconHeat        = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M8 6c0 2 2 2 2 4s-2 2-2 4M12 4c0 2 2 2 2 4s-2 2-2 4M16 6c0 2 2 2 2 4s-2 2-2 4" stroke={AMBER} strokeWidth="1.8" strokeLinecap="round"/><path d="M5 19h14" stroke={AMBER} strokeWidth="1.8" strokeLinecap="round"/></svg>;
const IconLeaf        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 22C12 22 4 16 4 9a8 8 0 0 1 16 0c0 7-8 13-8 13z" stroke={AMBER} strokeWidth="1.8"/><path d="M12 22V9" stroke={AMBER} strokeWidth="1.8"/></svg>;
const IconTruck       = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M1 3h13v13H1z" stroke={AMBER} strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 8h4l3 3v5h-7V8z" stroke={AMBER} strokeWidth="1.8" strokeLinejoin="round"/><circle cx="5.5" cy="18.5" r="2.5" stroke={AMBER} strokeWidth="1.8"/><circle cx="18.5" cy="18.5" r="2.5" stroke={AMBER} strokeWidth="1.8"/></svg>;
const IconReturn      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 14H4V9" stroke={AMBER} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 14a9 9 0 1 0 1.5-5" stroke={AMBER} strokeWidth="1.8" strokeLinecap="round"/></svg>;
const IconLock        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke={AMBER} strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={AMBER} strokeWidth="1.8"/></svg>;
const IconSize        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h10M3 18h6" stroke={AMBER} strokeWidth="2" strokeLinecap="round"/></svg>;

// ── 7 icônes exactes de la capture — une seule ligne, toutes visibles ──
function IconBandeau() {
  // Filtre CSS pour convertir le noir (#000) des SVG en marron foncé (#2d1a0e)
  const svgFilter = "brightness(0) saturate(100%) invert(10%) sepia(40%) saturate(700%) hue-rotate(340deg) brightness(55%)";
  const items = [
    { src: "/icons/01_bambou.svg",          label: "Bambou\nBio"            },
    { src: "/icons/02_anti_bacterien.svg",  label: "Anti-\nbactérien"       },
    { src: "/icons/04_thermoregulation.svg",label: "Thermo-\nrégulateur"    },
    { src: "/icons/05_goutte_validation.svg",label: "Hypo-\nallergénique"   },
    { src: "/icons/06_respiration_air.svg", label: "Ultra\nRespirant"        },
    { src: "/icons/07_plume_douceur.svg",   label: "Ultra\nDoux"            },
    { src: "/icons/super_extensible.svg",   label: "Super\nExtensible"      },
  ];
  return (
    <div style={{ marginTop: 14, background: TAUPE, borderRadius: 14, padding: "16px 12px" }}>
      <div className="bandeau-inner" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, scrollbarWidth: "none" }}>
        {items.map(item => (
          <div key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: "1 1 0", minWidth: 0, padding: "0 4px" }}>
            <img
              src={item.src}
              alt={item.label.replace("\n", " ")}
              style={{
                filter: svgFilter,
                objectFit: "contain",
                width: item.src.includes("thermoregulation") ? 44 : 36,
                height: 36,
                display: "block",
              }}
            />
            <div style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "rgba(26,20,16,0.65)", textAlign: "center", lineHeight: 1.3, whiteSpace: "pre-line" }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function DiagonalBadge({ label, out }: { label?: string; out: boolean }) {
  const t = useTranslations("product");
  if (out) return (
    <div style={{ position: "absolute", top: 0, right: 0, width: 110, height: 110, overflow: "hidden", zIndex: 30, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 26, right: -30, background: "#6b7280", color: "#fff", fontSize: 11, fontWeight: 900, padding: "8px 44px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{t("badge_sold_out")}</div>
    </div>
  );
  const cfg: Record<string,string> = { nouveau:t("badge_nouveau"), bestseller:t("badge_bestseller"), exclusif:t("badge_exclusif"), last:t("badge_last"), promo:t("badge_promo"), coup_de_coeur:t("badge_coup") };
  const text = label ? cfg[label] : null;
  if (!text) return null;
  return (
    <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, overflow: "hidden", zIndex: 30, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 28, right: -34, background: AMBER, color: DARK, fontSize: 11, fontWeight: 900, padding: "9px 48px", transform: "rotate(45deg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{text}</div>
    </div>
  );
}

function Lightbox({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const t = useTranslations("product");
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = document.getElementById(`lb-img-${startIndex}`);
    if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [startIndex, onClose]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.94)", display: "flex", flexDirection: "column" }}>
      <div style={{ flexShrink: 0, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{t("lightbox_count", { count: images.length })}</div>
        <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: 99, background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: "#fff", fontSize: 18, display: "grid", placeItems: "center" }}>✕</button>
      </div>
      <div ref={containerRef} style={{ flex: 1, overflowY: "auto", padding: "0 20px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        {images.map((img, i) => (
          <div key={i} id={`lb-img-${i}`} style={{ width: "min(92vw, 680px)", flexShrink: 0 }}>
            <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", borderRadius: 14, overflow: "hidden" }}>
              <Image src={img} alt={t("photo", { n: i+1 })} fill style={{ objectFit: "cover" }} sizes="680px"/>
            </div>
            <div style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{i+1} / {images.length}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqItem({ q, r, isOpen, onToggle }: { q: string; r: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div style={{ borderTop: `1px solid rgba(26,20,16,0.1)` }}>
      <button onClick={onToggle} style={{ width: "100%", padding: "13px 0", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, textAlign: "left" }}>
        <span style={{ fontWeight: 800, fontSize: "clamp(13px,1.3vw,15px)", color: DARK, lineHeight: 1.3 }}>{q}</span>
        <span style={{ fontSize: 20, color: AMBER, flexShrink: 0, transition: "transform 0.25s", transform: isOpen ? "rotate(45deg)" : "none", lineHeight: 1 }}>+</span>
      </button>
      <div style={{
        overflow: "hidden",
        maxHeight: isOpen ? "400px" : "0px",
        transition: "max-height 0.3s ease",
      }}>
        <div style={{ padding: "0 0 13px", fontSize: "clamp(13px,1.2vw,14px)", lineHeight: 1.75, color: "rgba(26,20,16,0.6)", whiteSpace: "pre-line" }}>{r}</div>
      </div>
    </div>
  );
}

// ── Apple Pay / Google Pay via Stripe Payment Request ────────────────────────
function ApplePayButton({ product, taille, couleur, qty, promo }: {
  product: any; taille: string; couleur: string; qty: number; promo: boolean;
}) {
  const t = useTranslations("product");
  const locale = useLocale();
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [canPay, setCanPay]                 = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!product || typeof window === "undefined") return;
    // Stripe doit être chargé
    const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!stripeKey) return;

    let stripe: any;
    let pr: any;

    async function init() {
      const { loadStripe } = await import("@stripe/stripe-js");
      stripe = await loadStripe(stripeKey!);
      if (!stripe) return;

      const price  = promo ? product.promo_price : product.price_ttc;
      const amount = Math.round(price * qty * 100);
      const name   = [product.name, taille, couleur].filter(Boolean).join(" — ");

      pr = stripe.paymentRequest({
        country:  "FR",
        currency: "eur",
        total:    { label: name, amount },
        requestPayerName:  true,
        requestPayerEmail: true,
        requestShipping:   true,
        shippingOptions: [
          { id: "standard", label: t("applepay_shipping_label"), detail: t("applepay_shipping_detail"), amount: amount >= 6000 ? 0 : 682 },
        ],
      });

      const result = await pr.canMakePayment();
      if (result) {
        setPaymentRequest(pr);
        setCanPay(true);
      }

      pr.on("paymentmethod", async (ev: any) => {
        // Express (Apple/Google Pay) = achat direct sans passer par le panier. On
        // émet quand même add_to_cart (interne + Pixel AddToCart) pour que le tunnel
        // les compte, + InitiateCheckout (Pixel) pour le retargeting. Une seule fois.
        const exValue = Number(price ?? 0) * Number(qty ?? 1);
        trackAddToCart({ id: String(product.id), name, price: Number(price ?? 0), category: product.category_slug || "", variant: taille || couleur || undefined, quantity: qty });
        metaAddToCart({ id: String(product.id), name, price: Number(price ?? 0), quantity: qty });
        metaInitiateCheckout(exValue, qty);
        // Créer session Stripe depuis le backend
        const res = await fetch("/api/checkout/create-session", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            items: [{ id: product.id, name, quantity: qty }],
            customer_email: ev.payerEmail,
            locale,
          }),
        });
        const data = await res.json();
        if (data.url) {
          ev.complete("success");
          window.location.href = data.url;
        } else {
          ev.complete("fail");
        }
      });
    }

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, taille, couleur, qty, promo, locale]);

  useEffect(() => {
    if (!paymentRequest || !btnRef.current) return;
    // Monter le bouton Stripe PRB
    let mounted = false;
    import("@stripe/stripe-js").then(async ({ loadStripe }) => {
      if (mounted) return;
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      if (!stripe || !btnRef.current) return;
      const elements = stripe.elements();
      const prButton = elements.create("paymentRequestButton", {
        paymentRequest,
        style: { paymentRequestButton: { type: "buy", theme: "dark", height: "52px" } },
      });
      prButton.mount(btnRef.current);
      mounted = true;
    });
  }, [paymentRequest]);

  if (!canPay) return null;

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 700, textAlign: "center", color: "rgba(26,20,16,0.4)", marginBottom: 8, letterSpacing: 0.5 }}>
        {t("applepay_or")}
      </div>
      <div ref={btnRef} style={{ borderRadius: 14, overflow: "hidden" }} />
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Estimé livraison ─────────────────────────────────────────────────────────
function getDeliveryEstimate(t: TFn): string {
  const now   = new Date();
  const hour  = now.getHours();
  const day   = now.getDay(); // 0=dim, 1=lun ... 6=sam
  const CUTOFF = 16;

  // Jours ouvrés : lun-ven. Délai Sendcloud : 2 jours ouvrés
  function addBusinessDays(date: Date, days: number): Date {
    const d = new Date(date);
    let added = 0;
    while (added < days) {
      d.setDate(d.getDate() + 1);
      const wd = d.getDay();
      if (wd !== 0 && wd !== 6) added++;
    }
    return d;
  }

  // Si week-end → livraison à partir de lundi + 2j ouvrés
  let startDate = new Date(now);
  if (day === 6) { startDate.setDate(startDate.getDate() + 2); }      // sam → lun
  else if (day === 0) { startDate.setDate(startDate.getDate() + 1); } // dim → lun
  else if (hour >= CUTOFF) { startDate.setDate(startDate.getDate() + 1); } // après 16h → lendemain

  const delivery = addBusinessDays(startDate, 2);
  const jours = t.raw("days") as string[];
  const mois  = t.raw("months") as string[];
  return `${jours[delivery.getDay()]} ${delivery.getDate()} ${mois[delivery.getMonth()]}`;
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Alerte réassort ───────────────────────────────────────────────────────────
function StockAlertForm({ productId, productName, productSlug, taille }: {
  productId: string; productName: string; productSlug: string; taille: string;
}) {
  const t = useTranslations("product");
  const locale = useLocale();
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError(t("error_email")); return;
    }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/stock-alerts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), product_id: productId, product_name: productName, product_slug: productSlug, taille }),
      });
      if (!res.ok) throw new Error("Erreur");
      setDone(true);
    } catch { setError(t("error_generic")); }
    finally  { setLoading(false); }
  }

  if (done) return (
    <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.25)", fontSize: 14, fontWeight: 700, color: "#15803d", textAlign: "center" }}>
      {t("stock_alert_done")}
    </div>
  );

  return (
    <div style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(26,20,16,0.05)", border: "1px solid rgba(26,20,16,0.12)" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1410", marginBottom: 4 }}>{t("stock_alert_title")}</div>
      {taille && <div style={{ fontSize: 12, color: "rgba(26,20,16,0.5)", marginBottom: 10 }}>{t("stock_alert_size", { taille: getSizeLabel(taille, locale) })}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder={t("stock_alert_placeholder")}
          style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: error ? "1.5px solid #ef4444" : "1px solid rgba(26,20,16,0.15)", fontSize: 14, outline: "none", background: "#fff" }}
        />
        <button onClick={handleSubmit} disabled={loading}
          style={{ padding: "10px 16px", borderRadius: 10, background: "#1a1410", color: "#c49a4a", fontWeight: 900, fontSize: 13, border: "none", cursor: "pointer", opacity: loading ? 0.6 : 1, whiteSpace: "nowrap" }}>
          {loading ? "..." : t("stock_alert_submit")}
        </button>
      </div>
      {error && <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 700, marginTop: 6 }}>⚠ {error}</div>}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function ProductClient({ initialProduct, header }: { initialProduct: any; header: React.ReactNode }) {
  const t                    = useTranslations("product") as unknown as TFn;
  const locale               = useLocale();
  const { addToCart, items }               = useCart();
  const { toggle: toggleWishlist, isInList } = useWishlist();

  // Produit fourni en SSR par page.tsx (coque server) → plus de fetch client,
  // plus d'écran « Chargement ».
  const [product]     = useState<any>(initialProduct);
  const [related,     setRelated]     = useState<any[]>([]);
  const [loading]     = useState(false);
  const [taille,      setTaille]      = useState("");
  const [couleur,     setCouleur]     = useState("");
  const [qty,         setQty]         = useState(1);
  const [added,       setAdded]       = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  // (state 'reviews' retiré — les avis sont désormais affichés sur /produits, plus dans la fiche)
  const [freeShipThreshold, setFreeShipThreshold] = useState<number>(60);
  const [guideOpen,   setGuideOpen]   = useState(false);
  const [openFaqIdx,  setOpenFaqIdx]  = useState<number | null>(null);
  const leftColRef    = useRef<HTMLDivElement>(null);
  const rightInnerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Produit déjà fourni en SSR (initialProduct). On ne fetch QUE la liste pour
    // les recommandations, et on émet le tracking de vue produit.
    fetch("/api/produits")
      .then(r => r.json())
      .then((all) => setRelated((Array.isArray(all) ? all : []).filter((p: any) => p.id !== initialProduct.id && p.category_slug === initialProduct.category_slug).slice(0, 4)))
      .catch(() => {});
    const viewPrice = initialProduct.promo_price || initialProduct.price_ttc || 0;
    trackViewItem({ id: String(initialProduct.id), name: initialProduct.name, price: viewPrice, category: initialProduct.category_slug || "" });
    metaViewContent({ id: String(initialProduct.id), name: initialProduct.name, price: viewPrice });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch("/api/settings/public").then(r=>r.json()).then((s:any)=>{
      const n = Number(s?.free_shipping_threshold);
      if (Number.isFinite(n) && n > 0) setFreeShipThreshold(n);
    }).catch(()=>{});
  }, []);

  // ⚠️ SUPPRIMÉ : useEffect qui synchronisait la hauteur du panneau droit
  // avec la colonne gauche (maxHeight forcé créait un vide visuel énorme
  // quand le contenu droit était plus court que la galerie photos gauche).
  // La colonne droite prend désormais sa hauteur naturelle, le grid
  // align-items: flex-start évite tout stretching forcé.

  function handleAddToCart() {
    if (!product) return;
    if (taillesDispos.length > 0 && !taille) {
      alert(t("select_size_alert"));
      return;
    }
    const name = [product.name, taille, couleur].filter(Boolean).join(" — ");
    // Tracking add_to_cart (GA4) + AddToCart (Meta) est centralisé dans CartContext.addToCart()
    addToCart({ id: String(product.id), slug: product.slug, name, price: promo ? product.promo_price : product.price_ttc, quantity: qty, taille: taille || undefined, couleur: couleur || undefined, category_slug: product.category_slug || undefined });
    setAdded(true); setTimeout(() => setAdded(false), 2500);
  }

  if (loading) return <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: BG }}><div style={{ opacity: 0.4, color: DARK }}>{t("loading")}</div></div>;
  if (!product) return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: BG, padding: 40, textAlign: "center" }}>
      <div><div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12, color: DARK }}>{t("not_found")}</div>
      <Link href="/produits" style={{ padding: "12px 24px", borderRadius: 12, background: DARK, color: WARM, fontWeight: 800, textDecoration: "none" }}>{t("back")}</Link></div>
    </div>
  );

  const promo          = isPromoActive(product);
  const out            = Number(product.stock ?? 0) <= 0;
  const lowStock       = !out && Number(product.stock ?? 0) <= 5;
  const displayPrice   = promo ? product.promo_price : product.price_ttc;
  const badgeLabel     = out ? undefined : (product.label || (promo ? "promo" : undefined));
  const allImages      = [product.image_url, product.image_url_2, product.image_url_3, product.image_url_4, product.image_url_5, product.image_url_6, product.image_url_7, product.image_url_8].filter(Boolean) as string[];
  const taillesDispos  : string[]              = Array.isArray(product.sizes)  ? product.sizes  : [];
  const sizesStock     : Record<string,number> = product.sizes_stock ?? {};
  const couleursDispos : any[]                 = Array.isArray(product.colors) ? product.colors : [];
  const outTaille      = taille ? Number(sizesStock[taille] ?? product.stock ?? 0) <= 0 : out;
  const needsTaille     = taillesDispos.length > 0 && !taille;
  const cartCount      = items.reduce((s, i) => s + i.quantity, 0);

  const productSlug   = product.slug ?? "";
  const productCat    = product.category_slug ?? "";

  // Label catégorie traduit (breadcrumb + eyebrow). Fallback = slug brut si
  // catégorie inconnue. Note : la clé bonnet est cat_bonnets (pluriel) côté product.
  const catLabel = (c: string) => (({ bodies: t("cat_bodies"), pyjamas: t("cat_pyjamas"), gigoteuses: t("cat_gigoteuses"), accessoires: t("cat_accessoires"), bonnet: t("cat_bonnets"), langes: t("cat_langes") } as Record<string,string>)[c] || c);

  // ── Priorité : données custom admin (fiche_cards/fiche_faqs) sinon fallback auto ──
  // hasCustomCards/hasCustomFaqs : logique FR existante — INCHANGÉE (le contenu
  // DB FR ne s'applique que sur /fr ; sur /en il était ignoré au profit des
  // fallbacks traduits getProduct*).
  const ficheCards: any[]  = Array.isArray(product.fiche_cards) ? product.fiche_cards : [];
  const ficheFaqs:  any[]  = Array.isArray(product.fiche_faqs)  ? product.fiche_faqs  : [];
  const hasCustomCards     = locale === "fr" && ficheCards.length > 0;
  const hasCustomFaqs      = locale === "fr" && ficheFaqs.length > 0;

  // ── Vague 2 — contenu fiche EN saisi en admin (colonnes fiche_cards_en /
  // fiche_faqs_en, même structure que fiche_cards). Fallback 3 niveaux sur /en :
  //   (1) fiche_cards_en rempli → prioritaire
  //   (2) sinon → getProduct* (messages/en.json — comportement ACTUEL intact)
  //   (3) sinon → fiche_cards FR (filet de sécurité, /en uniquement, pour les
  //       catégories non couvertes par messages — ex. accessoires).
  // On ne touche NI à hasCustomCards NI aux fonctions getProduct*.
  const ficheCardsEn: any[] = Array.isArray(product.fiche_cards_en) ? product.fiche_cards_en : [];
  const ficheFaqsEn:  any[] = Array.isArray(product.fiche_faqs_en)  ? product.fiche_faqs_en  : [];
  const hasCustomCardsEn    = locale === "en" && ficheCardsEn.length > 0;
  const hasCustomFaqsEn     = locale === "en" && ficheFaqsEn.length  > 0;
  // Source custom effective : EN sur /en (niveau 1) sinon FR sur /fr (existant).
  const customCards: any[]  = hasCustomCardsEn ? ficheCardsEn : (hasCustomCards ? ficheCards : []);
  const useCustom           = customCards.length > 0;
  const customFaqs: any[]   = hasCustomFaqsEn ? ficheFaqsEn : (hasCustomFaqs ? ficheFaqs : []);
  const useCustomFaq        = customFaqs.length > 0;
  // Niveau 3 (cartes uniquement) : contenu FR de fiche_cards, /en seulement,
  // quand getProduct* ne renvoie rien. La FAQ n'a PAS de filet FR (sinon la FAQ
  // FR fuirait sur /en) → niveaux 1+2 seulement.
  const frNet = (type: string): string => (locale === "en" ? (ficheCards.find((c: any) => c.type === type)?.content ?? "") : "");

  const subtitle      = useCustom ? (customCards.find((c: any) => c.type === "subtitle")?.content ?? "") : (getProductSubtitle(t, productCat, productSlug) || frNet("subtitle"));
  const extraDesc     = useCustom ? (customCards.find((c: any) => c.type === "description")?.content ?? "") : (getProductDesc(t, productSlug) || frNet("description"));
  const coloris       = useCustom ? (customCards.find((c: any) => c.type === "coloris")?.content ?? null) : (getColoris(t, productSlug) ?? (frNet("coloris") || null));
  const motif         = useCustom ? (() => { const m = customCards.find((c: any) => c.type === "motif"); if (!m?.content) return null; const parts = m.content.split(" — "); return parts.length >= 2 ? { motif: parts[0].replace("Motif ", ""), desc: parts.slice(1).join(" — ") } : null; })() : getMotifDetails(t, productSlug);
  const features      = useCustom ? (() => { try { return JSON.parse(customCards.find((c: any) => c.type === "features")?.content ?? "[]"); } catch { return []; } })() : (() => { const auto = getProductFeatures(t, productCat, productSlug); if (auto.length) return auto; const net = frNet("features"); if (net) { try { return JSON.parse(net); } catch { return []; } } return []; })();
  const whyResult     = useCustom ? (() => { try { const wr = JSON.parse(customCards.find((c: any) => c.type === "whyresult")?.content ?? "null"); return wr?.why ? wr : null; } catch { return null; } })() : (getWhyResult(t, productCat, productSlug) ?? (() => { const net = frNet("whyresult"); if (!net) return null; try { const wr = JSON.parse(net); return wr?.why ? wr : null; } catch { return null; } })());
  const philosophy    = useCustom ? (customCards.find((c: any) => c.type === "philosophy")?.content ?? "") : (getPhilosophy(t, productCat, productSlug) || frNet("philosophy"));
  const entretien     = useCustom ? (() => { try { const arr = JSON.parse(customCards.find((c: any) => c.type === "entretien")?.content ?? "null"); return Array.isArray(arr) ? arr.map((text: string, i: number) => ({ Icon: [IconThermometer,IconBan,IconFlat,IconHeat][i%4], text })) : getProductEntretien(t, productSlug); } catch { return getProductEntretien(t, productSlug); } })() : getProductEntretien(t, productSlug);
  const FAQ           = useCustomFaq ? customFaqs.map((f: any) => ({ q: f.question, r: f.reponse })) : getProductFAQ(t, productCat, productSlug);

  const photoRows: string[][] = [];
  if (allImages.length === 0) { photoRows.push(["placeholder"]); }
  else { for (let i = 0; i < allImages.length; i += 2) photoRows.push(allImages.slice(i, i + 2)); }


  // ⚠️ Product JSON-LD legacy SUPPRIMÉ d'ici.
  // Le Product schema complet (avec hasMerchantReturnPolicy + shippingDetails
  // + aggregateRating + material + sku + priceValidUntil + itemCondition) est
  // émis en SSR depuis app/produits/[slug]/layout.tsx via getProductJsonLd().
  // Cause GSC : ce schéma client-side était incomplet (manquait return policy
  // + shipping), Google le voyait en parallèle de celui du layout → "champs
  // manquants" alors qu'ils existaient ailleurs.

  return (
    <>
      {FAQ.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map(f => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.r },
          })),
        }) }} />
      )}
    <div style={{ background: BG, minHeight: "100vh" }}>
      {lightboxIdx !== null && allImages.length > 0 && (
        <Lightbox images={allImages} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      <style>{`
        * { box-sizing:border-box; }
        /* ── Grille principale fiche produit (état pré-avis) ──
           align-items:flex-start → chaque cellule hauteur naturelle.
           overflow:hidden → empêche scroll horizontal accidentel.
           Pas de sticky/max-height : layout simple, scroll page commun.
           Les avis sont DÉPLACÉS sur /produits (page liste), plus sur fiche. */
        .pl-outer { display:grid; grid-template-columns:1fr 1fr; gap:0; align-items:flex-start; max-width:1800px; margin:0 auto; overflow:hidden; background:#ede8df; }
        .pl-left  { padding:16px 24px 80px 4vw; }
        .pl-right { display:flex; flex-direction:column; background:#ede8df; }
        .pl-right-inner { padding:16px 4vw 80px 24px; display:flex; flex-direction:column; gap:18px; width:100%; box-sizing:border-box; }
        .photo-row  { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px; }
        .photo-item { position:relative; aspect-ratio:3/4; border-radius:14px; overflow:hidden; background:${TAUPE}; cursor:zoom-in; }
        .photo-item.single { grid-column:1/-1; aspect-ratio:4/5; }
        /* Bottom-grid : recos + philosophie côte à côte sous la fiche.
           2 enfants pour 2 colonnes = remplissage propre (pas de zigzag). */
        .bottom-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:stretch; }
        @media(max-width:900px){
          .pl-outer  { grid-template-columns:1fr!important; }
          .pl-left   { padding:12px 16px 0!important; }
          .pl-right  { display:contents!important; }
          .pl-right-inner { padding:16px 16px 80px!important; width:100%!important; background:#ede8df!important; }
          .bandeau-inner { min-width:0!important; grid-template-columns:repeat(4,1fr)!important; overflow:hidden!important; row-gap:10px!important; }
          .photo-row { gap:8px!important; }
          .bottom-grid { grid-template-columns:1fr!important; gap:16px!important; }
        }
        @media(max-width:600px){
          .icon-bandeau-grid { grid-template-columns:repeat(4, 1fr)!important; row-gap:12px!important; }
          .icon-bandeau-grid img { width:26px!important; height:26px!important; }
          .icon-bandeau-grid span { font-size:6.5px!important; }
        }
      `}</style>

      {/* Breadcrumb — même position que l'ancien natif (sous navbar, au-dessus des photos) */}
      <div style={{ maxWidth: 1800, margin: "0 auto", padding: "84px 4vw 0" }}>
        <Breadcrumb
          variant="dark"
          padding="0 0 8px 0"
          items={[
            { label: t("breadcrumb_home"),  href: "/" },
            { label: t("breadcrumb_products"), href: "/produits" },
            ...(productCat ? [{
              label: catLabel(productCat),
              href:  `/categorie/${productCat}`,
            }] : []),
            { label: product.name },
          ]}
        />
      </div>

      <div className="pl-outer">

        {/* ─── GAUCHE : photos ─── */}
        <div className="pl-left" ref={leftColRef}>
          <div style={{ position: "relative" }}>
            <DiagonalBadge label={badgeLabel} out={out} />
            {photoRows.map((row, ri) => (
              <div key={ri} className="photo-row">
                {row.map((img, ci) => {
                  const idx = ri * 2 + ci;
                  const isPlaceholder = img === "placeholder";
                  const isSingle = row.length === 1;
                  return (
                    <div key={ci} className={`photo-item${isSingle ? " single" : ""}`} onClick={() => { if (!isPlaceholder) setLightboxIdx(idx); }}>
                      {isPlaceholder ? (
                        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 28, fontWeight: 950, color: "rgba(26,20,16,0.2)" }}>M!LK</div>
                      ) : (
                        <>
                          <Image
                            src={img}
                            alt={t("img_alt", { name: product.name, n: idx+1 })}
                            fill
                            sizes="(max-width:900px) 50vw, 40vw"
                            quality={90}
                            priority={ri === 0 && ci === 0}
                            loading={ri === 0 && ci === 0 ? undefined : "lazy"}
                            style={{ objectFit: "cover" }}
                          />
                          {ri === 0 && ci === 0 && lowStock && (
                            <div style={{ position: "absolute", top: 10, left: 10, zIndex: 5 }}>
                              <span style={{ padding: "5px 11px", borderRadius: 99, background: "rgba(180,80,60,0.85)", color: "#fff", fontSize: 11, fontWeight: 800 }}>{t("low_stock", { n: product.stock })}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <IconBandeau />

        </div>

        {/* ─── DROITE : panneau achat — sticky, scroll indépendant ─── */}
        <div className="pl-right"><div className="pl-right-inner" ref={rightInnerRef}>

          {/* Eyebrow + H1 + prix : rendus en SSR par page.tsx (coque server) et
              injectés ici → titre/prix dans le HTML brut (SEO/LCP), zéro changement
              visuel. Le H1 unique de la page est dans ce nœud. */}
          {header}

          {subtitle && <p style={{ margin: 0, fontSize: "clamp(14px,1.3vw,16px)", fontWeight: 700, color: "rgba(26,20,16,0.7)", lineHeight: 1.5 }}>{subtitle}</p>}
          {extraDesc && <p style={{ margin: 0, fontSize: "clamp(13px,1.1vw,14px)", color: "rgba(26,20,16,0.6)", lineHeight: 1.8 }}>{extraDesc}</p>}

          {features.length > 0 && (
            <div style={{ padding: "18px 20px", borderRadius: 16, background: "rgba(26,20,16,0.06)", border: `1px solid rgba(26,20,16,0.1)`, display: "flex", flexDirection: "column", gap: 11 }}>
              {features.map((feat: string, i: number) => {
                const colonIdx = feat.indexOf(" : ");
                const label = colonIdx > -1 ? feat.slice(0, colonIdx) : feat;
                const desc  = colonIdx > -1 ? feat.slice(colonIdx + 3) : "";
                return (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(196,154,74,0.15)", border: "1px solid rgba(196,154,74,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke={AMBER} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: "clamp(13px,1.1vw,14px)", color: DARK }}>{label}</span>
                      {desc && <span style={{ fontWeight: 400, fontSize: "clamp(12px,1vw,13px)", color: "rgba(26,20,16,0.5)" }}> : {desc}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {coloris && (
            <div style={{ fontSize: "clamp(14px,1.2vw,16px)", fontWeight: 700, color: DARK, lineHeight: 1.5 }}>
              <span style={{ color: AMBER, fontWeight: 900 }}>{t("coloris_label")}</span> — {coloris}
            </div>
          )}

          {!coloris && motif && (
            <div style={{ fontSize: "clamp(14px,1.2vw,16px)", fontWeight: 700, color: DARK, lineHeight: 1.5 }}>
              <span style={{ color: AMBER, fontWeight: 900 }}>{t("motif_prefix")} {motif.motif}</span> — {motif.desc}.
            </div>
          )}

          {(couleursDispos.length > 0 || related.length > 0) && (
            <div style={{ display: "grid", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>
                {t("color_label")} {couleur && <span style={{ color: DARK }}>— {couleur}</span>}
              </span>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>

                {/* Pastilles couleurs du produit courant */}
                {couleursDispos.map((col: any) => {
                  const epuise  = Number(col.stock ?? 0) <= 0;
                  const selected = couleur === col.name;
                  return (
                    <button key={col.name} onClick={() => { if (!epuise) setCouleur(col.name); }} title={col.name}
                      style={{ position: "relative", width: 40, height: 40, borderRadius: 99, border: selected ? `3px solid ${DARK}` : "2px solid rgba(0,0,0,0.15)", overflow: "hidden", background: col.hex, cursor: epuise ? "not-allowed" : "pointer", opacity: epuise ? 0.5 : 1, boxShadow: selected ? `0 0 0 3px ${BG}, 0 0 0 5px ${DARK}` : "none" }}>
                      {col.image_url && <img src={col.image_url} alt={col.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                      {epuise && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: "130%", height: 2, background: AMBER, transform: "rotate(45deg)" }} /></div>}
                    </button>
                  );
                })}

                {/* Séparateur si couleurs ET autres motifs */}
                {couleursDispos.length > 0 && related.length > 0 && (
                  <div style={{ width: 1, height: 32, background: "rgba(26,20,16,0.12)", margin: "0 4px" }} />
                )}

                {/* Pastilles autres motifs (même catégorie) — dans le même sélecteur */}
                {related.map((p: any) => {
                  const motifLabel = (() => { const parts = (p.name ?? "").split("—"); return parts.length > 1 ? parts[parts.length-1].trim() : p.name; })();
                  const pColors    = Array.isArray(p.colors) ? p.colors : [];
                  const motifImg   = pColors[0]?.image_url || null;
                  const motifHex   = pColors[0]?.hex || TAUPE;
                  return (
                    <Link key={p.id} href={`/produits/${p.slug}`} title={motifLabel}
                      style={{ display: "block", textDecoration: "none" }}>
                      <button
                        style={{ position: "relative", width: 40, height: 40, borderRadius: 99, border: "2px solid rgba(0,0,0,0.15)", overflow: "hidden", background: motifHex, cursor: "pointer", padding: 0, transition: "all 0.15s" }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.border = `3px solid ${DARK}`; el.style.boxShadow = `0 0 0 3px ${BG}, 0 0 0 5px ${DARK}`; }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.border = "2px solid rgba(0,0,0,0.15)"; el.style.boxShadow = "none"; }}>
                        {motifImg
                          ? <img src={motifImg} alt={motifLabel} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 7, fontWeight: 900, color: "rgba(26,20,16,0.3)" }}>M!LK</div>}
                      </button>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {taillesDispos.length > 0 && (
            <div id="taille-selector" style={{ display: "grid", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>
                {t("size_label")} {taille && <span style={{ color: DARK }}>— {getSizeLabel(taille, locale)}</span>}
              </span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[...TAILLES_ORDER, ...taillesDispos.filter(t => !TAILLES_ORDER.includes(t))].filter(t => taillesDispos.includes(t)).map(t => {
                  const stockT = Number(sizesStock[t] ?? product.stock ?? 0);
                  const epuise = stockT <= 0;
                  const selected = taille === t;
                  return (
                    <button key={t} onClick={() => { if (!epuise) setTaille(selected ? "" : t); }}
                      style={{ position: "relative", padding: "10px 18px", borderRadius: 10, border: "none", fontWeight: 800, fontSize: "clamp(12px,1vw,14px)", cursor: epuise ? "not-allowed" : "pointer", background: selected ? DARK : "rgba(26,20,16,0.08)", color: selected ? WARM : epuise ? "rgba(26,20,16,0.3)" : DARK, boxShadow: selected ? "none" : "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {getSizeLabel(t, locale)}
                      {epuise && <div style={{ position: "absolute", top: "50%", left: "5%", width: "90%", height: 2, background: AMBER, transform: "translateY(-50%) rotate(-6deg)", borderRadius: 2 }} />}
                      {!epuise && stockT <= 3 && <span style={{ marginLeft: 5, fontSize: 10, color: AMBER, fontWeight: 700 }}>({stockT})</span>}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 12px", borderRadius: 10, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.2)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="9" stroke={AMBER} strokeWidth="1.8"/><path d="M12 8v4M12 16h.01" stroke={AMBER} strokeWidth="2" strokeLinecap="round"/></svg>
                <span style={{ fontSize: 12, color: "rgba(26,20,16,0.6)", lineHeight: 1.5, fontWeight: 600 }}>{t("size_hint")}</span>
              </div>
            </div>
          )}

          {taillesDispos.length > 0 && !productSlug.includes("bonnet") && (
            <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(26,20,16,0.12)` }}>
              <button onClick={() => setGuideOpen(v => !v)} style={{ width: "100%", padding: "11px 14px", background: guideOpen ? DARK : "rgba(26,20,16,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <IconSize />
                  <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase", color: guideOpen ? AMBER : DARK }}>{t("size_guide")}</span>
                </div>
                <span style={{ fontSize: 18, color: guideOpen ? AMBER : DARK, transition: "transform 0.2s", transform: guideOpen ? "rotate(45deg)" : "none", fontWeight: 300 }}>+</span>
              </button>
              {guideOpen && (
                <div style={{ background: "rgba(26,20,16,0.04)", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 280 }}>
                    <thead>
                      <tr style={{ background: "rgba(26,20,16,0.06)" }}>
                        {[t("guide_col_size"),t("guide_col_weight"),t("guide_col_chest"),t("guide_col_length")].map(h => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "center", fontSize: 9, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: "rgba(26,20,16,0.4)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {GUIDE_TAILLES.map((row, i) => (
                        <tr key={row.taille} style={{ borderTop: "1px solid rgba(26,20,16,0.06)", background: i % 2 === 0 ? "transparent" : "rgba(26,20,16,0.03)" }}>
                          <td style={{ padding: "9px 10px", fontWeight: 900, color: AMBER, fontSize: 13, textAlign: "left" }}>{getSizeLabel(row.taille, locale)}</td>
                          <td style={{ padding: "9px 10px", color: "rgba(26,20,16,0.55)", fontSize: 12, textAlign: "center" }}>{row.poids}</td>
                          <td style={{ padding: "9px 10px", color: "rgba(26,20,16,0.55)", fontSize: 13, fontWeight: 700, textAlign: "center" }}>{row.poitrine}</td>
                          <td style={{ padding: "9px 10px", color: "rgba(26,20,16,0.55)", fontSize: 13, fontWeight: 700, textAlign: "center" }}>{row.longueur}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: "7px 12px", fontSize: 11, color: "rgba(26,20,16,0.4)", background: "rgba(26,20,16,0.04)" }}>{t("guide_note")}</div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "rgba(26,20,16,0.5)" }}>{t("qty_label")}</span>
            <div style={{ display: "flex", alignItems: "center", background: "rgba(26,20,16,0.06)", borderRadius: 12, padding: 4, width: "fit-content" }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 20, display: "grid", placeItems: "center", color: DARK }}>−</button>
              <span style={{ width: 40, textAlign: "center", fontWeight: 900, fontSize: 16, color: DARK }}>{qty}</span>
              <button onClick={() => setQty(Math.min(Number(product.stock ?? 10), qty + 1))} style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: "none", cursor: "pointer", fontSize: 20, display: "grid", placeItems: "center", color: DARK }}>+</button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <button onClick={handleAddToCart} disabled={outTaille}
              style={{ padding: "17px 24px", borderRadius: 16, border: "none", fontWeight: 900, fontSize: "clamp(14px,1.3vw,17px)", cursor: outTaille ? "not-allowed" : "pointer", background: added ? "#2d6a2d" : outTaille ? "rgba(26,20,16,0.2)" : DARK, color: added ? "#fff" : outTaille ? "rgba(26,20,16,0.4)" : WARM, transition: "all 0.2s", position: "relative" }}>
              {added ? t("added") : outTaille ? t("sold_out") : needsTaille ? t("choose_size_up") : t("add_price", { price: (Number(displayPrice) * qty).toFixed(2) })}
            </button>
            {/* ── Alerte réassort si épuisé ── */}
            {outTaille && !needsTaille && (
              <StockAlertForm
                productId={String(product.id)}
                productName={product.name}
                productSlug={product.slug}
                taille={taille}
              />
            )}

            {/* ── Apple Pay / Google Pay ── */}
            {!outTaille && !needsTaille && (
              <ApplePayButton
                product={product}
                taille={taille}
                couleur={couleur}
                qty={qty}
                promo={promo}
              />
            )}
            {/* ── Bouton Wishlist ── */}
            <button
              onClick={() => product && toggleWishlist(product.id)}
              aria-label={product && isInList(product.id) ? t("wishlist_remove") : t("wishlist_add")}
              style={{ width: "100%", padding: "13px 24px", borderRadius: 14, border: `1.5px solid ${product && isInList(product.id) ? "rgba(220,38,38,0.3)" : "rgba(26,20,16,0.15)"}`, background: product && isInList(product.id) ? "rgba(220,38,38,0.05)" : "transparent", color: product && isInList(product.id) ? "#dc2626" : "rgba(26,20,16,0.55)", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s" }}>
              <span style={{ fontSize: 18 }}>{product && isInList(product.id) ? "❤️" : "🤍"}</span>
              {product && isInList(product.id) ? t("wishlist_in") : t("wishlist_add")}
            </button>
            {/* ── Partage ── */}
            <ShareButtons title={product.name} />
            {cartCount > 0 && (
              <Link href="/panier" style={{ padding: "13px 24px", borderRadius: 16, border: `2px solid ${DARK}`, fontWeight: 800, fontSize: 14, textDecoration: "none", color: DARK, textAlign: "center", display: "block" }}>
                {t("view_cart", { count: cartCount })}
              </Link>
            )}
          </div>

{/* ── Estimé livraison ── */}
          {!out && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)" }}>
              <span style={{ fontSize: 18 }}>🚚</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#15803d" }}>
                  {t("delivered", { date: getDeliveryEstimate(t) })}
                </div>
                <div style={{ fontSize: 11, color: "rgba(26,20,16,0.45)", fontWeight: 600, marginTop: 1 }}>
                  {t("delivery_note")}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { Icon: IconLeaf,   label: t("reass_oeko")     },
              { Icon: IconTruck,  label: t("reass_shipping", { amount: freeShipThreshold }) },
              { Icon: IconReturn, label: t("reass_returns")   },
              { Icon: IconLock,   label: t("reass_payment")  },
            ].map(r => (
              <div key={r.label} style={{ padding: "9px 11px", borderRadius: 10, background: "rgba(26,20,16,0.07)", display: "flex", alignItems: "center", gap: 7, fontSize: "clamp(10px,0.9vw,12px)", fontWeight: 700, color: "rgba(26,20,16,0.65)", whiteSpace: "nowrap" }}>
                <r.Icon />{r.label}
              </div>
            ))}
          </div>

          {whyResult && (
            <div style={{ padding: "20px 22px", borderRadius: 16, background: "rgba(26,20,16,0.06)", border: `1px solid rgba(26,20,16,0.1)` }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: AMBER, marginBottom: 4 }}>{t("why_eyebrow")}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,20,16,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>{t("why_sub")}</div>
              <p style={{ margin: 0, fontSize: "clamp(13px,1.1vw,14px)", color: "rgba(26,20,16,0.7)", lineHeight: 1.8 }}>{whyResult.why}</p>
            </div>
          )}

          {whyResult && (
            <div style={{ padding: "20px 22px", borderRadius: 16, background: "rgba(196,154,74,0.1)", border: "1px solid rgba(196,154,74,0.2)" }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: AMBER, marginBottom: 4 }}>{t("result_eyebrow")}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,20,16,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>{t("result_sub")}</div>
              <p style={{ margin: 0, fontSize: "clamp(13px,1.1vw,14px)", color: "rgba(26,20,16,0.7)", lineHeight: 1.8, fontWeight: 600 }}>{whyResult.result}</p>
            </div>
          )}

          <div style={{ padding: "18px 20px", borderRadius: 16, background: "rgba(26,20,16,0.06)", border: `1px solid rgba(26,20,16,0.1)` }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "clamp(13px,1.2vw,15px)", fontWeight: 950, color: DARK }}>{t("care_title")}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { svg: <svg viewBox="0 0 32 32" fill="none" width={28} height={28}><circle cx="16" cy="16" r="12" stroke={AMBER} strokeWidth="1.6"/><text x="16" y="20" textAnchor="middle" fontSize="9" fontWeight="700" fill={AMBER}>30°</text></svg>, text: t("care_item1") },
                { svg: <svg viewBox="0 0 32 32" fill="none" width={28} height={28}><circle cx="16" cy="16" r="12" stroke={AMBER} strokeWidth="1.6"/><line x1="10" y1="10" x2="22" y2="22" stroke={AMBER} strokeWidth="1.8" strokeLinecap="round"/></svg>, text: t("care_item2") },
                { svg: <svg viewBox="0 0 32 32" fill="none" width={28} height={28}><line x1="4" y1="10" x2="28" y2="10" stroke={AMBER} strokeWidth="1.6" strokeLinecap="round"/><path d="M12 10 L10 22 L22 22 L20 10" stroke={AMBER} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="12" cy="10" r="1.8" fill={AMBER}/><circle cx="20" cy="10" r="1.8" fill={AMBER}/></svg>, text: t("care_item3") },
                { svg: <svg viewBox="0 0 32 32" fill="none" width={28} height={28}><path d="M16 6 C16 6 8 13 8 19 a8 8 0 0 0 16 0 C24 13 16 6 16 6Z" stroke={AMBER} strokeWidth="1.6" fill="none"/><path d="M13 18 Q16 15 19 18" stroke={AMBER} strokeWidth="1.3" strokeLinecap="round" fill="none"/></svg>, text: t("care_item4") },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ flexShrink: 0, marginTop: 2 }}>{item.svg}</div>
                  <span style={{ fontSize: "clamp(11px,1vw,12px)", color: "rgba(26,20,16,0.7)", lineHeight: 1.4, fontWeight: 600 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          </div>{/* /pl-right-inner */}
        </div>

      </div>

      {/* ─── BAS DE PAGE ───
            Avis DÉPLACÉS sur /produits (page liste) — plus dans la fiche.
            Ici : recos (theme dark) + philosophie en 2 colonnes, puis FAQ. */}
      <div style={{ maxWidth: 1800, margin: "0 auto", padding: "0 4vw 80px" }}>
        <div className="bottom-grid" style={{ marginBottom: 24 }}>
          <ProductRecommendations
            productId={product.id}
            categorySlug={productCat ?? ""}
            eyebrow={t("crosssell_eyebrow")}
            title={t("crosssell_title")}
            viewLabel={t("view_product")}
            outLabel={t("sold_out")}
          />
          {philosophy && <PhilosophyCard text={philosophy} />}
        </div>

        {/* FAQ */}
        <div style={{ padding: "24px 28px", borderRadius: 20, background: TAUPE, border: `1px solid rgba(26,20,16,0.1)` }}>
          <h3 style={{ margin: "0 0 8px", fontSize: "clamp(16px,1.8vw,20px)", fontWeight: 950, color: DARK }}>{t("faq_title")}</h3>
          {FAQ.map((item, idx) => (
            <FaqItem
              key={item.q}
              q={item.q}
              r={item.r}
              isOpen={openFaqIdx === idx}
              onToggle={() => setOpenFaqIdx(openFaqIdx === idx ? null : idx)}
            />
          ))}
        </div>
      </div>

      {/* CTA mobile */}
      <div className="mobile-cta-bar" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, padding: "12px 16px", background: `rgba(216,200,176,0.97)`, backdropFilter: "blur(8px)", borderTop: `1px solid rgba(26,20,16,0.1)` }}>
        <button
          onClick={() => {
            if (needsTaille) {
              const el = document.getElementById("taille-selector");
            if (el) {
              const y = el.getBoundingClientRect().top + window.scrollY - 100;
              window.scrollTo({ top: y, behavior: "smooth" });
            }
            } else {
              handleAddToCart();
            }
          }}
          disabled={outTaille}
          style={{ width: "100%", padding: "17px", borderRadius: 14, border: "none", fontWeight: 900, fontSize: 17, cursor: outTaille ? "not-allowed" : "pointer", background: added ? "#2d6a2d" : outTaille ? "rgba(26,20,16,0.2)" : DARK, color: WARM }}>
          {added ? t("mobile_added") : outTaille ? t("sold_out") : needsTaille ? t("choose_size") : t("add_price", { price: (Number(displayPrice) * qty).toFixed(2) })}
        </button>
      </div>
      <style>{`.mobile-cta-bar{display:none!important}@media(max-width:900px){.mobile-cta-bar{display:block!important}}`}</style>
    </div>
    </>
  );
}