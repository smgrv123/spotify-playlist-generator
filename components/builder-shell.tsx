'use client';

import { useState } from 'react';

import { AddTrackSearch } from '@/components/add-track-search';
import { PreviewRail } from '@/components/preview-rail';
import { SavePanel } from '@/components/save-panel';
import { Stepper } from '@/components/stepper';
import { TrackList } from '@/components/track-list';
import { TrackPasteForm } from '@/components/track-paste-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { Visibility } from '@/lib/constants';
import { isFailed, isResolved } from '@/lib/type-guards';
import type { BuilderStep, Draft, FailedTrack, ResolvedTrack } from '@/lib/types';

type TrackItem = ResolvedTrack | FailedTrack;

const INITIAL_DRAFT: Draft = {
  tracks: [],
  name: '',
  visibility: 'private',
  step: 0,
  maxReached: 0,
  mode: 'create',
  target: '',
};

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
 * single column and the rail stacks under the step card. Phase 5 owns the
 * final mobile polish.
 */
export function BuilderShell() {
  const [draft, setDraft] = useState<Draft>(INITIAL_DRAFT);

  const goToStep = (next: BuilderStep) => {
    setDraft((prev) => (next <= prev.maxReached ? { ...prev, step: next } : prev));
  };

  const handleTracksResolved = (newTracks: TrackItem[]) => {
    setDraft((prev) => ({ ...prev, tracks: newTracks }));
  };

  const handleAddTrack = (track: ResolvedTrack) => {
    setDraft((prev) => ({ ...prev, tracks: [track, ...prev.tracks] }));
  };

  const handleRemoveFromSubset = (subset: TrackItem[]) => (subsetIndex: number) => {
    setDraft((prev) => {
      const target = subset[subsetIndex];
      if (!target) return prev;
      const originalIndex = prev.tracks.indexOf(target);
      if (originalIndex === -1) return prev;
      return { ...prev, tracks: prev.tracks.filter((_, i) => i !== originalIndex) };
    });
  };

  const handleNameChange = (name: string) => setDraft((prev) => ({ ...prev, name }));
  const handleVisibilityChange = (visibility: Visibility) =>
    setDraft((prev) => ({ ...prev, visibility }));

  const resolvedTracks = draft.tracks.filter(isResolved);
  const failedTracks = draft.tracks.filter(isFailed);
  const existingUris = new Set(resolvedTracks.map((track) => track.spotifyUri));

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Stepper step={draft.step} maxReached={draft.maxReached} onStepChange={goToStep} />

      <div className="grid grid-cols-1 gap-8 2pane:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          {draft.step === 0 && (
            <Card className="overflow-hidden border-2 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="border-b bg-muted/30 pb-4">
                <CardTitle className="text-xl">1. Prepare Your Tracks</CardTitle>
                <CardDescription>
                  Paste a list of tracks and resolve them to Spotify.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <TrackPasteForm onTracksResolved={handleTracksResolved} />
              </CardContent>
            </Card>
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
