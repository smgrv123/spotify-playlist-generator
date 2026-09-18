'use client';

import { AlertCircle, Info, Loader2 } from 'lucide-react';

import { AddTracksPanel } from '@/components/playlist/add-tracks-panel';
import { TrackList } from '@/components/track-list';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { EditableRow } from '@/lib/playlist-edit';
import { getErrorMessage } from '@/lib/type-guards';
import type { ResolvedTrack } from '@/lib/types';

interface PlaylistTrackEditorProps {
  /** Local (possibly edited) rows — never the raw server tracks. */
  rows: EditableRow[];
  isLoading: boolean;
  error: unknown;
  /**
   * Items the tracks endpoint could not turn into editable rows — podcast
   * episodes and local files. They are part of the playlist on Spotify but
   * cannot be re-added by URI, so a save drops them.
   */
  skippedCount: number;
  onReorder: (oldIndex: number, newIndex: number) => void;
  onRemove: (index: number) => void;
  /** Appends tracks to the end of the local rows. Deferred like every other edit. */
  onAddTracks: (tracks: ResolvedTrack[]) => void;
  /** Freezes drag, remove and adding while a save is in flight. */
  isSaving: boolean;
}

/**
 * The editable track list: drag to reorder, per-row remove, plus this
 * section's own loading, error and un-editable-items treatments.
 *
 * Rows are keyed by their `rowId` through `TrackList`'s `rowIds` prop rather
 * than by Spotify URI, because a playlist may hold the same track twice and
 * URI-keyed rows make the second copy indistinguishable from the first.
 */
export function PlaylistTrackEditor({
  rows,
  isLoading,
  error,
  skippedCount,
  onReorder,
  onRemove,
  onAddTracks,
  isSaving,
}: PlaylistTrackEditorProps) {
  // Built from the *local* rows so the search's duplicate check accounts for
  // additions made in this session that Spotify has not seen yet. Not memoized
  // — React Compiler owns memoization here, and nothing downstream compares
  // this set by reference.
  const existingUris = new Set(rows.map((row) => row.spotifyUri));

  return (
    <section className="rounded-[var(--radius-lg)] border bg-surface p-6 shadow-card sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold text-foreground">Tracks</h2>
        <span className="rounded-full border bg-surface-2 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
          {rows.length}
        </span>
      </div>
      <p className="mt-1 text-[12.5px] text-text-faint">
        Drag to reorder or remove a track. Nothing is written to Spotify until you save.
      </p>

      {/* Standing, not dismissible: it stays true for as long as the playlist
          holds these items, and it is the one thing a save silently changes
          that the diff below cannot show. Same amber treatment the builder
          uses for "some of your tracks won't make it". */}
      {skippedCount > 0 && !isLoading && (
        <Alert variant="warning" className="mt-5">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-current">
            {skippedCount} item{skippedCount === 1 ? '' : 's'} in this playlist — podcast episodes
            or local files — can&apos;t be edited here. Saving rewrites the whole playlist, so they
            would be removed.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? null : (
        <AddTracksPanel existingUris={existingUris} onAddTracks={onAddTracks} disabled={isSaving} />
      )}

      {error ? (
        <Alert variant="destructive" className="mt-5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-4">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-border bg-surface-2 text-[13px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading tracks…
          </div>
        ) : (
          <TrackList
            tracks={rows}
            rowIds={rows.map((row) => row.rowId)}
            onReorder={onReorder}
            onRemove={onRemove}
            readOnly={isSaving}
            heightClassName="h-[min(62vh,620px)]"
            emptyMessage="This playlist has no tracks."
          />
        )}
      </div>
    </section>
  );
}
