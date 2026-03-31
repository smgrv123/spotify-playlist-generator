'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AddTrackSearch } from '@/components/add-track-search';
import { SavePanel } from '@/components/save-panel';
import { TrackList } from '@/components/track-list';
import type { FailedTrack, ResolvedTrack } from '@/lib/types';

type TrackItem = ResolvedTrack | FailedTrack;
type TrackInput = {
  title: string;
  artist: string;
  album?: string;
};

export function PlaylistBuilder() {
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>(
    'loading'
  );

  useEffect(() => {
    let cancelled = false;
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (cancelled) return;
        setAuthStatus(res.ok && data.authenticated ? 'authenticated' : 'unauthenticated');
      } catch {
        if (!cancelled) setAuthStatus('unauthenticated');
      }
    };
    checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const isAuthenticated = authStatus === 'authenticated';

  // Draft State
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [pasteValue, setPasteValue] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleRemoveTrack = (indexToRemove: number) => {
    setTracks((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleAddTrack = (track: ResolvedTrack) => {
    setTracks((prev) => [track, ...prev]);
  };

  const parseTracks = (raw: string) => {
    const trimmed = raw.trim();
    const warnings: string[] = [];
    const parsed: TrackInput[] = [];

    if (!trimmed) {
      return { tracks: parsed, warnings, error: 'Paste some tracks to resolve first.' };
    }

    const parseLineList = () => {
      const skipped: string[] = [];
      const lines = trimmed.split(/\r?\n/);
      lines.forEach((line) => {
        const clean = line.trim();
        if (!clean) return;
        let dividerIndex = clean.indexOf(' - ');
        let delimiterLength = 3;
        if (dividerIndex === -1) {
          dividerIndex = clean.indexOf('-');
          delimiterLength = 1;
        }
        if (dividerIndex === -1) {
          skipped.push(clean);
          return;
        }
        const title = clean.slice(0, dividerIndex).trim();
        const artist = clean.slice(dividerIndex + delimiterLength).trim();
        if (!title || !artist) {
          skipped.push(clean);
          return;
        }
        parsed.push({ title, artist });
      });

      if (skipped.length > 0) {
        warnings.push(
          `Skipped ${skipped.length} line${skipped.length === 1 ? '' : 's'} that could not be parsed.`
        );
      }
    };

    if (trimmed.startsWith('[')) {
      try {
        const json = JSON.parse(trimmed);
        if (!Array.isArray(json)) {
          return { tracks: parsed, warnings, error: 'JSON input must be an array.' };
        }

        const skipped: number[] = [];
        json.forEach((item, index) => {
          if (!item || typeof item !== 'object') {
            skipped.push(index + 1);
            return;
          }
          const title = typeof item.title === 'string' ? item.title.trim() : '';
          const artist = typeof item.artist === 'string' ? item.artist.trim() : '';
          const album = typeof item.album === 'string' ? item.album.trim() : undefined;

          if (!title || !artist) {
            skipped.push(index + 1);
            return;
          }
          parsed.push({ title, artist, album });
        });

        if (skipped.length > 0) {
          warnings.push(
            `Skipped ${skipped.length} JSON entr${skipped.length === 1 ? 'y' : 'ies'} missing title or artist.`
          );
        }
      } catch {
        return {
          tracks: parsed,
          warnings,
          error: 'Invalid JSON. Fix the syntax or paste line items.',
        };
      }
    } else {
      parseLineList();
    }

    if (parsed.length === 0) {
      return { tracks: parsed, warnings, error: 'No valid tracks found to resolve.' };
    }

    return { tracks: parsed, warnings, error: null };
  };

  const handleResolve = async () => {
    setResolveError(null);
    setParseError(null);

    const { tracks: parsedTracks, warnings, error } = parseTracks(pasteValue);
    setParseWarnings(warnings);

    if (error) {
      setParseError(error);
      return;
    }

    setIsResolving(true);

    try {
      const resolveRes = await fetch('/api/spotify/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracks: parsedTracks }),
      });

      const resolveData = await resolveRes.json();

      if (!resolveRes.ok) {
        throw new Error(resolveData.message || 'Failed to resolve Spotify tracks');
      }

      setTracks(resolveData.results || []);
    } catch (err) {
      const e = err as Error;
      setResolveError(e.message || 'Unable to resolve tracks. Please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setAuthStatus('unauthenticated');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const existingUris = new Set(tracks?.map((t) => (t.status === 'resolved' ? t.spotifyUri : '')));
  const resolvedTracks = tracks.filter((track) => track.status === 'resolved') as ResolvedTrack[];
  const failedTracks = tracks.filter((track) => track.status === 'failed') as FailedTrack[];
  const createRemoveHandler = (subset: TrackItem[]) => (subsetIndex: number) => {
    const target = subset[subsetIndex];
    if (!target) return;
    const originalIndex = tracks.indexOf(target);
    if (originalIndex === -1) return;
    handleRemoveTrack(originalIndex);
  };

  if (authStatus === 'loading') {
    return (
      <Card className="mx-auto max-w-lg border-2 mt-8 animate-in fade-in duration-700">
        <CardHeader className="text-center pb-8 pt-10">
          <CardTitle className="text-3xl font-bold tracking-tight mb-2">Playlist Manager</CardTitle>
          <CardDescription className="text-base text-muted-foreground mx-auto max-w-sm">
            Checking your Spotify session...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card className="mx-auto max-w-lg border-2 mt-8 animate-in fade-in duration-700">
        <CardHeader className="text-center pb-8 pt-10">
          <CardTitle className="text-3xl font-bold tracking-tight mb-2">Playlist Manager</CardTitle>
          <CardDescription className="text-base text-muted-foreground mx-auto max-w-sm">
            Log in to your Spotify account to manage playlists and track lists.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-10">
          <Button
            asChild
            size="lg"
            className="rounded-full px-8 bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold transition-all"
          >
            <a href="/api/auth/login">Connect with Spotify</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging out...
            </>
          ) : (
            <>
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </>
          )}
        </Button>
      </div>

      <Card className="border-2 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <CardTitle className="text-xl">1. Prepare Your Tracks</CardTitle>
          <CardDescription>Paste a list of tracks and resolve them to Spotify.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="track-paste">Paste Tracks</Label>
            <Textarea
              id="track-paste"
              placeholder={`Title - Artist\nAnother Song - Another Artist\n\nOr JSON: [{\"title\":\"Song\",\"artist\":\"Artist\",\"album\":\"Album\"}]`}
              value={pasteValue}
              onChange={(event) => setPasteValue(event.target.value)}
              className="min-h-[160px]"
            />
            <p className="text-xs text-muted-foreground">
              Use one track per line in <strong>Title - Artist</strong> format, or paste a JSON
              array with <strong>title</strong>, <strong>artist</strong>, and optional{' '}
              <strong>album</strong>.
            </p>
          </div>

          {parseWarnings.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {parseWarnings.map((warning, index) => (
                <div key={index}>{warning}</div>
              ))}
            </div>
          )}

          {parseError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {parseError}
            </div>
          )}

          {resolveError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {resolveError}
            </div>
          )}

          <Button onClick={handleResolve} disabled={isResolving || !pasteValue.trim()}>
            {isResolving ? 'Resolving...' : 'Resolve Tracks'}
          </Button>
        </CardContent>
      </Card>

      {/* 2. Draft Resolution Area (Phase 16) */}
      <Card className="border-2 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <CardTitle className="text-xl">2. Review & Refine Tracks</CardTitle>
          <CardDescription>Add, remove, and review tracks before saving.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Resolved Tracks ({resolvedTracks.length})</Label>
              <span className="text-xs text-muted-foreground hidden sm:inline-block">
                Drag to reorder (coming soon)
              </span>
            </div>

            <AddTrackSearch onAdd={handleAddTrack} existingUris={existingUris} />

            <TrackList tracks={resolvedTracks} onRemove={createRemoveHandler(resolvedTracks)} />
          </div>

          {failedTracks.length > 0 && (
            <div className="space-y-3">
              <Label>Unresolved Tracks ({failedTracks.length})</Label>
              <div className="text-xs text-muted-foreground">
                These tracks could not be matched on Spotify.
              </div>
              <TrackList tracks={failedTracks} onRemove={createRemoveHandler(failedTracks)} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Save Controls Area (Phase 18) */}
      <Card className="border-2 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <CardTitle className="text-xl">3. Save to Spotify</CardTitle>
          <CardDescription>Select destination playlist or create a new one.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <SavePanel tracks={tracks} suggestedName="" />
        </CardContent>
      </Card>
    </div>
  );
}
