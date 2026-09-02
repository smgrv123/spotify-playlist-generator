'use client';

import { UnauthorizedError } from '@/lib/api-client';
import { getQueryClient } from '@/lib/query-client';
import {
  QueryClientProvider,
  useQueryClient,
  type MutationCacheNotifyEvent,
  type QueryCacheNotifyEvent,
} from '@tanstack/react-query';
import { ThemeProvider, useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Toaster } from 'sonner';

/**
 * True for the one event both `UnauthorizedRedirect` subscriptions care
 * about: an `updated` notification whose underlying action failed with an
 * `UnauthorizedError`. Shared by the query- and mutation-cache listeners
 * below since `QueryCacheNotifyEvent` and `MutationCacheNotifyEvent` both
 * discriminate on `type`/`action.type` the same way.
 */
function isUnauthorizedUpdate(event: QueryCacheNotifyEvent | MutationCacheNotifyEvent): boolean {
  return (
    event.type === 'updated' &&
    event.action.type === 'error' &&
    event.action.error instanceof UnauthorizedError
  );
}

/**
 * Watches the shared `QueryClient`'s query and mutation caches for an
 * `UnauthorizedError` and redirects to `/login` when one lands.
 *
 * The "Session expired" toast itself fires from `lib/query-client.ts`'s
 * `QueryCache`/`MutationCache` `onError` — that code runs outside any
 * component and has no access to `useRouter`, so this component's only job
 * is the redirect. Because Phase 5's builder draft lives in
 * `sessionStorage` (`lib/draft-storage.ts`), it survives the navigation
 * untouched: the user lands on `/login` and, after re-authenticating,
 * returns to `/` with the same draft `BuilderShell` restores on mount.
 *
 * A cache subscription (rather than a per-query `onError`) is what makes a
 * `router.push` reachable at all here — `next/navigation`'s router has no
 * imperative, outside-a-component entry point in the App Router, so the
 * redirect has to live in a mounted component that owns `useRouter()`.
 */
function UnauthorizedRedirect() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const redirectIfUnauthorized = (event: QueryCacheNotifyEvent | MutationCacheNotifyEvent) => {
      if (isUnauthorizedUpdate(event)) {
        router.push('/login');
      }
    };

    const unsubscribeQueries = queryClient.getQueryCache().subscribe(redirectIfUnauthorized);
    const unsubscribeMutations = queryClient.getMutationCache().subscribe(redirectIfUnauthorized);

    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
    };
  }, [queryClient, router]);

  return null;
}

/**
 * Mounts sonner's toast viewport. Split out from `Providers` because it
 * needs `useTheme()`'s *resolved* theme, which is only meaningful once
 * rendered under `ThemeProvider`; `richColors` leans into the same
 * accent/destructive palette the rest of the app's `Alert`s already use.
 */
function SonnerToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      position="top-center"
      richColors
      closeButton
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <UnauthorizedRedirect />
        {children}
        <SonnerToaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
