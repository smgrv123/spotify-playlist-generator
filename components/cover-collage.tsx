'use client';

import { TrackArt } from '@/components/track-art';
import type { ResolvedTrack } from '@/lib/types';

interface CoverCollageProps {
  /**
   * `rowId` is optional here (unlike `PreviewRail`'s prop) because this
   * component is also used by `SaveSuccessState` with plain, rowId-less
   * `ResolvedTrack`s. When present (the builder's draft tracks), it's used
   * as the row key instead of `spotifyUri` so a pasted duplicate doesn't
   * collide with its own first occurrence.
   */
  tracks: (ResolvedTrack & { rowId?: string })[];
}

const QUADRANT_COUNT = 4;

/**
 * 2×2 playlist cover collage. Each quadrant renders one of:
 *   1. Real album art (`next/image`) when the track's displayData has an image.
 *   2. A deterministic OKLCH gradient derived from `${title} ${artist}`
 *      via `coverGradient(...)` when no image is available.
 *   3. A muted placeholder surface (Music icon) when we have fewer than four
 *      resolved tracks.
 *
 * Quadrants 1 and 2 are rendered by the shared `TrackArt` primitive (unsized,
 * filling the grid cell; `decorative={false}` since a quadrant has no
 * adjacent text to label it). Dynamic gradient backgrounds go through
 * `style={{ background }}` because Tailwind can't statically emit an
 * unbounded set of runtime-computed gradient strings. This matches the
 * pattern already established in `app/login/page.tsx`.
 */
export function CoverCollage({ tracks }: CoverCollageProps) {
  const quadrants = tracks.slice(0, QUADRANT_COUNT);
  const emptyQuadrantCount = QUADRANT_COUNT - quadrants.length;

  return (
    <div className="grid aspect-square w-full grid-cols-2 grid-rows-2 overflow-hidden rounded-[var(--radius-sm)] border border-border shadow-card">
      {quadrants.map((track, index) => {
        const { title, artist, imageUrl } = track.displayData;
        return (
          <TrackArt
            key={track.rowId ?? `${track.spotifyUri}-${index}`}
            title={title}
            artist={artist}
            imageUrl={imageUrl}
            sizes="180px"
            decorative={false}
          />
        );
      })}
      {Array.from({ length: emptyQuadrantCount }, (_, index) => (
        <div key={`empty-${index}`} className="bg-surface-2" aria-hidden />
      ))}
    </div>
  );
}
