import { z } from 'zod';

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
  retryAfterSeconds: z.number().optional(),
});

export const generateRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(1000, 'Prompt is too long'),
  count: z.number().int().min(5).max(50),
});

export const generateResponseSchema = z.object({
  suggestedName: z.string(),
  tracks: z.array(
    z.object({
      title: z.string(),
      artist: z.string(),
    })
  ),
});

export const resolveRequestSchema = z.object({
  tracks: z.array(
    z.object({
      title: z.string(),
      artist: z.string(),
    })
  ),
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
  query: z.object({
    title: z.string(),
    artist: z.string(),
  }),
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
