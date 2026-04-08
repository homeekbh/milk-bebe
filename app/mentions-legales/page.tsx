import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions Légales | M!LK",
  description: "Mentions légales de M!LK — boutique de vêtements bébé en bambou premium.",
};

export default function MentionsLegalesPage() {
  return (
    <div style={{ background: "#f6f4f1", minHeight: "100vh", paddingTop: 100, paddingBottom: 100 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px" }}>

        <div style={{ marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase", opacity: 0.35, marginBottom: 16 }}>
            Informations légales
          </div>
          <h1 style={{ margin: "0 0 16px", fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 950, letterSpacing: -1.5, lineHeight: 1.1 }}>
            Mentions légales
          </h1>
          <div style={{ fontSize: 14, opacity: 0.5 }}>
            Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>

          {/* Éditeur */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: "28px 32px" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 900 }}>Éditeur du site</h2>
            <div style={{ display: "grid", gap: 8, fontSize: 14, lineHeight: 1.7, opacity: 0.7 }}>
              <div><strong>Dénomination sociale :</strong> M!LK</div>
              <div><strong>Forme juridique :</strong> À compléter</div>
              <div><strong>Siège social :</strong> À compléter</div>
              <div><strong>SIRET :</strong> À compléter</div>
              <div><strong>Capital social :</strong> À compléter</div>
              <div><strong>Email :</strong> contact@milk-bebe.fr</div>
              <div><strong>Directeur de la publication :</strong> À compléter</div>
            </div>
          </div>

          {/* Hébergement */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: "28px 32px" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 900 }}>Hébergement</h2>
            <div style={{ display: "grid", gap: 8, fontSize: 14, lineHeight: 1.7, opacity: 0.7 }}>
              <div><strong>Hébergeur :</strong> Vercel Inc.</div>
              <div><strong>Adresse :</strong> 340 Pine Street, Suite 701, San Francisco, CA 94104, USA</div>
              <div><strong>Site :</strong> vercel.com</div>
            </div>
          </div>

          {/* Propriété intellectuelle */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: "28px 32px" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 900 }}>Propriété intellectuelle</h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, opacity: 0.7 }}>
              L'ensemble du contenu de ce site (textes, images, logos, visuels, structure) est la propriété exclusive de M!LK et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle. Toute reproduction, représentation, modification ou exploitation, même partielle, sans autorisation préalable écrite est strictement interdite.
            </p>
          </div>

          {/* Données personnelles */}
          <div id="donnees-personnelles" style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: "28px 32px" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 900 }}>Données personnelles (RGPD)</h2>
            <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.8, opacity: 0.7 }}>
              Les données personnelles collectées sur ce site (nom, prénom, email, adresse de livraison) sont traitées par M!LK dans le cadre de la gestion des commandes et, avec votre consentement, de l'envoi de communications commerciales.
            </p>
            <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.8, opacity: 0.7 }}>
              Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :
            </p>
            <ul style={{ margin: "0 0 12px", paddingLeft: 20, fontSize: 14, lineHeight: 1.8, opacity: 0.7 }}>
              <li>Droit d'accès à vos données</li>
              <li>Droit de rectification</li>
              <li>Droit à l'effacement (« droit à l'oubli »)</li>
              <li>Droit à la limitation du traitement</li>
              <li>Droit à la portabilité</li>
              <li>Droit d'opposition</li>
            </ul>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, opacity: 0.7 }}>
              Pour exercer ces droits, contactez-nous à : <strong>contact@milk-bebe.fr</strong>
            </p>
          </div>

          {/* Cookies */}
          <div id="cookies" style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: "28px 32px" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 900 }}>Politique de cookies</h2>
            <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.8, opacity: 0.7 }}>
              Ce site utilise des cookies techniques nécessaires à son fonctionnement (gestion du panier, session utilisateur) et des cookies analytiques pour mesurer l'audience.
            </p>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, opacity: 0.7 }}>
              Vous pouvez à tout moment désactiver les cookies dans les paramètres de votre navigateur. La désactivation des cookies techniques peut altérer le fonctionnement du site.
            </p>
          </div>

          {/* Responsabilité */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: "28px 32px" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 900 }}>Limitation de responsabilité</h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, opacity: 0.7 }}>
              M!LK ne saurait être tenu responsable des dommages directs ou indirects résultant de l'utilisation du site. Les informations présentes sur le site sont fournies à titre indicatif et peuvent être modifiées à tout moment. M!LK se réserve le droit de modifier, suspendre ou interrompre l'accès au site à tout moment.
            </p>
          </div>

          {/* Droit applicable */}
          <div style={{ background: "#fff", borderRadius: "4px 4px 16px 16px", border: "1px solid rgba(0,0,0,0.07)", padding: "28px 32px" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 900 }}>Droit applicable</h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, opacity: 0.7 }}>
              Le présent site et ses mentions légales sont soumis au droit français. En cas de litige, les tribunaux français seront seuls compétents.
            </p>
          </div>

        </div>

        <div style={{ marginTop: 48, display: "flex", gap: 14, flexWrap: "wrap" }}>
          <Link href="/cgv" style={{ padding: "12px 24px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", fontWeight: 700, fontSize: 14, textDecoration: "none", color: "#111" }}>
            Voir les CGV →
          </Link>
          <Link href="/" style={{ padding: "12px 24px", borderRadius: 12, background: "#111", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}