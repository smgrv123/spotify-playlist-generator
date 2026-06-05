'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, LogOut } from 'lucide-react';
import { useState } from 'react';

import { AddTrackSearch } from '@/components/add-track-search';
import { SavePanel } from '@/components/save-panel';
import { TrackList } from '@/components/track-list';
import { TrackPasteForm } from '@/components/track-paste-form';
import { useLogout } from '@/hooks/use-logout';
import { useSession } from '@/hooks/use-session';
import type { FailedTrack, ResolvedTrack } from '@/lib/types';

type TrackItem = ResolvedTrack | FailedTrack;

export function PlaylistBuilder() {
  const { isAuthenticated, isLoading: authLoading } = useSession();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  // Draft State
  const [tracks, setTracks] = useState<TrackItem[]>([]);

  const handleRemoveTrack = (indexToRemove: number) => {
    setTracks((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleAddTrack = (track: ResolvedTrack) => {
    setTracks((prev) => [track, ...prev]);
  };

  const handleTracksResolved = (newTracks: TrackItem[]) => {
    setTracks(newTracks);
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

  if (authLoading) {
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
            className="rounded-full px-8 bg-spotify hover:bg-spotify-hover text-black font-semibold transition-all"
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
        <Button variant="outline" onClick={() => logout()} disabled={isLoggingOut}>
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
        <CardContent className="pt-6">
          <TrackPasteForm onTracksResolved={handleTracksResolved} />
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
