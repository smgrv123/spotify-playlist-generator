'use client';

import { AlertCircle, ListMusic, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { PlaylistCard } from '@/components/playlist/playlist-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { usePlaylists } from '@/hooks/use-playlists';
import { getErrorMessage } from '@/lib/type-guards';

/** Responsive column track for the playlist grid. */
const GRID_CLASSES = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4';

/**
 * Loading treatment — the same dashed-box spinner used by the playlist
 * detail view, so the two loading states read as one app.
 */
function PlaylistLibraryPlaceholder() {
  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface-2 px-5 py-10 text-[13px] text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      Loading your playlists…
    </div>
  );
}

/**
 * Empty state — the account has no editable playlists yet, so point the user
 * at the builder rather than leaving them staring at a blank grid.
 */
function PlaylistLibraryEmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface-2 px-6 py-14 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-accent-foreground">
        <ListMusic className="h-5 w-5" aria-hidden />
      </span>
      <p className="text-[15px] font-semibold text-foreground">No playlists yet</p>
      <p className="max-w-sm text-[13px] text-muted-foreground">
        Playlists you own or collaborate on show up here. Build your first one and it will land in
        this library.
      </p>
      <Button asChild size="lg" className="mt-1">
        <Link href="/">Build a playlist</Link>
      </Button>
    </div>
  );
}

/**
 * The `/playlists` library view: page heading plus a responsive grid of
 * playlist cards, with the loading / error / empty treatments lifted from the
 * save step's target-playlist picker so the two lists read as one app.
 *
 * A client component because the list comes from `usePlaylists()` — the shared
 * TanStack Query hook the save step already uses, so navigating between the
 * two hits the same warm cache instead of refetching.
 */
export function PlaylistLibrary() {
  const { playlists, isLoading, error } = usePlaylists();

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="display-text text-[clamp(22px,3vw,28px)] leading-tight text-foreground">
          Your playlists
        </h1>
        <p className="mt-1.5 text-[14px] text-muted-foreground">
          Open one to reorder tracks, rename it, or delete it.
        </p>
      </header>

      {isLoading ? (
        <PlaylistLibraryPlaceholder />
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : playlists.length === 0 ? (
        <PlaylistLibraryEmptyState />
      ) : (
        <div className={GRID_CLASSES}>
          {playlists.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
        </div>
      )}
    </section>
  );
}
