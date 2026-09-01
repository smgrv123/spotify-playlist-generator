import { useMutation } from '@tanstack/react-query';
import { API_ROUTES } from '@/lib/constants';
import { isApiErrorShape } from '@/lib/type-guards';
import { SaveRequest, SaveResponse } from '@/lib/types';

export function useSavePlaylist() {
  return useMutation({
    mutationFn: async (payload: SaveRequest): Promise<SaveResponse> => {
      const saveRes = await fetch(API_ROUTES.SPOTIFY_PLAYLIST_SAVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const saveData = await saveRes.json();

      if (!saveRes.ok) {
        if (isApiErrorShape(saveData)) {
          throw Object.assign(new Error(saveData.message), {
            code: saveData.code,
            details: saveData.details,
          });
        }
        throw new Error('Failed to save to Spotify');
      }

      return saveData;
    },
  });
}
