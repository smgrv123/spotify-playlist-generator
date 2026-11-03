'use client';

import { AlertCircle, Loader2, Plus, Wand2, X } from 'lucide-react';
import { useState } from 'react';

import { AddTrackSearch } from '@/components/add-track-search';
import { TrackPasteField } from '@/components/track-paste-field';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getErrorMessage, isFailed, isResolved } from '@/lib/type-guards';
import type { FailedTrack, ResolvedTrack, TrackItem } from '@/lib/types';
import { cn } from '@/lib/utils';

const PANEL_ID = 'add-tracks-panel';

/** One human-readable line for a query Spotify could not match. */
function describeFailure(track: FailedTrack): string {
  const { title, artist } = track.query;
  return artist ? `${title} — ${artist}` : title;
}

interface AddTracksPanelProps {
  /**
   * URIs held by the *local* rows, unsaved additions included. Feeding the
   * search its dedupe set from local state (not from the server tracks) is
   * what stops the same track being added twice inside one editing session.
   */
  existingUris: Set<string>;
  /** Appends resolved tracks to the end of the local rows. Never writes to Spotify. */
  onAddTracks: (tracks: ResolvedTrack[]) => void;
  /** Collapses and locks the panel while a save is in flight. */
  disabled: boolean;
}

/**
 * Inline, collapsible "add tracks" section for the deferred-save editor.
 *
 * Deliberately **not** a modal: no `dialog` primitive is installed, the
 * resolve-results list needs vertical room, and the sticky `UnsavedChangesBar`
 * has to stay visible so the user can see the change count climb as they add.
 * The collapse is plain conditional rendering — there is no `collapsible`
 * primitive either — and the two ways to add are stacked under their own
 * headings rather than tabbed, for the same reason.
 *
 * Everything added lands in local state via `onAddTracks`; the panel issues no
 * write of its own. Its only network call is the read-only resolve endpoint
 * that turns pasted text into Spotify tracks.
 */
export function AddTracksPanel({ existingUris, onAddTracks, disabled }: AddTracksPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const [issues, setIssues] = useState<string[]>([]);

  // Derived, not synced: a save in flight force-collapses the panel without a
  // second piece of state (and so without any render-time state adjustment).
  const isExpanded = isOpen && !disabled;

  const handleResolved = ({
    results,
    warnings,
    error,
  }: {
    results?: TrackItem[];
    warnings: string[];
    error: string | null;
  }) => {
    if (error) {
      setIssues([error, ...warnings]);
      return;
    }
    if (!results) return;

    const resolved = results.filter(isResolved);
    const failed = results.filter(isFailed);

    if (resolved.length > 0) onAddTracks(resolved);
    setIssues([...warnings, ...failed.map(describeFailure)]);

    // Only a clean sweep clears the box: if anything failed, the user
    // keeps the text they need in order to fix it.
    if (warnings.length === 0 && failed.length === 0) setPasteValue('');
  };

  return (
    <div className="mt-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        aria-expanded={isExpanded}
        aria-controls={PANEL_ID}
        onClick={() => setIsOpen((open) => !open)}
      >
        {isExpanded ? (
          <>
            <X className="h-4 w-4" aria-hidden />
            Done adding
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" aria-hidden />
            Add tracks
          </>
        )}
      </Button>

      {isExpanded && (
        <div
          id={PANEL_ID}
          className={cn(
            'mt-3 space-y-5 rounded-[var(--radius-sm)] border border-dashed border-border',
            'bg-surface-2 p-4 animate-in fade-in duration-200'
          )}
        >
          <div className="space-y-2">
            <h3 className="text-[13px] font-bold text-foreground">Search Spotify</h3>
            <AddTrackSearch onAdd={(track) => onAddTracks([track])} existingUris={existingUris} />
          </div>

          <div className="space-y-2">
            <h3 className="text-[13px] font-bold text-foreground">Paste a list</h3>
            <Label htmlFor="add-tracks-paste" className="sr-only">
              Paste tracks to add
            </Label>
            <TrackPasteField
              id="add-tracks-paste"
              value={pasteValue}
              onChange={setPasteValue}
              minHeightClassName="min-h-[120px]"
              onResolved={handleResolved}
            >
              {({ resolve, isResolving, resolveError }) => (
                <>
                  <p className="text-[12.5px] leading-relaxed text-text-faint">
                    One{' '}
                    <strong className="font-semibold text-muted-foreground">Title - Artist</strong>{' '}
                    per line, or a JSON array. Added tracks go to the end of the list and are only
                    written to Spotify when you save.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={resolve}
                    disabled={isResolving || !pasteValue.trim()}
                  >
                    {isResolving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Resolving…
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" aria-hidden />
                        Resolve &amp; add
                      </>
                    )}
                  </Button>

                  {resolveError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{getErrorMessage(resolveError)}</AlertDescription>
                    </Alert>
                  ) : null}
                </>
              )}
            </TrackPasteField>
          </div>

          {issues.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Couldn&apos;t add every line</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-0.5 pl-4">
                  {issues.map((issue, index) => (
                    <li key={`${issue}-${index}`}>{issue}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
