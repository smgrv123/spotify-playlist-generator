import { normalizeError, ok } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { spotifyClient } from '@/lib/spotify-client';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

interface SpotifyPlaylistsResponse {
  items?: Array<{
    id: string;
    name: string;
    public: boolean | null;
    description: string | null;
    images?: Array<{ url: string }>;
  }>;
  next: string | null;
}

export async function GET(request: NextRequest) {
  const reqId = crypto.randomUUID();
  logger.info('Fetch user playlists request started', { reqId });

  try {
    // Only fetch first page (up to 50 playlists limit max per Spotify default)
    // Extendable via url params and the returned `next` cursor later
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    const data = await spotifyClient.get<SpotifyPlaylistsResponse>(
      `/me/playlists?limit=${limit}&offset=${offset}`
    );

    const items = data.items || [];

    // Map to minimal, stable UI payload discarding unnecessary Spotify metadata
    const mappedPlaylists = items.map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      public: !!playlist.public, // force boolean
      description: playlist.description || '',
      imageUrl: playlist.images?.[0]?.url || null, // Best resolution image (usually index 0)
    }));

    logger.info('Fetch user playlists complete', { reqId, returned: mappedPlaylists.length });
    return ok({
      playlists: mappedPlaylists,
      next: data.next,
    });
  } catch (error) {
    logger.error('Fetch user playlists failed', error, { reqId });
    return normalizeError(error);
  }
}
