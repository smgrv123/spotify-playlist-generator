'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

import { AddTrackSearch } from '@/components/add-track-search';
import { SavePanel } from '@/components/save-panel';
import { TrackList } from '@/components/track-list';
import type { FailedTrack, ResolvedTrack } from '@/lib/types';

type TrackItem = ResolvedTrack | FailedTrack;

export function PlaylistBuilder() {
  // TODO: Actual auth state management comes in Phase x
  const isAuthenticated = true; // Hardcoded to true for now

  // Draft State
  const [tracks, setTracks] = useState<TrackItem[]>([]);

  const handleRemoveTrack = (indexToRemove: number) => {
    setTracks((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleAddTrack = (track: ResolvedTrack) => {
    setTracks((prev) => [track, ...prev]);
  };

  const existingUris = new Set(tracks?.map((t) => (t.status === 'resolved' ? t.spotifyUri : '')));

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
      <Card className="border-2 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <CardTitle className="text-xl">1. Prepare Your Tracks</CardTitle>
          <CardDescription>Paste or add tracks manually to build your playlist.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
            Track paste and resolve tools are coming in the next phase. For now, you can start
            adding tracks manually below.
          </div>
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
              <Label>Track List ({tracks.length})</Label>
              <span className="text-xs text-muted-foreground hidden sm:inline-block">
                Drag to reorder (coming soon)
              </span>
            </div>

            <AddTrackSearch onAdd={handleAddTrack} existingUris={existingUris} />

            <TrackList tracks={tracks} onRemove={handleRemoveTrack} />
          </div>
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
