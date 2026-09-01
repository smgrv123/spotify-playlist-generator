import { useQuery } from '@tanstack/react-query';

import { API_ROUTES, QUERY_KEYS } from '@/lib/constants';
import { isApiErrorShape } from '@/lib/type-guards';
import type { PlaylistTracksResponse, ResolvedTrack } from '@/lib/types';

const EMPTY_TRACKS: ResolvedTrack[] = [];

/**
 * Fetches a playlist's current tracks for the `/playlists/[id]` editor.
 * Disabled until a `playlistId` is provided.
 *
 * The whole `PlaylistTracksResponse` is cached, not just `tracks`, because
 * `skippedCount` matters to the caller: the endpoint drops podcast episodes and
 * local files (they have no track URI to write back), and a save rewrites the
 * whole playlist, so the editor has to warn that those items would be lost.
 */
export function usePlaylistTracks(playlistId: string | null) {
  const { data, isLoading, error } = useQuery<PlaylistTracksResponse>({
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
      return { tracks: data.tracks ?? [], skippedCount: data.skippedCount ?? 0 };
    },
    enabled: Boolean(playlistId),
    staleTime: 30 * 1000,
    retry: 1,
  });

  return {
    tracks: data?.tracks ?? EMPTY_TRACKS,
    /** Playlist items the endpoint could not represent as editable tracks. */
    skippedCount: data?.skippedCount ?? 0,
    isLoading,
    error,
  };
}
