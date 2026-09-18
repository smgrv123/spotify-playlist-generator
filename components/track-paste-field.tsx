'use client';

import type { ReactNode } from 'react';

import { Textarea } from '@/components/ui/textarea';
import { useResolveTracks } from '@/hooks/use-resolve-tracks';
import { parseTracks } from '@/lib/track-parser';
import type { TrackItem } from '@/lib/types';

export const PASTE_PLACEHOLDER = `Title - Artist
Another Song - Another Artist

Or JSON: [{"title":"Song","artist":"Artist"}]`;

interface TrackPasteFieldResolvedOutcome {
  /** Present only when `resolveTracks` succeeded. */
  results?: TrackItem[];
  /** From `parseTracks`, always passed. */
  warnings: string[];
  /** `parseTracks` blocking error; when set, `results` is undefined and `resolveTracks` was never called. */
  error: string | null;
}

interface TrackPasteFieldChildrenState {
  resolve: () => void;
  isResolving: boolean;
  resolveError: Error | null;
}

interface TrackPasteFieldProps {
  /** Textarea id — caller still renders its own `<Label htmlFor={id}>`. */
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Default `'min-h-[220px]'`; `add-tracks-panel` passes `'min-h-[120px]'`. */
  minHeightClassName?: string;
  onResolved: (outcome: TrackPasteFieldResolvedOutcome) => void;
  children: (state: TrackPasteFieldChildrenState) => ReactNode;
}

/**
 * Shared paste-and-resolve primitive behind `TrackPasteForm`'s prepare step
 * and `AddTracksPanel`'s inline add flow. Owns the placeholder copy, the
 * `<Textarea>` markup, and the `parseTracks` → `useResolveTracks` pipeline.
 * Renders nothing else — no label, hint text, alerts, or buttons — those
 * differ meaningfully between the two call sites and stay with each caller.
 */
export function TrackPasteField({
  id,
  value,
  onChange,
  minHeightClassName = 'min-h-[220px]',
  onResolved,
  children,
}: TrackPasteFieldProps) {
  const { mutate: resolveTracks, isPending: isResolving, error: resolveError } = useResolveTracks();

  const resolve = () => {
    const { tracks: parsedTracks, warnings, error } = parseTracks(value);

    if (error) {
      onResolved({ warnings, error });
      return;
    }

    resolveTracks(parsedTracks, {
      onSuccess: (results) => {
        onResolved({ results, warnings, error: null });
      },
    });
  };

  return (
    <>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={PASTE_PLACEHOLDER}
        className={`block ${minHeightClassName} w-full resize-y rounded-[var(--radius-sm)] border bg-surface-inset px-4 py-3 text-[14.5px] leading-relaxed text-foreground placeholder:text-text-faint transition focus:border-primary focus:bg-surface focus:outline-none focus:ring-[3px] focus:ring-ring dark:bg-surface-inset`}
      />
      {children({ resolve, isResolving, resolveError })}
    </>
  );
}
