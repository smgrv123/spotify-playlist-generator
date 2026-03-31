import { fail, normalizeError, ok } from '@/lib/api-response';
import { generatePlaylist } from '@/lib/gemini-client';
import { logger } from '@/lib/logger';
import { generateRequestSchema } from '@/lib/schemas';
import { formatZodErrors } from '@/lib/utils';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const reqId = crypto.randomUUID();
  logger.info('Generate request started', { reqId });

  try {
    const rawBody = await request.json();
    const validationResult = generateRequestSchema.safeParse(rawBody);

    if (!validationResult.success) {
      logger.warn('Generate request validation failed', {
        reqId,
        issues: validationResult.error.issues,
      });
      return fail(
        'VALIDATION_ERROR',
        'Invalid generate request',
        400,
        formatZodErrors(validationResult.error)
      );
    }

    const { prompt, count } = validationResult.data;

    // Use the central Gemini Client Utility to fetch model response securely
    const rawGeneratedResponse = await generatePlaylist({ prompt, count });

    // Enforce uniqueness natively by normalized `title::artist` string maps
    const uniqueTracksMap = new Map<string, { title: string; artist: string }>();

    for (const track of rawGeneratedResponse.tracks) {
      const canonicalKey = `${track.title.toLowerCase().trim()}::${track.artist.toLowerCase().trim()}`;
      if (!uniqueTracksMap.has(canonicalKey)) {
        uniqueTracksMap.set(canonicalKey, track);
      }
    }

    let deduplicatedTracks = Array.from(uniqueTracksMap.values());

    // Explicit count check (Gemini frequently hallucinates incorrect array counts)
    // If we have fewer than requested due to extreme deduping, it's considered a failure to satisfy bounds.
    if (deduplicatedTracks.length < count) {
      logger.warn('Generated tracks fell below requested count after dedup', {
        reqId,
        requested: count,
        actual: deduplicatedTracks.length,
      });
      return fail(
        'GENERATION_INCOMPLETE',
        `Only generated ${deduplicatedTracks.length} unique tracks (requested ${count}). Please try a broader prompt.`,
        400
      );
    }

    // In case the model over-provided, trim exactly to requested count
    deduplicatedTracks = deduplicatedTracks.slice(0, count);

    return ok({
      suggestedName: rawGeneratedResponse.suggestedName,
      tracks: deduplicatedTracks,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      logger.warn('Generate request failed JSON parse', { reqId });
      return fail('VALIDATION_ERROR', 'Invalid JSON body', 400);
    }
    logger.error('Generate pipeline failed entirely', error, { reqId });
    return normalizeError(error);
  }
}
