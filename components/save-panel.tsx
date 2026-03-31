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
import type { FailedTrack, ResolvedTrack } from '@/lib/types';
import { CheckCircle, ExternalLink, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SavePanelProps {
  tracks: (ResolvedTrack | FailedTrack)[]; // Accept mixed track array but filter internally
  suggestedName: string;
}

interface SpotifyPlaylistMeta {
  id: string;
  name: string;
}

export function SavePanel({ tracks, suggestedName }: SavePanelProps) {
  const [saveMode, setSaveMode] = useState<'create' | 'update'>('create');
  const [playlistName, setPlaylistName] = useState(suggestedName);
  const [targetPlaylistId, setTargetPlaylistId] = useState<string>('');

  const [userPlaylists, setUserPlaylists] = useState<SpotifyPlaylistMeta[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessUrl, setSaveSuccessUrl] = useState<string | null>(null);

  // Keep internal name completely synced with suggestions until edited
  useEffect(() => {
    if (!saveSuccessUrl) {
      setPlaylistName(suggestedName);
    }
  }, [suggestedName, saveSuccessUrl]);

  // Load playlists when switching to update mode
  useEffect(() => {
    if (saveMode === 'update' && userPlaylists.length === 0) {
      const fetchPlaylists = async () => {
        setIsLoadingPlaylists(true);
        try {
          const res = await fetch('/api/spotify/playlists');
          if (res.ok) {
            const data = await res.json();
            setUserPlaylists(data.items);
            if (data.items.length > 0) {
              setTargetPlaylistId(data.items[0].id);
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

  const validUris = tracks
    .filter((t) => t.status === 'resolved')
    .map((t) => (t as ResolvedTrack).spotifyUri);

  const handleSave = async () => {
    if (validUris.length === 0) return;
    if (saveMode === 'create' && !playlistName.trim()) return;
    if (saveMode === 'update' && !targetPlaylistId) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccessUrl(null);

    const payload = {
      playlistName: playlistName.trim() || 'My AI Playlist',
      uris: validUris,
      ...(saveMode === 'update' ? { playlistId: targetPlaylistId, mode: 'replace' } : {}),
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

      setSaveSuccessUrl(`https://open.spotify.com/playlist/${data.playlistId}`);
    } catch (err) {
      const e = err as Error;
      setSaveError(e.message || 'An unexpected error occurred during save.');
    } finally {
      setIsSaving(false);
    }
  };

  const isSaveDisabled =
    isSaving ||
    validUris.length === 0 ||
    (saveMode === 'create' && !playlistName.trim()) ||
    (saveMode === 'update' && !targetPlaylistId);

  // Success State Override
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
              : 'Replaced contents of existing playlist.'}
          </p>
        </div>
        <Button
          asChild
          className="mt-4 bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold rounded-full px-8"
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
        onValueChange={(val) => setSaveMode(val as 'create' | 'update')}
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
            Replace Existing Playlist
          </Label>
        </div>
      </RadioGroup>

      <div className="space-y-4 p-4 bg-muted/20 border rounded-lg">
        {saveMode === 'create' ? (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
            <Label htmlFor="save-name">New Playlist Name</Label>
            <Input
              id="save-name"
              placeholder="E.g., Summer Vibes 2026..."
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              disabled={isSaving}
            />
          </div>
        ) : (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
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
        )}
      </div>

      {saveError && (
        <div className="text-sm text-red-500 font-medium p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-900 animate-in fade-in slide-in-from-bottom-2">
          {saveError}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {validUris.length} {validUris.length === 1 ? 'track' : 'tracks'} will be saved.
          {tracks.length > validUris.length && (
            <span className="text-amber-600 dark:text-amber-400 ml-1">
              ({tracks.length - validUris.length} unresolved skipped)
            </span>
          )}
        </p>
        <Button onClick={handleSave} disabled={isSaveDisabled} className="min-w-[150px]">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save to Spotify'
          )}
        </Button>
      </div>
    </div>
  );
}
