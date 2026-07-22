-- ═══════════════════════════════════════════════════════════════════════════
-- 020_profiles_update_policy.sql
-- VERSIONNE la policy RLS "Users can update own profile" sur public.profiles,
-- appliquée MANUELLEMENT en prod pour FERMER une escalade de privilège : l'inscription
-- écrit dans `profiles` côté client (clé anon) et la table porte `is_admin` ; sans WITH
-- CHECK, un utilisateur pouvait forger `update profiles set is_admin=true where id=<son uid>`
-- via PostgREST et devenir admin. Le WITH CHECK ci-dessous FIGE is_admin et parrain_code.
--
-- Absente des migrations jusqu'ici (006_rls_lockdown ne couvre PAS profiles ; 014 n'y crée
-- aucune policy) → sans ce fichier, un nouvel environnement ré-ouvrirait la faille.
--
-- Idempotent, non destructif.
--
-- ⚠️ À CONFIRMER : ce fichier reproduit l'INTENTION de la policy appliquée en prod. Avant de
--    le considérer comme la source de vérité, comparer avec la définition LIVE :
--      select polname,
--             pg_get_expr(polqual,      polrelid) as using_expr,
--             pg_get_expr(polwithcheck, polrelid) as with_check_expr
--      from pg_policy where polrelid = 'public.profiles'::regclass;
--    Ajuster ci-dessous si la version prod diffère (nom de policy, colonnes figées, rôle).
-- ═══════════════════════════════════════════════════════════════════════════

-- La policy n'a d'effet que si RLS est active sur profiles (profiles est absente du
-- lockdown 006). Idempotent : ré-activer n'a aucun effet si déjà actif.
alter table public.profiles enable row level security;

drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile" on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Fige les colonnes sensibles : la NOUVELLE valeur doit rester identique à la valeur
    -- courante en base (sous-requête = valeur d'avant l'UPDATE) → l'utilisateur ne peut ni
    -- s'auto-promouvoir admin, ni modifier son code parrain.
    and is_admin     is not distinct from (select p.is_admin     from public.profiles p where p.id = auth.uid())
    and parrain_code is not distinct from (select p.parrain_code from public.profiles p where p.id = auth.uid())
  );

-- ── Défense en profondeur (RECOMMANDÉ, cohérent avec l'intention) ────────────
-- Retirer carrément le privilège d'UPDATE au niveau colonne sur is_admin/parrain_code
-- rend l'escalade impossible même en cas de policy trop permissive. Décommenter après
-- avoir confirmé que ça ne casse aucun flux serveur légitime (le service_role bypasse RLS
-- ET les GRANTs colonne, donc les écritures serveur restent possibles) :
-- revoke update (is_admin, parrain_code) on public.profiles from anon, authenticated;

-- ── Vérifs post-exécution suggérées ─────────────────────────────────────────
--   -- 1) La policy existe et fige bien les colonnes :
--   select polname, pg_get_expr(polwithcheck, polrelid)
--     from pg_policy where polrelid = 'public.profiles'::regclass;
--   -- 2) Test manuel (avec un JWT utilisateur non-admin) : l'update suivant DOIT échouer
--   --    update public.profiles set is_admin = true where id = auth.uid();
-- ═══════════════════════════════════════════════════════════════════════════
