import { normalizeError } from '@/lib/api-response';
import { setSpotifyStateCookie } from '@/lib/cookies';
import { env } from '@/lib/env';
import crypto from 'crypto';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Generate cryptographically secure state value to mitigate CSRF risks
    const state = crypto.randomBytes(16).toString('hex');

    // Write cookie via Next.js cookies API
    await setSpotifyStateCookie(state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.SPOTIFY_CLIENT_ID,
      scope: env.SPOTIFY_SCOPES,
      redirect_uri: env.SPOTIFY_REDIRECT_URI,
      state,
    });

    const url = `https://accounts.spotify.com/authorize?${params.toString()}`;

    return NextResponse.redirect(url);
  } catch (error) {
    return normalizeError(error);
  }
}
