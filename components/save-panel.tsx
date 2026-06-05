import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrackList } from '@/components/track-list';
import type { FailedTrack, ResolvedTrack } from '@/lib/types';
import { AlertCircle, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

interface SavePanelProps {
  tracks: (ResolvedTrack | FailedTrack)[]; // Accept mixed track array but filter internally
  suggestedName: string;
}

interface SpotifyPlaylistMeta {
  id: string;
  name: string;
}

export function SavePanel({ tracks, suggestedName }: SavePanelProps) {
  const [saveMode, setSaveMode] = useState<'create' | 'update' | 'delete'>('create');
  const [playlistName, setPlaylistName] = useState(suggestedName);
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [targetPlaylistId, setTargetPlaylistId] = useState<string>('');
  const [currentPlaylistTracks, setCurrentPlaylistTracks] = useState<ResolvedTrack[]>([]);
  const [currentSelection, setCurrentSelection] = useState<Set<string>>(new Set());
  const [newSelection, setNewSelection] = useState<Set<string>>(new Set());
  const [isLoadingCurrentTracks, setIsLoadingCurrentTracks] = useState(false);
  const [currentTracksError, setCurrentTracksError] = useState<string | null>(null);

  const [userPlaylists, setUserPlaylists] = useState<SpotifyPlaylistMeta[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessUrl, setSaveSuccessUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const selectedPlaylist = userPlaylists.find((playlist) => playlist.id === targetPlaylistId);

  useEffect(() => {
    setSaveError(null);
    setSaveSuccessUrl(null);
    setDeleteError(null);
    setDeleteSuccess(null);
  }, [saveMode]);

  // Keep internal name synced with suggestions for create flow only
  useEffect(() => {
    if (saveMode === 'create' && !saveSuccessUrl && suggestedName) {
      setPlaylistName(suggestedName);
    }
  }, [saveMode, suggestedName, saveSuccessUrl]);

  // Sync playlist name with selection in update flow
  useEffect(() => {
    if (saveMode !== 'update' || !targetPlaylistId) return;
    const selected = userPlaylists.find((playlist) => playlist.id === targetPlaylistId);
    if (selected) {
      setPlaylistName(selected.name);
    }
  }, [saveMode, targetPlaylistId, userPlaylists]);

  // Load playlists when switching to update mode
  useEffect(() => {
    if ((saveMode === 'update' || saveMode === 'delete') && userPlaylists.length === 0) {
      const fetchPlaylists = async () => {
        setIsLoadingPlaylists(true);
        try {
          const res = await fetch('/api/spotify/playlists');
          if (res.ok) {
            const data = await res.json();
            const items = Array.isArray(data.playlists) ? data.playlists : [];
            setUserPlaylists(items);
            if (items.length > 0) {
              setTargetPlaylistId(items[0].id);
            }
          }
        } catch (error) {
          console.error('Failed to load playlists', error);
        } finally {
          setIsLoadingPlaylists(false);
        }
      };
      fetchPlaylists();
    }
  }, [saveMode, userPlaylists.length]);

  // Load selected playlist tracks for update flow
  useEffect(() => {
    if (saveMode !== 'update' || !targetPlaylistId) return;
    let isCancelled = false;

    const fetchTracks = async () => {
      setIsLoadingCurrentTracks(true);
      setCurrentTracksError(null);
      try {
        const res = await fetch(
          `/api/spotify/playlist/tracks?playlistId=${encodeURIComponent(targetPlaylistId)}`
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Failed to load playlist tracks');
        }
        const data = await res.json();
        const loadedTracks = Array.isArray(data.tracks) ? (data.tracks as ResolvedTrack[]) : [];
        if (isCancelled) return;
        setCurrentPlaylistTracks(loadedTracks);
        setCurrentSelection(new Set(loadedTracks.map((track) => track.spotifyUri)));
      } catch (error) {
        if (isCancelled) return;
        const message = error instanceof Error ? error.message : 'Failed to load playlist tracks';
        setCurrentTracksError(message);
        setCurrentPlaylistTracks([]);
        setCurrentSelection(new Set());
      } finally {
        if (!isCancelled) {
          setIsLoadingCurrentTracks(false);
        }
      }
    };

    fetchTracks();
    return () => {
      isCancelled = true;
    };
  }, [saveMode, targetPlaylistId]);

  const resolvedTracks = useMemo(
    () => tracks.filter((t) => t.status === 'resolved') as ResolvedTrack[],
    [tracks]
  );
  const createUris = resolvedTracks.map((t) => t.spotifyUri);
  const selectedCurrentTracks = useMemo(
    () => currentPlaylistTracks.filter((track) => currentSelection.has(track.spotifyUri)),
    [currentPlaylistTracks, currentSelection]
  );
  const selectedNewTracks = useMemo(
    () => resolvedTracks.filter((track) => newSelection.has(track.spotifyUri)),
    [resolvedTracks, newSelection]
  );
  const finalPreviewTracks = useMemo(() => {
    const seen = new Set<string>();
    const merged: ResolvedTrack[] = [];

    selectedCurrentTracks.forEach((track) => {
      if (seen.has(track.spotifyUri)) return;
      seen.add(track.spotifyUri);
      merged.push(track);
    });

    selectedNewTracks.forEach((track) => {
      if (seen.has(track.spotifyUri)) return;
      seen.add(track.spotifyUri);
      merged.push(track);
    });

    return merged;
  }, [selectedCurrentTracks, selectedNewTracks]);
  const dedupedCount =
    selectedCurrentTracks.length + selectedNewTracks.length - finalPreviewTracks.length;
  const updateUris = finalPreviewTracks.map((track) => track.spotifyUri);

  useEffect(() => {
    if (saveMode !== 'update') return;
    const resolvedUris = resolvedTracks.map((track) => track.spotifyUri);

    setNewSelection((prev) => {
      if (resolvedUris.length === 0) return new Set();
      if (prev.size === 0) {
        return new Set(resolvedUris);
      }

      const previouslyAllSelected = resolvedUris.every((uri) => prev.has(uri));
      const next = new Set<string>();

      if (previouslyAllSelected) {
        resolvedUris.forEach((uri) => next.add(uri));
        return next;
      }

      resolvedUris.forEach((uri) => {
        if (prev.has(uri)) {
          next.add(uri);
        }
      });
      return next;
    });
  }, [resolvedTracks, saveMode]);

  const allCurrentSelected =
    currentPlaylistTracks.length > 0 &&
    currentPlaylistTracks.every((track) => currentSelection.has(track.spotifyUri));
  const allNewSelected =
    resolvedTracks.length > 0 &&
    resolvedTracks.every((track) => newSelection.has(track.spotifyUri));

  const toggleCurrentTrack = (uri: string) => {
    setCurrentSelection((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) {
        next.delete(uri);
      } else {
        next.add(uri);
      }
      return next;
    });
  };

  const toggleNewTrack = (uri: string) => {
    setNewSelection((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) {
        next.delete(uri);
      } else {
        next.add(uri);
      }
      return next;
    });
  };

  const toggleAllCurrent = (checked: boolean) => {
    if (checked) {
      setCurrentSelection(new Set(currentPlaylistTracks.map((track) => track.spotifyUri)));
    } else {
      setCurrentSelection(new Set());
    }
  };

  const toggleAllNew = (checked: boolean) => {
    if (checked) {
      setNewSelection(new Set(resolvedTracks.map((track) => track.spotifyUri)));
    } else {
      setNewSelection(new Set());
    }
  };

  const handleSave = async () => {
    if (saveMode === 'create') {
      if (createUris.length === 0) return;
      if (!playlistName.trim()) return;
    }
    if (saveMode === 'update') {
      if (!targetPlaylistId) return;
      if (updateUris.length === 0) return;
      if (!playlistName.trim()) return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccessUrl(null);

    const payload =
      saveMode === 'create'
        ? {
            playlistName: playlistName.trim(),
            uris: createUris,
            isPublic: visibility === 'public',
          }
        : {
            playlistId: targetPlaylistId,
            playlistName: playlistName.trim(),
            uris: updateUris,
            mode: 'replace' as const,
          };

    try {
      const res = await fetch('/api/spotify/playlist/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to save to Spotify');
      }

      const id = saveMode === 'create' ? data.playlistId : targetPlaylistId;
      setSaveSuccessUrl(`https://open.spotify.com/playlist/${id}`);
    } catch (err) {
      const e = err as Error;
      setSaveError(e.message || 'An unexpected error occurred during save.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!targetPlaylistId) return;

    const playlistLabel = selectedPlaylist?.name || 'this playlist';
    const confirmed =
      typeof window !== 'undefined' &&
      window.confirm(`Delete ${playlistLabel}? This will remove it from your library.`);

    if (!confirmed) return;

    setIsDeleting(true);
    setDeleteError(null);
    setDeleteSuccess(null);

    try {
      const res = await fetch('/api/spotify/playlist/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId: targetPlaylistId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete playlist');
      }

      setDeleteSuccess(selectedPlaylist?.name || 'Playlist deleted');
      setUserPlaylists((prev) => prev.filter((playlist) => playlist.id !== targetPlaylistId));
      setTargetPlaylistId('');
      setPlaylistName('');
    } catch (err) {
      const e = err as Error;
      setDeleteError(e.message || 'An unexpected error occurred during delete.');
    } finally {
      setIsDeleting(false);
    }
  };

  const isSaveDisabled =
    isSaving ||
    (saveMode === 'create'
      ? createUris.length === 0 || !playlistName.trim()
      : !targetPlaylistId || updateUris.length === 0 || !playlistName.trim());
  const isDeleteDisabled = isDeleting || !targetPlaylistId;

  // Success State Override
  if (deleteSuccess) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center animate-in fade-in zoom-in duration-500">
        <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-semibold">Playlist Deleted</h3>
          <p className="text-sm text-muted-foreground">{deleteSuccess}</p>
        </div>
        <Button
          onClick={() => setDeleteSuccess(null)}
          className="mt-4 bg-spotify hover:bg-spotify-hover text-black font-semibold rounded-full px-8"
        >
          Delete Another
        </Button>
      </div>
    );
  }

  if (saveSuccessUrl) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center animate-in fade-in zoom-in duration-500">
        <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-semibold">Playlist Saved Successfully!</h3>
          <p className="text-sm text-muted-foreground">
            {saveMode === 'create'
              ? `Created new playlist: ${playlistName}`
              : `Updated playlist: ${playlistName}`}
          </p>
        </div>
        <Button
          asChild
          className="mt-4 bg-spotify hover:bg-spotify-hover text-black font-semibold rounded-full px-8"
        >
          <a href={saveSuccessUrl} target="_blank" rel="noopener noreferrer">
            Open in Spotify
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <RadioGroup
        value={saveMode}
        onValueChange={(val) => setSaveMode(val as 'create' | 'update' | 'delete')}
        className="flex flex-col sm:flex-row gap-4"
        disabled={isSaving}
      >
        <div className="flex items-center space-x-2 border p-4 rounded-lg flex-1 cursor-pointer hover:bg-muted/50 transition-colors">
          <RadioGroupItem value="create" id="r-create" />
          <Label htmlFor="r-create" className="cursor-pointer font-medium w-full">
            Create New Playlist
          </Label>
        </div>
        <div className="flex items-center space-x-2 border p-4 rounded-lg flex-1 cursor-pointer hover:bg-muted/50 transition-colors">
          <RadioGroupItem value="update" id="r-update" />
          <Label htmlFor="r-update" className="cursor-pointer font-medium w-full">
            Update Existing Playlist
          </Label>
        </div>
        <div className="flex items-center space-x-2 border p-4 rounded-lg flex-1 cursor-pointer hover:bg-muted/50 transition-colors">
          <RadioGroupItem value="delete" id="r-delete" />
          <Label htmlFor="r-delete" className="cursor-pointer font-medium w-full">
            Delete Playlist
          </Label>
        </div>
      </RadioGroup>

      <div className="space-y-4 p-4 bg-muted/20 border rounded-lg">
        {saveMode === 'create' ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-2">
              <Label htmlFor="save-name">New Playlist Name</Label>
              <Input
                id="save-name"
                placeholder="E.g., Summer Vibes 2026..."
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <RadioGroup
                value={visibility}
                onValueChange={(val) => setVisibility(val as 'private' | 'public')}
                className="flex flex-col sm:flex-row gap-3"
                disabled={isSaving}
              >
                <div className="flex items-center space-x-2 border p-3 rounded-lg flex-1 cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="private" id="vis-private" />
                  <Label htmlFor="vis-private" className="cursor-pointer font-medium w-full">
                    Private (default)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border p-3 rounded-lg flex-1 cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="public" id="vis-public" />
                  <Label htmlFor="vis-public" className="cursor-pointer font-medium w-full">
                    Public
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        ) : saveMode === 'update' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-2">
              <Label htmlFor="update-name">Playlist Name</Label>
              <Input
                id="update-name"
                placeholder="Rename this playlist (optional)"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                disabled={isSaving || !targetPlaylistId}
              />
              <p className="text-xs text-muted-foreground">
                Update the name if you want to rename this playlist.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-playlist">
                Select Target Playlist (Warning: Contents will be replaced)
              </Label>
              {isLoadingPlaylists ? (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading your playlists...</span>
                </div>
              ) : (
                <Select
                  value={targetPlaylistId}
                  onValueChange={setTargetPlaylistId}
                  disabled={isSaving || userPlaylists.length === 0}
                >
                  <SelectTrigger id="target-playlist">
                    <SelectValue placeholder="Select a playlist to overwrite" />
                  </SelectTrigger>
                  <SelectContent>
                    {userPlaylists.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {userPlaylists.length === 0 && !isLoadingPlaylists && (
                <p className="text-xs text-destructive mt-1">
                  No public/editable playlists found on your account.
                </p>
              )}
            </div>

            <div className="space-y-3 border rounded-lg p-4 bg-muted/10">
              <div className="flex items-center justify-between">
                <Label>Current Playlist Tracks ({currentPlaylistTracks.length})</Label>
                <label className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={allCurrentSelected}
                    onChange={(event) => toggleAllCurrent(event.target.checked)}
                    className="h-4 w-4 accent-foreground"
                    disabled={currentPlaylistTracks.length === 0}
                  />
                  <span>Include all</span>
                </label>
              </div>

              {isLoadingCurrentTracks ? (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading playlist tracks...</span>
                </div>
              ) : currentTracksError ? (
                <div className="text-sm text-destructive">{currentTracksError}</div>
              ) : currentPlaylistTracks.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  No tracks found in this playlist.
                </div>
              ) : (
                <div className="space-y-2">
                  {currentPlaylistTracks.map((track) => (
                    <div
                      key={`current-${track.spotifyUri}`}
                      className="flex items-center justify-between border rounded-lg px-3 py-2 bg-background"
                    >
                      <label className="flex items-center gap-3 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentSelection.has(track.spotifyUri)}
                          onChange={() => toggleCurrentTrack(track.spotifyUri)}
                          className="h-4 w-4 accent-foreground"
                        />
                        <div className="flex items-center space-x-3 overflow-hidden">
                          {track.displayData.imageUrl ? (
                            <div className="relative h-9 w-9 rounded overflow-hidden flex-shrink-0">
                              <Image
                                src={track.displayData.imageUrl}
                                alt={track.displayData.albumContext || track.displayData.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-9 w-9 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                              <span className="text-muted-foreground text-[10px]">No img</span>
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm truncate">
                              {track.displayData.title}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {track.displayData.artist}
                            </span>
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 border rounded-lg p-4 bg-muted/10">
              <div className="flex items-center justify-between">
                <Label>New Tracks ({resolvedTracks.length})</Label>
                <label className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={allNewSelected}
                    onChange={(event) => toggleAllNew(event.target.checked)}
                    className="h-4 w-4 accent-foreground"
                    disabled={resolvedTracks.length === 0}
                  />
                  <span>Include all</span>
                </label>
              </div>

              {resolvedTracks.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  Resolve tracks first to include them in the update.
                </div>
              ) : (
                <div className="space-y-2">
                  {resolvedTracks.map((track) => (
                    <div
                      key={`new-${track.spotifyUri}`}
                      className="flex items-center justify-between border rounded-lg px-3 py-2 bg-background"
                    >
                      <label className="flex items-center gap-3 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newSelection.has(track.spotifyUri)}
                          onChange={() => toggleNewTrack(track.spotifyUri)}
                          className="h-4 w-4 accent-foreground"
                        />
                        <div className="flex items-center space-x-3 overflow-hidden">
                          {track.displayData.imageUrl ? (
                            <div className="relative h-9 w-9 rounded overflow-hidden flex-shrink-0">
                              <Image
                                src={track.displayData.imageUrl}
                                alt={track.displayData.albumContext || track.displayData.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-9 w-9 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                              <span className="text-muted-foreground text-[10px]">No img</span>
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm truncate">
                              {track.displayData.title}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {track.displayData.artist}
                            </span>
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 border rounded-lg p-4 bg-muted/10">
              <div className="flex items-center justify-between">
                <Label>Final Playlist Preview ({finalPreviewTracks.length})</Label>
                {dedupedCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Removed {dedupedCount} duplicate{dedupedCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              <TrackList
                tracks={finalPreviewTracks}
                readOnly
                emptyMessage="No tracks selected yet."
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-2">
              <Label htmlFor="delete-playlist">Select Playlist to Delete</Label>
              {isLoadingPlaylists ? (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground p-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading your playlists...</span>
                </div>
              ) : (
                <Select
                  value={targetPlaylistId}
                  onValueChange={setTargetPlaylistId}
                  disabled={isDeleting || userPlaylists.length === 0}
                >
                  <SelectTrigger id="delete-playlist">
                    <SelectValue placeholder="Select a playlist to delete" />
                  </SelectTrigger>
                  <SelectContent>
                    {userPlaylists.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {userPlaylists.length === 0 && !isLoadingPlaylists && (
                <p className="text-xs text-destructive mt-1">
                  No public/editable playlists found on your account.
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Deleting will remove this playlist from your library. This action cannot be undone.
            </p>
          </div>
        )}
      </div>

      {saveError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}
      {deleteError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{deleteError}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {saveMode === 'delete' ? (
            selectedPlaylist ? (
              `Deleting playlist: ${selectedPlaylist.name}`
            ) : (
              'Select a playlist to delete.'
            )
          ) : saveMode === 'update' ? (
            <>
              {finalPreviewTracks.length} track
              {finalPreviewTracks.length === 1 ? '' : 's'} in final preview
              {dedupedCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400 ml-1">
                  ({dedupedCount} duplicate{dedupedCount === 1 ? '' : 's'} removed)
                </span>
              )}
            </>
          ) : (
            <>
              {createUris.length} {createUris.length === 1 ? 'track' : 'tracks'} will be saved.
              {tracks.length > createUris.length && (
                <span className="text-amber-600 dark:text-amber-400 ml-1">
                  ({tracks.length - createUris.length} unresolved skipped)
                </span>
              )}
            </>
          )}
        </p>
        {saveMode === 'delete' ? (
          <Button
            onClick={handleDelete}
            disabled={isDeleteDisabled}
            variant="destructive"
            className="min-w-[150px]"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Playlist'
            )}
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={isSaveDisabled} className="min-w-[150px]">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : saveMode === 'update' ? (
              'Finalize Update'
            ) : (
              'Save to Spotify'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
