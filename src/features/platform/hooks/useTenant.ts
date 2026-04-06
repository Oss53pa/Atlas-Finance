
import { useQuery } from '@tanstack/react-query';
import { getMyTenant, getMySubscriptions, getEnabledModules } from '../services/tenantService';

const isDev = import.meta.env.VITE_APP_ENV === 'development' || import.meta.env.VITE_DATA_MODE === 'local';

// ════════════════════════════════════════════════════════
// Entreprise fictive pour la démo
// ════════════════════════════════════════════════════════
const DEMO_TENANT = {
  id: 'demo-tenant-001',
  name: 'SANGA & Fils SARL',
  slug: 'sanga-fils',
  rccm: 'CI-ABJ-2025-B-08742',
  country: 'CI',
  currency: 'XOF',
  legal_form: 'SARL',
  status: 'active',
  billing_email: 'admin@sangafils.ci',
  plan: 'pro',
  created_at: '2025-06-15T10:00:00Z',
  updated_at: '2026-03-01T08:00:00Z',
  userRole: 'admin',
  userName: 'Amadou Sanga',
};

const DEMO_SUBSCRIPTIONS = [
  {
    id: 'sub-001',
    organization_id: 'demo-tenant-001',
    solution_id: 'sol-001',
    status: 'active',
    payment_method: 'mobile_money',
    current_period_start: '2026-03-01',
    current_period_end: '2026-04-01',
    seats_limit: 10,
    seats_used: 4,
    activated_at: '2025-06-15',
    solution: {
      id: 'sol-001',
      code: 'atlas-fna',
      name: 'Atlas F&A',
      description: 'ERP Comptable & Financier SYSCOHADA',
      icon: 'calculator',
      color: '#171717',
      price_monthly_xof: 25000,
      price_yearly_xof: 250000,
      price_monthly_eur: 39,
      price_yearly_eur: 390,
      features: ['Comptabilité SYSCOHADA', 'États financiers', 'Trésorerie', 'Fiscalité 17 pays', 'Audit IA PROPH3T'],
      is_active: true,
    },
  },
  {
    id: 'sub-002',
    organization_id: 'demo-tenant-001',
    solution_id: 'sol-002',
    status: 'trialing',
    payment_method: 'free',
    current_period_start: '2026-03-10',
    current_period_end: '2026-03-24',
    trial_ends_at: '2026-03-24',
    seats_limit: 5,
    seats_used: 1,
    solution: {
      id: 'sol-002',
      code: 'liass-pilot',
      name: "Liass'Pilot",
      description: 'Liasse fiscale automatique DSF/DGI',
      icon: 'file-text',
      color: '#0891b2',
      price_monthly_xof: 15000,
      price_yearly_xof: 150000,
      price_monthly_eur: 25,
      price_yearly_eur: 250,
      features: ['Liasse fiscale auto', 'DSF conforme DGI', 'Télédéclaration'],
      is_active: true,
    },
  },
];

const DEMO_MODULES = ['atlas-fna', 'liass-pilot'];

export function useTenant() {
  const { data: tenant, isLoading } = useQuery({
    queryKey: ['my-tenant'],
    queryFn: async () => {
      if (isDev) return DEMO_TENANT;
      return getMyTenant();
    },
    staleTime: 60_000,
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: async () => {
      if (isDev) return DEMO_SUBSCRIPTIONS;
      return getMySubscriptions();
    },
    staleTime: 60_000,
    enabled: !!tenant,
  });

  const { data: enabledModules = [] } = useQuery({
    queryKey: ['enabled-modules', tenant?.id],
    queryFn: async () => {
      if (isDev) return DEMO_MODULES;
      return getEnabledModules(tenant!.id);
    },
    staleTime: 60_000,
    enabled: !!tenant?.id,
  });

  return {
    tenant,
    subscriptions,
    enabledModules,
    isLoading,
    userRole: tenant?.userRole || 'collaborateur',
    userName: tenant?.userName || 'Utilisateur',
    isAdmin: ['superadmin', 'admin'].includes(tenant?.userRole || ''),
    isSuperAdmin: tenant?.userRole === 'superadmin',
  };
}
