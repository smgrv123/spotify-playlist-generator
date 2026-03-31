import { z } from 'zod';
import * as schemas from './schemas';

export type ApiError = z.infer<typeof schemas.apiErrorSchema>;

export type ResolveRequest = z.infer<typeof schemas.resolveRequestSchema>;
export type ResolvedTrack = z.infer<typeof schemas.resolvedTrackSchema>;
export type FailedTrack = z.infer<typeof schemas.failedTrackSchema>;
export type ResolveResponse = z.infer<typeof schemas.resolveResponseSchema>;

export type SaveRequest = z.infer<typeof schemas.saveRequestSchema>;
export type SaveResponse = z.infer<typeof schemas.saveResponseSchema>;
