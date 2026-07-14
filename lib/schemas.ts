import { z } from 'zod';
import {
  BUILDER_STEP,
  FAILED_REASON,
  SAVE_MODE,
  SAVE_RESPONSE_MODE,
  UPDATE_MODE,
  VISIBILITY,
  type FailedReason,
  type SaveMode,
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
  uris: z.array(z.string()),
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
 * Full `Draft` shape validated at the sessionStorage boundary. Persisted data
 * is untrusted input — any missing / extra / mistyped field collapses to
 * `null` in `loadDraft()`.
 */
export const draftSchema = z.object({
  tracks: z.array(resolveResponseSchema),
  name: z.string(),
  visibility: z.enum(Object.values(VISIBILITY) as [Visibility, ...Visibility[]]),
  step: builderStepSchema,
  maxReached: builderStepSchema,
  mode: z.enum(Object.values(SAVE_MODE) as [SaveMode, ...SaveMode[]]),
  target: z.string(),
});
