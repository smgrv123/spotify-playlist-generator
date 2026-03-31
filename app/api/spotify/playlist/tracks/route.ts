import { fail, normalizeError, ok } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { spotifyClient } from '@/lib/spotify-client';
import { ResolvedTrack } from '@/lib/types';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

type PlaylistItemContent = {
  type?: 'track' | 'episode' | string;
  id: string;
  name: string;
  uri: string;
  artists?: Array<{ name: string }>;
  album?: {
    name: string;
    images?: Array<{ url: string }>;
  };
};

interface SpotifyPlaylistTracksResponse {
  items?: Array<{
    track?: PlaylistItemContent | null;
    item?: PlaylistItemContent | null;
  }>;
  next: string | null;
}

export async function GET(request: NextRequest) {
  const reqId = crypto.randomUUID();
  logger.info('Fetch playlist tracks request started', { reqId });

  try {
    const playlistId = request.nextUrl.searchParams.get('playlistId');
    if (!playlistId) {
      return fail('VALIDATION_ERROR', 'playlistId is required', 400);
    }

    const tracks: ResolvedTrack[] = [];
    let nextUrl: string | null = `/playlists/${encodeURIComponent(playlistId)}/items?limit=100`;

    while (nextUrl) {
      const data: SpotifyPlaylistTracksResponse =
        await spotifyClient.get<SpotifyPlaylistTracksResponse>(nextUrl);
      const items: SpotifyPlaylistTracksResponse['items'] = data.items || [];

      items.forEach((item) => {
        const content = item.item ?? item.track;
        if (!content || content.type !== 'track' || !content.artists) return;

        tracks.push({
          status: 'resolved',
          spotifyUri: content.uri,
          spotifyTrackId: content.id,
          displayData: {
            title: content.name,
            artist: content.artists.map((artist) => artist.name).join(', '),
            albumContext: content.album?.name || 'Unknown Album',
            imageUrl: content.album?.images?.[0]?.url,
          },
        });
      });

      nextUrl = data.next;
    }

    logger.info('Fetch playlist tracks complete', { reqId, count: tracks.length });
    return ok({ tracks });
  } catch (error) {
    logger.error('Fetch playlist tracks failed', error, { reqId });
    return normalizeError(error);
  }
}
