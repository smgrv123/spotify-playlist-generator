import { normalizeError, ok } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { SpotifyPlaylistsResponse } from '@/lib/spotify-types';
import { toPlaylistSummary } from '@/lib/spotify-mappers';
import { spotifyClient } from '@/lib/spotify-client';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const reqId = crypto.randomUUID();

  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    const data = await spotifyClient.get<SpotifyPlaylistsResponse>(
      `/me/playlists?limit=${limit}&offset=${offset}`
    );

    const items = data.items || [];
    const profile = await spotifyClient.get<{ id: string }>('/me');
    const editableItems = items.filter(
      (playlist) => playlist.owner?.id === profile.id || playlist.collaborative
    );

    const mappedPlaylists = editableItems.map((playlist) => toPlaylistSummary(playlist));

    return ok({
      playlists: mappedPlaylists,
      next: data.next,
    });
  } catch (error) {
    logger.error('Fetch user playlists failed', error, { reqId });
    return normalizeError(error);
  }
}
