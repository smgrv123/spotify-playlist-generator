import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ResolvedTrack } from '@/lib/types';
import { Loader2, Plus, Search } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

interface AddTrackSearchProps {
  onAdd: (track: ResolvedTrack) => void;
  existingUris: Set<string>;
}

// Map the API response shape
interface SearchResultTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  uri: string;
  album?: string;
  image?: string;
}

export function AddTrackSearch({ onAdd, existingUris }: AddTrackSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.tracks || []);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (track: SearchResultTrack) => {
    // Prevent redundant additions
    if (existingUris.has(track.uri)) return;

    // Map SearchResultTrack to our internal ResolvedTrack standard format
    const newTrack: ResolvedTrack = {
      status: 'resolved',
      spotifyUri: track.uri,
      spotifyTrackId: track.id,
      displayData: {
        title: track.name,
        artist: track.artists.map((a) => a.name).join(', '),
        albumContext: track.album || 'Unknown Album',
        imageUrl: track.image || undefined,
      },
    };

    onAdd(newTrack);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="relative w-full" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search for a track on Spotify to add manually..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => {
            if (query.trim()) setShowResults(true);
          }}
          className="pl-9 pr-10"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-popover text-popover-foreground border rounded-md shadow-md max-h-[300px] overflow-y-auto overflow-x-hidden">
          {results.map((track) => {
            const isDuplicate = existingUris.has(track.uri);
            return (
              <div
                key={track.uri}
                className={`flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/50 transition-colors ${
                  isDuplicate ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
                onClick={() => handleSelect(track)}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  {track.image ? (
                    <div className="relative h-10 w-10 rounded overflow-hidden flex-shrink-0">
                      <Image
                        src={track.image}
                        alt={track.album || track.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                      <span className="text-muted-foreground text-xs">No img</span>
                    </div>
                  )}
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="font-medium text-sm truncate">{track.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {track.artists.map((a) => a.name).join(', ')}
                    </span>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-shrink-0"
                  disabled={isDuplicate}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {isDuplicate ? 'Added' : 'Add'}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {showResults && query.trim() && !isSearching && results.length === 0 && (
        <div className="absolute z-10 w-full mt-2 bg-popover text-popover-foreground border rounded-md shadow-md p-4 text-center text-sm text-muted-foreground">
          No tracks found for &quot;{query}&quot;.
        </div>
      )}
    </div>
  );
}
