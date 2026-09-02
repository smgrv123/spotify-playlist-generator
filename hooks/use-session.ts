import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { API_ROUTES, QUERY_KEYS } from '@/lib/constants';
import type { SessionResponse } from '@/lib/types';

export function useSession() {
  const { data, isLoading, error } = useQuery<SessionResponse>({
    queryKey: QUERY_KEYS.session.all,
    queryFn: () => apiFetch<SessionResponse>(API_ROUTES.AUTH_SESSION),
    staleTime: 30 * 1000, // 30 seconds fresh
    retry: 1,
  });

  return {
    isAuthenticated: data?.authenticated ?? false,
    user: data?.user ?? null,
    isLoading,
    error,
  };
}
