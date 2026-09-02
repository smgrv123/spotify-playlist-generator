import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { API_ROUTES } from '@/lib/constants';
import { ResolveRequest, ResolveResponse } from '@/lib/types';

export function useResolveTracks() {
  return useMutation({
    mutationFn: async (tracks: ResolveRequest['tracks']): Promise<ResolveResponse[]> => {
      const data = await apiFetch<{ results?: ResolveResponse[] }>(API_ROUTES.SPOTIFY_RESOLVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracks }),
      });
      return data.results || [];
    },
  });
}
