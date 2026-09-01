import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { API_ROUTES, QUERY_KEYS } from '@/lib/constants';

const SEARCH_DEBOUNCE_MS = 400;

/** Shape of one row in `GET /api/spotify/search`'s `tracks` array. */
export interface SearchResultTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  uri: string;
  album?: string;
  image?: string | null;
  duration?: number;
}

/**
 * Debounced Spotify track search for the refine step's "add a track" field.
 *
 * `query` is the raw, un-debounced input value; the hook debounces it
 * internally by `SEARCH_DEBOUNCE_MS` before it becomes part of the
 * `useQuery` key, so keystrokes don't each trigger a network call.
 * `isSearching` stays true across the whole "did anything change since the
 * user stopped typing" window — both the debounce delay and the in-flight
 * request — so a caller's spinner doesn't flicker off between them.
 */
export function useSearchTracks(query: string) {
  const trimmed = query.trim();
  const [debouncedQuery, setDebouncedQuery] = useState(trimmed);

  useEffect(() => {
    // Clearing the query collapses to the empty string right away (delay 0);
    // a non-empty query waits out the full debounce. Both go through the
    // timer callback (rather than a synchronous `setState` in the effect
    // body) so rapid keystrokes don't each trigger cascading renders.
    const delay = trimmed === '' ? 0 : SEARCH_DEBOUNCE_MS;
    const timer = setTimeout(() => setDebouncedQuery(trimmed), delay);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const enabled = debouncedQuery !== '';

  const { data, isFetching } = useQuery<SearchResultTrack[]>({
    queryKey: QUERY_KEYS.searchTracks(debouncedQuery),
    queryFn: async () => {
      const res = await fetch(
        `${API_ROUTES.SPOTIFY_SEARCH}?q=${encodeURIComponent(debouncedQuery)}`
      );
      if (!res.ok) {
        throw new Error('Failed to search Spotify tracks');
      }
      const data = await res.json();
      return data.tracks ?? [];
    },
    enabled,
    staleTime: 30 * 1000,
    retry: 1,
  });

  return {
    results: enabled ? (data ?? []) : [],
    isSearching: trimmed !== '' && (debouncedQuery !== trimmed || isFetching),
  };
}
