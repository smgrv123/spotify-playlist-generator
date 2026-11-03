import { fail, normalizeError, ok } from '@/lib/api-response';
import { API_ERROR_CODE } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { deletePlaylistRequestSchema } from '@/lib/schemas';
import { spotifyClient } from '@/lib/spotify-client';
import { SpotifyMeIdResponse, SpotifyPlaylistItem } from '@/lib/spotify-types';
import { formatZodErrors } from '@/lib/utils';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const reqId = crypto.randomUUID();

  try {
    const rawBody = await request.json();
    const validationResult = deletePlaylistRequestSchema.safeParse(rawBody);

    if (!validationResult.success) {
      logger.warn('Delete playlist validation failed', {
        reqId,
        issues: validationResult.error.issues,
      });
      return fail(
        API_ERROR_CODE.VALIDATION_ERROR,
        'Invalid delete request',
        400,
        formatZodErrors(validationResult.error)
      );
    }

    const { playlistId } = validationResult.data;
    const encodedPlaylistId = encodeURIComponent(playlistId);

    // Ownership check runs before the unfollow call: Spotify's unfollow endpoint
    // succeeds for non-owners too, which would silently no-op a "delete" instead
    // of rejecting it. Fetched in parallel, mirroring the GET playlist route.
    const [playlist, profile] = await Promise.all([
      spotifyClient.get<Pick<SpotifyPlaylistItem, 'owner'>>(
        `/playlists/${encodedPlaylistId}?fields=owner(id)`
      ),
      spotifyClient.get<SpotifyMeIdResponse>('/me'),
    ]);

    if (playlist.owner?.id !== profile.id) {
      logger.warn('Delete playlist forbidden: requester is not the owner', { reqId, playlistId });
      return fail(
        API_ERROR_CODE.FORBIDDEN,
        'Only the playlist owner can delete this playlist',
        403
      );
    }

    await spotifyClient.delete(`/playlists/${encodedPlaylistId}/followers`);

    return ok({ playlistId });
  } catch (error) {
    if (error instanceof SyntaxError) {
      logger.warn('Delete playlist failed JSON parse', { reqId });
      return fail(API_ERROR_CODE.VALIDATION_ERROR, 'Invalid JSON body', 400);
    }
    logger.error('Delete playlist pipeline failed entirely', error, { reqId });
    return normalizeError(error);
  }
}
