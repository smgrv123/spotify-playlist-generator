import { fail, normalizeError, ok } from '@/lib/api-response';
import { API_ERROR_CODE, TRACK_STATUS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { SpotifyPlaylistTracksResponse } from '@/lib/spotify-types';
import { spotifyClient } from '@/lib/spotify-client';
import { PlaylistTracksResponse, ResolvedTrack } from '@/lib/types';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const reqId = crypto.randomUUID();

  try {
    const playlistId = request.nextUrl.searchParams.get('playlistId');
    if (!playlistId) {
      return fail(API_ERROR_CODE.VALIDATION_ERROR, 'playlistId is required', 400);
    }

    const tracks: ResolvedTrack[] = [];
    // Items dropped below have no Spotify track URI to re-add, so rewriting the
    // playlist loses them. Counted across every page so the UI can warn first.
    let skippedCount = 0;
    let nextUrl: string | null = `/playlists/${encodeURIComponent(playlistId)}/items?limit=100`;

    while (nextUrl) {
      const data: SpotifyPlaylistTracksResponse =
        await spotifyClient.get<SpotifyPlaylistTracksResponse>(nextUrl);
      const items = data.items || [];

      items.forEach((item) => {
        const content = item.item ?? item.track;
        // Podcast episodes, local files and unavailable items all land here.
        if (
          !content ||
          content.type !== 'track' ||
          !content.artists ||
          item.is_local ||
          content.is_local
        ) {
          skippedCount += 1;
          return;
        }

        tracks.push({
          status: TRACK_STATUS.RESOLVED,
          spotifyUri: content.uri,
          spotifyTrackId: content.id,
          durationMs: content.duration_ms ?? 0,
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

    const response: PlaylistTracksResponse = { tracks, skippedCount };
    return ok(response);
  } catch (error) {
    logger.error('Fetch playlist tracks failed', error, { reqId });
    return normalizeError(error);
  }
}
