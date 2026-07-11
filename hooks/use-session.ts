import { useQuery } from '@tanstack/react-query';
import { API_ROUTES, QUERY_KEYS } from '@/lib/constants';
import type { SessionResponse } from '@/lib/types';

export function useSession() {
  const { data, isLoading, error } = useQuery<SessionResponse>({
    queryKey: QUERY_KEYS.session.all,
    queryFn: async () => {
      const res = await fetch(API_ROUTES.AUTH_SESSION);
      if (!res.ok) {
        throw new Error('Failed to fetch session');
      }
      return res.json();
    },
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
