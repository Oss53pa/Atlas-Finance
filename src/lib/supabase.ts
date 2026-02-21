import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Detect if real Supabase keys are configured
export const isSupabaseConfigured =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  !supabaseUrl.includes('YOUR_PROJECT_ID') &&
  !supabaseAnonKey.includes('YOUR_ANON_KEY');

// Create client only if real keys exist, otherwise use a dummy URL (client won't be called)
export const supabase: SupabaseClient<Database> = createClient<Database>(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
  {
    auth: {
      autoRefreshToken: isSupabaseConfigured,
      persistSession: isSupabaseConfigured,
      detectSessionInUrl: isSupabaseConfigured,
      storage: typeof sessionStorage !== 'undefined' ? sessionStorage : undefined,
      storageKey: 'atlas-finance-auth',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Helper to get the current session
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

// Helper to get the current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

// Helper to get user profile with role and company
export async function getUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      *,
      role:roles(*),
      company:societes(*)
    `)
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return profile;
}

// Helper to get user permissions
export async function getUserPermissions(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      role:roles(
        permissions:role_permissions(
          permission:permissions(code)
        )
      )
    `)
    .eq('id', user.id)
    .single();

  if (error) return [];

  const permissions = data?.role?.permissions?.map(
    (rp: Record<string, Record<string, string>>) => rp.permission?.code
  ).filter(Boolean) || [];

  return permissions;
}
