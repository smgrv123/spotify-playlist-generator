import 'server-only';
import { parseExternalError } from './api-response';
import { env } from './env';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

export async function exchangeAuthCodeForToken(code: string): Promise<SpotifyTokenResponse> {
  const tokenUrl = 'https://accounts.spotify.com/api/token';

  const basicAuth = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString(
    'base64'
  );

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.SPOTIFY_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    let errorPayload: unknown;
    try {
      errorPayload = await response.json();
    } catch {
      // Ignore JSON parse errors if the response isn't JSON
    }

    const parsedError = parseExternalError(errorPayload, 'Failed to exchange authorization code');

    // We throw this error so that the route handler can catch it using normalizeError
    const errorToThrow = new Error(parsedError.message) as Error & {
      code?: string;
      details?: unknown;
      status?: number;
    };
    errorToThrow.code = parsedError.code;
    errorToThrow.details = parsedError.details;
    errorToThrow.status = response.status;

    throw errorToThrow;
  }

  const data = await response.json();
  return data as SpotifyTokenResponse;
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<
  | { success: true; tokens: SpotifyTokenResponse }
  | { success: false; error: import('./types').ApiError }
> {
  const tokenUrl = 'https://accounts.spotify.com/api/token';

  const basicAuth = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString(
    'base64'
  );

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    let errorPayload: unknown;
    try {
      errorPayload = await response.json();
    } catch {
      // ignore
    }

    const parsedError = parseExternalError(errorPayload, 'Failed to refresh authorization token');
    return { success: false, error: parsedError };
  }

  const data = await response.json();
  return { success: true, tokens: data as SpotifyTokenResponse };
}
