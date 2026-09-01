import { useMutation, useQueryClient } from '@tanstack/react-query';
import { API_ROUTES, QUERY_KEYS } from '@/lib/constants';
import { isApiErrorShape } from '@/lib/type-guards';
import { DeletePlaylistRequest, DeletePlaylistResponse } from '@/lib/types';

export function useDeletePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DeletePlaylistRequest): Promise<DeletePlaylistResponse> => {
      const deleteRes = await fetch(API_ROUTES.SPOTIFY_PLAYLIST_DELETE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const deleteData = await deleteRes.json();

      if (!deleteRes.ok) {
        if (isApiErrorShape(deleteData)) {
          throw Object.assign(new Error(deleteData.message), {
            code: deleteData.code,
            details: deleteData.details,
          });
        }
        throw new Error('Failed to delete playlist');
      }

      return deleteData;
    },
    onSuccess: () => {
      // Deleted playlist should no longer linger in the target-playlist
      // picker's cached list (used by both Update and Delete modes).
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.playlists.all });
    },
  });
}
