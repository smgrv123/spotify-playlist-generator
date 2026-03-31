'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { AddTrackSearch } from '@/components/add-track-search';
import { SavePanel } from '@/components/save-panel';
import { TrackList } from '@/components/track-list';
import type { FailedTrack, ResolvedTrack } from '@/lib/types';

type TrackItem = ResolvedTrack | FailedTrack;

export function PlaylistBuilder() {
  // TODO: Actual auth state management comes in Phase x
  const isAuthenticated = true; // Hardcoded to true to focus on generation logic

  // Pipeline State
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState(15);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Draft State
  const [suggestedName, setSuggestedName] = useState('');
  const [tracks, setTracks] = useState<TrackItem[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Step 1: Generate AI Playlist
      const generateRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, count }),
      });

      const generateData = await generateRes.json();

      if (!generateRes.ok) {
        throw new Error(generateData.message || 'Failed to generate playlist');
      }

      setSuggestedName(generateData.suggestedName);

      // Step 2: Resolve AI Tracks into Spotify URIs
      const resolveRes = await fetch('/api/spotify/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracks: generateData.tracks }),
      });

      const resolveData = await resolveRes.json();
      console.log('fooo1111o', resolveData);

      if (!resolveRes.ok) {
        throw new Error(resolveData.message || 'Failed to resolve Spotify tracks');
      }

      setTracks(resolveData.resultsz);
    } catch (err) {
      const e = err as Error;
      setError(e.message || 'An unexpected error occurred in the pipeline');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemoveTrack = (indexToRemove: number) => {
    setTracks((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleAddTrack = (track: ResolvedTrack) => {
    setTracks((prev) => [track, ...prev]);
  };

  console.log('foooot', tracks);

  const existingUris = new Set(tracks?.map((t) => (t.status === 'resolved' ? t.spotifyUri : '')));

  if (!isAuthenticated) {
    return (
      <Card className="mx-auto max-w-lg border-2 mt-8 animate-in fade-in duration-700">
        <CardHeader className="text-center pb-8 pt-10">
          <CardTitle className="text-3xl font-bold tracking-tight mb-2">
            AI Playlist Generator
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground mx-auto max-w-sm">
            Design perfect Spotify playlists instantly using Google Gemini. Log in to your Spotify
            account to get started.
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
      {/* 1. Generation Prompt Area (Phase 16) */}
      <Card className="border-2 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <CardTitle className="text-xl">1. Describe Your Playlist</CardTitle>
          <CardDescription>Give the AI a theme, mood, or context to build from.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="e.g. A high energy cyberpunk running mix with industrial beats"
              className="resize-none h-24"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Track Count: {count}</Label>
            </div>
            <Slider
              value={[count]}
              onValueChange={(val) => setCount(val[0])}
              max={50}
              min={5}
              step={1}
              disabled={isGenerating}
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 font-medium p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          <Button
            className="w-full sm:w-auto"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Crafting Playlist...
              </>
            ) : (
              'Generate & Resolve Tracks'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 2. Draft Resolution Area (Phase 16) */}
      <Card className="border-2 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <CardTitle className="text-xl">2. Review & Refine Tracks</CardTitle>
          <CardDescription>
            Select tracks, refine generated choices, and match Spotify URIs.
          </CardDescription>
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
          <SavePanel tracks={tracks} suggestedName={suggestedName} />
        </CardContent>
      </Card>
    </div>
  );
}
