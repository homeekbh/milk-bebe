-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 015 — Parrainage : seuil unique → barème PROGRESSIF par palier
-- ⚠️  À EXÉCUTER MANUELLEMENT par Bou dans Supabase Studio.
--
-- Remplace le seuil unique `seuil_parrain` (100€, débloquait les 4 récompenses
-- d'un coup) par `seuils_parrain numeric[]` = un seuil par position (1ère, 2e,
-- 3e, 4e récompense). Défaut {60,80,90,100}.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ÉTAPE A (à exécuter AVANT / au moment du déploiement du nouveau code) ────
-- Ajout de la nouvelle colonne. Le défaut remplit automatiquement la ligne
-- singleton existante (id=1) avec {60,80,90,100}.
alter table parrainage_settings
  add column if not exists seuils_parrain numeric[] not null default '{60,80,90,100}';

-- (Filet : si la ligne singleton avait été créée sans le défaut, on la garnit.)
update parrainage_settings
  set seuils_parrain = '{60,80,90,100}'
  where id = 1 and (seuils_parrain is null or array_length(seuils_parrain, 1) is null);

-- ── ÉTAPE B (à exécuter APRÈS confirmation que le nouveau code est déployé) ──
-- Le nouveau code ne lit QUE `seuils_parrain` → `seuil_parrain` devient une
-- colonne morte. On la supprime pour garder une seule source de vérité.
-- ⚠️ Ne PAS lancer cette ligne tant que l'ancien code (seuil unique) est encore
--    en ligne : il lit `seuil_parrain`. Décommenter et exécuter une fois le
--    déploiement Vercel terminé.
--
--   alter table parrainage_settings drop column if exists seuil_parrain;

-- ═══════════════════════════════════════════════════════════════════════════
-- Vérif post-étape A : select seuils_parrain from parrainage_settings;  -- → {60,80,90,100}
-- ═══════════════════════════════════════════════════════════════════════════
