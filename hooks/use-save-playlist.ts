import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { API_ROUTES, QUERY_KEYS } from '@/lib/constants';
import { SaveRequest, SaveResponse } from '@/lib/types';

export function useSavePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveRequest): Promise<SaveResponse> =>
      apiFetch<SaveResponse>(API_ROUTES.SPOTIFY_PLAYLIST_SAVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSettled: () => {
      // A save rewrites the playlist's name, visibility and full item list, so
      // every cached read of it is now stale. `QUERY_KEYS.playlists.detail`
      // and `.tracks` both nest under the `['playlists']` prefix, and
      // invalidation matches by prefix — so this single call refreshes the
      // library list, the saved playlist's metadata and its tracks. The
      // detail editor depends on that refetch: it re-seeds its local rows from
      // the returned server data, which is what clears the unsaved-changes bar.
      //
      // A failed save is not a no-op, either. The save route writes in stages
      // (name and visibility first, then the item list in 100-URI chunks), so
      // a failure partway through leaves the playlist in a state neither the
      // client nor the server predicted — most visibly, a truncated track
      // list. Re-reading is the only way to find out what actually landed,
      // and the caller must not keep rendering the pre-save data as if the
      // write never happened.
      //
      // The error itself is surfaced by the caller (`saveError`); this only
      // makes sure the data underneath it is real.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.playlists.all });
    },
  });
}
