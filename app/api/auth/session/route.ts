import { ok } from '@/lib/api-response';
import { getSpotifyTokens } from '@/lib/cookies';
import { fetchSpotifyProfile } from '@/lib/spotify-me';
import type { SessionResponse } from '@/lib/types';

/**
 * Reports session state and the user's Spotify profile. The profile is fetched
 * whenever any token cookie exists, including refresh-only sessions. That fetch
 * can refresh the access token, or clear the cookies on a failed refresh. So
 * `authenticated` is read from cookies after the fetch. Fetch failures still
 * collapse to `user: null`.
 */
export async function GET() {
  const initial = await getSpotifyTokens();
  const hasTokens = Boolean(initial.accessToken || initial.refreshToken);

  const user = hasTokens ? await fetchSpotifyProfile() : null;

  const after = await getSpotifyTokens();
  const authenticated = Boolean(after.accessToken || after.refreshToken);

  const body: SessionResponse = { authenticated, user };
  return ok(body);
}
