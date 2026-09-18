import { TRACK_STATUS } from './constants';
import { FailedTrack, ResolvedTrack, TrackItem } from './types';

/**
 * Type-narrowing guards for track variants.
 * Use these instead of `as` casts when filtering mixed track arrays.
 */

export function isResolved(track: TrackItem): track is ResolvedTrack {
  return track.status === TRACK_STATUS.RESOLVED;
}

export function isFailed(track: TrackItem): track is FailedTrack {
  return track.status === TRACK_STATUS.FAILED;
}

/**
 * Safely extracts an error message from an unknown caught value.
 * Eliminates the need for `err as Error` casts in catch blocks.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as Record<string, unknown>).message === 'string'
  ) {
    return (err as Record<string, unknown>).message as string;
  }
  return 'An unexpected error occurred';
}

/**
 * Checks whether an unknown value has the shape of an API error response
 * (`{ code: string, message: string }`).
 */
export function isApiErrorShape(
  value: unknown
): value is { code: string; message: string; details?: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof (value as Record<string, unknown>).code === 'string' &&
    'message' in value &&
    typeof (value as Record<string, unknown>).message === 'string'
  );
}
