import { useQuery } from '@tanstack/react-query';

import { API_ROUTES, QUERY_KEYS } from '@/lib/constants';

/** Shape of one row in `GET /api/spotify/playlists`'s `playlists` array. */
export interface PlaylistSummary {
  id: string;
  name: string;
  public: boolean;
  description: string;
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
      const res = await fetch(API_ROUTES.SPOTIFY_PLAYLISTS);
      if (!res.ok) {
        throw new Error('Failed to load playlists');
      }
      const data = await res.json();
      return data.playlists ?? [];
    },
    enabled,
    staleTime: 30 * 1000,
    retry: 1,
  });

  return {
    playlists: data ?? EMPTY_PLAYLISTS,
    isLoading,
    error,
  };
}
