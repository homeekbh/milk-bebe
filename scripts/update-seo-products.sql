-- ════════════════════════════════════════════════════════════════
-- M!LK — SEO : seo_title + seo_description des 13 produits
-- À exécuter MANUELLEMENT dans Supabase Studio (SQL Editor).
-- NE PAS exécuter automatiquement.
--
-- Titles courts SANS suffixe marque : le title.template du layout racine
-- ajoute déjà « | M!LK — Essentiels bébé bambou OEKO-TEX ». Descriptions ≤ 155 car.
-- Une fois ces valeurs en base, le fallback par catégorie de
-- app/[locale]/produits/[slug]/layout.tsx n'est plus utilisé pour ces produits.
-- ════════════════════════════════════════════════════════════════

-- ── Pyjamas (4) ──────────────────────────────────────────────────
UPDATE products SET
  seo_title       = 'Pyjama bébé bambou Éclair — grenouillère OEKO-TEX',
  seo_description = 'Pyjama bébé bambou certifié OEKO-TEX. Grenouillère nourrisson ultra-douce. Double zip inversé + moufles intégrées. Livraison offerte dès 60€.'
WHERE slug = 'pyjama-bambou-eclair';

UPDATE products SET
  seo_title       = 'Pyjama bébé bambou Smileys — grenouillère OEKO-TEX',
  seo_description = 'Pyjama bébé bambou certifié OEKO-TEX. Grenouillère nourrisson ultra-douce. Double zip inversé + moufles intégrées. Livraison offerte dès 60€.'
WHERE slug = 'pyjama-bambou-smileys';

UPDATE products SET
  seo_title       = 'Pyjama bébé bambou Damier — grenouillère OEKO-TEX',
  seo_description = 'Pyjama bébé bambou certifié OEKO-TEX. Grenouillère nourrisson ultra-douce. Double zip inversé + moufles intégrées. Livraison offerte dès 60€.'
WHERE slug = 'pyjama-bambou-damier';

UPDATE products SET
  seo_title       = 'Pyjama bébé bambou Uni — grenouillère OEKO-TEX',
  seo_description = 'Pyjama bébé bambou certifié OEKO-TEX. Grenouillère nourrisson ultra-douce. Double zip inversé + moufles intégrées. Livraison offerte dès 60€.'
WHERE slug = 'pyjama-bambou-uni';

-- ── Bodies (3) ───────────────────────────────────────────────────
UPDATE products SET
  seo_title       = 'Body bébé bambou Éclair — body nourrisson OEKO-TEX',
  seo_description = 'Body bébé bambou certifié OEKO-TEX. Body nourrisson hypoallergénique. Encolure enveloppe + moufles intégrées. Livraison offerte dès 60€.'
WHERE slug = 'body-bambou-eclair';

UPDATE products SET
  seo_title       = 'Body bébé bambou Smileys — body nourrisson OEKO-TEX',
  seo_description = 'Body bébé bambou certifié OEKO-TEX. Body nourrisson hypoallergénique. Encolure enveloppe + moufles intégrées. Livraison offerte dès 60€.'
WHERE slug = 'body-bambou-smileys';

UPDATE products SET
  seo_title       = 'Body bébé bambou Damier — body nourrisson OEKO-TEX',
  seo_description = 'Body bébé bambou certifié OEKO-TEX. Body nourrisson hypoallergénique. Encolure enveloppe + moufles intégrées. Livraison offerte dès 60€.'
WHERE slug = 'body-bambou-damier';

-- ── Gigoteuses (3) ───────────────────────────────────────────────
UPDATE products SET
  seo_title       = 'Gigoteuse bébé bambou Éclair — turbulette OEKO-TEX',
  seo_description = 'Gigoteuse bébé bambou certifié OEKO-TEX. Turbulette nourrisson respirante à nouer. Zéro bouton, change facile la nuit. Livraison offerte dès 60€.'
WHERE slug = 'gigoteuse-eclair';

UPDATE products SET
  seo_title       = 'Gigoteuse bébé bambou Smileys — turbulette OEKO-TEX',
  seo_description = 'Gigoteuse bébé bambou certifié OEKO-TEX. Turbulette nourrisson respirante à nouer. Zéro bouton, change facile la nuit. Livraison offerte dès 60€.'
WHERE slug = 'gigoteuse-smileys';

UPDATE products SET
  seo_title       = 'Gigoteuse bébé bambou Damier — turbulette OEKO-TEX',
  seo_description = 'Gigoteuse bébé bambou certifié OEKO-TEX. Turbulette nourrisson respirante à nouer. Zéro bouton, change facile la nuit. Livraison offerte dès 60€.'
WHERE slug = 'gigoteuse-damier';

-- ── Lange (1) ────────────────────────────────────────────────────
UPDATE products SET
  seo_title       = 'Lange bébé bambou Terracotta — emmaillotage OEKO-TEX',
  seo_description = 'Lange bébé bambou 120×120 cm certifié OEKO-TEX. Emmaillotage nourrisson multi-usage. Livraison offerte dès 60€.'
WHERE slug = 'lange-bambou-terracotta';

-- ── Bonnet (1) ───────────────────────────────────────────────────
UPDATE products SET
  seo_title       = 'Bonnet bébé bambou Terracotta — bonnet nourrisson',
  seo_description = 'Bonnet bébé bambou certifié OEKO-TEX. Bonnet nourrisson anatomique ultra-doux. Livraison offerte dès 60€.'
WHERE slug = 'bonnet-bambou-terracotta';

-- ── Bandeau (1) ──────────────────────────────────────────────────
UPDATE products SET
  seo_title       = 'Bandeau bébé bambou Terracotta — accessoire nourrisson',
  seo_description = 'Bandeau bébé bambou certifié OEKO-TEX. Accessoire nourrisson doux. Livraison offerte dès 60€.'
WHERE slug = 'bandeau-noeud-terracotta';
