import { arrayMove } from '@dnd-kit/sortable';
import { useState } from 'react';

import { useSavePlaylist } from '@/hooks/use-save-playlist';
import { UPDATE_MODE } from '@/lib/constants';
import {
  diffPlaylist,
  NO_PENDING_CHANGES,
  orderKey,
  planSeedSync,
  toEditableRows,
  toSaveUris,
  type EditableRow,
} from '@/lib/playlist-edit';
import type { PlaylistDetail, ResolvedTrack } from '@/lib/types';

/**
 * The last-saved truth this editing session started from: a *snapshot* taken
 * when local state was seeded, never live query data. Diffing against a
 * snapshot is the whole point — if the playlist moves on Spotify's side
 * mid-edit, live data would silently redefine what "unsaved" means.
 */
interface EditorBaseline {
  tracks: ResolvedTrack[];
  name: string;
  isPublic: boolean;
}

/**
 * The deferred-edit state machine behind `/playlists/[id]`.
 *
 * Every mutation — reorder, remove, add, rename, visibility — writes local
 * state only; one Save rewrites the whole playlist in `replace` mode. This hook
 * owns that state, the pending diff, the Save mutation, and the conflict rule
 * that stops freshly fetched server data from eating unsaved work. Detail and
 * tracks are passed in rather than fetched here so the component keeps its own
 * loading and error treatments for each query.
 */
export function usePlaylistEditor(
  playlistId: string,
  detail: PlaylistDetail | null,
  serverTracks: ResolvedTrack[]
) {
  const { mutate: savePlaylist, isPending: isSaving, error: saveError } = useSavePlaylist();

  const [rows, setRows] = useState<EditableRow[]>([]);
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [baseline, setBaseline] = useState<EditorBaseline | null>(null);
  const [hasConflict, setHasConflict] = useState(false);

  // Pending changes are measured against the captured `baseline`, never against
  // `serverTracks`/`detail`. Before the first seed there is no baseline and
  // therefore, by definition, nothing pending.
  const diff = baseline
    ? diffPlaylist(baseline.tracks, rows, {
        serverName: baseline.name,
        name,
        serverPublic: baseline.isPublic,
        isPublic,
      })
    : NO_PENDING_CHANGES;

  // Seed local edit state from server data, and re-seed whenever that server
  // data changes (first load, a refetch after Save, a cache invalidation).
  //
  // The seed is a derived *primitive string* on purpose, and derives *only*
  // from query data. Three hard rules behind that, the first two learned the
  // hard way:
  //
  //  1. Never compare `serverTracks` (or `detail`) by reference. Nothing here is
  //     manually memoized — React Compiler owns memoization in this repo and
  //     does not guarantee a stable identity for every intermediate — so an
  //     identity check can be true on every render and never settle. That exact
  //     mistake produced a "Too many re-renders" crash, fixed in `027c385`;
  //     `orderKey` exists for this comparison.
  //  2. Never let `rows`, `name`, `isPublic`, `baseline` or `hasConflict` into
  //     the seed. They are what this block *writes*; feeding them back in would
  //     make every local edit re-trigger the sync and immediately undo itself.
  //  3. `syncedSeed` is assigned on *every* seed change, the conflict one
  //     included. The branch has to close even when local state is deliberately
  //     left untouched, or the render never converges.
  //
  // Adjusting state during render (React's documented "reset state when a prop
  // or state changes" pattern — https://react.dev/reference/react/useState)
  // rather than in a `useEffect` avoids an extra commit + render pass. It
  // converges because the seed cannot move as a result of the setters it calls.
  // `planSeedSync` holds the decision itself, unit-tested as a truth table.
  const seed = `${orderKey(serverTracks)}::${detail?.name}::${detail?.public}`;
  const [syncedSeed, setSyncedSeed] = useState<string | null>(null);

  const seedFrom = (source: PlaylistDetail, tracks: ResolvedTrack[]) => {
    setRows(toEditableRows(tracks));
    setName(source.name);
    setIsPublic(source.public);
    setBaseline({ tracks, name: source.name, isPublic: source.public });
    setHasConflict(false);
  };

  const action = planSeedSync({
    isStale: Boolean(detail) && syncedSeed !== seed,
    hasPendingChanges: diff.total > 0,
    hasConflict,
  });
  if (detail && action !== 'none') {
    // A no-op when the seed did not move (React bails out on `Object.is`),
    // which is the case on the conflict-recovery re-seed.
    setSyncedSeed(seed);
    if (action === 'reseed') seedFrom(detail, serverTracks);
    else setHasConflict(true);
  }

  const reorder = (oldIndex: number, newIndex: number) => {
    setRows((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  // Positional, not URI-based: a playlist can hold the same track twice, and
  // removing "the row at index 3" is the only reading that behaves correctly.
  const remove = (index: number) => {
    setRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  // Appends to the end of the local rows — nothing reaches Spotify until Save.
  // `toEditableRows` mints the `rowId`s, so a track the playlist already holds
  // still gets a distinct row rather than colliding with its twin. Safe for the
  // render-time sync above: that seed reads only query data, never `rows`.
  const addTracks = (tracks: ResolvedTrack[]) => {
    if (tracks.length === 0) return;
    setRows((prev) => [...prev, ...toEditableRows(tracks)]);
  };

  /**
   * Throw away pending edits — normally by restoring the captured `baseline`
   * (the state this session started from), not live server data, so Discard is
   * the exact inverse of the edits it undoes.
   *
   * **With a conflict pending it is deliberately the same action as the
   * banner's "Discard my changes and reload": re-seed from current server data
   * and clear the flag.** Restoring the baseline there would leave the user
   * editing a playlist that no longer exists on Spotify, still blocked from
   * saving, with a reload as the only way forward. One button, one meaning:
   * "drop my edits and show me what Spotify has now."
   *
   * Neither path re-triggers the render-time sync: `syncedSeed` already matches
   * the current seed, so the sync stays dormant while this writes exactly the
   * values it would have written.
   */
  const discard = () => {
    if (hasConflict) {
      if (detail) seedFrom(detail, serverTracks);
      return;
    }
    if (!baseline) return;
    setRows(toEditableRows(baseline.tracks));
    setName(baseline.name);
    setIsPublic(baseline.isPublic);
  };

  const canSave =
    name.trim().length > 0 && !hasConflict && !!detail && (detail.isOwner || detail.collaborative);

  const save = () => {
    const trimmedName = name.trim();
    if (!canSave || isSaving) return;
    savePlaylist(
      {
        playlistId,
        playlistName: trimmedName,
        uris: toSaveUris(rows),
        mode: UPDATE_MODE.REPLACE,
        isPublic,
      },
      {
        // What was just written *is* the new last-saved truth, so the baseline
        // moves with it. Without this the post-save refetch would land against a
        // stale baseline, read as "the server moved while you had unsaved
        // changes", and flag a conflict on a save that actually succeeded.
        // Editing is frozen while `isSaving`, so `rows` cannot have drifted.
        //
        // `syncedSeed` moves alongside it, stamped with the *anticipated*
        // post-save seed (same `orderKey::name::isPublic` shape as `seed`
        // above). The cache invalidation that follows a successful save is
        // fire-and-forget (see `use-save-playlist.ts`), so the refetch can land
        // after `isSaving` has already flipped back to `false`. Without this
        // stamp, that confirming refetch would find `syncedSeed` still pointing
        // at the pre-save value, read as "the server moved," and drop the editor
        // into `conflict` right after a successful save. Stamping the
        // anticipated value here makes that refetch a no-op the instant it
        // matches, while any real edit made in the interim still produces a
        // different seed and is handled as ordinary unsaved local state.
        onSuccess: () => {
          setBaseline({ tracks: rows, name: trimmedName, isPublic });
          setSyncedSeed(`${orderKey(rows)}::${trimmedName}::${isPublic}`);
        },
      }
    );
  };

  return {
    rows,
    name,
    setName,
    isPublic,
    setIsPublic,
    diff,
    /** True while server data has moved that local edits refuse to adopt. */
    hasConflict,
    isSaving,
    saveError,
    canSave,
    reorder,
    remove,
    addTracks,
    discard,
    save,
  };
}
