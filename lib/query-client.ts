import { environmentManager, MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UnauthorizedError } from './api-client';

let browserQueryClient: QueryClient | undefined = undefined;

/**
 * Shared toast policy for both query and mutation failures.
 *
 * `UnauthorizedError` always wins: a 401 means the session is gone, so
 * "Session expired" is the one toast the user sees (a stable `id` collapses
 * duplicates when several in-flight queries 401 at once). The matching
 * redirect to `/login` is handled separately by `components/providers.tsx`'s
 * `UnauthorizedRedirect` — navigation needs `useRouter`, which only exists
 * inside a component, not here.
 *
 * Any other failure is left to the query/mutation itself to surface (e.g. an
 * inline `Alert`, or `hooks/use-search-tracks.ts`'s own toast) — this
 * cache-level handler only owns the cross-cutting 401 case.
 */
function handleCacheError(error: unknown): void {
  if (error instanceof UnauthorizedError) {
    console.error(error);
    toast.error('Session expired. Please sign in again.', { id: 'session-expired' });
  }
}

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => handleCacheError(error),
    }),
    mutationCache: new MutationCache({
      onError: (error) => handleCacheError(error),
    }),
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30 seconds fresh
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
