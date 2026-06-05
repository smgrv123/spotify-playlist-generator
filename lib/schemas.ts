import { z } from 'zod';
import {
  FAILED_REASON,
  SAVE_RESPONSE_MODE,
  UPDATE_MODE,
  type FailedReason,
  type SaveResponseMode,
  type UpdateMode,
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
