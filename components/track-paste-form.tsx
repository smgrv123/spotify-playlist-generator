'use client';

import { AlertCircle, Loader2, Pencil, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useResolveTracks } from '@/hooks/use-resolve-tracks';
import { parseTracks } from '@/lib/track-parser';
import type { FailedTrack, ResolvedTrack } from '@/lib/types';

interface TrackPasteFormProps {
  onTracksResolved: (tracks: (ResolvedTrack | FailedTrack)[]) => void;
  /**
   * Renders directly below the textarea and its formatting-hint paragraph,
   * above the chip actions and resolve button, still inside the prepare
   * card. Used by `BuilderShell` to inline a danger-styled failed-tracks
   * list when a total-fail resolve keeps the user on step 1 — the paste
   * UI and the failed rows visually share one card.
   */
  unresolvedSlot?: ReactNode;
}

const PASTE_PLACEHOLDER = `Title - Artist
Another Song - Another Artist

Or JSON: [{"title":"Song","artist":"Artist"}]`;

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

  const { mutate: resolveTracks, isPending: isResolving, error: resolveError } = useResolveTracks();

  const handleResolve = () => {
    setParseError(null);
    setParseWarnings([]);

    const { tracks: parsedTracks, warnings, error } = parseTracks(pasteValue);
    setParseWarnings(warnings);

    if (error) {
      setParseError(error);
      return;
    }

    resolveTracks(parsedTracks, {
      onSuccess: (data) => {
        setParseWarnings([]);
        onTracksResolved(data);
      },
    });
  };

  const isDisabled = isResolving || !pasteValue.trim();

  return (
    <section className="rounded-[var(--radius-lg)] border bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
      <p className="label-text text-[11px] font-semibold uppercase text-accent-strong">
        Step 01 — Import
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
        <Textarea
          id="track-paste"
          value={pasteValue}
          onChange={(event) => setPasteValue(event.target.value)}
          placeholder={PASTE_PLACEHOLDER}
          className="block min-h-[220px] w-full resize-y rounded-[var(--radius-sm)] border bg-surface-inset px-4 py-3 text-[14.5px] leading-relaxed text-foreground placeholder:text-text-faint transition focus:border-primary focus:bg-surface focus:outline-none focus:ring-[3px] focus:ring-ring dark:bg-surface-inset"
        />
        <p className="pt-1 text-[12.5px] leading-relaxed text-text-faint">
          Use <strong className="font-semibold text-muted-foreground">Title - Artist</strong> per
          line, or paste a JSON array with{' '}
          <strong className="font-semibold text-muted-foreground">title</strong>,{' '}
          <strong className="font-semibold text-muted-foreground">artist</strong>, and optional{' '}
          <strong className="font-semibold text-muted-foreground">album</strong>.
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
      </div>

      {parseWarnings.length > 0 && (
        <Alert
          variant="default"
          className="mt-5 border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-400"
        >
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
          onClick={handleResolve}
          disabled={isDisabled}
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
