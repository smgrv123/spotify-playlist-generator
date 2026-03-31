import { normalizeError } from '@/lib/api-response';
import { clearSpotifyStateCookie, clearSpotifyTokens } from '@/lib/cookies';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    await clearSpotifyTokens();
    await clearSpotifyStateCookie();

    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    return normalizeError(error);
  }
}
