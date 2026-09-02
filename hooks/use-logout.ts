import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { API_ROUTES, QUERY_KEYS } from '@/lib/constants';

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      await apiFetch(API_ROUTES.AUTH_LOGOUT, { method: 'POST' });
    },
    onSuccess: () => {
      // Optimistically mark session as logged out so the UI re-renders immediately
      queryClient.setQueryData(QUERY_KEYS.session.all, { authenticated: false });
      // Drop all user-scoped query caches except the session key (which holds the optimistic value)
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'session',
      });
    },
  });
}
