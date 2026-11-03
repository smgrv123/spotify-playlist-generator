import { describe, expect, it } from 'vitest';
import { SEED_SYNC_ACTION, type SeedSyncAction } from './constants';
import {
  diffPlaylist,
  NO_PENDING_CHANGES,
  orderKey,
  planSeedSync,
  toEditableRows,
  toSaveUris,
  type EditableRow,
  type PlaylistMeta,
  type SeedSyncState,
} from './playlist-edit';
import type { ResolvedTrack } from './types';

const URI_A = 'spotify:track:aaaaaaaaaaaaaaaaaaaaaa';
const URI_B = 'spotify:track:bbbbbbbbbbbbbbbbbbbbbb';
const URI_C = 'spotify:track:cccccccccccccccccccccc';
const URI_D = 'spotify:track:dddddddddddddddddddddd';

/** Minimal `ResolvedTrack` fixture — matches `resolvedTrackSchema` exactly. */
function makeTrack(uri: string, overrides: Partial<ResolvedTrack> = {}): ResolvedTrack {
  const id = uri.slice(uri.lastIndexOf(':') + 1);
  return {
    status: 'resolved',
    spotifyUri: uri,
    spotifyTrackId: id,
    durationMs: 210_000,
    displayData: { title: `Title ${id}`, artist: `Artist ${id}` },
    ...overrides,
  };
}

/** Local rows in an explicit order, independent of any server list. */
function makeRows(...uris: string[]): EditableRow[] {
  return toEditableRows(uris.map((uri) => makeTrack(uri)));
}

/** Rows reordered by index, mimicking a drag-and-drop without re-deriving ids. */
function reorder(rows: EditableRow[], indices: number[]): EditableRow[] {
  return indices.map((index) => rows[index]);
}

const SETTLED_META: PlaylistMeta = {
  serverName: 'Road Trip',
  name: 'Road Trip',
  serverPublic: false,
  isPublic: false,
};

const NO_CHANGES = {
  removed: 0,
  added: 0,
  reordered: false,
  renamed: false,
  visibilityChanged: false,
  total: 0,
};

describe('toEditableRows', () => {
  it('gives duplicate URIs distinct rowIds', () => {
    const rows = toEditableRows([makeTrack(URI_A), makeTrack(URI_A), makeTrack(URI_A)]);
    expect(rows.map((row) => row.spotifyUri)).toEqual([URI_A, URI_A, URI_A]);
    expect(new Set(rows.map((row) => row.rowId)).size).toBe(3);
  });

  it('preserves order and every track field', () => {
    const tracks = [makeTrack(URI_A), makeTrack(URI_B)];
    const rows = toEditableRows(tracks);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject(tracks[0]);
    expect(rows[1]).toMatchObject(tracks[1]);
    expect(typeof rows[0].rowId).toBe('string');
    expect(rows[0].rowId.length).toBeGreaterThan(0);
  });

  it('returns an empty list for an empty playlist', () => {
    expect(toEditableRows([])).toEqual([]);
  });
});

describe('diffPlaylist', () => {
  it('reports no pending changes when list and meta are untouched', () => {
    const server = [makeTrack(URI_A), makeTrack(URI_B), makeTrack(URI_A)];
    expect(diffPlaylist(server, toEditableRows(server), SETTLED_META)).toEqual(NO_CHANGES);
  });

  it('reports a pure reorder of a duplicate-heavy list as a reorder only', () => {
    const server = [makeTrack(URI_A), makeTrack(URI_B), makeTrack(URI_A), makeTrack(URI_C)];
    const moved = reorder(toEditableRows(server), [3, 0, 2, 1]);
    expect(diffPlaylist(server, moved, SETTLED_META)).toEqual({
      ...NO_CHANGES,
      reordered: true,
      total: 1,
    });
  });

  it('counts removing ONE of two identical URIs as removed: 1', () => {
    const server = [makeTrack(URI_A), makeTrack(URI_B), makeTrack(URI_A)];
    const local = makeRows(URI_A, URI_B);
    expect(diffPlaylist(server, local, SETTLED_META)).toEqual({
      ...NO_CHANGES,
      removed: 1,
      total: 1,
    });
  });

  it('counts adding a URI that is already present once as added: 1', () => {
    const server = [makeTrack(URI_A), makeTrack(URI_B)];
    const local = makeRows(URI_A, URI_B, URI_A);
    expect(diffPlaylist(server, local, SETTLED_META)).toEqual({
      ...NO_CHANGES,
      added: 1,
      total: 1,
    });
  });

  it('counts each removed and added track individually', () => {
    const server = [makeTrack(URI_A), makeTrack(URI_B), makeTrack(URI_C)];
    const local = makeRows(URI_A, URI_D);
    expect(diffPlaylist(server, local, SETTLED_META)).toEqual({
      ...NO_CHANGES,
      removed: 2,
      added: 1,
      total: 3,
    });
  });

  it('does not mistake a plain removal from the middle for a reorder', () => {
    const server = [makeTrack(URI_A), makeTrack(URI_B), makeTrack(URI_C)];
    expect(diffPlaylist(server, makeRows(URI_A, URI_C), SETTLED_META).reordered).toBe(false);
  });

  it('does not mistake an insertion in the middle for a reorder', () => {
    const server = [makeTrack(URI_A), makeTrack(URI_B)];
    expect(diffPlaylist(server, makeRows(URI_A, URI_D, URI_B), SETTLED_META).reordered).toBe(false);
  });

  it('reports both a removal and a reorder when the survivors moved', () => {
    const server = [makeTrack(URI_A), makeTrack(URI_B), makeTrack(URI_C)];
    expect(diffPlaylist(server, makeRows(URI_C, URI_A), SETTLED_META)).toEqual({
      ...NO_CHANGES,
      removed: 1,
      reordered: true,
      total: 2,
    });
  });

  it('reports a rename on its own', () => {
    const server = [makeTrack(URI_A)];
    const diff = diffPlaylist(server, toEditableRows(server), {
      ...SETTLED_META,
      name: 'Road Trip 2026',
    });
    expect(diff).toEqual({ ...NO_CHANGES, renamed: true, total: 1 });
  });

  it('ignores surrounding whitespace when comparing names', () => {
    const server = [makeTrack(URI_A)];
    const diff = diffPlaylist(server, toEditableRows(server), {
      ...SETTLED_META,
      name: '  Road Trip  ',
    });
    expect(diff).toEqual(NO_CHANGES);
  });

  it('treats a name cleared to whitespace as not renamed (unsavable, so not pending)', () => {
    const server = [makeTrack(URI_A)];
    const diff = diffPlaylist(server, toEditableRows(server), { ...SETTLED_META, name: '   ' });
    expect(diff).toEqual(NO_CHANGES);
  });

  it('reports a visibility change on its own', () => {
    const server = [makeTrack(URI_A)];
    const diff = diffPlaylist(server, toEditableRows(server), { ...SETTLED_META, isPublic: true });
    expect(diff).toEqual({ ...NO_CHANGES, visibilityChanged: true, total: 1 });
  });

  it('sums every kind of pending change into total', () => {
    const server = [makeTrack(URI_A), makeTrack(URI_B), makeTrack(URI_C)];
    const diff = diffPlaylist(server, makeRows(URI_C, URI_A, URI_D), {
      serverName: 'Road Trip',
      name: 'Road Trip 2026',
      serverPublic: false,
      isPublic: true,
    });
    expect(diff).toEqual({
      removed: 1,
      added: 1,
      reordered: true,
      renamed: true,
      visibilityChanged: true,
      total: 5,
    });
  });

  it('handles clearing every track', () => {
    const server = [makeTrack(URI_A), makeTrack(URI_A)];
    expect(diffPlaylist(server, [], SETTLED_META)).toEqual({
      ...NO_CHANGES,
      removed: 2,
      total: 2,
    });
  });
});

describe('toSaveUris', () => {
  it('preserves local order and keeps duplicates', () => {
    expect(toSaveUris(makeRows(URI_B, URI_A, URI_B, URI_B))).toEqual([URI_B, URI_A, URI_B, URI_B]);
  });

  it('returns an empty list when every track was removed', () => {
    expect(toSaveUris([])).toEqual([]);
  });
});

describe('orderKey', () => {
  it('is stable for the same sequence and changes after a reorder', () => {
    const server = [makeTrack(URI_A), makeTrack(URI_B), makeTrack(URI_A)];
    const rows = toEditableRows(server);
    expect(orderKey(rows)).toBe(orderKey(server));
    expect(orderKey(reorder(rows, [1, 0, 2]))).not.toBe(orderKey(rows));
  });

  it('changes when a duplicate occurrence is removed', () => {
    const both = orderKey([makeTrack(URI_A), makeTrack(URI_A)]);
    const one = orderKey([makeTrack(URI_A)]);
    expect(one).not.toBe(both);
  });
});

describe('NO_PENDING_CHANGES', () => {
  it('is a genuinely empty diff', () => {
    expect(NO_PENDING_CHANGES).toEqual(NO_CHANGES);
  });

  it('is frozen, since every caller shares the one instance', () => {
    expect(Object.isFrozen(NO_PENDING_CHANGES)).toBe(true);
  });
});

describe('planSeedSync', () => {
  /** The full truth table, so no case is decided by reading the implementation. */
  const cases: [SeedSyncState, SeedSyncAction, string][] = [
    [
      { isStale: false, hasPendingChanges: false, hasConflict: false },
      SEED_SYNC_ACTION.NONE,
      'settled',
    ],
    [
      { isStale: true, hasPendingChanges: false, hasConflict: false },
      SEED_SYNC_ACTION.RESEED,
      'new server data, nothing to lose',
    ],
    [
      { isStale: true, hasPendingChanges: true, hasConflict: false },
      SEED_SYNC_ACTION.CONFLICT,
      'new server data would overwrite unsaved work',
    ],
    [
      { isStale: false, hasPendingChanges: true, hasConflict: false },
      SEED_SYNC_ACTION.NONE,
      'plain local editing',
    ],
    [
      { isStale: false, hasPendingChanges: false, hasConflict: true },
      SEED_SYNC_ACTION.RESEED,
      'conflict recovered: edits undone by hand',
    ],
    [
      { isStale: false, hasPendingChanges: true, hasConflict: true },
      SEED_SYNC_ACTION.NONE,
      'conflict stands while edits stand',
    ],
    [
      { isStale: true, hasPendingChanges: false, hasConflict: true },
      SEED_SYNC_ACTION.RESEED,
      'server moved again after a recovered conflict',
    ],
    [
      { isStale: true, hasPendingChanges: true, hasConflict: true },
      SEED_SYNC_ACTION.CONFLICT,
      'server moved again while the conflict stands',
    ],
  ];

  it.each(cases)('%j → %s (%s)', (state, expected) => {
    expect(planSeedSync(state)).toBe(expected);
  });

  it('never re-seeds over unsaved work, whatever else is true', () => {
    for (const [state, action] of cases) {
      if (state.hasPendingChanges) expect(action).not.toBe(SEED_SYNC_ACTION.RESEED);
    }
  });
});
