// @ts-nocheck

/**
 * Service d'onboarding Atlas Studio.
 * Gère : création org, solutions, subscriptions, invitations.
 */
import { supabase } from '../../../lib/supabase';
import type { Organization, Solution, Subscription, Invitation, TeamMember } from '../types';

// ============================================================================
// SOLUTIONS
// ============================================================================

export async function getSolutions(): Promise<Solution[]> {
  const { data, error } = await supabase
    .from('solutions')
    .select('*')
    .order('display_order');
  if (error) throw new Error(error.message);
  return (data || []).map(s => ({ ...s, features: s.features || [] }));
}

// ============================================================================
// ORGANIZATION
// ============================================================================

export async function getMyOrganization(): Promise<Organization | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) return null;

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.organization_id)
    .single();

  return org || null;
}

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export async function getMySubscriptions(): Promise<Subscription[]> {
  const org = await getMyOrganization();
  if (!org) return [];

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, solution:solutions(*)')
    .eq('organization_id', org.id);

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createSubscription(
  solutionId: string,
  paymentMethod: 'free' | 'mobile_money' | 'stripe' = 'free'
): Promise<Subscription> {
  const org = await getMyOrganization();
  if (!org) throw new Error('Aucune organisation trouvée');

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      organization_id: org.id,
      solution_id: solutionId,
      status: 'trialing',
      payment_method: paymentMethod,
      trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      current_period_start: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function hasActiveSubscription(solutionCode: string): Promise<boolean> {
  const subs = await getMySubscriptions();
  return subs.some(s =>
    s.solution?.code === solutionCode &&
    (s.status === 'active' || s.status === 'trialing')
  );
}

// ============================================================================
// INVITATIONS
// ============================================================================

export async function sendInvitation(email: string, roleCode: string): Promise<Invitation> {
  const org = await getMyOrganization();
  if (!org) throw new Error('Aucune organisation trouvée');

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      organization_id: org.id,
      email,
      role_code: roleCode,
      invited_by: user?.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Try to send email via Edge Function (non-blocking)
  try {
    await supabase.functions.invoke('send-invitation', {
      body: {
        email,
        organization_name: org.name,
        inviter_name: user?.email,
        token: data.token,
        role: roleCode,
      },
    });
  } catch (e) {
  }

  return data;
}

export async function getInvitationByToken(token: string): Promise<Invitation | null> {
  const { data } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();
  return data || null;
}

export async function acceptInvitation(token: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');

  const invitation = await getInvitationByToken(token);
  if (!invitation) throw new Error('Invitation invalide ou expirée');

  // Update profile with org + role
  const { data: role } = await supabase
    .from('roles')
    .select('id')
    .eq('code', invitation.role_code)
    .single();

  await supabase
    .from('profiles')
    .update({
      organization_id: invitation.organization_id,
      role_id: role?.id,
    })
    .eq('id', user.id);

  // Mark invitation as accepted
  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('token', token);
}

// ============================================================================
// TEAM
// ============================================================================

export async function getTeamMembers(): Promise<TeamMember[]> {
  const org = await getMyOrganization();
  if (!org) return [];

  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, is_active, created_at, role:roles(code)')
    .eq('organization_id', org.id);

  return (data || []).map(p => ({
    id: p.id,
    email: p.email || '',
    full_name: p.full_name || p.email || '',
    role_code: (p.role as unknown as { code?: string })?.code || 'user',
    is_active: p.is_active,
    created_at: p.created_at,
  }));
}

export async function getPendingInvitations(): Promise<Invitation[]> {
  const org = await getMyOrganization();
  if (!org) return [];

  const { data } = await supabase
    .from('invitations')
    .select('*')
    .eq('organization_id', org.id)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  return data || [];
}
