'use client';

import { AlertCircle } from 'lucide-react';
import { useSyncExternalStore } from 'react';

import { AddTrackSearch } from '@/components/add-track-search';
import { PreviewRail } from '@/components/preview-rail';
import { SavePanel } from '@/components/save-panel';
import { Stepper } from '@/components/stepper';
import { TrackList } from '@/components/track-list';
import { TrackPasteForm } from '@/components/track-paste-form';
import { BUILDER_STEP, type Visibility } from '@/lib/constants';
import * as draftStore from '@/lib/draft-store';
import { isFailed, isResolved } from '@/lib/type-guards';
import type { BuilderStep, FailedTrack, ResolvedTrack } from '@/lib/types';

type TrackItem = ResolvedTrack | FailedTrack;

/**
 * Top-level builder UI rendered on `/` for authenticated users.
 *
 * Owns the unified Draft state (tracks, name, visibility, step, maxReached,
 * mode, target) and threads slices into the existing step cards. Only the
 * active step is mounted at a time, gated by the `Stepper`. The existing
 * step-card internals (TrackPasteForm / AddTrackSearch+TrackList / SavePanel)
 * are preserved as-is — restyling happens in Phase 6+.
 *
 * Layout: at the `2pane` breakpoint (941px) the workspace is a two-pane grid
 * (active step card left, `PreviewRail` right). Below that it collapses to a
 * single column and the rail stacks under the step card.
 *
 * Persistence: draft is stored in sessionStorage via `lib/draft-storage`.
 * Refresh within the tab restores the draft; closing the tab wipes it.
 */
export function BuilderShell() {
  const draft = useSyncExternalStore(
    draftStore.subscribe,
    draftStore.getSnapshot,
    draftStore.getServerSnapshot
  );

  const goToStep = (next: BuilderStep) => {
    draftStore.update((prev) => (next <= prev.maxReached ? { ...prev, step: next } : prev));
  };

  /**
   * On resolve completion, atomically merge the resolved+failed set into the
   * draft AND — if at least one track resolved — advance to REFINE in the same
   * transition (so the stepper unlock and the step swap render together, not
   * as two paints). Total-fail keeps the user on PREPARE; the shell then
   * renders the failed rows inline beneath the paste UI via `unresolvedSlot`.
   */
  const handleTracksResolved = (newTracks: TrackItem[]) => {
    draftStore.update((prev) => {
      if (!newTracks.some(isResolved)) {
        return { ...prev, tracks: newTracks };
      }
      return {
        ...prev,
        tracks: newTracks,
        step: BUILDER_STEP.REFINE,
        maxReached: prev.maxReached >= BUILDER_STEP.REFINE ? prev.maxReached : BUILDER_STEP.REFINE,
      };
    });
  };

  const handleAddTrack = (track: ResolvedTrack) => {
    draftStore.update((prev) => ({ ...prev, tracks: [track, ...prev.tracks] }));
  };

  const handleRemoveFromSubset = (subset: TrackItem[]) => (subsetIndex: number) => {
    draftStore.update((prev) => {
      const target = subset[subsetIndex];
      if (!target) return prev;
      const originalIndex = prev.tracks.indexOf(target);
      if (originalIndex === -1) return prev;
      return { ...prev, tracks: prev.tracks.filter((_, i) => i !== originalIndex) };
    });
  };

  const handleNameChange = (name: string) => draftStore.update((prev) => ({ ...prev, name }));
  const handleVisibilityChange = (visibility: Visibility) =>
    draftStore.update((prev) => ({ ...prev, visibility }));
  const handleBuildAnother = () => draftStore.reset();

  const resolvedTracks = draft.tracks.filter(isResolved);
  const failedTracks = draft.tracks.filter(isFailed);
  const existingUris = new Set(resolvedTracks.map((track) => track.spotifyUri));

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Stepper step={draft.step} maxReached={draft.maxReached} onStepChange={goToStep} />

      <div className="grid grid-cols-1 gap-8 2pane:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          {draft.step === BUILDER_STEP.PREPARE && (
            <TrackPasteForm
              onTracksResolved={handleTracksResolved}
              unresolvedSlot={
                failedTracks.length > 0 ? (
                  <section
                    aria-label="Unresolved tracks"
                    className="mt-5 space-y-2"
                    data-testid="prepare-unresolved-inline"
                  >
                    {failedTracks.map((track, index) => (
                      <div
                        key={`${track.query.title}-${track.query.artist}-${index}`}
                        className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-destructive/40 bg-destructive/10 p-3"
                      >
                        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-[14px] text-foreground">
                          {track.query.title}
                          {track.query.artist ? ` — ${track.query.artist}` : ''}
                        </span>
                        <span className="shrink-0 text-[12px] text-text-faint">No match</span>
                      </div>
                    ))}
                  </section>
                ) : null
              }
            />
          )}

          {draft.step === BUILDER_STEP.REFINE && (
            <section className="rounded-[var(--radius-lg)] border bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
              <p className="label-text text-[11px] font-semibold uppercase text-accent-strong">
                Step 02 — Curate
              </p>
              <h2 className="display-text mt-1.5 text-[clamp(22px,3vw,28px)] leading-tight text-foreground">
                Review &amp; refine
              </h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
                Add songs by search, drop anything that doesn&apos;t fit, and reorder until it
                flows.
              </p>

              <div className="mt-6">
                <AddTrackSearch onAdd={handleAddTrack} existingUris={existingUris} />
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
                  onRemove={handleRemoveFromSubset(resolvedTracks)}
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
                      onRemove={handleRemoveFromSubset(failedTracks)}
                    />
                  </div>
                </div>
              )}
            </section>
          )}

          {draft.step === BUILDER_STEP.SAVE && (
            <SavePanel
              tracks={draft.tracks}
              name={draft.name}
              onNameChange={handleNameChange}
              visibility={draft.visibility}
              onVisibilityChange={handleVisibilityChange}
              onBuildAnother={handleBuildAnother}
            />
          )}
        </div>

        <PreviewRail tracks={resolvedTracks} name={draft.name} onNameChange={handleNameChange} />
      </div>
    </div>
  );
}
