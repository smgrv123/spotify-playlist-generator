import { z } from 'zod';
import * as schemas from './schemas';
export type { BuilderStep } from './constants';

export type ApiError = z.infer<typeof schemas.apiErrorSchema>;

export type ResolveRequest = z.infer<typeof schemas.resolveRequestSchema>;
export type ResolvedTrack = z.infer<typeof schemas.resolvedTrackSchema>;
export type FailedTrack = z.infer<typeof schemas.failedTrackSchema>;
export type ResolveResponse = z.infer<typeof schemas.resolveResponseSchema>;

export type TrackItem = ResolvedTrack | FailedTrack;

export type SaveRequest = z.infer<typeof schemas.saveRequestSchema>;
export type SaveResponse = z.infer<typeof schemas.saveResponseSchema>;

export type DeletePlaylistRequest = z.infer<typeof schemas.deletePlaylistRequestSchema>;
export type DeletePlaylistResponse = z.infer<typeof schemas.deletePlaylistResponseSchema>;

export type PlaylistDetail = z.infer<typeof schemas.playlistDetailSchema>;
export type PlaylistTracksResponse = z.infer<typeof schemas.playlistTracksResponseSchema>;

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
 *
 * The save step is create-only — editing an existing playlist lives on
 * `/playlists/[id]` — so the draft carries no save-mode or target-playlist
 * fields.
 */
export type Draft = z.infer<typeof schemas.draftSchema>;

/**
 * Draft track variants after `draftSchema` attaches a client-minted `rowId`
 * (see `components/builder-shell.tsx`). Pasting the same song twice produces
 * two entries sharing a `spotifyUri` but with distinct `rowId`s — that's the
 * identity `TrackList`'s `rowIds` prop and `PreviewRail`/`CoverCollage`'s row
 * keys use instead, so duplicates don't collide on URI.
 */
export type DraftTrack = Draft['tracks'][number];
export type DraftResolvedTrack = Extract<DraftTrack, { status: 'resolved' }>;
export type DraftFailedTrack = Extract<DraftTrack, { status: 'failed' }>;
