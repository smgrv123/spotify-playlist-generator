import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import { API_ROUTES, QUERY_KEYS } from '@/lib/constants';
import type { PlaylistDetail } from '@/lib/types';

/**
 * Fetches a single playlist's header metadata (name, artwork, ownership,
 * track count) for the playlist detail route. Disabled until a `playlistId`
 * is provided.
 */
export function usePlaylistDetail(playlistId: string | null) {
  const {
    data: detail,
    isLoading,
    error,
  } = useQuery<PlaylistDetail>({
    queryKey: QUERY_KEYS.playlists.detail(playlistId ?? ''),
    queryFn: () =>
      apiFetch<PlaylistDetail>(
        `${API_ROUTES.SPOTIFY_PLAYLIST}?playlistId=${encodeURIComponent(playlistId ?? '')}`
      ),
    enabled: Boolean(playlistId),
  });

  return {
    detail: detail ?? null,
    isLoading,
    error,
  };
}
