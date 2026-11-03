'use client';

import { AddTrackSearch } from '@/components/add-track-search';
import { TrackList } from '@/components/track-list';
import { BUILDER_STEP, BUILDER_STEP_META } from '@/lib/constants';
import type { DraftFailedTrack, DraftResolvedTrack, ResolvedTrack } from '@/lib/types';

interface RefineStepProps {
  resolvedTracks: DraftResolvedTrack[];
  failedTracks: DraftFailedTrack[];
  onAddTrack: (track: ResolvedTrack) => void;
  /** Index is local to `resolvedTracks`. */
  onRemoveResolved: (index: number) => void;
  /** Index is local to `failedTracks`. */
  onRemoveFailed: (index: number) => void;
  /** Indices are local to `resolvedTracks`; see `TrackList`'s `onReorder`. */
  onReorderResolved: (oldIndex: number, newIndex: number) => void;
}

/**
 * The builder's refine step: add songs by search, drop or reorder resolved
 * tracks, and review whatever failed to resolve.
 *
 * Presentational only — `BuilderShell` stays the single owner of the track
 * array and passes the resolved/failed slices plus the mutation callbacks in.
 */
export function RefineStep({
  resolvedTracks,
  failedTracks,
  onAddTrack,
  onRemoveResolved,
  onRemoveFailed,
  onReorderResolved,
}: RefineStepProps) {
  const existingUris = new Set(resolvedTracks.map((track) => track.spotifyUri));

  return (
    <section className="rounded-[var(--radius-lg)] border bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
      <p className="label-text text-[11px] font-semibold uppercase text-accent-strong">
        {BUILDER_STEP_META[BUILDER_STEP.REFINE].stepLabel}
      </p>
      <h2 className="display-text mt-1.5 text-[clamp(22px,3vw,28px)] leading-tight text-foreground">
        Review &amp; refine
      </h2>
      <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
        Add songs by search, drop anything that doesn&apos;t fit, and reorder until it flows.
      </p>

      <div className="mt-6">
        <AddTrackSearch onAdd={onAddTrack} existingUris={existingUris} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <span className="text-[12.5px] font-semibold text-foreground">Resolved tracks</span>
        <span className="rounded-full border bg-surface-2 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
          {resolvedTracks.length}
        </span>
      </div>
      <div className="mt-3">
        <TrackList
          tracks={resolvedTracks}
          rowIds={resolvedTracks.map((track) => track.rowId)}
          onRemove={onRemoveResolved}
          onReorder={onReorderResolved}
          emptyMessage="No tracks yet. Search above or go back and paste a list."
        />
      </div>

      {failedTracks.length > 0 && (
        <div className="mt-6" data-testid="refine-unresolved-section">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-foreground">Unresolved</span>
            <span className="rounded-full border bg-surface-2 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
              {failedTracks.length}
            </span>
          </div>
          <p className="mt-1 text-[12.5px] text-text-faint">
            These tracks could not be matched on Spotify.
          </p>
          <div className="mt-3">
            <TrackList
              tracks={failedTracks}
              rowIds={failedTracks.map((track) => track.rowId)}
              onRemove={onRemoveFailed}
            />
          </div>
        </div>
      )}
    </section>
  );
}
