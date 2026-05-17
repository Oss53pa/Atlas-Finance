
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

// Lock no-op : @supabase/gotrue-js essaie d'utiliser Navigator.locks pour
// coordonner l'auth entre onglets. Certains contextes (iframes sandboxed,
// vieux navigateurs, modes privés) retournent un lock null et le SDK
// déclenche un warning console répétitif. On force une implémentation
// no-op qui exécute simplement la fonction sans verrou. La coordination
// cross-tab reste fonctionnelle via les events `onAuthStateChange` de
// Supabase + le storage event de localStorage.
const noopLock = async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
  return await fn();
};

// Create client only if real keys exist, otherwise use a dummy URL (client won't be called)
export const supabase: SupabaseClient<Database> = createClient<Database>(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
  {
    auth: {
      autoRefreshToken: isSupabaseConfigured,
      persistSession: isSupabaseConfigured,
      detectSessionInUrl: isSupabaseConfigured,
      // localStorage : persiste entre fermetures d'onglet et navigateur.
      // (sessionStorage purgeait la session a chaque fermeture, ce qui forcait
      // l'utilisateur a se reconnecter sans cesse.)
      storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
      storageKey: 'atlas-fna-auth',
      // Désactive le Navigator.locks (warning console répétitif sur navigateurs
      // non-compliants ou iframes). Le lock est remplacé par une no-op.
      lock: noopLock as any,
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
// Stratégie tolérante en 4 niveaux :
//  1) select('*, role:roles(*), company:societes(*)') -- idéal, schéma complet
//  2) select('*')                                       -- profil sans embeds
//  3) fetch séparé de roles / societes si role_id / societe_id présent
//  4) fallback complet construit depuis user_metadata Supabase Auth
// Aucune étape ne throw -- le caller ne doit jamais déconnecter le user.
export async function getUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const meta = (user.user_metadata as Record<string, unknown> | undefined) || {};
  const fallbackProfile: Record<string, any> = {
    id: user.id,
    email: user.email,
    full_name: (meta.full_name as string) || (meta.name as string) || user.email,
    first_name: (meta.first_name as string) || undefined,
    last_name: (meta.last_name as string) || undefined,
    is_active: true,
    role: { code: (meta.role as string) || 'user' },
    company: undefined,
    company_id: (meta.company_id as string) || undefined,
    photo_url: (meta.photo_url as string) || (meta.avatar_url as string) || undefined,
    phone: (meta.phone as string) || undefined,
    department: (meta.department as string) || undefined,
    two_factor_enabled: false,
  };

  // Étape 1 : essai avec embeds complets (idéal)
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, role:roles(*), company:societes(*)')
      .eq('id', user.id)
      .maybeSingle();
    if (!error && data) return data;
  } catch (_e) { /* embed pas dispo -- on passe à l'étape 2 */ }

  // Étape 2 : profile brut sans embed
  let baseProfile: Record<string, any> | null = null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (!error && data) baseProfile = data as Record<string, any>;
  } catch (_e) { /* table absente -- fallback complet */ }

  if (!baseProfile) return fallbackProfile;

  // Étape 3 : compléter avec roles / societes en best-effort
  let roleData: Record<string, any> | undefined;
  const roleId = baseProfile.role_id || baseProfile.roleId;
  if (roleId) {
    try {
      const { data } = await supabase.from('roles').select('*').eq('id', roleId).maybeSingle();
      if (data) roleData = data as Record<string, any>;
    } catch (_e) { /* roles table absente -- ignore */ }
  }

  let companyData: Record<string, any> | undefined;
  const companyId = baseProfile.company_id || baseProfile.societe_id;
  if (companyId) {
    try {
      const { data } = await supabase.from('societes').select('*').eq('id', companyId).maybeSingle();
      if (data) companyData = data as Record<string, any>;
    } catch (_e) { /* ignore */ }
  }

  return {
    ...baseProfile,
    role: roleData || { code: baseProfile.role || (meta.role as string) || 'user' },
    company: companyData,
  };
}

// Helper to get user permissions — tolerant
// Si la chaîne d'embeds roles -> role_permissions -> permissions n'existe
// pas dans la DB (400), on retourne [] silencieusement et l'app continue
// avec les permissions par défaut (front-side: tout ouvert pour role 'user').
export async function getUserPermissions(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role:roles(permissions:role_permissions(permission:permissions(code)))')
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
