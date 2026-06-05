import { useMutation } from '@tanstack/react-query';
import { API_ROUTES } from '@/lib/constants';
import { ResolveRequest, ResolveResponse } from '@/lib/types';

export function useResolveTracks() {
  return useMutation({
    mutationFn: async (tracks: ResolveRequest['tracks']): Promise<ResolveResponse[]> => {
      const resolveRes = await fetch(API_ROUTES.SPOTIFY_RESOLVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracks }),
      });

      const resolveData = await resolveRes.json();

      if (!resolveRes.ok) {
        if (
          typeof resolveData === 'object' &&
          resolveData !== null &&
          typeof resolveData.code === 'string' &&
          typeof resolveData.message === 'string'
        ) {
          throw Object.assign(new Error(resolveData.message), {
            code: resolveData.code,
            details: resolveData.details,
          });
        }
        throw new Error('Failed to resolve Spotify tracks');
      }

      return resolveData.results || [];
    },
  });
}
