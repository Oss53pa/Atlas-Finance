-- ============================================================================
-- Paramètres · Lot B·2 — Backfill canonique de user_role (bascule étape 2).
--
-- Constat (base live 2026-08-02) : les seuls profils enrôlables (tenant valide)
-- sont déjà dans user_role et ALIGNÉS (2/2 admin). Les 5 comptes 'client' ont
-- company_id = NULL → non enrôlables (pas de tenant) ET déjà bloqués par
-- l'enforcement legacy ('client' ∉ allowedRoles) → la bascule ne change RIEN pour
-- eux. Aucune ligne nouvelle n'est créée aujourd'hui.
--
-- Cette migration établit néanmoins le backfill de RÉFÉRENCE, correct pour l'avenir :
--   1. NORMALISE user_role.role_code vers le canonique (le backfill 107 stockait le
--      rôle BRUT ; un futur 'client' avec tenant y serait mal enrôlé → accès vide).
--   2. Backfill IDEMPOTENT canonique de tout profil à tenant valide et rôle résolu.
-- Idempotent et sûr : aucune ligne modifiée si l'état est déjà canonique.
-- ============================================================================

-- 1. Normaliser les role_code existants vers le vocabulaire canonique.
update public.user_role ur
set role_code = public.canonical_role('user_role', ur.role_code)
where public.canonical_role('user_role', ur.role_code) is not null
  and public.canonical_role('user_role', ur.role_code) <> ur.role_code;

-- 2. Backfill canonique idempotent : role_code = rôle canonique du profil.
--    Exclut les rôles non résolus (canonical_role NULL) et les profils sans tenant.
insert into public.user_role(user_id, tenant_id, role_code)
select p.id, p.company_id, public.canonical_role('profiles', p.role)
from public.profiles p
where p.company_id is not null and p.role is not null
  and public.canonical_role('profiles', p.role) is not null
  and exists (select 1 from public.societes s where s.id = p.company_id)
on conflict (user_id, tenant_id, role_code) where delegue_de is null do nothing;
