'use client';

import { AlertCircle, Loader2 } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { PlaylistDiff } from '@/lib/playlist-edit';
import { getErrorMessage } from '@/lib/type-guards';

interface UnsavedChangesBarProps {
  diff: PlaylistDiff;
  onDiscard: () => void;
  onSave: () => void;
  isSaving: boolean;
  /**
   * False while the name is blank (a nameless playlist can't be written) or
   * while a conflict blocks the write.
   */
  canSave: boolean;
  /**
   * The playlist moved on Spotify's side. Save is blocked, and the bar says so
   * next to the disabled button — a fuller explanation is shown elsewhere on
   * the page, which may be scrolled out of view from here.
   */
  isBlockedByConflict: boolean;
  /**
   * A failed save renders here rather than elsewhere on the page: the bar is
   * pinned to the viewport, so the message stays next to the button that
   * produced it instead of scrolling out of view.
   */
  saveError: unknown;
}

/**
 * Human-readable roll-up of a pending diff, e.g.
 * `"2 removed · reordered · renamed"`. Track changes are counted (they are
 * per-track actions); reorder, rename and visibility are stated once.
 */
function summarizeChanges(diff: PlaylistDiff): string {
  const parts: string[] = [];
  if (diff.removed > 0) parts.push(`${diff.removed} removed`);
  if (diff.added > 0) parts.push(`${diff.added} added`);
  if (diff.reordered) parts.push('reordered');
  if (diff.renamed) parts.push('renamed');
  if (diff.visibilityChanged) parts.push('visibility changed');
  return parts.join(' · ');
}

/**
 * Sticky action bar for the deferred-save editor. Rendered only while
 * `diff.total > 0`, so its presence *is* the "you have unsaved work" signal.
 *
 * It sticks to the bottom of the viewport rather than the document so it stays
 * reachable while scrolling a long track list, and sits at the end of the page
 * flow so it never overlaps the content it describes once the page bottom is
 * reached.
 */
export function UnsavedChangesBar({
  diff,
  onDiscard,
  onSave,
  isSaving,
  canSave,
  isBlockedByConflict,
  saveError,
}: UnsavedChangesBarProps) {
  const summary = summarizeChanges(diff);

  return (
    <div className="sticky bottom-4 z-20 space-y-3">
      {/* Keeps the variant's own opaque `bg-card` rather than the bar's glass:
          this floats over the track list and must stay legible. */}
      {saveError ? (
        <Alert variant="destructive" className="shadow-pop">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{getErrorMessage(saveError)}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-border-strong bg-glass px-5 py-4 shadow-pop">
        {/* Only the summary is a live region — announcing the buttons on every
            edit would make the bar chatty for screen-reader users. */}
        <div className="min-w-0" role="status" aria-live="polite">
          <p className="text-[13.5px] font-semibold text-foreground">
            {diff.total} unsaved change{diff.total === 1 ? '' : 's'}
          </p>
          {isBlockedByConflict ? (
            <p className="mt-0.5 text-[12.5px] font-semibold text-danger">
              Saving is paused — this playlist changed on Spotify.
            </p>
          ) : (
            summary && <p className="mt-0.5 text-[12.5px] text-muted-foreground">{summary}</p>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Button variant="outline" onClick={onDiscard} disabled={isSaving}>
            Discard
          </Button>
          <Button onClick={onSave} disabled={isSaving || !canSave} className="min-w-[130px]">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
