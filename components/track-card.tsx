import { AlertCircle, Play } from 'lucide-react';

import { TrackArt } from '@/components/track-art';
import { cn } from '@/lib/utils';

/**
 * Common prop interface spanning resolved, failed, or standard track shapes.
 */
export interface TrackCardProps {
  title: string;
  artist: string;
  albumContext?: string;
  imageUrl?: string;
  isFailed?: boolean;
  /** Resolved-track duration in ms. Rendered as a mono `m:ss` label when present. */
  durationMs?: number;
  /**
   * `'md'` (default) is the full row used by `TrackList`/`TrackPasteForm`'s
   * unresolved slot: 46px art, play-hover overlay, trailing duration/failed
   * badge. `'sm'` is a compact art+title/artist pair for dense lists
   * (preview rail, search results) with no overlay and no trailing content —
   * the four props below only apply to it.
   */
  size?: 'sm' | 'md';
  /** `size="sm"` only: Tailwind size + radius classes for the art box (e.g. `h-7 w-7 rounded-[6px]`). */
  artSizeClassName?: string;
  /** `size="sm"` only: the `sizes` attr passed through to `TrackArt`/`next/image` (e.g. `28px`). */
  artSizes?: string;
  /** `size="sm"` only: text classes for the title line (size/weight; color is always `text-foreground`). */
  titleClassName?: string;
  /** `size="sm"` only: text classes for the artist line (size + color). */
  artistClassName?: string;
}

/** Formats a duration in ms as `m:ss` (e.g. `225_000` → `"3:45"`). */
function formatTrackDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Reusable display component for a single track row's content: 46×46 album
 * art (real image or gradient fallback via `TrackArt`, with a play-icon
 * overlay that fades in on row hover), title + artist/album, and a trailing
 * mono duration. Failed tracks swap the art for a danger-soft alert tile, the
 * title turns red, the subtext becomes "No Spotify match found", and the
 * duration is replaced with an "unresolved" badge.
 *
 * Row-level chrome (background, border, the grip handle used for
 * drag-to-reorder, and the remove button) is owned by the caller
 * (`TrackList`) — this component only renders content and relies on an
 * ancestor `.group` for the hover-revealed play overlay.
 *
 * Pass `size="sm"` for the compact art+title/artist variant used by dense
 * lists (preview rail, search results) — see `TrackCardProps` for the
 * size-specific overrides.
 */
export function TrackCard({
  title,
  artist,
  albumContext,
  imageUrl,
  isFailed,
  durationMs,
  size = 'md',
  artSizeClassName = 'h-7 w-7 rounded-[6px]',
  artSizes = '28px',
  titleClassName = 'text-[13px] font-medium',
  artistClassName = 'text-[11px] text-text-faint',
}: TrackCardProps) {
  if (size === 'sm') {
    return (
      <div className="flex w-full min-w-0 items-center gap-3">
        <TrackArt
          title={title}
          artist={artist}
          imageUrl={imageUrl}
          sizes={artSizes}
          boxClassName={cn('relative flex-shrink-0 overflow-hidden bg-surface-2', artSizeClassName)}
        />
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-foreground', titleClassName)}>{title}</p>
          <p className={cn('truncate', artistClassName)}>{artist}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 items-center gap-3">
      <div className="relative h-[46px] w-[46px] flex-shrink-0 overflow-hidden rounded-[8px] bg-surface-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
        {isFailed ? (
          <div className="flex h-full w-full items-center justify-center bg-danger-soft text-danger">
            <AlertCircle className="h-5 w-5" aria-hidden />
          </div>
        ) : (
          <>
            <TrackArt
              title={title}
              artist={artist}
              imageUrl={imageUrl}
              sizes="46px"
              boxClassName="absolute inset-0"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <Play className="h-4 w-4" fill="currentColor" aria-hidden />
            </div>
          </>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-[14px] font-semibold',
            isFailed ? 'text-danger' : 'text-foreground'
          )}
        >
          {title}
        </p>
        <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
          {isFailed
            ? 'No Spotify match found'
            : albumContext
              ? `${artist} · ${albumContext}`
              : artist}
        </p>
      </div>

      {isFailed ? (
        <span className="flex-shrink-0 rounded-full bg-danger-soft px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-danger uppercase">
          unresolved
        </span>
      ) : (
        durationMs !== undefined && (
          <span className="flex-shrink-0 font-mono text-[12px] text-text-faint">
            {formatTrackDuration(durationMs)}
          </span>
        )
      )}
    </div>
  );
}
