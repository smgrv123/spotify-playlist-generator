import { fail, normalizeError, ok } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { resolveRequestSchema } from '@/lib/schemas';
import { spotifyClient } from '@/lib/spotify-client';
import { ResolveResponse } from '@/lib/types';
import { formatZodErrors } from '@/lib/utils';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

// Maximum tracks to resolve concurrently to protect against immediate rate limit spikes
const CHUNK_SIZE = 10;

interface SpotifySearchResponse {
  tracks?: {
    items?: Array<{
      id: string;
      name: string;
      uri: string;
      artists: Array<{ name: string }>;
      album?: {
        name: string;
        images?: Array<{ url: string }>;
      };
    }>;
  };
}

export async function POST(request: NextRequest) {
  const reqId = crypto.randomUUID();
  logger.info('Resolve request started', { reqId });

  try {
    const rawBody = await request.json();
    const validationResult = resolveRequestSchema.safeParse(rawBody);

    if (!validationResult.success) {
      logger.warn('Resolve request validation failed', {
        reqId,
        issues: validationResult.error.issues,
      });
      return fail(
        'VALIDATION_ERROR',
        'Invalid resolve request',
        400,
        formatZodErrors(validationResult.error)
      );
    }

    const { tracks } = validationResult.data;

    // We process the array in sequential chunks to cap parallelism, but within the chunk, requests are parallel
    const resolvedTracks: ResolveResponse[] = new Array(tracks.length);

    for (let i = 0; i < tracks.length; i += CHUNK_SIZE) {
      const chunk = tracks.slice(i, i + CHUNK_SIZE);
      const chunkIndices = Array.from({ length: chunk.length }, (_, idx) => i + idx);

      const chunkPromises = chunk.map(
        async (track: { title: string; artist: string; album?: string }, indexInChunk: number) => {
          const globalIndex = chunkIndices[indexInChunk];

          try {
            // Construct explicit track/artist query
            const q = `track:${track.title} artist:${track.artist}${
              track.album ? ` album:${track.album}` : ''
            }`;
            const encodedQ = encodeURIComponent(q);

            const searchResult = await spotifyClient.get<SpotifySearchResponse>(
              `/search?type=track&limit=1&q=${encodedQ}`
            );

            const items = searchResult.tracks?.items || [];

            if (items.length === 0) {
              resolvedTracks[globalIndex] = {
                status: 'failed',
                reason: 'NO_MATCH',
                query: { title: track.title, artist: track.artist },
              };
              return;
            }

            const matchedTrack = items[0];
            resolvedTracks[globalIndex] = {
              status: 'resolved',
              spotifyUri: matchedTrack.uri,
              spotifyTrackId: matchedTrack.id,
              displayData: {
                title: matchedTrack.name,
                artist: matchedTrack.artists.map((a) => a.name).join(', '),
                albumContext: matchedTrack.album?.name || 'Unknown Album',
                imageUrl: matchedTrack.album?.images?.[0]?.url,
              },
            };
          } catch (error) {
            // A systemic failure on a SINGLE track should not take down the whole batch.
            // Log parsing/network problems, but map to SEARCH_ERROR to let the UI prompt a manual retry.
            logger.warn(`Failed resolving track ${track.title} by ${track.artist}:`, {
              reqId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            resolvedTracks[globalIndex] = {
              status: 'failed',
              reason: 'SEARCH_ERROR',
              query: { title: track.title, artist: track.artist },
            };
          }
        }
      );

      // Wait for the entire chunk of 10 to resolve before beginning the next chunk
      await Promise.all(chunkPromises);
    }

    // Since we assigned by global index, sorting/ordering is impeccably maintained identically to the `tracks` array.
    logger.info('Resolve request complete', { reqId, resolvedCount: resolvedTracks.length });
    return ok({ results: resolvedTracks });
  } catch (error) {
    if (error instanceof SyntaxError) {
      logger.warn('Resolve request failed JSON parse', { reqId });
      return fail('VALIDATION_ERROR', 'Invalid JSON body', 400);
    }
    logger.error('Resolve pipeline failed entirely', error, { reqId });
    return normalizeError(error);
  }
}
