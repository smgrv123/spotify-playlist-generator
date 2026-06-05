import { environmentManager, QueryClient } from '@tanstack/react-query';

let browserQueryClient: QueryClient | undefined = undefined;

function makeQueryClient() {
  return new QueryClient({
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
