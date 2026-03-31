import { fail, normalizeError, ok } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { spotifyClient } from '@/lib/spotify-client';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const querySchema = z.object({
  playlistId: z.string().min(1, 'playlistId is required'),
});

interface SpotifyPlaylistTracksResponse {
  items?: Array<{
    track?: {
      type?: string | null;
      id?: string | null;
      uri?: string | null;
      name?: string | null;
      artists?: Array<{ name: string }>;
      album?: {
        name?: string | null;
        images?: Array<{ url: string }>;
      };
    };
    item?: {
      type?: string | null;
      id?: string | null;
      uri?: string | null;
      name?: string | null;
      artists?: Array<{ name: string }>;
      album?: {
        name?: string | null;
        images?: Array<{ url: string }>;
      };
    };
  }>;
  next: string | null;
}

function mapPlaylistItems(items: NonNullable<SpotifyPlaylistTracksResponse['items']>) {
  return items.flatMap((item) => {
    const track = item.track ?? item.item;
    if (track?.type && track.type !== 'track') return [];
    if (!track?.id || !track.uri || !track.name) return [];

    return [
      {
        status: 'resolved' as const,
        spotifyUri: track.uri,
        spotifyTrackId: track.id,
        displayData: {
          title: track.name,
          artist: track.artists?.map((artist) => artist.name).join(', ') || 'Unknown Artist',
          albumContext: track.album?.name || 'Unknown Album',
          imageUrl: track.album?.images?.[0]?.url,
        },
      },
    ];
  });
}

export async function GET(request: NextRequest) {
  const reqId = crypto.randomUUID();
  logger.info('Fetch playlist tracks request started', { reqId });

  try {
    const searchParams = request.nextUrl.searchParams;
    const validationResult = querySchema.safeParse({
      playlistId: searchParams.get('playlistId') || '',
    });

    if (!validationResult.success) {
      return fail(
        'VALIDATION_ERROR',
        validationResult.error.issues?.[0]?.message || 'Invalid playlist id',
        400
      );
    }

    const { playlistId } = validationResult.data;

    const profile = await spotifyClient.get<{ country?: string | null }>('/me');
    const market = profile.country?.trim();
    const baseQuery = new URLSearchParams({
      limit: '50',
      offset: '0',
      additional_types: 'track',
      ...(market ? { market } : {}),
    });

    const tracks: Array<{
      status: 'resolved';
      spotifyUri: string;
      spotifyTrackId: string;
      displayData: {
        title: string;
        artist: string;
        albumContext?: string;
        imageUrl?: string;
      };
    }> = [];

    let nextUrl: string | null = `/playlists/${playlistId}/items?${baseQuery.toString()}`;

    while (nextUrl) {
      const data: SpotifyPlaylistTracksResponse =
        await spotifyClient.get<SpotifyPlaylistTracksResponse>(nextUrl);
      const items = (data.items || []) as NonNullable<SpotifyPlaylistTracksResponse['items']>;
      tracks.push(...mapPlaylistItems(items));
      nextUrl = data.next;
    }

    logger.info('Fetch playlist tracks complete', { reqId, returned: tracks.length });
    return ok({ tracks });
  } catch (error) {
    logger.error('Fetch playlist tracks failed', error, { reqId });
    return normalizeError(error);
  }
}
