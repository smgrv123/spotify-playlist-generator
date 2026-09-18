'use client';

import { Loader2, Plus, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { TrackCard } from '@/components/track-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSearchTracks, type SearchResultTrack } from '@/hooks/use-search-tracks';
import type { ResolvedTrack } from '@/lib/types';

interface AddTrackSearchProps {
  onAdd: (track: ResolvedTrack) => void;
  existingUris: Set<string>;
}

/**
 * Refine-step "add a track" search field, restyled to the Vibecrafter
 * handoff: left-icon input with a trailing spinner while a search is
 * in-flight, and an absolute-positioned results panel underneath it
 * (`shadow-[var(--shadow-pop)]`, matching `.dropdown` in the handoff).
 *
 * Each result row shows album art (`TrackCard`, `size="sm"`, real image or
 * gradient fallback), title/artist, and an Add button. Rows already present in the
 * draft (by `spotifyUri`, via `existingUris`) render at 50% opacity with an
 * "Added" label and are not clickable.
 */
export function AddTrackSearch({ onAdd, existingUris }: AddTrackSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const { results, isSearching } = useSearchTracks(query);

  const searchRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside the search field + panel.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (track: SearchResultTrack) => {
    if (existingUris.has(track.uri)) return;

    const newTrack: ResolvedTrack = {
      status: 'resolved',
      spotifyUri: track.uri,
      spotifyTrackId: track.id,
      durationMs: track.duration ?? 0,
      displayData: {
        title: track.name,
        artist: track.artists.map((a) => a.name).join(', '),
        albumContext: track.album || 'Unknown Album',
        imageUrl: track.image || undefined,
      },
    };

    onAdd(newTrack);
    setQuery('');
    setOpen(false);
  };

  const trimmedQuery = query.trim();
  const showNoResults = open && trimmedQuery !== '' && !isSearching && results.length === 0;

  return (
    <div className="relative w-full" ref={searchRef}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-text-faint"
          aria-hidden
        />
        <Input
          placeholder="Search Spotify to add a track…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (trimmedQuery) setOpen(true);
          }}
          className="h-11 rounded-[var(--radius-sm)] border bg-surface-inset pr-10 pl-10 text-[14.5px] text-foreground placeholder:text-text-faint transition focus-visible:border-primary focus-visible:bg-surface focus-visible:ring-[3px] focus-visible:ring-ring dark:bg-surface-inset"
        />
        {isSearching && (
          <Loader2
            className="absolute right-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 animate-spin text-text-faint"
            aria-hidden
          />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-30 mt-2 max-h-[320px] w-full overflow-y-auto overflow-x-hidden rounded-[var(--radius-lg)] border bg-surface p-1.5 shadow-[var(--shadow-pop)]">
          {results.map((track) => {
            const isDuplicate = existingUris.has(track.uri);
            return (
              <div
                key={track.uri}
                className={`flex items-center gap-3 rounded-[var(--radius-sm)] p-2.5 transition-colors ${
                  isDuplicate
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer hover:bg-surface-2'
                }`}
                onClick={() => handleSelect(track)}
              >
                <TrackCard
                  size="sm"
                  title={track.name}
                  artist={track.artists.map((a) => a.name).join(', ')}
                  imageUrl={track.image || undefined}
                  artSizeClassName="h-[38px] w-[38px] rounded-[8px]"
                  artSizes="38px"
                  titleClassName="text-[14px] font-medium"
                  artistClassName="text-[12.5px] text-muted-foreground"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isDuplicate}
                  className="h-auto flex-shrink-0 rounded-[var(--radius-sm)] px-3.5 py-1.5 text-[13px] font-semibold"
                >
                  {isDuplicate ? (
                    'Added'
                  ) : (
                    <>
                      <Plus className="h-4 w-4" aria-hidden />
                      Add
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {showNoResults && (
        <div className="absolute z-30 mt-2 w-full rounded-[var(--radius-lg)] border bg-surface p-4 text-center text-[13px] text-text-faint shadow-[var(--shadow-pop)]">
          No tracks found for &quot;{trimmedQuery}&quot;.
        </div>
      )}
    </div>
  );
}
