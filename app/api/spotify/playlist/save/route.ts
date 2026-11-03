import { fail, normalizeError, ok } from '@/lib/api-response';
import { SAVE_RESPONSE_MODE, UPDATE_MODE } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { saveRequestSchema } from '@/lib/schemas';
import { spotifyClient } from '@/lib/spotify-client';
import { SpotifySnapshotResponse } from '@/lib/spotify-types';
import { formatZodErrors } from '@/lib/utils';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

// Spotify natively enforces exactly 100 URIs per add-items request
const MAX_URIS_PER_REQUEST = 100;

export async function POST(request: NextRequest) {
  const reqId = crypto.randomUUID();

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

    // NOTE: there is deliberately no global zero-URI guard here. An update in
    // 'replace' mode with an empty list is the canonical "clear this playlist"
    // call, so the rejection lives on the two branches where zero URIs really
    // are meaningless: creating a playlist, and appending nothing to one.
    let finalSnapshotId: string | undefined = undefined;

    let targetPlaylistId: string;
    const isUpdate = !!playlistId;
    const CHUNK_LIMIT = MAX_URIS_PER_REQUEST; // Use the constant for clarity

    if (isUpdate) {
      targetPlaylistId = playlistId;

      if (mode === UPDATE_MODE.REPLACE) {
        // The Spotify PUT /playlists/{playlist_id}/items endpoint actually overwrites everything.
        // So, we don't need to clear it first with an empty array.
        // We will perform the PUT with the first chunk, and then POST the rest.
        // An empty list is allowed: it is how a playlist gets cleared, and it is
        // also what a rename-only save sends.
      } else if (mode === UPDATE_MODE.APPEND) {
        // Appending nothing is a no-op request, not a valid save.
        if (uris.length === 0) {
          logger.warn('Append attempted with zero tracks', { reqId, targetPlaylistId });
          return fail('VALIDATION_ERROR', 'Cannot append zero tracks to a playlist', 400);
        }
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
      // `public` is spread in conditionally: callers that omit `isPublic` are
      // renaming or re-ordering only, and must not have visibility flipped as a
      // side effect of the update.
      await spotifyClient.put(`/playlists/${encodeURIComponent(targetPlaylistId)}`, {
        name: trimmedName,
        ...(isPublic !== undefined && { public: isPublic }),
      });
    } else {
      // Create new playlist
      if (uris.length === 0) {
        logger.warn('New playlist creation attempted with zero tracks', { reqId });
        return fail('VALIDATION_ERROR', 'Cannot save a playlist with zero tracks', 400);
      }
      if (!playlistName.trim()) {
        logger.warn('New playlist creation attempted with empty name', { reqId });
        return fail(
          'VALIDATION_ERROR',
          'Playlist name cannot be empty when creating a new playlist',
          400
        );
      }
      const created = await spotifyClient.post<{ id: string }>(`/me/playlists`, {
        name: playlistName.trim(),
        public: isPublic ?? false,
      });
      targetPlaylistId = created.id;
      logger.info('New playlist created', { reqId, targetPlaylistId });
    }

    // Now, add tracks to the target playlist
    if (isUpdate && mode === UPDATE_MODE.REPLACE) {
      // KNOWN FAILURE MODE — a partial write truncates the playlist.
      //
      // Spotify has no "replace with N > 100 items" call, so a replace is a PUT
      // of the first 100 URIs (which wipes everything already there) followed by
      // one POST per further 100. Those requests are not a transaction and there
      // is no rollback: if request k fails, the playlist is left holding only
      // the first k * 100 URIs and the tail is gone from Spotify.
      //
      // Nothing here retries. `spotifyClient` throws on any non-2xx, including
      // 429 — there is deliberately no backoff (out of scope), and a long
      // replace is exactly the shape of request that earns one. The error
      // propagates to the catch below and the client sees a failed save.
      //
      // The mitigation is on the client, not here: `useSavePlaylist` invalidates
      // the playlist queries on error as well as on success, so the editor
      // re-reads what actually landed instead of rendering the list it hoped to
      // write. If the user still holds unsaved edits at that point, the editor
      // keeps them, flags a conflict and blocks a second blind `replace`
      // (`hooks/use-playlist-editor.ts`) — recovery is an explicit reload, never
      // a silent overwrite of whatever the failed write left behind.
      //
      // For 'replace' mode on an existing playlist, the first chunk uses PUT to overwrite
      const initialChunk = uris.slice(0, CHUNK_LIMIT);
      logger.info(`Replacing initial chunk to playlist ${targetPlaylistId}`, {
        reqId,
        chunkSize: initialChunk.length,
      });
      const replaceResponse = await spotifyClient.put<SpotifySnapshotResponse>(
        `/playlists/${encodeURIComponent(targetPlaylistId)}/items`,
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
        const addRes = await spotifyClient.post<SpotifySnapshotResponse>(
          `/playlists/${encodeURIComponent(targetPlaylistId)}/items`,
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
        const addRes = await spotifyClient.post<SpotifySnapshotResponse>(
          `/playlists/${encodeURIComponent(targetPlaylistId)}/items`,
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
      mode: isUpdate ? SAVE_RESPONSE_MODE.UPDATED : SAVE_RESPONSE_MODE.CREATED,
    });
  } catch (error) {
    logger.error('Save playlist pipeline failed entirely', error, { reqId });
    return normalizeError(error);
  }
}
