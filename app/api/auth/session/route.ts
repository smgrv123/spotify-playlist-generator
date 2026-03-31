import { ok } from '@/lib/api-response';
import { getSpotifyTokens } from '@/lib/cookies';

export async function GET() {
  const tokens = await getSpotifyTokens();
  const authenticated = Boolean(tokens.accessToken || tokens.refreshToken);
  return ok({ authenticated });
}
