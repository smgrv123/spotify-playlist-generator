import { useQuery } from '@tanstack/react-query';

import { API_ROUTES, QUERY_KEYS } from '@/lib/constants';
import { isApiErrorShape } from '@/lib/type-guards';
import type { PlaylistDetail } from '@/lib/types';

/**
 * Fetches a single playlist's header metadata (name, artwork, ownership,
 * track count) for the playlist detail route. Disabled until a `playlistId`
 * is provided.
 */
export function usePlaylistDetail(playlistId: string | null) {
  const { data, isLoading, error } = useQuery<PlaylistDetail>({
    queryKey: QUERY_KEYS.playlists.detail(playlistId ?? ''),
    queryFn: async () => {
      const res = await fetch(
        `${API_ROUTES.SPOTIFY_PLAYLIST}?playlistId=${encodeURIComponent(playlistId ?? '')}`
      );
      const data = await res.json();
      if (!res.ok) {
        if (isApiErrorShape(data)) {
          throw Object.assign(new Error(data.message), {
            code: data.code,
            details: data.details,
          });
        }
        throw new Error('Failed to load playlist');
      }
      return data;
    },
    enabled: Boolean(playlistId),
    staleTime: 30 * 1000,
    retry: 1,
  });

  return {
    detail: data ?? null,
    isLoading,
    error,
  };
}
