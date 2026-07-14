'use client';

import { CoverCollage } from '@/components/cover-collage';
import { TrackArt } from '@/components/track-art';
import { Input } from '@/components/ui/input';
import type { ResolvedTrack } from '@/lib/types';

interface PreviewRailProps {
  tracks: ResolvedTrack[];
  name: string;
  onNameChange: (name: string) => void;
}

function totalDurationMs(tracks: ResolvedTrack[]): number {
  return tracks.reduce<number>((acc, track) => acc + track.durationMs, 0);
}

function formatDuration(ms: number): string | null {
  if (ms <= 0) return null;
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
}

function songLabel(count: number): string {
  return count === 1 ? 'song' : 'songs';
}

/**
 * Right-side preview rail for the builder workspace. Renders (top → bottom):
 *
 * 1. `CoverCollage` — 2×2 quadrants of resolved-track art with gradient
 *    fallbacks.
 * 2. Playlist-name input bound to the shell's `name` state.
 * 3. Stats line `{count} songs · {duration}`, using the acceptance-criterion
 *    format. Duration is omitted only when there are no resolved tracks.
 * 4. Compact scrollable list of resolved tracks with 28px thumbs (via
 *    `TrackArt`) and truncated title/artist rows.
 *
 * The rail turns sticky at the `2pane` breakpoint (941px) so it stays with
 * the user as they scroll the workspace. Below that it stacks (Phase 5 owns
 * the final mobile polish; this component just doesn't fight that layout).
 */
export function PreviewRail({ tracks, name, onNameChange }: PreviewRailProps) {
  const count = tracks.length;
  const duration = formatDuration(totalDurationMs(tracks));
  const statsLine =
    duration !== null
      ? `${count} ${songLabel(count)} · ${duration}`
      : `${count} ${songLabel(count)}`;

  return (
    <aside className="flex flex-col gap-5 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-card 2pane:sticky 2pane:top-[var(--topbar-offset)] 2pane:self-start">
      <CoverCollage tracks={tracks} />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="preview-rail-playlist-name"
          className="label-text text-[11px] uppercase text-text-faint"
        >
          Playlist name
        </label>
        <Input
          id="preview-rail-playlist-name"
          type="text"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Untitled playlist"
          className="display-text text-[18px] md:text-[18px]"
        />
      </div>

      <div className="label-text text-[11px] uppercase text-text-faint">{statsLine}</div>

      <div className="flex max-h-[280px] flex-col gap-1 overflow-y-auto pr-1">
        {count === 0 ? (
          <p className="rounded-[var(--radius-sm)] bg-surface-2 px-3 py-6 text-center text-xs text-text-faint">
            Resolved tracks will preview here.
          </p>
        ) : (
          tracks.map((track) => {
            const { title, artist, imageUrl } = track.displayData;
            return (
              <div
                key={track.spotifyUri}
                className="flex items-center gap-3 rounded-[var(--radius-sm)] px-1.5 py-1.5 hover:bg-surface-2"
              >
                <TrackArt
                  title={title}
                  artist={artist}
                  imageUrl={imageUrl}
                  sizes="28px"
                  boxClassName="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded-[6px] bg-surface-2"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">{title}</p>
                  <p className="truncate text-[11px] text-text-faint">{artist}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
