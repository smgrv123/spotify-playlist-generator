import { cookies } from 'next/headers';
import { env } from './env';

export const STATE_COOKIE_NAME = 'sp_state';
export const ACCESS_TOKEN_COOKIE = 'sp_access_token';
export const REFRESH_TOKEN_COOKIE = 'sp_refresh_token';
export const EXPIRES_AT_COOKIE = 'sp_expires_at';

const defaultCookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax' as const,
  path: '/',
};

export async function setSpotifyStateCookie(state: string) {
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE_NAME, state, {
    ...defaultCookieOptions,
    maxAge: 60 * 15, // 15 minutes is plenty for the auth flow
  });
}

export async function getSpotifyStateCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(STATE_COOKIE_NAME)?.value;
}

export async function clearSpotifyStateCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(STATE_COOKIE_NAME);
}

export async function setSpotifyTokens(
  accessToken: string,
  refreshToken: string | undefined, // sometimes Spotify does not return a new refresh token
  expiresInSeconds: number
) {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + expiresInSeconds * 1000;

  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...defaultCookieOptions,
    maxAge: expiresInSeconds,
  });

  cookieStore.set(EXPIRES_AT_COOKIE, expiresAt.toString(), {
    ...defaultCookieOptions,
    // Store for a long time; we only care about the absolute timestamp value
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  if (refreshToken) {
    cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...defaultCookieOptions,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }
}

export async function getSpotifyTokens() {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value,
    refreshToken: cookieStore.get(REFRESH_TOKEN_COOKIE)?.value,
    expiresAt: cookieStore.get(EXPIRES_AT_COOKIE)?.value,
  };
}

export async function clearSpotifyTokens() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  cookieStore.delete(EXPIRES_AT_COOKIE);
}

export async function isAccessTokenExpiringSoon(): Promise<boolean> {
  const tokens = await getSpotifyTokens();
  if (!tokens.accessToken || !tokens.expiresAt) {
    return true; // Missing completely, treat as expiring/expired
  }

  const expiresAtMs = parseInt(tokens.expiresAt, 10);
  if (isNaN(expiresAtMs)) {
    return true;
  }

  // If token expires in less than 5 minutes, consider it expiring soon
  const fiveMinutesMs = 5 * 60 * 1000;
  return Date.now() + fiveMinutesMs >= expiresAtMs;
}
