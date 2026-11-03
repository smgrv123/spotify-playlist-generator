'use client';

import { AlertCircle, Loader2, Pencil, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TrackPasteField } from '@/components/track-paste-field';
import { BUILDER_STEP, BUILDER_STEP_META } from '@/lib/constants';
import type { TrackItem } from '@/lib/types';

interface TrackPasteFormProps {
  onTracksResolved: (tracks: TrackItem[]) => void;
  /**
   * Renders directly below the textarea and its formatting-hint paragraph,
   * above the chip actions and resolve button, still inside the prepare
   * card. Used by `BuilderShell` to inline a danger-styled failed-tracks
   * list when a total-fail resolve keeps the user on step 1 — the paste
   * UI and the failed rows visually share one card.
   */
  unresolvedSlot?: ReactNode;
}

const PASTE_SAMPLE = `Midnight City - M83
Redbone - Childish Gambino
Nights - Frank Ocean
The Less I Know The Better - Tame Impala
Pink + White - Frank Ocean
Electric Feel - MGMT`;

/**
 * Prepare-step paste UI restyled to the Vibecrafter handoff. Renders its own
 * card container (eyebrow + h-step heading + subtext + textarea + hint +
 * chip actions + primary resolve button). Consumed by `BuilderShell` when
 * `step === BUILDER_STEP.PREPARE`.
 */
export function TrackPasteForm({ onTracksResolved, unresolvedSlot }: TrackPasteFormProps) {
  const [pasteValue, setPasteValue] = useState('');
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  return (
    <section className="rounded-[var(--radius-lg)] border bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
      <p className="label-text text-[11px] font-semibold uppercase text-accent-strong">
        {BUILDER_STEP_META[BUILDER_STEP.PREPARE].stepLabel}
      </p>
      <h2 className="display-text mt-1.5 text-[clamp(22px,3vw,28px)] leading-tight text-foreground">
        Prepare your tracks
      </h2>
      <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
        Paste a list and we&apos;ll match each line to Spotify. One track per line, or a JSON array.
      </p>

      <div className="mt-6 space-y-2">
        <Label htmlFor="track-paste" className="block text-[12.5px] font-semibold text-foreground">
          Paste tracks
        </Label>
        <TrackPasteField
          id="track-paste"
          value={pasteValue}
          onChange={setPasteValue}
          onResolved={({ results, warnings, error }) => {
            setParseWarnings(warnings);
            setParseError(error);
            if (error) return;
            if (results) {
              setParseWarnings([]);
              onTracksResolved(results);
            }
          }}
        >
          {({ resolve, isResolving, resolveError }) => (
            <>
              <p className="pt-1 text-[12.5px] leading-relaxed text-text-faint">
                Use <strong className="font-semibold text-muted-foreground">Title - Artist</strong>{' '}
                per line, or paste a JSON array with{' '}
                <strong className="font-semibold text-muted-foreground">title</strong>,{' '}
                <strong className="font-semibold text-muted-foreground">artist</strong>, and
                optional <strong className="font-semibold text-muted-foreground">album</strong>.
              </p>
              {unresolvedSlot}
              <div className="flex flex-wrap gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPasteValue(PASTE_SAMPLE)}
                  className="rounded-full border bg-surface-2 px-3.5 py-1.5 text-[12.5px] font-semibold text-muted-foreground transition hover:border-primary hover:text-foreground h-auto hover:bg-surface-2 dark:bg-surface-2 dark:hover:bg-surface-2"
                >
                  Use a sample list
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPasteValue('')}
                  className="rounded-full border bg-surface-2 px-3.5 py-1.5 text-[12.5px] font-semibold text-muted-foreground transition hover:border-primary hover:text-foreground h-auto hover:bg-surface-2 dark:bg-surface-2 dark:hover:bg-surface-2"
                >
                  Clear
                </Button>
              </div>

              {parseWarnings.length > 0 && (
                <Alert variant="warning" className="mt-5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex flex-col gap-1">
                      {parseWarnings.map((warning, index) => (
                        <span key={index}>{warning}</span>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {parseError && (
                <Alert variant="destructive" className="mt-5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{parseError}</AlertDescription>
                </Alert>
              )}

              {resolveError && (
                <Alert variant="destructive" className="mt-5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{resolveError.message}</AlertDescription>
                </Alert>
              )}

              <div className="mt-6">
                <Button
                  type="button"
                  onClick={resolve}
                  disabled={isResolving || !pasteValue.trim()}
                  size="lg"
                  className="h-11 px-5 text-[15px] font-semibold shadow-[var(--shadow-pop)]"
                >
                  {isResolving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Resolving…
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" aria-hidden />
                      Resolve tracks
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </TrackPasteField>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="label-text text-[11px] font-semibold uppercase text-text-faint">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="mt-3">
        <Button asChild variant="outline" className="w-full">
          <Link href="/playlists">
            <Pencil className="h-4 w-4" aria-hidden />
            Edit an existing playlist
          </Link>
        </Button>
      </div>
    </section>
  );
}
