import Image from 'next/image';
import Link from 'next/link';

import type { PlaylistSummary } from '@/hooks/use-playlists';
import { coverGradient } from '@/lib/cover-art';

interface PlaylistCardProps {
  playlist: PlaylistSummary;
}

/**
 * `sizes` hint for the cover image. The library grid is 2 / 3 / 4 columns
 * inside the `max-w-6xl` page container, so past the `lg` breakpoint the art
 * box stops growing and settles near 230px — telling `next/image` that avoids
 * shipping a 1200px-wide asset for a thumbnail.
 */
const COVER_SIZES = '(min-width: 1024px) 232px, (min-width: 640px) 30vw, 44vw';

/**
 * One playlist in the `/playlists` library grid: a single link to the detail
 * route wrapping cover art, name, and track count.
 *
 * The art uses Spotify's real `imageUrl` when there is one and falls back to
 * the deterministic `coverGradient(name)` otherwise — the same treatment the
 * save step's target-playlist picker gives its rows, except that picker never
 * had a real image to prefer. Either way the art is decorative (`alt=""` /
 * `aria-hidden`): the playlist name sits inside the same link and already
 * names it, so labelling the art too would just make the link read twice.
 */
export function PlaylistCard({ playlist }: PlaylistCardProps) {
  const { id, name, imageUrl, trackCount } = playlist;

  return (
    <Link
      href={`/playlists/${id}`}
      className="group flex flex-col gap-3 rounded-[var(--radius-sm)] border border-border bg-surface p-3 outline-none transition-colors hover:border-border-strong focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-sm)] bg-surface-2 shadow-card">
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill sizes={COVER_SIZES} className="object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: coverGradient(name) }} aria-hidden />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-semibold text-foreground">{name}</p>
        {trackCount !== null && (
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {trackCount} track{trackCount === 1 ? '' : 's'}
          </p>
        )}
      </div>
    </Link>
  );
}
