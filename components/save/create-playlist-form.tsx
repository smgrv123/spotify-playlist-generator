'use client';

import { AlertCircle, Loader2 } from 'lucide-react';

import { PlaylistMetaFields } from '@/components/playlist/playlist-meta-fields';
import { SaveSuccessState } from '@/components/save/save-success-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSavePlaylist } from '@/hooks/use-save-playlist';
import { VISIBILITY, type Visibility } from '@/lib/constants';
import { getErrorMessage, isFailed, isResolved } from '@/lib/type-guards';
import type { FailedTrack, ResolvedTrack } from '@/lib/types';

interface CreatePlaylistFormProps {
  /** Accepts the mixed draft track array and filters internally. */
  tracks: (ResolvedTrack | FailedTrack)[];
  name: string;
  onNameChange: (name: string) => void;
  visibility: Visibility;
  onVisibilityChange: (visibility: Visibility) => void;
  /** "Build another" CTA on the success state — resets the shell's Draft. */
  onBuildAnother: () => void;
}

/**
 * The builder's publish step: name + visibility, then a single write that
 * creates a brand-new Spotify playlist from the draft's resolved tracks.
 *
 * Owns its own card wrapper (eyebrow + heading), matching the pattern
 * `TrackPasteForm` and the refine-step section use. Editing, renaming and
 * deleting an existing playlist live on `/playlists` and `/playlists/[id]`,
 * so this step is create-only and carries no mode switch.
 */
export function CreatePlaylistForm({
  tracks,
  name,
  onNameChange,
  visibility,
  onVisibilityChange,
  onBuildAnother,
}: CreatePlaylistFormProps) {
  const {
    mutate: savePlaylist,
    isPending: isSaving,
    error: saveError,
    data: saveData,
  } = useSavePlaylist();

  const resolvedTracks = tracks.filter(isResolved);
  const failedTracks = tracks.filter(isFailed);
  const uris = resolvedTracks.map((track) => track.spotifyUri);

  const isSaveDisabled = isSaving || !name.trim() || uris.length === 0;

  const handleSave = () => {
    if (isSaveDisabled) return;
    savePlaylist({
      playlistName: name.trim(),
      uris,
      isPublic: visibility === VISIBILITY.PUBLIC,
    });
  };

  if (saveData) {
    return (
      <SaveSuccessState
        heading="Playlist saved!"
        subtext={`"${name}" • ${resolvedTracks.length} track${resolvedTracks.length === 1 ? '' : 's'}`}
        coverTracks={resolvedTracks}
        openUrl={`https://open.spotify.com/playlist/${saveData.playlistId}`}
        onBuildAnother={onBuildAnother}
      />
    );
  }

  return (
    <section className="rounded-[var(--radius-lg)] border bg-surface p-6 shadow-card sm:p-8">
      <p className="label-text text-[11px] font-semibold uppercase text-accent-strong">
        Step 03 — Publish
      </p>
      <h2 className="display-text mt-1.5 text-[clamp(22px,3vw,28px)] leading-tight text-foreground">
        Save to Spotify
      </h2>
      <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
        Name your playlist and save your {resolvedTracks.length} resolved track
        {resolvedTracks.length === 1 ? '' : 's'}.
      </p>

      <div className="mt-6 animate-in fade-in">
        <PlaylistMetaFields
          name={name}
          onNameChange={onNameChange}
          visibility={visibility}
          onVisibilityChange={onVisibilityChange}
          disabled={isSaving}
          idPrefix="save"
        />
      </div>

      {failedTracks.length > 0 && (
        <Alert
          variant="default"
          className="mt-5 border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-400"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {failedTracks.length} unresolved track{failedTracks.length === 1 ? '' : 's'} will be
            skipped.
          </AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive" className="mt-5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{getErrorMessage(saveError)}</AlertDescription>
        </Alert>
      )}

      <div className="my-6 h-px bg-border" aria-hidden />

      <div className="flex items-center justify-between gap-4">
        <p className="text-[13px] text-muted-foreground">
          {uris.length} track{uris.length === 1 ? '' : 's'} will be saved.
        </p>
        <Button onClick={handleSave} disabled={isSaveDisabled} className="min-w-[150px]">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            'Save to Spotify'
          )}
        </Button>
      </div>
    </section>
  );
}
