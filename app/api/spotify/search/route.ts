import { fail, normalizeError, ok } from '@/lib/api-response';
import { SpotifySearchResponse } from '@/lib/spotify-types';
import { spotifyClient } from '@/lib/spotify-client';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const searchSchema = z.object({
  q: z.string().trim().min(1, 'Search query cannot be empty').max(100, 'Search query is too long'),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const qRaw = searchParams.get('q');

    const validationResult = searchSchema.safeParse({ q: qRaw || '' });
    if (!validationResult.success) {
      return fail(
        'VALIDATION_ERROR',
        validationResult.error.issues?.[0]?.message || 'Invalid search query',
        400
      );
    }

    const { q } = validationResult.data;

    const data = await spotifyClient.get<SpotifySearchResponse>(
      `/search?type=track&limit=10&q=${encodeURIComponent(q)}`
    );

    const tracks = data.tracks?.items || [];

    const mappedTracks = tracks.map((track) => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map((a) => ({ name: a.name })),
      uri: track.uri,
      album: track.album?.name,
      image: track.album?.images?.[0]?.url || null,
      duration: track.duration_ms,
    }));

    return ok({ tracks: mappedTracks });
  } catch (error) {
    return normalizeError(error);
  }
}
