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

// ─── API Route Paths ──────────────────────────────────────────────────────────
// Used by client-side hooks so URL changes require exactly one edit.

export const API_ROUTES = {
  AUTH_SESSION: '/api/auth/session',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_LOGOUT: '/api/auth/logout',
  SPOTIFY_SEARCH: '/api/spotify/search',
  SPOTIFY_RESOLVE: '/api/spotify/resolve',
  SPOTIFY_PLAYLISTS: '/api/spotify/playlists',
  SPOTIFY_PLAYLIST: '/api/spotify/playlist',
  SPOTIFY_PLAYLIST_TRACKS: '/api/spotify/playlist/tracks',
  SPOTIFY_PLAYLIST_SAVE: '/api/spotify/playlist/save',
  SPOTIFY_PLAYLIST_DELETE: '/api/spotify/playlist/delete',
} as const;

// ─── Track Status ─────────────────────────────────────────────────────────────

export const TRACK_STATUS = {
  RESOLVED: 'resolved',
  FAILED: 'failed',
} as const;

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

// ─── Seed Sync Action ─────────────────────────────────────────────────────────

/**
 * What the editor's render-time state sync should do on this render.
 *
 * - `reseed`: adopt the server's data wholesale (rows, name, visibility, and
 *   the diff baseline).
 * - `conflict`: refuse to adopt it. The server moved *and* the user has
 *   unsaved work that a re-seed would silently destroy.
 * - `none`: leave local state alone.
 */
export const SEED_SYNC_ACTION = {
  NONE: 'none',
  RESEED: 'reseed',
  CONFLICT: 'conflict',
} as const;

export type SeedSyncAction = (typeof SEED_SYNC_ACTION)[keyof typeof SEED_SYNC_ACTION];

// ─── Track Card Size ──────────────────────────────────────────────────────────

export const TRACK_CARD_SIZE = {
  SM: 'sm',
  MD: 'md',
} as const;

export type TrackCardSize = (typeof TRACK_CARD_SIZE)[keyof typeof TRACK_CARD_SIZE];

// ─── Builder Step ─────────────────────────────────────────────────────────────

export const BUILDER_STEP = {
  PREPARE: 0,
  REFINE: 1,
  SAVE: 2,
} as const;

export type BuilderStep = (typeof BUILDER_STEP)[keyof typeof BUILDER_STEP];

// ─── Builder Step Display Metadata ───────────────────────────────────────────
// Single source of truth for step eyebrow/title/label strings, keyed by
// BUILDER_STEP so the stepper header and each step card's own heading never
// drift out of sync.

export const BUILDER_STEP_META: Record<
  BuilderStep,
  { eyebrow: string; title: string; stepLabel: string }
> = {
  [BUILDER_STEP.PREPARE]: { eyebrow: 'Import', title: 'Prepare', stepLabel: 'Step 01 — Import' },
  [BUILDER_STEP.REFINE]: { eyebrow: 'Curate', title: 'Refine', stepLabel: 'Step 02 — Curate' },
  [BUILDER_STEP.SAVE]: { eyebrow: 'Publish', title: 'Save', stepLabel: 'Step 03 — Publish' },
} as const;

// ─── API Error Codes ──────────────────────────────────────────────────────────

export const API_ERROR_CODE = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  UNAUTHORIZED: 'UNAUTHORIZED',
} as const;

// ─── Query Keys ───────────────────────────────────────────────────────────────
// Centralized so key shapes are never duplicated across hooks.

export const QUERY_KEYS = {
  session: { all: ['session'] as const },
  playlists: {
    all: ['playlists'] as const,
    detail: (playlistId: string) => ['playlists', playlistId, 'detail'] as const,
    tracks: (playlistId: string) => ['playlists', playlistId, 'tracks'] as const,
  },
  searchTracks: (query: string) => ['search-tracks', query] as const,
} as const;
