'use client';

import { Loader2, Plus, Search } from 'lucide-react';
import { useState } from 'react';

import { TrackCard } from '@/components/track-card';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
    <Command
      shouldFilter={false}
      className="relative size-auto w-full overflow-visible rounded-none! bg-transparent p-0"
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false);
        if (event.key === 'ArrowDown') setOpen(true);
      }}
      // Focus only ever lives in the input (rows are never focused, see the
      // list's `onMouseDown`), so blurring it means focus/click left the field.
      onBlur={() => setOpen(false)}
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-text-faint"
          aria-hidden
        />
        <CommandInput
          placeholder="Search Spotify to add a track…"
          value={query}
          onValueChange={(value) => {
            setQuery(value);
            setOpen(true);
          }}
          onFocus={() => {
            if (trimmedQuery) setOpen(true);
          }}
          className="h-11 min-w-0 rounded-[var(--radius-sm)] border border-input bg-surface-inset py-1 pr-10 pl-10 text-[14.5px] text-foreground transition placeholder:text-text-faint focus-visible:border-primary focus-visible:bg-surface focus-visible:ring-[3px] focus-visible:ring-ring md:text-sm dark:bg-surface-inset"
        />
        {isSearching && (
          <Loader2
            className="pointer-events-none absolute right-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 animate-spin text-text-faint"
            aria-hidden
          />
        )}
      </div>

      {open && (results.length > 0 || showNoResults) && (
        <CommandList
          // Keep focus in the input when clicking rows, scrollbar or padding.
          onMouseDown={(event) => event.preventDefault()}
          className="absolute z-30 mt-2 max-h-[320px] w-full rounded-[var(--radius-lg)] border bg-surface p-1.5 shadow-[var(--shadow-pop)]"
        >
          {showNoResults && (
            <CommandEmpty className="p-2.5 text-[13px] text-text-faint">
              No tracks found for &quot;{trimmedQuery}&quot;.
            </CommandEmpty>
          )}
          {results.map((track) => {
            const isDuplicate = existingUris.has(track.uri);
            return (
              <CommandItem
                key={track.uri}
                value={track.uri}
                disabled={isDuplicate}
                onSelect={() => handleSelect(track)}
                className="cursor-pointer gap-3 rounded-[var(--radius-sm)] p-2.5 transition-colors data-selected:bg-surface-2 data-[disabled=true]:pointer-events-auto data-[disabled=true]:cursor-not-allowed"
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
                  tabIndex={-1}
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
              </CommandItem>
            );
          })}
        </CommandList>
      )}
    </Command>
  );
}
