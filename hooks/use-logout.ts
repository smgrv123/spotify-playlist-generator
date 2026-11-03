import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/constants';
import * as draftStore from '@/lib/draft-store';
import { getErrorMessage } from '@/lib/type-guards';

/**
 * Explicit sign-out: clears the auth cookies server-side, then wipes every
 * client-side trace of the account and lands on `/login`.
 *
 * Unlike the 401 path (`lib/query-client.ts` + `UnauthorizedRedirect`), which
 * deliberately keeps the builder draft so it can be restored after
 * re-authenticating, signing out resets the draft too — the next account
 * signing in on this tab must not inherit it. `queryClient.clear()` drops the
 * session and all other user-scoped caches without refetching them (a refetch
 * would 401 and fire a spurious "Session expired" toast).
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => apiFetch(API_ROUTES.AUTH_LOGOUT, { method: 'POST' }),
    onSuccess: () => {
      draftStore.reset();
      queryClient.clear();
      router.push('/login');
    },
    onError: (error) => {
      console.error(error);
      toast.error(getErrorMessage(error));
    },
  });
}
