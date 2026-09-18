import { fail, normalizeError, ok } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { deletePlaylistRequestSchema } from '@/lib/schemas';
import { spotifyClient } from '@/lib/spotify-client';
import { formatZodErrors } from '@/lib/utils';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const reqId = crypto.randomUUID();

  try {
    const rawBody = await request.json();
    const validationResult = deletePlaylistRequestSchema.safeParse(rawBody);

    if (!validationResult.success) {
      logger.warn('Delete playlist validation failed', {
        reqId,
        issues: validationResult.error.issues,
      });
      return fail(
        'VALIDATION_ERROR',
        'Invalid delete request',
        400,
        formatZodErrors(validationResult.error)
      );
    }

    const { playlistId } = validationResult.data;

    await spotifyClient.delete(`/playlists/${playlistId}/followers`);

    return ok({ playlistId });
  } catch (error) {
    if (error instanceof SyntaxError) {
      logger.warn('Delete playlist failed JSON parse', { reqId });
      return fail('VALIDATION_ERROR', 'Invalid JSON body', 400);
    }
    logger.error('Delete playlist pipeline failed entirely', error, { reqId });
    return normalizeError(error);
  }
}
