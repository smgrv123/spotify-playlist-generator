import { environmentManager, MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UnauthorizedError } from './api-client';
import { getErrorMessage } from './type-guards';

let browserQueryClient: QueryClient | undefined = undefined;

/**
 * Shared toast policy for both query and mutation failures.
 *
 * `UnauthorizedError` always wins: regardless of whether the failing
 * query/mutation opted into a generic toast, a 401 means the session is
 * gone, so "Session expired" is the one toast the user sees (a stable `id`
 * collapses duplicates when several in-flight queries 401 at once). The
 * matching redirect to `/login` is handled separately by
 * `components/providers.tsx`'s `UnauthorizedRedirect` — navigation needs
 * `useRouter`, which only exists inside a component, not here.
 *
 * Anything else only toasts when the query/mutation explicitly opted in via
 * `meta: { toastOnError: true }` — reserved for cross-cutting failures that
 * have no inline `Alert` of their own (see `hooks/use-search-tracks.ts`).
 * Failures that already render inline (save, delete, resolve, playlist
 * fetches) leave `meta` unset so this never double-notifies.
 */
function handleCacheError(error: unknown, meta: Record<string, unknown> | undefined): void {
  if (error instanceof UnauthorizedError) {
    console.error(error);
    toast.error('Session expired. Please sign in again.', { id: 'session-expired' });
    return;
  }
  if (meta?.toastOnError) {
    console.error(error);
    toast.error(getErrorMessage(error));
  }
}

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => handleCacheError(error, query.meta),
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => handleCacheError(error, mutation.meta),
    }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute default
        retry: 1,
      },
    },
  });
}

export function getQueryClient() {
  if (environmentManager.isServer()) {
    // Server: always create a new client to avoid sharing state between requests
    return makeQueryClient();
  }
  // Browser: use a singleton so the cache persists across renders
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
