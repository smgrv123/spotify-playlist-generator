import { fail, normalizeError, ok } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { saveRequestSchema } from '@/lib/schemas';
import { spotifyClient } from '@/lib/spotify-client';
import { formatZodErrors } from '@/lib/utils';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

// Spotify natively enforces exactly 100 URIs per add-items request
const MAX_URIS_PER_REQUEST = 100;

interface AddItemsResponse {
  snapshot_id: string;
}

export async function POST(request: NextRequest) {
  const reqId = crypto.randomUUID();
  logger.info('Save playlist request started', { reqId });

  try {
    const rawBodyText = await request.text();
    let rawBody: unknown;
    try {
      const sanitizedBody = rawBodyText.replace(/^\uFEFF/, '');
      rawBody = JSON.parse(sanitizedBody);
    } catch (parseError) {
      logger.warn('Save playlist failed JSON parse', {
        reqId,
        error: parseError instanceof Error ? parseError.message : 'Unknown error',
      });
      return fail('VALIDATION_ERROR', 'Invalid JSON body', 400);
    }

    const validationResult = saveRequestSchema.safeParse(rawBody);

    if (!validationResult.success) {
      logger.warn('Save playlist validation failed', {
        reqId,
        issues: validationResult.error.issues,
      });
      return fail(
        'VALIDATION_ERROR',
        'Invalid save request',
        400,
        formatZodErrors(validationResult.error)
      );
    }

    const { playlistId, playlistName, uris, mode, isPublic } = validationResult.data;

    if (!uris || uris.length === 0) {
      return fail('VALIDATION_ERROR', 'Cannot save a playlist with zero tracks', 400);
    }

    let finalSnapshotId: string | undefined = undefined;

    let targetPlaylistId: string;
    const isUpdate = !!playlistId;
    const CHUNK_LIMIT = MAX_URIS_PER_REQUEST; // Use the constant for clarity

    if (isUpdate) {
      if (!playlistId) {
        logger.warn('Save playlist update attempted without ID', { reqId });
        return fail('VALIDATION_ERROR', 'Updating a playlist requires a playlistId', 400);
      }
      targetPlaylistId = playlistId;

      if (mode === 'replace') {
        logger.info('Replacing playlist items', { reqId, targetPlaylistId, count: uris.length });
        // The Spotify PUT /playlists/{playlist_id}/items endpoint actually overwrites everything.
        // So, we don't need to clear it first with an empty array.
        // We will perform the PUT with the first chunk, and then POST the rest.
      } else if (mode === 'append') {
        logger.info('Appending to playlist items', { reqId, targetPlaylistId, count: uris.length });
        // For append, we just POST all chunks.
      } else {
        logger.warn('Invalid update mode specified', { reqId, mode });
        return fail('VALIDATION_ERROR', 'Invalid update mode specified', 400);
      }

      const trimmedName = playlistName.trim();
      if (!trimmedName) {
        logger.warn('Playlist rename attempted with empty name', { reqId, targetPlaylistId });
        return fail('VALIDATION_ERROR', 'Playlist name cannot be empty when updating', 400);
      }
      await spotifyClient.put(`/playlists/${targetPlaylistId}`, { name: trimmedName });
    } else {
      // Create new playlist
      if (!playlistName.trim()) {
        logger.warn('New playlist creation attempted with empty name', { reqId });
        return fail(
          'VALIDATION_ERROR',
          'Playlist name cannot be empty when creating a new playlist',
          400
        );
      }
      logger.info('Creating new playlist', { reqId, playlistName });
      const created = await spotifyClient.post<{ id: string }>(`/me/playlists`, {
        name: playlistName.trim(),
        public: isPublic ?? false,
      });
      targetPlaylistId = created.id;
      logger.info('New playlist created', { reqId, targetPlaylistId });
    }

    // Now, add tracks to the target playlist
    if (isUpdate && mode === 'replace') {
      // For 'replace' mode on an existing playlist, the first chunk uses PUT to overwrite
      const initialChunk = uris.slice(0, CHUNK_LIMIT);
      logger.info(`Replacing initial chunk to playlist ${targetPlaylistId}`, {
        reqId,
        chunkSize: initialChunk.length,
      });
      const replaceResponse = await spotifyClient.put<AddItemsResponse>(
        `/playlists/${targetPlaylistId}/items`,
        { uris: initialChunk }
      );
      finalSnapshotId = replaceResponse.snapshot_id;

      // Subsequent chunks (if any) are appended using POST
      for (let i = CHUNK_LIMIT; i < uris.length; i += CHUNK_LIMIT) {
        const chunk = uris.slice(i, i + CHUNK_LIMIT);
        logger.info(`Appending chunk to playlist ${targetPlaylistId}`, {
          reqId,
          chunkStart: i,
          chunkSize: chunk.length,
        });
        const addRes = await spotifyClient.post<{ snapshot_id: string }>(
          `/playlists/${targetPlaylistId}/items`,
          { uris: chunk }
        );
        finalSnapshotId = addRes.snapshot_id;
      }
    } else {
      // For 'append' mode on existing, or any mode on new playlist, all chunks use POST
      for (let i = 0; i < uris.length; i += CHUNK_LIMIT) {
        const chunk = uris.slice(i, i + CHUNK_LIMIT);
        logger.info(`Adding chunk to playlist ${targetPlaylistId}`, {
          reqId,
          chunkStart: i,
          chunkSize: chunk.length,
        });
        const addRes = await spotifyClient.post<{ snapshot_id: string }>(
          `/playlists/${targetPlaylistId}/items`,
          { uris: chunk }
        );
        finalSnapshotId = addRes.snapshot_id;
      }
    }

    logger.info('Save playlist request complete', {
      reqId,
      targetPlaylistId,
      snapshotId: finalSnapshotId,
    });
    return ok({
      playlistId: targetPlaylistId,
      snapshotId: finalSnapshotId,
      mode: isUpdate ? 'updated' : 'created',
    });
  } catch (error) {
    logger.error('Save playlist pipeline failed entirely', error, { reqId });
    return normalizeError(error);
  }
}
