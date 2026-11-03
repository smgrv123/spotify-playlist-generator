import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { API_ROUTES, QUERY_KEYS } from '@/lib/constants';
import { DeletePlaylistRequest, DeletePlaylistResponse } from '@/lib/types';

export function useDeletePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DeletePlaylistRequest): Promise<DeletePlaylistResponse> =>
      apiFetch<DeletePlaylistResponse>(API_ROUTES.SPOTIFY_PLAYLIST_DELETE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      // Deleted playlist should no longer linger in the target-playlist
      // picker's cached list (used by both Update and Delete modes).
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.playlists.all });
    },
  });
}
