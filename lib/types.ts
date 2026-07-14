import { z } from 'zod';
import * as schemas from './schemas';
export type { BuilderStep } from './constants';

export type ApiError = z.infer<typeof schemas.apiErrorSchema>;

export type ResolveRequest = z.infer<typeof schemas.resolveRequestSchema>;
export type ResolvedTrack = z.infer<typeof schemas.resolvedTrackSchema>;
export type FailedTrack = z.infer<typeof schemas.failedTrackSchema>;
export type ResolveResponse = z.infer<typeof schemas.resolveResponseSchema>;

export type SaveRequest = z.infer<typeof schemas.saveRequestSchema>;
export type SaveResponse = z.infer<typeof schemas.saveResponseSchema>;

export type DeletePlaylistRequest = z.infer<typeof schemas.deletePlaylistRequestSchema>;
export type DeletePlaylistResponse = z.infer<typeof schemas.deletePlaylistResponseSchema>;

/**
 * Authenticated Spotify user profile surfaced to the client via
 * `GET /api/auth/session`. Derived from Spotify's `/v1/me` response.
 *
 * - `displayName`: trimmed Spotify display_name; never empty.
 * - `avatarUrl`: first image URL from `images[]`, or null if absent.
 * - `initials`: deterministic uppercase initials derived from `displayName`,
 *   used as the avatar fallback when `avatarUrl` is null.
 */
export interface UserProfile {
  displayName: string;
  avatarUrl: string | null;
  initials: string;
}

/**
 * Response body for `GET /api/auth/session`.
 *
 * - `authenticated`: strictly reflects Spotify token cookie presence.
 * - `user`: the caller's Spotify profile, or null if unauthenticated or the
 *   profile fetch failed.
 */
export interface SessionResponse {
  authenticated: boolean;
  user: UserProfile | null;
}

/**
 * Unified builder state owned by `BuilderShell`. Each step component receives
 * only the slice it needs plus the relevant setter from the shell.
 *
 * - `step`: the active step (0=Prepare, 1=Refine, 2=Save).
 * - `maxReached`: the furthest step the user has unlocked; gating in the
 *   stepper uses this to allow navigation backward but not skip ahead.
 * - `mode`/`target`: save-step concerns (kept in the draft so they can be
 *   persisted in later phases). Defaults are `'create'` and `''`.
 */
export type Draft = z.infer<typeof schemas.draftSchema>;
