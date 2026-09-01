'use client';

import { AlertCircle, ListMusic } from 'lucide-react';
import Link from 'next/link';

import { PlaylistCard } from '@/components/playlist/playlist-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { usePlaylists } from '@/hooks/use-playlists';
import { getErrorMessage } from '@/lib/type-guards';

/** Responsive column track shared by the real grid and the loading placeholder. */
const GRID_CLASSES = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4';

/**
 * Stable keys for the loading placeholders. They render a fixed number of
 * inert cards, so they need identities that don't shift — hence a named list
 * rather than array indices.
 */
const PLACEHOLDER_KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/**
 * Loading treatment: a grid of inert cards matching the real card's box so
 * the layout doesn't jump when data lands. No `skeleton` primitive is
 * installed and this phase adds no dependencies, so the shimmer is a plain
 * `animate-pulse` — gated behind `motion-safe:` to respect reduced motion,
 * like the app's other animations.
 */
function PlaylistGridPlaceholder() {
  return (
    <div className={GRID_CLASSES} role="status">
      {PLACEHOLDER_KEYS.map((key) => (
        <div
          key={key}
          className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-dashed border-border bg-surface p-3 motion-safe:animate-pulse"
          aria-hidden
        >
          <div className="aspect-square w-full rounded-[var(--radius-sm)] bg-surface-2" />
          <div className="space-y-1.5">
            <div className="h-3 w-3/4 rounded-full bg-surface-2" />
            <div className="h-2.5 w-1/3 rounded-full bg-surface-2" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading your playlists…</span>
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
        <PlaylistGridPlaceholder />
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
