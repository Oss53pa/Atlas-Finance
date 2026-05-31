-- Fix overly permissive invitations policy.
-- The previous policy "Anyone can read invitation by token" used USING(true),
-- allowing any authenticated user to read any invitation regardless of org membership.
-- Replace with a scoped policy that only allows members of the same organization to read invitations.

DROP POLICY IF EXISTS "Anyone can read invitation by token" ON invitations;

CREATE POLICY invitations_read_own_org ON invitations
  FOR SELECT USING (organization_id IN (SELECT auth_company_ids()));
