// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { getMyTenant, getMySubscriptions, getEnabledModules } from '../services/tenantService';

export function useTenant() {
  const { data: tenant, isLoading } = useQuery({
    queryKey: ['my-tenant'],
    queryFn: getMyTenant,
    staleTime: 60_000,
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: getMySubscriptions,
    staleTime: 60_000,
    enabled: !!tenant,
  });

  const { data: enabledModules = [] } = useQuery({
    queryKey: ['enabled-modules', tenant?.id],
    queryFn: () => getEnabledModules(tenant!.id),
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
