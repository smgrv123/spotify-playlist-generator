import { fail, normalizeError, ok } from '@/lib/api-response';
import { SpotifySearchResponse } from '@/lib/spotify-types';
import { spotifyClient } from '@/lib/spotify-client';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim();
    if (!q || q.length > 100) {
      return fail('VALIDATION_ERROR', 'Invalid search query', 400);
    }

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
