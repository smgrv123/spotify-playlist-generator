import { fail, normalizeError, ok } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { SpotifyPlaylistDetailResponse } from '@/lib/spotify-types';
import { spotifyClient } from '@/lib/spotify-client';
import { PlaylistDetail } from '@/lib/types';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

// An unprojected GET /playlists/{id} inlines the first 100 items; this route
// only needs the header metadata, so the projection keeps the payload small.
const PLAYLIST_FIELDS =
  'id,name,public,collaborative,description,images,owner(id,display_name),snapshot_id,tracks(total)';

export async function GET(request: NextRequest) {
  const reqId = crypto.randomUUID();
  logger.info('Fetch playlist detail request started', { reqId });

  try {
    const playlistId = request.nextUrl.searchParams.get('playlistId');
    if (!playlistId) {
      return fail('VALIDATION_ERROR', 'playlistId is required', 400);
    }

    // `/me` is needed only to decide ownership, so it runs alongside the
    // playlist fetch rather than serializing two round trips.
    const [playlist, profile] = await Promise.all([
      spotifyClient.get<SpotifyPlaylistDetailResponse>(
        `/playlists/${encodeURIComponent(playlistId)}?fields=${PLAYLIST_FIELDS}`
      ),
      spotifyClient.get<{ id: string }>('/me'),
    ]);

    const ownerId = playlist.owner?.id ?? null;
    const detail: PlaylistDetail = {
      id: playlist.id,
      name: playlist.name,
      public: !!playlist.public,
      description: playlist.description || '',
      imageUrl: playlist.images?.[0]?.url || null,
      trackCount: playlist.tracks?.total ?? null,
      ownerId,
      ownerName: playlist.owner?.display_name ?? null,
      isOwner: !!ownerId && ownerId === profile.id,
      collaborative: !!playlist.collaborative,
      snapshotId: playlist.snapshot_id ?? null,
    };

    logger.info('Fetch playlist detail complete', { reqId, playlistId: detail.id });
    return ok(detail);
  } catch (error) {
    logger.error('Fetch playlist detail failed', error, { reqId });
    return normalizeError(error);
  }
}
