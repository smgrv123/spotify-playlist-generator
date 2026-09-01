import type { ResolvedTrack } from './types';

/**
 * Pure, framework-free brain of the playlist edit screen (`/playlists/[id]`).
 *
 * The edit screen defers every mutation: reordering, removal, rename and
 * visibility changes all live in local React state until one Save writes the
 * full ordered URI list back to Spotify. Everything in this module is a plain
 * function over plain data so it can be unit-tested without a DOM, and so the
 * component layer stays a thin rendering shell.
 *
 * Entry points:
 *
 * - `toEditableRows(tracks)`: attach a stable per-row identity to server tracks.
 * - `hasSameOrder(server, local)`: cheap "is the local sequence still the
 *   server's sequence?" check, safe to call on every render.
 * - `diffPlaylist(server, local, meta)`: the full pending-change summary that
 *   drives the sticky "N unsaved changes" bar.
 * - `orderKey(tracks)`: scalar seed for render-time state sync (see its docs).
 * - `planSeedSync(state)`: what the render-time sync should do when server data
 *   moves — adopt it, or refuse and flag a conflict.
 * - `toSaveUris(rows)`: the exact payload Save sends.
 *
 * Duplicate URIs are a first-class case throughout: a Spotify playlist may
 * legitimately contain the same track more than once, so rows are identified
 * by `rowId` (never by URI) and every count is multiset-correct (by
 * occurrence), never set-correct (by membership).
 */

/**
 * A server track plus a stable client-side row identity.
 *
 * `rowId` exists because `spotifyUri` is *not* unique within a playlist — the
 * same track can appear twice. Drag-and-drop and per-row removal must target
 * one specific occurrence, so they key off `rowId`. It is generated once when
 * server data arrives and must survive reordering and re-renders; it is never
 * sent to Spotify.
 */
export type EditableRow = ResolvedTrack & { rowId: string };

/**
 * Name and visibility as they stand on the server versus in local state.
 * `serverName` / `serverPublic` are the last-saved truth; `name` / `isPublic`
 * are the user's pending edits.
 */
export interface PlaylistMeta {
  serverName: string;
  name: string;
  serverPublic: boolean;
  isPublic: boolean;
}

/**
 * Summary of everything that would change if the user hit Save right now.
 *
 * - `removed` / `added`: counted by occurrence, not by set membership. Two
 *   copies of a URI on the server against one locally is `removed: 1`.
 * - `reordered`: the tracks common to both sides sit in a different relative
 *   order. Plain removals and plain insertions do *not* set this flag; only a
 *   genuine resequencing does.
 * - `total`: see `diffPlaylist` for the counting rule.
 */
export interface PlaylistDiff {
  removed: number;
  added: number;
  reordered: boolean;
  renamed: boolean;
  visibilityChanged: boolean;
  total: number;
}

/**
 * The "nothing is pending" diff, for callers that have no baseline to compare
 * against yet (the editor before its first seed lands). Frozen because it is a
 * shared module-level value: a caller that mutated it would corrupt every other
 * reader.
 */
export const NO_PENDING_CHANGES: PlaylistDiff = Object.freeze({
  removed: 0,
  added: 0,
  reordered: false,
  renamed: false,
  visibilityChanged: false,
  total: 0,
});

/** Occurrence count per URI — the basis for every multiset-correct comparison. */
function countByUri(rows: readonly { spotifyUri: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.spotifyUri, (counts.get(row.spotifyUri) ?? 0) + 1);
  }
  return counts;
}

/**
 * The URI sequence of `rows` restricted to the occurrences allowed by `quota`,
 * keeping the earliest occurrences of each URI. Used to strip additions and
 * removals out of both sides so what remains is purely a question of order.
 */
function retainedUris(
  rows: readonly { spotifyUri: string }[],
  quota: Map<string, number>
): string[] {
  const remaining = new Map(quota);
  const kept: string[] = [];
  for (const row of rows) {
    const left = remaining.get(row.spotifyUri) ?? 0;
    if (left > 0) {
      kept.push(row.spotifyUri);
      remaining.set(row.spotifyUri, left - 1);
    }
  }
  return kept;
}

/** Element-wise string sequence equality, early-exiting on the first mismatch. */
function sameSequence(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  return !a.some((value, index) => value !== b[index]);
}

/**
 * Attach a fresh `rowId` to each server track, preserving order.
 *
 * Two rows carrying the identical `spotifyUri` are guaranteed distinct
 * `rowId`s — that separation is the entire reason the field exists.
 *
 * `crypto.randomUUID()` is a global in every environment this code runs in
 * (Node 18+, and browsers in a secure context), so no import is needed.
 */
export function toEditableRows(tracks: ResolvedTrack[]): EditableRow[] {
  return tracks.map((track) => ({ ...track, rowId: crypto.randomUUID() }));
}

/**
 * Whether the local rows still hold the server's exact track sequence.
 *
 * Deliberately cheap: a length check first, then a `.some()` that bails on the
 * first differing position. Callers run this on every render, so it must not
 * allocate — in particular it must never build joined strings from both sides
 * (that is `orderKey`'s job, for a different purpose).
 */
export function hasSameOrder(server: ResolvedTrack[], local: EditableRow[]): boolean {
  if (server.length !== local.length) return false;
  return !server.some((track, index) => track.spotifyUri !== local[index].spotifyUri);
}

/**
 * A scalar (string) fingerprint of a track sequence, for use as a *seed* in a
 * render-time state sync — e.g. resetting local rows when freshly fetched
 * server data arrives.
 *
 * This exists on purpose and is not redundant with `hasSameOrder`. A
 * render-time sync has to compare the previous value against the current one
 * with `Object.is`, and comparing an unmemoized array by reference makes the
 * comparison fail every render — that caused a real infinite-render loop in
 * this codebase. A derived primitive compares by value and ends the loop.
 * (Manual memoization is not the fix here: React Compiler owns memoization in
 * this repo, and a scalar seed is the cheaper, more robust answer anyway.)
 *
 * `hasSameOrder` deliberately does *not* call this: it is the hot per-render
 * equality check and must stay allocation-free, whereas `orderKey` allocates a
 * string by design because its result is stored and compared across renders.
 * Do not "optimize" one into the other.
 */
export function orderKey(tracks: { spotifyUri: string }[]): string {
  return tracks.map((track) => track.spotifyUri).join('\n');
}

/**
 * What the editor's render-time state sync should do on this render.
 *
 * - `reseed`: adopt the server's data wholesale (rows, name, visibility, and
 *   the diff baseline).
 * - `conflict`: refuse to adopt it. The server moved *and* the user has
 *   unsaved work that a re-seed would silently destroy.
 * - `none`: leave local state alone.
 */
export type SeedSyncAction = 'none' | 'reseed' | 'conflict';

/**
 * Inputs to `planSeedSync`.
 *
 * - `isStale`: freshly fetched server data no longer matches what local state
 *   was seeded from (a first load, a post-save refetch, a collaborator's edit).
 * - `hasPendingChanges`: local state differs from the captured baseline, i.e.
 *   the user has work that has not reached Spotify.
 * - `hasConflict`: a conflict was already raised on an earlier render.
 */
export interface SeedSyncState {
  isStale: boolean;
  hasPendingChanges: boolean;
  hasConflict: boolean;
}

/**
 * Decide whether newly arrived server data may overwrite local edit state.
 *
 * The rule is one sentence: **never discard unsaved work to make room for
 * server data.** Adopting server data is only safe when there is nothing
 * pending; otherwise the playlist moved underneath an in-progress edit and the
 * user has to arbitrate.
 *
 * The `!isStale && hasConflict && !hasPendingChanges` case is the recovery
 * path: a conflict was raised, then the user undid their edits by hand. Local
 * state now agrees with the baseline, so the pending server data can finally be
 * adopted and the conflict cleared — without that case, the editor would sit on
 * data it already knows is out of date.
 *
 * Pure and total by design: the caller owns all the state, this owns the
 * policy, and the truth table is unit-tested rather than reasoned about inside
 * a render.
 */
export function planSeedSync(state: SeedSyncState): SeedSyncAction {
  if (state.hasPendingChanges) return state.isStale ? 'conflict' : 'none';
  return state.isStale || state.hasConflict ? 'reseed' : 'none';
}

/**
 * The exact URI list Save writes to Spotify: local row order, duplicates kept.
 * No de-duplication — a playlist holding the same track twice is valid, and
 * silently collapsing it would delete a track the user never removed.
 */
export function toSaveUris(rows: EditableRow[]): string[] {
  return rows.map((row) => row.spotifyUri);
}

/**
 * Compare the server's playlist against local edits and summarise what is
 * pending.
 *
 * Track counting is multiset-based: per URI, `min(serverCount, localCount)`
 * occurrences are treated as retained, any server surplus is a removal and any
 * local surplus is an addition. `reordered` is then decided *only* on the
 * retained occurrences of both sides, so a pure reorder reports
 * `removed: 0, added: 0, reordered: true` rather than masquerading as a pile of
 * removals plus additions — and, symmetrically, a plain removal or a plain
 * insertion does not get mislabelled a reorder.
 *
 * `total` is the count of distinct pending changes shown as "N unsaved
 * changes": every removed track and every added track counts individually
 * (they are things the user did, one per track), while reorder, rename and
 * visibility each count once no matter how much was moved or retyped —
 * `removed + added + reordered + renamed + visibilityChanged`. `total === 0`
 * is therefore the authoritative "nothing to save" signal.
 *
 * `renamed` compares trimmed names, so leading/trailing whitespace alone is not
 * a change. A name that trims to empty is treated as *not* renamed: a blank
 * title cannot be saved (it would wipe the playlist's name), so an in-progress
 * cleared input must not inflate the unsaved-change count or arm Save. Typing
 * a real name afterwards flips `renamed` to true as expected.
 */
export function diffPlaylist(
  server: ResolvedTrack[],
  local: EditableRow[],
  meta: PlaylistMeta
): PlaylistDiff {
  const serverCounts = countByUri(server);
  const localCounts = countByUri(local);

  let removed = 0;
  let added = 0;
  const shared = new Map<string, number>();

  for (const [uri, count] of serverCounts) {
    const overlap = Math.min(count, localCounts.get(uri) ?? 0);
    removed += count - overlap;
    if (overlap > 0) shared.set(uri, overlap);
  }
  for (const [uri, count] of localCounts) {
    added += count - Math.min(count, serverCounts.get(uri) ?? 0);
  }

  const reordered = !sameSequence(retainedUris(server, shared), retainedUris(local, shared));

  const trimmedName = meta.name.trim();
  const renamed = trimmedName.length > 0 && trimmedName !== meta.serverName.trim();
  const visibilityChanged = meta.isPublic !== meta.serverPublic;

  return {
    removed,
    added,
    reordered,
    renamed,
    visibilityChanged,
    total: removed + added + (reordered ? 1 : 0) + (renamed ? 1 : 0) + (visibilityChanged ? 1 : 0),
  };
}
