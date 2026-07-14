import Image from 'next/image';

import { coverGradient } from '@/lib/cover-art';

interface TrackArtProps {
  title: string;
  artist: string;
  imageUrl?: string | null;
  /** `next/image`'s `sizes` hint; callers pick the value matching their layout. */
  sizes: string;
  /**
   * Whether the gradient fallback is purely decorative (`aria-hidden`,
   * default) or the sole accessible label for the art (`role="img"` +
   * `aria-label`). Pass `false` when no adjacent text already names the
   * track (e.g. a standalone collage quadrant).
   */
  decorative?: boolean;
  /**
   * Wrapper classes for a fixed-size box containing both the image and the
   * gradient fallback (e.g. the preview rail's 28px thumb, bespoke-radius
   * clipped). When omitted, the image variant falls back to a bare
   * `relative bg-surface-2` wrapper and the gradient variant renders
   * unwrapped, sized entirely by its parent (e.g. a CSS grid quadrant in
   * `CoverCollage`).
   */
  boxClassName?: string;
}

/**
 * Shared track-art primitive: renders real album art via `next/image` when
 * `imageUrl` is present, otherwise a deterministic `coverGradient` fallback
 * seeded by `"${title} ${artist}"`.
 *
 * The two current call sites need materially different boxes (a fixed
 * 28px thumb with a bespoke 6px radius vs. an unsized grid quadrant), so
 * layout is threaded through `boxClassName` rather than unified onto a
 * shared radius/size token — see its doc comment for the resulting DOM
 * shapes per mode.
 */
export function TrackArt({
  title,
  artist,
  imageUrl,
  sizes,
  decorative = true,
  boxClassName,
}: TrackArtProps) {
  const background = coverGradient(`${title} ${artist}`);
  const fallbackA11yProps = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img' as const, 'aria-label': `${title} — ${artist}` };

  if (imageUrl) {
    return (
      <div className={boxClassName ?? 'relative bg-surface-2'}>
        <Image src={imageUrl} alt={title} fill sizes={sizes} className="object-cover" />
      </div>
    );
  }

  if (boxClassName) {
    return (
      <div className={boxClassName}>
        <div className="h-full w-full" style={{ background }} {...fallbackA11yProps} />
      </div>
    );
  }

  return <div style={{ background }} {...fallbackA11yProps} />;
}
