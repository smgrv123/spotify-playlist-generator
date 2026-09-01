'use client';

import {
  AlertCircle,
  Check,
  CheckCircle,
  ExternalLink,
  Globe,
  Layers,
  Loader2,
  Lock,
  Plus,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrackList } from '@/components/track-list';
import { useDeletePlaylist } from '@/hooks/use-delete-playlist';
import { usePlaylistTracks } from '@/hooks/use-playlist-tracks';
import { usePlaylists, type PlaylistSummary } from '@/hooks/use-playlists';
import { useSavePlaylist } from '@/hooks/use-save-playlist';
import { coverGradient } from '@/lib/cover-art';
import {
  SAVE_MODE,
  UPDATE_MODE,
  VISIBILITY,
  type SaveMode,
  type Visibility,
} from '@/lib/constants';
import { getErrorMessage, isFailed, isResolved } from '@/lib/type-guards';
import type { FailedTrack, ResolvedTrack } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SavePanelProps {
  tracks: (ResolvedTrack | FailedTrack)[]; // Accept mixed track array but filter internally
  name: string;
  onNameChange: (name: string) => void;
  visibility: Visibility;
  onVisibilityChange: (visibility: Visibility) => void;
}

interface ModeOption {
  value: SaveMode;
  title: string;
  description: string;
  icon: LucideIcon;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    value: SAVE_MODE.CREATE,
    title: 'Create new',
    description: 'Make a fresh playlist',
    icon: Plus,
  },
  {
    value: SAVE_MODE.UPDATE,
    title: 'Update existing',
    description: 'Replace a playlist',
    icon: Layers,
  },
  { value: SAVE_MODE.DELETE, title: 'Delete', description: 'Remove from library', icon: Trash2 },
];

interface VisibilityOption {
  value: Visibility;
  label: string;
  icon: LucideIcon;
}

const VISIBILITY_OPTIONS: VisibilityOption[] = [
  { value: VISIBILITY.PRIVATE, label: 'Private', icon: Lock },
  { value: VISIBILITY.PUBLIC, label: 'Public', icon: Globe },
];

interface TargetPlaylistPickerProps {
  playlists: PlaylistSummary[];
  isLoading: boolean;
  error: unknown;
  targetPlaylistId: string;
  onSelect: (id: string) => void;
  disabled: boolean;
  /** Selected-row affordance: accent for Update mode, danger for Delete mode. */
  variant: 'accent' | 'danger';
}

/**
 * Scrollable row list for picking a target playlist — album art derived from
 * the playlist name via `coverGradient`, name, track count, checkmark on the
 * selected row. Shared by Update mode (Phase 10, accent selection) and
 * Delete mode (Phase 11, danger selection) so the row markup lives in one
 * place instead of being duplicated per mode.
 */
function TargetPlaylistPicker({
  playlists,
  isLoading,
  error,
  targetPlaylistId,
  onSelect,
  disabled,
  variant,
}: TargetPlaylistPickerProps) {
  const isDanger = variant === 'danger';

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-border bg-surface-2 px-4 py-6 text-[13px] text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading your playlists…
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{getErrorMessage(error)}</AlertDescription>
      </Alert>
    );
  }

  if (playlists.length === 0) {
    return (
      <p className="rounded-[var(--radius-sm)] border border-dashed border-border bg-surface-2 px-4 py-6 text-[13px] text-muted-foreground">
        No editable playlists found on your account.
      </p>
    );
  }

  return (
    <ScrollArea className="h-[220px] w-full rounded-[var(--radius-sm)]">
      <div className="space-y-2 pr-3">
        {playlists.map((playlist) => {
          const isActive = playlist.id === targetPlaylistId;
          return (
            <button
              key={playlist.id}
              type="button"
              onClick={() => onSelect(playlist.id)}
              disabled={disabled}
              className={cn(
                'flex w-full items-center gap-3 rounded-[var(--radius-sm)] border p-3 text-left transition-colors',
                isActive
                  ? isDanger
                    ? 'border-danger bg-danger-soft shadow-[0_0_0_3px_var(--danger-soft)]'
                    : 'border-primary bg-accent-soft shadow-[0_0_0_3px_var(--ring)]'
                  : 'border-border bg-surface hover:border-border-strong'
              )}
            >
              <div
                className="h-10 w-10 flex-shrink-0 rounded-[8px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
                style={{ background: coverGradient(playlist.name) }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-foreground">
                  {playlist.name}
                </p>
                {playlist.trackCount !== null && (
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {playlist.trackCount} track{playlist.trackCount === 1 ? '' : 's'}
                  </p>
                )}
              </div>
              {isActive && (
                <span
                  className={cn(
                    'grid h-5 w-5 flex-shrink-0 place-items-center rounded-full text-white',
                    isDanger ? 'bg-danger' : 'bg-primary text-accent-contrast'
                  )}
                  aria-hidden
                >
                  <Check className="h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

/**
 * Save-step card, restyled to the Vibecrafter handoff. Owns its own section
 * wrapper (eyebrow + heading), matching the pattern `TrackPasteForm` and the
 * refine-step section established in earlier phases.
 *
 * `mode` is owned locally (not lifted into the shell's `Draft`) — see the
 * `Draft` docstring in `lib/types.ts`, which defers persisting save-step
 * concerns to a later phase. Create and Update modes are wired to the save
 * API; Delete renders a minimal stub body and becomes functional in Phase 11.
 */
export function SavePanel({
  tracks,
  name,
  onNameChange,
  visibility,
  onVisibilityChange,
}: SavePanelProps) {
  const [mode, setMode] = useState<SaveMode>(SAVE_MODE.CREATE);

  // Update mode: target-playlist selection + per-row checkbox selection sets.
  // Legitimate local/derived component state (not data fetching), so it
  // stays as plain useState rather than moving into a hook.
  const [targetPlaylistId, setTargetPlaylistId] = useState('');
  const [currentSelection, setCurrentSelection] = useState<Set<string>>(new Set());
  const [newSelection, setNewSelection] = useState<Set<string>>(new Set());

  const {
    mutate: savePlaylist,
    isPending: isSaving,
    error: saveError,
    data: saveData,
  } = useSavePlaylist();

  const {
    mutate: deletePlaylist,
    isPending: isDeleting,
    error: deleteError,
    data: deleteData,
  } = useDeletePlaylist();

  // Captured at confirm-time so the success message survives the target
  // playlist disappearing from `playlists` once the cache invalidates.
  const [deletedPlaylistName, setDeletedPlaylistName] = useState('');

  const {
    playlists,
    isLoading: isLoadingPlaylists,
    error: playlistsError,
  } = usePlaylists({
    enabled: mode === SAVE_MODE.UPDATE || mode === SAVE_MODE.DELETE,
  });
  const {
    tracks: currentPlaylistTracks,
    isLoading: isLoadingCurrentTracks,
    error: currentTracksError,
  } = usePlaylistTracks(mode === SAVE_MODE.UPDATE ? targetPlaylistId || null : null);

  const resolvedTracks = tracks.filter(isResolved);
  const failedTracks = tracks.filter(isFailed);
  const uris = resolvedTracks.map((track) => track.spotifyUri);

  // Reset the current-tracks selection to "all selected" whenever the target
  // playlist's tracks (re)load. `currentPlaylistTracks` only changes identity
  // on a real data change (TanStack Query's structural sharing keeps the same
  // reference across no-op background refetches), so this doesn't clobber
  // in-progress de-selections. Adjusting state during render (React's
  // documented pattern for "resetting state when a dependency changes")
  // rather than in a useEffect avoids an extra commit + render pass.
  const [syncedCurrentTracks, setSyncedCurrentTracks] = useState<ResolvedTrack[] | null>(null);
  if (syncedCurrentTracks !== currentPlaylistTracks) {
    setSyncedCurrentTracks(currentPlaylistTracks);
    setCurrentSelection(new Set(currentPlaylistTracks.map((track) => track.spotifyUri)));
  }

  // Select all resolved new tracks by default, but preserve prior
  // de-selections when the resolved set changes (e.g. a track was removed
  // back in the refine step) instead of blowing the selection away. Same
  // render-time-adjustment pattern as above, gated to Update mode so
  // switching modes doesn't touch the selection.
  const [syncedNewUris, setSyncedNewUris] = useState<string[] | null>(null);
  if (mode === SAVE_MODE.UPDATE && syncedNewUris !== uris) {
    setSyncedNewUris(uris);
    setNewSelection((prev) => {
      if (uris.length === 0) return new Set();
      if (prev.size === 0) return new Set(uris);

      const previouslyAllSelected = uris.every((uri) => prev.has(uri));
      if (previouslyAllSelected) return new Set(uris);

      const next = new Set<string>();
      uris.forEach((uri) => {
        if (prev.has(uri)) next.add(uri);
      });
      return next;
    });
  }

  // Sync the playlist-name field to the selected target's name so "Update
  // playlist" defaults to renaming-in-place rather than a blank name.
  useEffect(() => {
    if (mode !== SAVE_MODE.UPDATE || !targetPlaylistId) return;
    const selected = playlists.find((playlist) => playlist.id === targetPlaylistId);
    if (selected) onNameChange(selected.name);
  }, [mode, targetPlaylistId, playlists, onNameChange]);

  const selectedCurrentTracks = currentPlaylistTracks.filter((track) =>
    currentSelection.has(track.spotifyUri)
  );
  const selectedNewTracks = resolvedTracks.filter((track) => newSelection.has(track.spotifyUri));
  const finalPreviewTracks = (() => {
    const seen = new Set<string>();
    const merged: ResolvedTrack[] = [];
    [...selectedCurrentTracks, ...selectedNewTracks].forEach((track) => {
      if (seen.has(track.spotifyUri)) return;
      seen.add(track.spotifyUri);
      merged.push(track);
    });
    return merged;
  })();
  const dedupedCount =
    selectedCurrentTracks.length + selectedNewTracks.length - finalPreviewTracks.length;
  const updateUris = finalPreviewTracks.map((track) => track.spotifyUri);

  const allCurrentSelected =
    currentPlaylistTracks.length > 0 &&
    currentPlaylistTracks.every((track) => currentSelection.has(track.spotifyUri));
  const allNewSelected =
    resolvedTracks.length > 0 &&
    resolvedTracks.every((track) => newSelection.has(track.spotifyUri));

  const toggleCurrentTrack = (uri: string) => {
    setCurrentSelection((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) next.delete(uri);
      else next.add(uri);
      return next;
    });
  };
  const toggleNewTrack = (uri: string) => {
    setNewSelection((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) next.delete(uri);
      else next.add(uri);
      return next;
    });
  };
  const toggleAllCurrent = (checked: boolean) => {
    setCurrentSelection(
      checked ? new Set(currentPlaylistTracks.map((track) => track.spotifyUri)) : new Set()
    );
  };
  const toggleAllNew = (checked: boolean) => {
    setNewSelection(checked ? new Set(resolvedTracks.map((track) => track.spotifyUri)) : new Set());
  };

  const isSaveDisabled =
    isSaving ||
    (mode === SAVE_MODE.CREATE
      ? !name.trim() || uris.length === 0
      : !targetPlaylistId || !name.trim() || updateUris.length === 0); // Update mode only — Delete mode uses isDeleteDisabled below.

  // Delete mode: target-playlist selection shared with Update mode's picker
  // (`playlists` is fetched above whenever mode is Update or Delete).
  const selectedTargetPlaylist = playlists.find((playlist) => playlist.id === targetPlaylistId);
  const isDeleteDisabled = isDeleting || !targetPlaylistId;

  const saveSuccessUrl = saveData
    ? `https://open.spotify.com/playlist/${saveData.playlistId}`
    : null;

  const handleSave = () => {
    if (isSaveDisabled) return;

    if (mode === SAVE_MODE.UPDATE) {
      savePlaylist({
        playlistId: targetPlaylistId,
        playlistName: name.trim(),
        uris: updateUris,
        mode: UPDATE_MODE.REPLACE,
      });
      return;
    }

    savePlaylist({
      playlistName: name.trim(),
      uris,
      isPublic: visibility === VISIBILITY.PUBLIC,
    });
  };

  if (saveSuccessUrl) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center animate-in fade-in zoom-in duration-500">
        <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-semibold">Playlist Saved Successfully!</h3>
          <p className="text-sm text-muted-foreground">
            {mode === SAVE_MODE.CREATE
              ? `Created new playlist: ${name}`
              : `Updated playlist: ${name}`}
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

  // Plain/unstyled for now — restyled alongside saveSuccessUrl's block in
  // Phase 12's unified success-state component.
  if (deleteData) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center animate-in fade-in zoom-in duration-500">
        <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-semibold">Playlist deleted</h3>
          <p className="text-sm text-muted-foreground">
            {deletedPlaylistName
              ? `"${deletedPlaylistName}" was removed from your library.`
              : 'The playlist was removed from your library.'}
          </p>
        </div>
      </div>
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
        Choose what to do with your {resolvedTracks.length} resolved track
        {resolvedTracks.length === 1 ? '' : 's'}.
      </p>

      <RadioGroup
        value={mode}
        onValueChange={(value) => setMode(value as SaveMode)}
        aria-label="Save mode"
        className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3"
      >
        {MODE_OPTIONS.map((option) => {
          const isActive = mode === option.value;
          const isDanger = option.value === SAVE_MODE.DELETE;
          const Icon = option.icon;
          const inputId = `save-mode-${option.value}`;
          return (
            <Label
              key={option.value}
              htmlFor={inputId}
              className={cn(
                'flex cursor-pointer flex-col items-start gap-0 rounded-[var(--radius-sm)] border p-4 text-left font-normal transition-colors',
                isActive
                  ? isDanger
                    ? 'border-danger bg-danger-soft shadow-[0_0_0_3px_var(--danger-soft)]'
                    : 'border-primary bg-accent-soft shadow-[0_0_0_3px_var(--ring)]'
                  : 'border-border bg-surface-2 hover:border-border-strong'
              )}
            >
              <RadioGroupItem value={option.value} id={inputId} className="peer sr-only" />
              <span
                className={cn(
                  'mb-2.5 grid h-[34px] w-[34px] place-items-center rounded-[9px] border text-muted-foreground',
                  isActive
                    ? isDanger
                      ? 'border-transparent bg-danger text-white'
                      : 'border-transparent bg-primary text-accent-contrast'
                    : 'border-border bg-surface'
                )}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="text-[14px] font-bold text-foreground">{option.title}</span>
              <span className="mt-[3px] text-[12px] leading-relaxed text-muted-foreground">
                {option.description}
              </span>
            </Label>
          );
        })}
      </RadioGroup>

      <div className="mt-6">
        {mode === SAVE_MODE.CREATE && (
          <div className="space-y-5 animate-in fade-in">
            <div className="space-y-2">
              <Label
                htmlFor="save-playlist-name"
                className="block text-[12.5px] font-semibold text-foreground"
              >
                Playlist name
              </Label>
              <Input
                id="save-playlist-name"
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="e.g. Summer Vibes 2026"
                disabled={isSaving}
                className="block h-auto w-full rounded-[var(--radius-sm)] border bg-surface-inset px-4 py-3 text-[14.5px] text-foreground placeholder:text-text-faint transition focus-visible:border-primary focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring dark:bg-surface-inset"
              />
            </div>

            <div className="space-y-2">
              <Label className="block text-[12.5px] font-semibold text-foreground">
                Visibility
              </Label>
              <RadioGroup
                value={visibility}
                onValueChange={(value) => onVisibilityChange(value as Visibility)}
                disabled={isSaving}
                aria-label="Visibility"
                className="inline-flex w-full gap-[3px] rounded-[var(--radius-sm)] border bg-surface-2 p-1"
              >
                {VISIBILITY_OPTIONS.map((option) => {
                  const isActive = visibility === option.value;
                  const Icon = option.icon;
                  const inputId = `save-visibility-${option.value}`;
                  return (
                    <Label
                      key={option.value}
                      htmlFor={inputId}
                      className={cn(
                        'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[calc(var(--radius-sm)-4px)] px-3.5 py-2.5 text-[13px] font-semibold transition-colors',
                        isActive
                          ? 'bg-surface text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                        isSaving && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      <RadioGroupItem value={option.value} id={inputId} className="peer sr-only" />
                      <Icon className="h-[15px] w-[15px]" aria-hidden />
                      {option.label}
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>
          </div>
        )}

        {mode === SAVE_MODE.UPDATE && (
          <div className="space-y-5 animate-in fade-in">
            <div className="space-y-2">
              <Label
                htmlFor="update-playlist-name"
                className="block text-[12.5px] font-semibold text-foreground"
              >
                Playlist name
              </Label>
              <Input
                id="update-playlist-name"
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="Pick a playlist below to load its name"
                disabled={isSaving || !targetPlaylistId}
                className="block h-auto w-full rounded-[var(--radius-sm)] border bg-surface-inset px-4 py-3 text-[14.5px] text-foreground placeholder:text-text-faint transition focus-visible:border-primary focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring dark:bg-surface-inset"
              />
            </div>

            <div className="space-y-2">
              <Label className="block text-[12.5px] font-semibold text-foreground">
                Target playlist
              </Label>
              <TargetPlaylistPicker
                playlists={playlists}
                isLoading={isLoadingPlaylists}
                error={playlistsError}
                targetPlaylistId={targetPlaylistId}
                onSelect={setTargetPlaylistId}
                disabled={isSaving}
                variant="accent"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[12.5px] font-semibold text-foreground">
                  Current tracks ({currentPlaylistTracks.length})
                </Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all-current"
                    checked={allCurrentSelected}
                    onCheckedChange={(checked) => toggleAllCurrent(checked === true)}
                    disabled={currentPlaylistTracks.length === 0}
                  />
                  <Label
                    htmlFor="select-all-current"
                    className="cursor-pointer text-[12px] font-normal text-muted-foreground"
                  >
                    Select all
                  </Label>
                </div>
              </div>
              {isLoadingCurrentTracks ? (
                <div className="flex h-[220px] items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-border bg-surface-2 text-[13px] text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading current tracks…
                </div>
              ) : currentTracksError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{getErrorMessage(currentTracksError)}</AlertDescription>
                </Alert>
              ) : (
                <TrackList
                  tracks={currentPlaylistTracks}
                  readOnly
                  heightClassName="h-[220px]"
                  selectedUris={currentSelection}
                  onToggleSelect={toggleCurrentTrack}
                  emptyMessage={
                    targetPlaylistId
                      ? 'This playlist has no tracks yet.'
                      : 'Pick a target playlist above to see its tracks.'
                  }
                />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[12.5px] font-semibold text-foreground">
                  New tracks ({resolvedTracks.length})
                </Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all-new"
                    checked={allNewSelected}
                    onCheckedChange={(checked) => toggleAllNew(checked === true)}
                    disabled={resolvedTracks.length === 0}
                  />
                  <Label
                    htmlFor="select-all-new"
                    className="cursor-pointer text-[12px] font-normal text-muted-foreground"
                  >
                    Select all
                  </Label>
                </div>
              </div>
              <TrackList
                tracks={resolvedTracks}
                readOnly
                heightClassName="h-[220px]"
                selectedUris={newSelection}
                onToggleSelect={toggleNewTrack}
                emptyMessage="Resolve tracks in the previous step to include them here."
              />
            </div>
          </div>
        )}

        {mode === SAVE_MODE.DELETE && (
          <div className="space-y-5 animate-in fade-in">
            <div className="space-y-2">
              <Label className="block text-[12.5px] font-semibold text-foreground">
                Target playlist
              </Label>
              <TargetPlaylistPicker
                playlists={playlists}
                isLoading={isLoadingPlaylists}
                error={playlistsError}
                targetPlaylistId={targetPlaylistId}
                onSelect={setTargetPlaylistId}
                disabled={isDeleting}
                variant="danger"
              />
            </div>

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {"Deleting removes this playlist from your library. This can't be undone."}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>

      {mode === SAVE_MODE.CREATE && failedTracks.length > 0 && (
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

      {deleteError && (
        <Alert variant="destructive" className="mt-5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{getErrorMessage(deleteError)}</AlertDescription>
        </Alert>
      )}

      <div className="my-6 h-px bg-border" aria-hidden />

      <div className="flex items-center justify-between gap-4">
        <p className="text-[13px] text-muted-foreground">
          {mode === SAVE_MODE.CREATE ? (
            `${uris.length} track${uris.length === 1 ? '' : 's'} will be saved.`
          ) : mode === SAVE_MODE.UPDATE ? (
            <>
              {finalPreviewTracks.length} track{finalPreviewTracks.length === 1 ? '' : 's'} will be
              saved.
              {dedupedCount > 0 && (
                <span className="ml-1 text-amber-600 dark:text-amber-400">
                  ({dedupedCount} duplicate{dedupedCount === 1 ? '' : 's'} removed)
                </span>
              )}
            </>
          ) : selectedTargetPlaylist ? (
            `"${selectedTargetPlaylist.name}" will be permanently deleted.`
          ) : (
            'Select a playlist to delete.'
          )}
        </p>
        {mode === SAVE_MODE.DELETE ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={isDeleteDisabled}
                className="min-w-[150px] bg-danger text-white hover:bg-danger/90 focus-visible:border-danger focus-visible:ring-danger/30"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Deleting…
                  </>
                ) : (
                  'Delete playlist'
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete playlist?</AlertDialogTitle>
                <AlertDialogDescription>
                  {selectedTargetPlaylist
                    ? `"${selectedTargetPlaylist.name}" will be removed from your library. This can't be undone.`
                    : "This playlist will be removed from your library. This can't be undone."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  className="bg-danger! text-white! hover:bg-danger/90! focus-visible:border-danger! focus-visible:ring-danger/30!"
                  onClick={() => {
                    setDeletedPlaylistName(selectedTargetPlaylist?.name ?? '');
                    deletePlaylist({ playlistId: targetPlaylistId });
                  }}
                >
                  Delete playlist
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button onClick={handleSave} disabled={isSaveDisabled} className="min-w-[150px]">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : mode === SAVE_MODE.UPDATE ? (
              'Update playlist'
            ) : (
              'Save to Spotify'
            )}
          </Button>
        )}
      </div>
    </section>
  );
}
