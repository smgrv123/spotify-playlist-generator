import { fail, normalizeError, ok } from '@/lib/api-response';
import { API_ERROR_CODE } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { SpotifyMeIdResponse, SpotifyPlaylistItem } from '@/lib/spotify-types';
import { toPlaylistSummary } from '@/lib/spotify-mappers';
import { spotifyClient } from '@/lib/spotify-client';
import { PlaylistDetail } from '@/lib/types';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

// An unprojected GET /playlists/{id} inlines the first 100 items; this route
// only needs the header metadata, so the projection keeps the payload small.
const PLAYLIST_FIELDS = 'id,name,public,images,owner(id,display_name),tracks(total),collaborative';

export async function GET(request: NextRequest) {
  const reqId = crypto.randomUUID();

  try {
    const playlistId = request.nextUrl.searchParams.get('playlistId');
    if (!playlistId) {
      return fail(API_ERROR_CODE.VALIDATION_ERROR, 'playlistId is required', 400);
    }

    // `/me` is needed only to decide ownership, so it runs alongside the
    // playlist fetch rather than serializing two round trips.
    const [playlist, profile] = await Promise.all([
      spotifyClient.get<SpotifyPlaylistItem>(
        `/playlists/${encodeURIComponent(playlistId)}?fields=${PLAYLIST_FIELDS}`
      ),
      spotifyClient.get<SpotifyMeIdResponse>('/me'),
    ]);

    const ownerId = playlist.owner?.id ?? null;
    const detail: PlaylistDetail = {
      ...toPlaylistSummary(playlist),
      ownerId,
      ownerName: playlist.owner?.display_name ?? null,
      isOwner: !!ownerId && ownerId === profile.id,
      collaborative: !!playlist.collaborative,
    };

    return ok(detail);
  } catch (error) {
    logger.error('Fetch playlist detail failed', error, { reqId });
    return normalizeError(error);
  }
}
