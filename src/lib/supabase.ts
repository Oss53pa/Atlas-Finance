
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
      storageKey: 'atlas-fna-auth',
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
// Tolerant : si la table profiles n'existe pas, si la ligne manque,
// ou si RLS bloque l'accès -> on construit un profil minimal à partir
// des métadonnées Supabase Auth pour ne pas bloquer l'utilisateur.
export async function getUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Profil minimal de secours, construit depuis auth.users uniquement
  const metaName = (user.user_metadata as Record<string, unknown> | undefined) || {};
  const fallbackProfile = {
    id: user.id,
    email: user.email,
    full_name: (metaName.full_name as string) || (metaName.name as string) || user.email,
    first_name: (metaName.first_name as string) || undefined,
    last_name: (metaName.last_name as string) || undefined,
    is_active: true,
    role: { code: (metaName.role as string) || 'user' },
    company: undefined,
    company_id: (metaName.company_id as string) || undefined,
    photo_url: (metaName.photo_url as string) || (metaName.avatar_url as string) || undefined,
    phone: (metaName.phone as string) || undefined,
    department: (metaName.department as string) || undefined,
    two_factor_enabled: false,
  };

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        *,
        role:roles(*),
        company:societes(*)
      `)
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      // 406 / 404 / RLS / table missing -> on retombe sur le fallback
      // sans logger en console.error pour ne pas polluer le Sentry du user.
      return fallbackProfile;
    }
    return profile ?? fallbackProfile;
  } catch (_e) {
    return fallbackProfile;
  }
}

// Helper to get user permissions — tolerant aussi
export async function getUserPermissions(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  try {
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
      .maybeSingle();

    if (error || !data) return [];

    const permissions = (data as unknown as { role?: { permissions?: Array<Record<string, Record<string, string>>> } })?.role?.permissions?.map(
      (rp: Record<string, Record<string, string>>) => rp.permission?.code
    ).filter(Boolean) || [];

    return permissions;
  } catch (_e) {
    return [];
  }
}
