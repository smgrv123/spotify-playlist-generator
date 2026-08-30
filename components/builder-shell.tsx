'use client';

import { AlertCircle } from 'lucide-react';
import { useSyncExternalStore } from 'react';

import { AddTrackSearch } from '@/components/add-track-search';
import { PreviewRail } from '@/components/preview-rail';
import { SavePanel } from '@/components/save-panel';
import { Stepper } from '@/components/stepper';
import { TrackList } from '@/components/track-list';
import { TrackPasteForm } from '@/components/track-paste-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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

          {draft.step === 1 && (
            <Card className="overflow-hidden border-2 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="border-b bg-muted/30 pb-4">
                <CardTitle className="text-xl">2. Review & Refine Tracks</CardTitle>
                <CardDescription>Add, remove, and review tracks before saving.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Resolved Tracks ({resolvedTracks.length})</Label>
                    <span className="hidden text-xs text-muted-foreground sm:inline-block">
                      Drag to reorder (coming soon)
                    </span>
                  </div>

                  <AddTrackSearch onAdd={handleAddTrack} existingUris={existingUris} />

                  <TrackList
                    tracks={resolvedTracks}
                    onRemove={handleRemoveFromSubset(resolvedTracks)}
                  />
                </div>

                {failedTracks.length > 0 && (
                  <div className="space-y-3">
                    <Label>Unresolved Tracks ({failedTracks.length})</Label>
                    <div className="text-xs text-muted-foreground">
                      These tracks could not be matched on Spotify.
                    </div>
                    <TrackList
                      tracks={failedTracks}
                      onRemove={handleRemoveFromSubset(failedTracks)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {draft.step === 2 && (
            <Card className="overflow-hidden border-2 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="border-b bg-muted/30 pb-4">
                <CardTitle className="text-xl">3. Save to Spotify</CardTitle>
                <CardDescription>Select destination playlist or create a new one.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <SavePanel
                  tracks={draft.tracks}
                  name={draft.name}
                  onNameChange={handleNameChange}
                  visibility={draft.visibility}
                  onVisibilityChange={handleVisibilityChange}
                />
              </CardContent>
            </Card>
          )}
        </div>

        <PreviewRail tracks={resolvedTracks} name={draft.name} onNameChange={handleNameChange} />
      </div>
    </div>
  );
}
