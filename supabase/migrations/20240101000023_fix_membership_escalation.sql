-- ── Fix privilege-escalation in activate_company_membership ──────────────────
-- Migration : 20240101000023_fix_membership_escalation.sql
--
-- PROBLÈME : La version précédente permettait à n'importe quel utilisateur
-- authentifié de s'ajouter comme 'Administrateur' dans n'importe quelle société.
--
-- CORRECTION : Deux guards ajoutés avant l'INSERT :
--   1. La société doit être orpheline (aucun Administrateur existant).
--   2. L'appelant doit avoir un profil lié à cette société (profiles.company_id).

CREATE OR REPLACE FUNCTION activate_company_membership(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_admin_count INTEGER;
  v_profile_match INTEGER;
BEGIN
  -- Guard 1 : la société ne doit pas déjà avoir un Administrateur
  SELECT COUNT(*)
    INTO v_admin_count
    FROM user_companies
   WHERE company_id = p_company_id
     AND role = 'Administrateur';

  IF v_admin_count > 0 THEN
    RAISE EXCEPTION 'Company already has an administrator. Contact your admin to be invited.';
  END IF;

  -- Guard 2 : l'appelant doit avoir un profil associé à cette société
  SELECT COUNT(*)
    INTO v_profile_match
    FROM profiles
   WHERE id = auth.uid()
     AND company_id = p_company_id;

  IF v_profile_match = 0 THEN
    RAISE EXCEPTION 'You are not associated with this company.';
  END IF;

  -- Les deux guards sont passés : insertion légitime (onboarding initial)
  INSERT INTO user_companies(user_id, company_id, role)
  VALUES (auth.uid(), p_company_id, 'Administrateur')
  ON CONFLICT (user_id, company_id) DO NOTHING;
END;
$$;
