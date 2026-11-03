import { normalizeError, ok } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { SpotifyPlaylistsResponse, SpotifyPlaylistItem } from '@/lib/spotify-types';
import { toPlaylistSummary } from '@/lib/spotify-mappers';
import { spotifyClient } from '@/lib/spotify-client';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const reqId = crypto.randomUUID();

  try {
    const items: SpotifyPlaylistItem[] = [];
    let nextUrl: string | null = '/me/playlists?limit=50';

    while (nextUrl) {
      const data: SpotifyPlaylistsResponse =
        await spotifyClient.get<SpotifyPlaylistsResponse>(nextUrl);
      items.push(...(data.items || []));
      nextUrl = data.next;
    }

    const profile = await spotifyClient.get<{ id: string }>('/me');
    const editableItems = items.filter(
      (playlist) => playlist.owner?.id === profile.id || playlist.collaborative
    );

    const mappedPlaylists = editableItems.map((playlist) => toPlaylistSummary(playlist));

    return ok({
      playlists: mappedPlaylists,
    });
  } catch (error) {
    logger.error('Fetch user playlists failed', error, { reqId });
    return normalizeError(error);
  }
}
