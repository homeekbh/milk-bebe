"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { C, Divider, Reveal, BigTextScroll, Ticker, MILK_STYLES } from "@/components/shared/MilkDesign";
import { Breadcrumb } from "@/components/seo/Breadcrumb";

type Property = { titre: string; texte: string; stat: string; statLabel: string; image: string; imageAlt: string };
type CompRow = { critere: string; bambou: boolean; coton: boolean; synth: boolean };
type QA = { q: string; r: string };

function Check({ amber = false }: { amber?: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke={amber ? C.amber : "#6bcf7f"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function Cross() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="rgba(242,237,230,0.18)" strokeWidth="2" strokeLinecap="round"/></svg>;
}

export default function PourquoiBambouPage() {
  const t = useTranslations("bamboo");
  const PROPRIETES = t.raw("properties") as Property[];
  const COMPARATIF = t.raw("comparatif") as CompRow[];
  const FAQ = t.raw("faq") as QA[];
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.warm }}>
      <style>{`
        ${MILK_STYLES}
        .pb-grid { display:grid; grid-template-columns:1fr 1fr; gap:56px; align-items:center; margin-bottom:64px; }
        .pb-rev .pb-img { order:1; } .pb-rev .pb-txt { order:0; }
        .pb-cmp  { display:grid; grid-template-columns:1fr repeat(3,110px); }
        .pb-otg  { display:grid; grid-template-columns:1fr 1fr; gap:56px; align-items:center; }
        @media(max-width:900px){
          .pb-grid { grid-template-columns:1fr!important; gap:28px!important; margin-bottom:40px!important; }
          .pb-rev .pb-img,.pb-rev .pb-txt { order:unset!important; }
          .pb-cmp  { grid-template-columns:1fr repeat(3,72px)!important; }
          .pb-otg  { grid-template-columns:1fr!important; gap:28px!important; }
        }
      `}</style>

      <div style={{ background: C.bg }}>
        <Breadcrumb
          variant="light"
          items={[{ label: t("breadcrumb_home"), href: "/" }, { label: t("hero_title") }]}
        />
      </div>

      {/* HERO */}
      <section style={{ position: "relative", height: "52vh", minHeight: 320, overflow: "hidden" }}>
        <Image src="/matiere/bambou-02.png" alt="Tissu bambou M!LK" fill priority sizes="100vw"
          style={{ objectFit: "cover", filter: "brightness(0.45) saturate(0.6)" }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, rgba(45,26,14,0.1), rgba(45,26,14,0.92))` }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", padding: "0 0 44px" }}>
          <div style={{ padding: "0 5vw", width: "100%", boxSizing: "border-box" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 12 }}>{t("hero_eyebrow")}</div>
            <h1 style={{ margin: "0 0 12px", fontSize: "clamp(36px,6vw,72px)", fontWeight: 950, letterSpacing: -2, lineHeight: 1.05 }}>{t("hero_title")}</h1>
            <p style={{ margin: 0, fontSize: "clamp(14px,1.8vw,18px)", color: C.muted, maxWidth: 480, lineHeight: 1.65 }}>{t("hero_desc")}</p>
          </div>
        </div>
      </section>

      <Ticker />
      <Divider from={C.bg} to={C.light} />

      {/* INTRO */}
      <div style={{ background: C.light, padding: "56px 5vw" }}>
        <Reveal>
          <div style={{ maxWidth: 780, margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.2, color: C.dark }}>
              {t("intro_title")}
            </h2>
            <p style={{ margin: 0, fontSize: "clamp(15px,1.6vw,17px)", lineHeight: 1.8, color: "rgba(26,20,16,0.6)" }}>
              {t("intro_desc")}
            </p>
          </div>
        </Reveal>
      </div>

      {/* PROPRIÉTÉS */}
      <div style={{ background: C.light, padding: "20px 5vw 56px", maxWidth: 1200, margin: "0 auto" }}>
        {PROPRIETES.map((p, i) => (
          <div key={p.titre} className={`pb-grid${i % 2 !== 0 ? " pb-rev" : ""}`}>
            <Reveal>
              <div className="pb-img" style={{ position: "relative", borderRadius: 20, overflow: "hidden", aspectRatio: "4/3", boxShadow: "0 16px 48px rgba(0,0,0,0.15)" }}>
                <Image src={p.image} alt={p.imageAlt} fill sizes="50vw" style={{ objectFit: "cover", filter: "brightness(0.85) saturate(0.8)" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(45,26,14,0.55) 0%, transparent 55%)" }} />
                <div style={{ position: "absolute", bottom: 14, left: 14, background: C.amber, borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: "clamp(18px,2.5vw,24px)", fontWeight: 950, color: C.dark, lineHeight: 1 }}>{p.stat}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(26,20,16,0.75)", marginTop: 2, maxWidth: 80, lineHeight: 1.3 }}>{p.statLabel}</div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="pb-txt">
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: C.amber, marginBottom: 14 }}>{t("property_label")} {i + 1} / {PROPRIETES.length}</div>
                <h2 style={{ margin: "0 0 18px", fontSize: "clamp(22px,2.8vw,34px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.15, color: C.dark }}>{p.titre}</h2>
                <p style={{ margin: 0, fontSize: "clamp(14px,1.5vw,17px)", lineHeight: 1.8, color: "rgba(26,20,16,0.6)" }}>{p.texte}</p>
              </div>
            </Reveal>
          </div>
        ))}
      </div>

      <Divider from={C.light} to={C.bg} />

      {/* COMPARATIF */}
      <div style={{ background: C.bg, padding: "56px 5vw" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: C.amber, marginBottom: 10 }}>{t("comparatif_eyebrow")}</div>
            <h2 style={{ margin: 0, fontSize: "clamp(24px,4vw,44px)", fontWeight: 950, letterSpacing: -1, color: C.warm }}>{t("comparatif_title")}</h2>
          </div>
          <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
            <div className="pb-cmp" style={{ background: C.faint, padding: "16px 24px" }}>
              <div style={{ fontSize: "clamp(12px,1.2vw,14px)", color: C.muted, fontWeight: 700 }}>{t("col_critere")}</div>
              {[t("col_bambou"), t("col_coton"), t("col_synth")].map((h, idx) => (
                <div key={h} style={{ textAlign: "center", fontSize: "clamp(11px,1.1vw,14px)", fontWeight: 900, color: idx === 0 ? C.amber : C.muted }}>{h}</div>
              ))}
            </div>
            {COMPARATIF.map((row, i) => (
              <div key={row.critere} className="pb-cmp" style={{ padding: "14px 24px", background: i % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent", borderBottom: i < COMPARATIF.length - 1 ? `1px solid ${C.faint}` : "none", alignItems: "center" }}>
                <div style={{ fontSize: "clamp(13px,1.3vw,16px)", color: C.warm, fontWeight: 700 }}>{row.critere}</div>
                <div style={{ display: "flex", justifyContent: "center" }}><Check amber /></div>
                <div style={{ display: "flex", justifyContent: "center" }}>{row.coton ? <Check /> : <Cross />}</div>
                <div style={{ display: "flex", justifyContent: "center" }}>{row.synth ? <Check /> : <Cross />}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      <Divider from={C.bg} to={C.taupe} />

      {/* OEKO-TEX */}
      <div style={{ background: C.taupe, padding: "56px 5vw" }}>
        <div className="pb-otg" style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Reveal>
            <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", aspectRatio: "4/3", boxShadow: "0 16px 48px rgba(0,0,0,0.15)" }}>
              <Image src="/images/pourquoi-bambou/bambou-oekotex.webp" alt="Tissu bambou certifié OEKO-TEX Standard 100 — M!LK essentiels bébé" fill sizes="50vw" style={{ objectFit: "contain", background: "#c4ae94" }} />
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div style={{ display: "grid", gap: 18 }}>
              <div style={{ display: "inline-block", padding: "7px 14px", borderRadius: 99, background: "rgba(196,154,74,0.15)", color: C.amber, fontSize: 11, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase", width: "fit-content", border: `1px solid rgba(196,154,74,0.3)` }}>
                {t("oeko_badge")}
              </div>
              <h2 style={{ margin: 0, fontSize: "clamp(20px,3vw,34px)", fontWeight: 950, letterSpacing: -1, lineHeight: 1.15, color: C.dark }}>{t("oeko_title")}</h2>
              <p style={{ margin: 0, fontSize: "clamp(14px,1.5vw,17px)", lineHeight: 1.8, color: "rgba(26,20,16,0.65)" }}>{t("oeko_p1_pre")}<strong style={{ color: C.dark }}>{t("oeko_p1_bold")}</strong>{t("oeko_p1_post")}</p>
              <p style={{ margin: 0, fontSize: "clamp(14px,1.5vw,17px)", lineHeight: 1.8, color: "rgba(26,20,16,0.65)" }}>{t("oeko_p2")}</p>
              <Link href="/produits" style={{ display: "inline-block", padding: "13px 26px", borderRadius: 12, background: C.dark, color: C.warm, fontWeight: 900, fontSize: 14, textDecoration: "none", width: "fit-content" }}>{t("oeko_cta")}</Link>
            </div>
          </Reveal>
        </div>
      </div>

      <Divider from={C.taupe} to={C.light} />

      {/* FAQ */}
      <div style={{ background: C.light, padding: "56px 5vw" }}>
        <Reveal>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <h2 style={{ margin: "0 0 28px", fontSize: "clamp(22px,3.5vw,36px)", fontWeight: 950, letterSpacing: -1, color: C.dark }}>{t("faq_title")}</h2>
            {FAQ.map((faq, i, arr) => (
              <div key={faq.q} style={{ borderBottom: i < arr.length - 1 ? `1px solid rgba(26,20,16,0.1)` : "none", padding: "18px 0" }}>
                <h3 style={{ margin: "0 0 10px", fontSize: "clamp(15px,1.8vw,18px)", fontWeight: 900, color: C.dark, lineHeight: 1.35 }}>{faq.q}</h3>
                <p style={{ margin: 0, fontSize: "clamp(13px,1.4vw,16px)", lineHeight: 1.75, color: "rgba(26,20,16,0.6)" }}>{faq.r}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      <BigTextScroll text={t("bigtext")} speed={28} bg={C.light} />
      <Divider from={C.light} to={C.bg} />

      {/* CTA */}
      <section style={{ background: C.bg, padding: "56px 5vw", textAlign: "center" }}>
        <Reveal>
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(22px,3.5vw,36px)", fontWeight: 950, letterSpacing: -1, color: C.warm }}>{t("cta_title")}</h2>
            <p style={{ margin: "0 0 24px", fontSize: "clamp(14px,1.5vw,16px)", color: C.muted, lineHeight: 1.7 }}>{t("cta_desc")}</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/produits" style={{ padding: "14px 30px", borderRadius: 14, background: C.warm, color: C.dark, fontWeight: 900, fontSize: 15, textDecoration: "none" }}>{t("cta_collection")}</Link>
              <Link href="/qui-sommes-nous" style={{ padding: "14px 30px", borderRadius: 14, border: `1px solid ${C.faint}`, color: C.warm, fontWeight: 800, fontSize: 15, textDecoration: "none" }}>{t("cta_story")}</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}