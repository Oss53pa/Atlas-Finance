-- ============================================================================
-- Fix profiles sans company_id : lier à la première societe disponible
-- Bug : au signup, societes était vide → company_id = NULL dans profiles
-- ============================================================================

-- 1. Corriger les profils existants sans company_id
UPDATE profiles p
SET company_id = (SELECT id FROM societes ORDER BY created_at LIMIT 1)
WHERE p.company_id IS NULL
  AND EXISTS (SELECT 1 FROM societes);

-- 2. Renforcer handle_new_user : si societes vide au moment du signup,
--    créer automatiquement une societe par défaut pour l'organisation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id     UUID;
  v_org_name   TEXT;
  v_role_id    UUID;
  v_company_id UUID;
  v_invite_token TEXT;
BEGIN
  v_invite_token := NEW.raw_user_meta_data->>'invite_token';

  IF v_invite_token IS NOT NULL THEN
    SELECT organization_id INTO v_org_id FROM invitations
    WHERE token = v_invite_token AND accepted_at IS NULL AND expires_at > now();
    IF v_org_id IS NOT NULL THEN
      SELECT id INTO v_role_id FROM roles
      WHERE code = (SELECT role_code FROM invitations WHERE token = v_invite_token)
      LIMIT 1;
      UPDATE invitations SET accepted_at = now() WHERE token = v_invite_token;
    END IF;
  END IF;

  IF v_org_id IS NULL THEN
    v_org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', 'Mon Organisation');
    INSERT INTO organizations (name, slug, billing_email, created_by)
    VALUES (v_org_name, generate_slug(v_org_name), NEW.email, NEW.id)
    RETURNING id INTO v_org_id;
  END IF;

  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id FROM roles WHERE code = 'admin' LIMIT 1;
  END IF;

  -- Chercher la société liée à l'organisation, sinon créer une par défaut
  SELECT id INTO v_company_id FROM societes
  WHERE created_by = NEW.id OR organization_id = v_org_id
  ORDER BY created_at LIMIT 1;

  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id FROM societes ORDER BY created_at LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    -- Créer une société par défaut si aucune n'existe
    INSERT INTO societes (
      nom, pays, devise, regime_fiscal, created_by,
      forme_juridique, secteur_activite, is_active
    ) VALUES (
      COALESCE(NEW.raw_user_meta_data->>'organization_name', 'Ma Société'),
      'Cote d''Ivoire', 'XOF', 'Reel normal', NEW.id,
      'SARL', 'Autre', true
    ) RETURNING id INTO v_company_id;
  END IF;

  INSERT INTO public.profiles (
    id, email, username, first_name, last_name, full_name,
    role_id, company_id, organization_id, is_active
  ) VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'first_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'first_name', SPLIT_PART(NEW.email, '@', 1)),
    v_role_id, v_company_id, v_org_id, true
  )
  ON CONFLICT (id) DO UPDATE SET
    company_id    = EXCLUDED.company_id,
    organization_id = EXCLUDED.organization_id,
    role_id       = COALESCE(profiles.role_id, EXCLUDED.role_id),
    is_active     = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- 3. S'assurer que le trigger est bien en place
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
