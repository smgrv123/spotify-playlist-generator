/**
 * Application-wide constants.
 *
 * All string unions are expressed as `as const` objects so that:
 * - Types are derived via `(typeof FOO)[keyof typeof FOO]`
 * - Zod schemas are derived via `z.enum(Object.values(FOO) as [Foo, ...Foo[]])`
 * - There is exactly ONE source of truth for every enum value
 */

// ─── App Metadata ────────────────────────────────────────────────────────────

export const APP_NAME = 'Vibecrafter';
export const APP_DESCRIPTION =
  'Create and manage Spotify playlists from your own track lists. Paste, resolve, and save tracks directly to your Spotify account.';
export const APP_TAGLINE = 'Create and manage Spotify playlists from your own track lists.';

// ─── API Route Paths ──────────────────────────────────────────────────────────
// Used by client-side hooks so URL changes require exactly one edit.

export const API_ROUTES = {
  AUTH_SESSION: '/api/auth/session',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_LOGOUT: '/api/auth/logout',
  SPOTIFY_SEARCH: '/api/spotify/search',
  SPOTIFY_RESOLVE: '/api/spotify/resolve',
  SPOTIFY_PLAYLISTS: '/api/spotify/playlists',
  SPOTIFY_PLAYLIST_TRACKS: '/api/spotify/playlist/tracks',
  SPOTIFY_PLAYLIST_SAVE: '/api/spotify/playlist/save',
  SPOTIFY_PLAYLIST_DELETE: '/api/spotify/playlist/delete',
} as const;

export type ApiRoute = (typeof API_ROUTES)[keyof typeof API_ROUTES];

// ─── Track Status ─────────────────────────────────────────────────────────────

export const TRACK_STATUS = {
  RESOLVED: 'resolved',
  FAILED: 'failed',
} as const;

export type TrackStatus = (typeof TRACK_STATUS)[keyof typeof TRACK_STATUS];

// ─── Failed Track Reason ──────────────────────────────────────────────────────

export const FAILED_REASON = {
  NO_MATCH: 'NO_MATCH',
  SEARCH_ERROR: 'SEARCH_ERROR',
} as const;

export type FailedReason = (typeof FAILED_REASON)[keyof typeof FAILED_REASON];

// ─── Save Mode (update strategy) ─────────────────────────────────────────────

export const UPDATE_MODE = {
  REPLACE: 'replace',
  APPEND: 'append',
} as const;

export type UpdateMode = (typeof UPDATE_MODE)[keyof typeof UPDATE_MODE];

// ─── Save Response Mode ───────────────────────────────────────────────────────

export const SAVE_RESPONSE_MODE = {
  CREATED: 'created',
  UPDATED: 'updated',
} as const;

export type SaveResponseMode = (typeof SAVE_RESPONSE_MODE)[keyof typeof SAVE_RESPONSE_MODE];

// ─── Playlist Visibility ──────────────────────────────────────────────────────

export const VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
} as const;

export type Visibility = (typeof VISIBILITY)[keyof typeof VISIBILITY];

// ─── Save Panel Mode ──────────────────────────────────────────────────────────

export const SAVE_MODE = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
} as const;

export type SaveMode = (typeof SAVE_MODE)[keyof typeof SAVE_MODE];

// ─── API Error Codes ──────────────────────────────────────────────────────────

export const API_ERROR_CODE = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  UNAUTHORIZED: 'UNAUTHORIZED',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODE)[keyof typeof API_ERROR_CODE];

// ─── Query Keys ───────────────────────────────────────────────────────────────
// Centralized so key shapes are never duplicated across hooks.

export const QUERY_KEYS = {
  session: { all: ['session'] as const },
  playlists: {
    all: ['playlists'] as const,
    tracks: (playlistId: string) => ['playlists', playlistId, 'tracks'] as const,
  },
  searchTracks: (query: string) => ['search-tracks', query] as const,
} as const;
