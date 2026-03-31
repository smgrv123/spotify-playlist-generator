import 'server-only';
import { parseExternalError } from './api-response';
import {
  clearSpotifyTokens,
  getSpotifyTokens,
  isAccessTokenExpiringSoon,
  setSpotifyTokens,
} from './cookies';
import { refreshAccessToken } from './spotify-auth';
import { ApiError } from './types';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

interface FetchOptions extends RequestInit {
  // Use _retry to internally prevent infinite 401 retry loops
  _retry?: boolean;
}

/**
 * Ensures a valid access token exists, refreshing if necessary.
 * Returns the token, or throws a normalized ApiError if auth cannot be established.
 */
async function ensureValidToken(): Promise<string> {
  const isExpiring = await isAccessTokenExpiringSoon();
  const tokens = await getSpotifyTokens();

  if (!isExpiring && tokens.accessToken) {
    return tokens.accessToken;
  }

  // If no refresh token exists, we cannot seamlessly establish a session
  if (!tokens.refreshToken) {
    await clearSpotifyTokens(); // Ensure clean state
    const err: ApiError = {
      code: 'NO_SESSION',
      message: 'No active session or refresh token available. User must log in.',
    };
    throw err;
  }

  const refreshResult = await refreshAccessToken(tokens.refreshToken);
  if (!refreshResult.success) {
    await clearSpotifyTokens(); // Refresh failed, clear poisoned session
    throw refreshResult.error;
  }

  await setSpotifyTokens(
    refreshResult.tokens.access_token,
    refreshResult.tokens.refresh_token, // might be undefined, `setSpotifyTokens` handles this safely
    refreshResult.tokens.expires_in
  );

  return refreshResult.tokens.access_token;
}

/**
 * The core fetch wrapper for Spotify API requests.
 * Handles automatic token injection, local expiry checks, 401 rotation, and 429 rate limits.
 */
async function spotifyFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  let accessToken: string;
  try {
    accessToken = await ensureValidToken();
  } catch (error) {
    throw error;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${SPOTIFY_API_BASE}${endpoint}`;

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (!headers.has('Content-Type') && options.method && options.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(url, fetchOptions);

  if (response.ok) {
    // 204 No Content means empty body, parsing JSON will throw
    if (response.status === 204) {
      return {} as T;
    }
    const data = await response.json();
    return data as T;
  }

  // Intercept 401 Unauthorized securely
  // If we haven't retried yet, force rotate and retry once
  if (response.status === 401 && !options._retry) {
    const tokens = await getSpotifyTokens();

    // Safety check: if we have no refresh token, failing immediately is safest
    if (tokens.refreshToken) {
      const refreshResult = await refreshAccessToken(tokens.refreshToken);
      if (refreshResult.success) {
        await setSpotifyTokens(
          refreshResult.tokens.access_token,
          refreshResult.tokens.refresh_token,
          refreshResult.tokens.expires_in
        );

        // Try exactly once more
        return spotifyFetch<T>(endpoint, { ...options, _retry: true });
      }
    }
  }

  // Intercept 429 Too Many Requests
  if (response.status === 429) {
    const retryAfterStr = response.headers.get('Retry-After');
    const retryAfterSeconds = retryAfterStr ? parseInt(retryAfterStr, 10) : 0;

    // We explicitly bubble a typed rate limit error upstream.
    // The consumer/route handles bounded sleeping rather than tying up the Node thread unconditionally for long intervals.
    const err: ApiError = {
      code: 'RATE_LIMITED',
      message: 'Spotify API rate limit reached.',
      details: { retryAfterSeconds: isNaN(retryAfterSeconds) ? undefined : retryAfterSeconds },
    };

    // Note: We assign it to an object and throw so Next route handlers can grab it
    const throwErr = new Error(err.message) as Error & {
      code?: string;
      details?: unknown;
      status?: number;
    };
    throwErr.code = err.code;
    throwErr.details = err.details;
    throwErr.status = 429;
    throw throwErr;
  }

  // For generic 4xx/5xx external errors
  let errorPayload: unknown;
  try {
    errorPayload = await response.json();
  } catch {
    // ignore
  }

  const parsedError = parseExternalError(
    errorPayload,
    `Spotify API request failed (${response.status})`
  );
  const genericErr = new Error(parsedError.message) as Error & {
    code?: string;
    details?: unknown;
    status?: number;
  };
  genericErr.code = parsedError.code;
  genericErr.details = parsedError.details;
  genericErr.status = response.status;
  throw genericErr;
}

// ==== Typed Exports ====

export const spotifyClient = {
  get: <T>(endpoint: string, options?: Omit<RequestInit, 'method' | 'body'>) =>
    spotifyFetch<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body: unknown, options?: Omit<RequestInit, 'method'>) =>
    spotifyFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body: unknown, options?: Omit<RequestInit, 'method'>) =>
    spotifyFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),
};
