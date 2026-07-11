import { ok } from '@/lib/api-response';
import { getSpotifyTokens } from '@/lib/cookies';
import { fetchSpotifyProfile } from '@/lib/spotify-me';
import type { SessionResponse } from '@/lib/types';

/**
 * Reports session state and (when a token is present) the user's Spotify
 * profile. Failures to fetch `/v1/me` collapse to `user: null` — they do
 * not change `authenticated`, which strictly reflects cookie presence.
 */
export async function GET() {
  const tokens = await getSpotifyTokens();
  const authenticated = Boolean(tokens.accessToken || tokens.refreshToken);

  const user = tokens.accessToken ? await fetchSpotifyProfile(tokens.accessToken) : null;

  const body: SessionResponse = { authenticated, user };
  return ok(body);
}
