import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import { API_ROUTES, QUERY_KEYS } from '@/lib/constants';

/** Shape of one row in `GET /api/spotify/playlists`'s `playlists` array. */
export interface PlaylistSummary {
  id: string;
  name: string;
  public: boolean;
  imageUrl: string | null;
  /** Total track count reported by Spotify, or `null` when it wasn't returned. */
  trackCount: number | null;
}

const EMPTY_PLAYLISTS: PlaylistSummary[] = [];

interface UsePlaylistsOptions {
  /** Only fetch when the caller actually needs the list (e.g. Update/Delete mode is active). Defaults to true. */
  enabled?: boolean;
}

/**
 * Fetches the caller's editable Spotify playlists for the save step's
 * target-playlist picker (Update/Delete modes).
 */
export function usePlaylists({ enabled = true }: UsePlaylistsOptions = {}) {
  const { data, isLoading, error } = useQuery<PlaylistSummary[]>({
    queryKey: QUERY_KEYS.playlists.all,
    queryFn: async () => {
      const data = await apiFetch<{ playlists?: PlaylistSummary[] }>(API_ROUTES.SPOTIFY_PLAYLISTS);
      return data.playlists ?? [];
    },
    enabled,
  });

  return {
    playlists: data ?? EMPTY_PLAYLISTS,
    isLoading,
    error,
  };
}
