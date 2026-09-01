import { useQuery } from '@tanstack/react-query';

import { API_ROUTES, QUERY_KEYS } from '@/lib/constants';
import { isApiErrorShape } from '@/lib/type-guards';
import type { ResolvedTrack } from '@/lib/types';

const EMPTY_TRACKS: ResolvedTrack[] = [];

/**
 * Fetches a target playlist's current tracks for the save step's Update-mode
 * selective merge. Disabled until a `playlistId` is provided.
 */
export function usePlaylistTracks(playlistId: string | null) {
  const { data, isLoading, error } = useQuery<ResolvedTrack[]>({
    queryKey: QUERY_KEYS.playlists.tracks(playlistId ?? ''),
    queryFn: async () => {
      const res = await fetch(
        `${API_ROUTES.SPOTIFY_PLAYLIST_TRACKS}?playlistId=${encodeURIComponent(playlistId ?? '')}`
      );
      const data = await res.json();
      if (!res.ok) {
        if (isApiErrorShape(data)) {
          throw Object.assign(new Error(data.message), {
            code: data.code,
            details: data.details,
          });
        }
        throw new Error('Failed to load playlist tracks');
      }
      return data.tracks ?? [];
    },
    enabled: Boolean(playlistId),
    staleTime: 30 * 1000,
    retry: 1,
  });

  return {
    tracks: data ?? EMPTY_TRACKS,
    isLoading,
    error,
  };
}
