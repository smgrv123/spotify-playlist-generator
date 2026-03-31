import { z } from 'zod';

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
  reason: z.enum(['NO_MATCH', 'SEARCH_ERROR']),
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
  mode: z.enum(['replace', 'append']).optional(),
});

export const saveResponseSchema = z.object({
  playlistId: z.string(),
  snapshotId: z.string().optional(),
  mode: z.enum(['created', 'updated']),
});
