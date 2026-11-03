import { spotifyClient } from './spotify-client';
import type { UserProfile } from './types';

/**
 * Deep module for fetching the authenticated user's Spotify profile.
 *
 * Exposes a tiny, testable interface (`fetchSpotifyProfile`) over the
 * `/v1/me` endpoint. All failure modes (401, non-2xx, network, empty
 * display_name, malformed JSON) collapse to `null` so the caller can
 * treat "no profile" as a single branch.
 */

interface SpotifyMeResponse {
  display_name?: string | null;
  images?: Array<{ url?: string | null }> | null;
}

/**
 * Derives initials from a display name.
 *
 * - Two or more words → first letter of the first two words, uppercase.
 * - Single word → first letter only, uppercase.
 * - Empty / whitespace-only → "?" as a sentinel fallback.
 */
export function deriveInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0]!.charAt(0).toUpperCase();
  return (words[0]!.charAt(0) + words[1]!.charAt(0)).toUpperCase();
}

/**
 * Fetches the authenticated user's profile from Spotify's `/v1/me`.
 *
 * Routes through `spotifyClient`, which reads/refreshes the access token
 * from cookies internally, so an expiring-but-refreshable session still
 * resolves a profile instead of getting a raw 401.
 *
 * Returns `null` on any failure path (no session, refresh failure, non-2xx,
 * network error, malformed JSON, or empty display_name). On success,
 * returns a fully-derived `UserProfile` including `initials` and a
 * possibly-null `avatarUrl`.
 *
 * The empty-display_name case returns null intentionally: a chip with
 * no name has nothing to show, and treating it as "no profile" is the
 * simplest contract for the consumer.
 */
export async function fetchSpotifyProfile(): Promise<UserProfile | null> {
  let body: SpotifyMeResponse;
  try {
    body = await spotifyClient.get<SpotifyMeResponse>('/me');
  } catch {
    return null;
  }

  const displayName = body.display_name?.trim() ?? '';
  if (!displayName) return null;

  const firstImageUrl = body.images?.find((img) => typeof img?.url === 'string' && img.url)?.url;
  const avatarUrl = firstImageUrl ?? null;

  return {
    displayName,
    avatarUrl,
    initials: deriveInitials(displayName),
  };
}
