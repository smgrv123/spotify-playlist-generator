'use client';

import { CheckCircle, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CoverCollage } from '@/components/cover-collage';
import type { ResolvedTrack } from '@/lib/types';

interface SaveSuccessStateProps {
  heading: string;
  subtext: string;
  /** Tracks the mini cover collage is built from. */
  coverTracks: ResolvedTrack[];
  /** "Open in Spotify" target for the playlist that was just created. */
  openUrl: string;
  onBuildAnother: () => void;
  /** Label for the secondary CTA, so the layout is not tied to one wording. */
  ctaLabel?: string;
}

/**
 * Confirmation layout for a completed playlist creation: centered badge +
 * heading + subtext, a mini cover collage, and the "Open in Spotify" /
 * secondary CTAs.
 *
 * Deliberately narrow. It was lifted out of the old save panel while that panel
 * also handled updates and deletes, and carried a `variant` prop to recolour
 * itself for a destructive write. Delete now lives on `/playlists` and
 * `/playlists/[id]` with its own confirmation, so the destructive branch had no
 * caller and is gone; the only parameters left are the ones the create flow
 * actually varies.
 */
export function SaveSuccessState({
  heading,
  subtext,
  coverTracks,
  openUrl,
  onBuildAnother,
  ctaLabel = 'Build another',
}: SaveSuccessStateProps) {
  return (
    <section className="rounded-[var(--radius-lg)] border bg-surface p-6 shadow-card sm:p-8">
      <div className="flex flex-col items-center gap-5 py-4 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-full bg-accent-soft text-accent-strong">
          <CheckCircle className="h-7 w-7" aria-hidden />
        </div>

        <div className="space-y-1.5">
          <h2 className="display-text text-[clamp(20px,3vw,26px)] leading-tight text-foreground">
            {heading}
          </h2>
          <p className="text-[14.5px] leading-relaxed text-muted-foreground">{subtext}</p>
        </div>

        <div className="w-[150px]">
          <CoverCollage tracks={coverTracks} />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button asChild className="rounded-full px-6">
            <a href={openUrl} target="_blank" rel="noopener noreferrer">
              Open in Spotify
              <ExternalLink className="ml-2 h-4 w-4" aria-hidden />
            </a>
          </Button>
          <Button variant="outline" className="rounded-full px-6" onClick={onBuildAnother}>
            {ctaLabel}
          </Button>
        </div>
      </div>
    </section>
  );
}
