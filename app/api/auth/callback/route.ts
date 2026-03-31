import { fail, normalizeError } from '@/lib/api-response';
import { clearSpotifyStateCookie, getSpotifyStateCookie, setSpotifyTokens } from '@/lib/cookies';
import { env } from '@/lib/env';
import { exchangeAuthCodeForToken } from '@/lib/spotify-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      return fail('OAUTH_ERROR', `Spotify authorization failed: ${errorParam}`, 400);
    }

    if (!code || !state) {
      return fail('INVALID_CALLBACK', 'Missing code or state in callback', 400);
    }

    // Securely verify state cookie against the callback state URL param to prevent CSRF
    const storedState = await getSpotifyStateCookie();

    if (!storedState || storedState !== state) {
      return fail(
        'INVALID_STATE',
        'State mismatch or expired. This is likely a CSRF attempt or expired session.',
        400
      );
    }

    // Exchange the valid authorization code for Spotify Access and Refresh tokens
    const tokenResponse = await exchangeAuthCodeForToken(code);

    // Persist tokens in HttpOnly secure cookies
    await setSpotifyTokens(
      tokenResponse.access_token,
      tokenResponse.refresh_token,
      tokenResponse.expires_in
    );

    // Consume (clear) the state cookie so it cannot be reused
    await clearSpotifyStateCookie();

    // Successfully completed the handshake, head into the application
    return NextResponse.redirect(new URL('/', env.APP_BASE_URL));
  } catch (error) {
    return normalizeError(error);
  }
}
