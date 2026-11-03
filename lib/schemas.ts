import { z } from 'zod';
import {
  BUILDER_STEP,
  FAILED_REASON,
  SAVE_RESPONSE_MODE,
  UPDATE_MODE,
  VISIBILITY,
  type FailedReason,
  type SaveResponseMode,
  type UpdateMode,
  type Visibility,
} from './constants';

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
  retryAfterSeconds: z.number().optional(),
});

const trackInputSchema = z.object({
  title: z.string(),
  artist: z.string(),
  album: z.string().optional(),
});

export const resolveRequestSchema = z.object({
  tracks: z.array(trackInputSchema),
});

export const resolvedTrackSchema = z.object({
  status: z.literal('resolved'),
  spotifyUri: z.string(),
  spotifyTrackId: z.string(),
  durationMs: z.number(),
  displayData: z.object({
    title: z.string(),
    artist: z.string(),
    albumContext: z.string().optional(),
    imageUrl: z.string().optional(),
  }),
});

export const failedTrackSchema = z.object({
  status: z.literal('failed'),
  reason: z.enum(Object.values(FAILED_REASON) as [FailedReason, ...FailedReason[]]),
  query: trackInputSchema,
});

export const resolveResponseSchema = z.discriminatedUnion('status', [
  resolvedTrackSchema,
  failedTrackSchema,
]);

export const saveRequestSchema = z.object({
  playlistId: z.string().optional(),
  playlistName: z.string(),
  uris: z.array(z.string().regex(/^spotify:track:[A-Za-z0-9]{22}$/)).max(10000),
  mode: z.enum(Object.values(UPDATE_MODE) as [UpdateMode, ...UpdateMode[]]).optional(),
  isPublic: z.boolean().optional(),
});

export const saveResponseSchema = z.object({
  playlistId: z.string(),
  snapshotId: z.string().optional(),
  mode: z.enum(Object.values(SAVE_RESPONSE_MODE) as [SaveResponseMode, ...SaveResponseMode[]]),
});

export const deletePlaylistRequestSchema = z.object({
  playlistId: z.string().min(1, 'playlistId is required'),
});

export const deletePlaylistResponseSchema = z.object({
  playlistId: z.string(),
});

/**
 * Response body for `GET /api/spotify/playlist` — one playlist's metadata
 * without its items.
 *
 * - `imageUrl`/`trackCount`/`ownerId`/`ownerName` are nullable because Spotify
 *   omits them for some playlists (and the `fields` projection makes no
 *   guarantees either).
 * - `isOwner` is computed server-side by comparing the playlist owner against
 *   the authenticated user; a collaborative playlist is editable without it.
 */
export const playlistDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  public: z.boolean(),
  imageUrl: z.string().nullable(),
  trackCount: z.number().nullable(),
  ownerId: z.string().nullable(),
  ownerName: z.string().nullable(),
  isOwner: z.boolean(),
  collaborative: z.boolean(),
});

/**
 * Response body for `GET /api/spotify/playlist/tracks`.
 *
 * `skippedCount` reports how many playlist items were dropped because they
 * aren't full tracks (podcast episodes, unavailable local files). They cannot
 * be re-added, so a rewrite of the playlist silently loses them — the UI warns
 * on this count before that happens.
 */
export const playlistTracksResponseSchema = z.object({
  tracks: z.array(resolvedTrackSchema),
  skippedCount: z.number(),
});

/**
 * `BuilderStep` values are constrained to `0 | 1 | 2` at the type level; the
 * schema mirrors that so persisted drafts with a rogue step index fail
 * validation instead of silently loading.
 */
const builderStepSchema = z.union([
  z.literal(BUILDER_STEP.PREPARE),
  z.literal(BUILDER_STEP.REFINE),
  z.literal(BUILDER_STEP.SAVE),
]);

/**
 * Per-track schema used only inside `draftSchema`. Adds a client-minted
 * `rowId` (see `components/builder-shell.tsx`) so pasting the same song
 * twice — the resolve route doesn't dedupe — doesn't collide on
 * `spotifyUri` for React keys and `TrackList`'s drag-and-drop identity,
 * mirroring `lib/playlist-edit.ts`'s `EditableRow` pattern. Kept separate
 * from `resolveResponseSchema` because that schema is the resolve API's
 * response contract and has no `rowId` concept.
 */
const draftResolvedTrackSchema = resolvedTrackSchema.extend({ rowId: z.string() });
const draftFailedTrackSchema = failedTrackSchema.extend({ rowId: z.string() });
const draftTrackSchema = z.discriminatedUnion('status', [
  draftResolvedTrackSchema,
  draftFailedTrackSchema,
]);

/**
 * Full `Draft` shape validated at the sessionStorage boundary. Persisted data
 * is untrusted input — any missing / extra / mistyped field collapses to
 * `null` in `loadDraft()`.
 */
export const draftSchema = z.object({
  tracks: z.array(draftTrackSchema),
  name: z.string(),
  visibility: z.enum(Object.values(VISIBILITY) as [Visibility, ...Visibility[]]),
  step: builderStepSchema,
  maxReached: builderStepSchema,
});
