'use client';

import {
  AlertCircle,
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
import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_ROUTES, SAVE_MODE, VISIBILITY, type SaveMode, type Visibility } from '@/lib/constants';
import { getErrorMessage, isApiErrorShape, isFailed, isResolved } from '@/lib/type-guards';
import type { FailedTrack, ResolvedTrack, SaveRequest, SaveResponse } from '@/lib/types';
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

/**
 * Save-step card, restyled to the Vibecrafter handoff. Owns its own section
 * wrapper (eyebrow + heading), matching the pattern `TrackPasteForm` and the
 * refine-step section established in earlier phases.
 *
 * `mode` is owned locally (not lifted into the shell's `Draft`) — see the
 * `Draft` docstring in `lib/types.ts`, which defers persisting save-step
 * concerns to a later phase. Only Create mode is wired to the save API in
 * this phase; Update and Delete render minimal stub bodies and become
 * functional in Phases 10 and 11.
 */
export function SavePanel({
  tracks,
  name,
  onNameChange,
  visibility,
  onVisibilityChange,
}: SavePanelProps) {
  const [mode, setMode] = useState<SaveMode>(SAVE_MODE.CREATE);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessUrl, setSaveSuccessUrl] = useState<string | null>(null);

  const resolvedTracks = tracks.filter(isResolved);
  const failedTracks = tracks.filter(isFailed);
  const uris = resolvedTracks.map((track) => track.spotifyUri);

  const isSaveDisabled = mode !== SAVE_MODE.CREATE || isSaving || !name.trim() || uris.length === 0;

  const handleSave = async () => {
    if (isSaveDisabled) return;

    setIsSaving(true);
    setSaveError(null);

    const payload: SaveRequest = {
      playlistName: name.trim(),
      uris,
      isPublic: visibility === VISIBILITY.PUBLIC,
    };

    try {
      const res = await fetch(API_ROUTES.SPOTIFY_PLAYLIST_SAVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data: unknown = await res.json();

      if (!res.ok) {
        throw new Error(isApiErrorShape(data) ? data.message : 'Failed to save to Spotify');
      }

      setSaveSuccessUrl(`https://open.spotify.com/playlist/${(data as SaveResponse).playlistId}`);
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
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

      <div
        role="radiogroup"
        aria-label="Save mode"
        className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3"
      >
        {MODE_OPTIONS.map((option) => {
          const isActive = mode === option.value;
          const isDanger = option.value === SAVE_MODE.DELETE;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setMode(option.value)}
              className={cn(
                'flex flex-col items-start rounded-[var(--radius-sm)] border p-4 text-left transition-colors',
                isActive
                  ? isDanger
                    ? 'border-danger bg-danger-soft shadow-[0_0_0_3px_var(--danger-soft)]'
                    : 'border-primary bg-accent-soft shadow-[0_0_0_3px_var(--ring)]'
                  : 'border-border bg-surface-2 hover:border-border-strong'
              )}
            >
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
            </button>
          );
        })}
      </div>

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
              <div
                role="radiogroup"
                aria-label="Visibility"
                className="inline-flex w-full gap-[3px] rounded-[var(--radius-sm)] border bg-surface-2 p-1"
              >
                {VISIBILITY_OPTIONS.map((option) => {
                  const isActive = visibility === option.value;
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      disabled={isSaving}
                      onClick={() => onVisibilityChange(option.value)}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--radius-sm)-4px)] px-3.5 py-2.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                        isActive
                          ? 'bg-surface text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="h-[15px] w-[15px]" aria-hidden />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {mode === SAVE_MODE.UPDATE && (
          <div className="animate-in fade-in rounded-[var(--radius-sm)] border border-dashed border-border bg-surface-2 px-5 py-10 text-center">
            <Layers className="mx-auto h-6 w-6 text-text-faint" aria-hidden />
            <p className="mt-3 text-[13.5px] font-semibold text-foreground">
              Updating playlists is coming soon
            </p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              This mode will let you replace the contents of an existing playlist.
            </p>
          </div>
        )}

        {mode === SAVE_MODE.DELETE && (
          <div className="animate-in fade-in rounded-[var(--radius-sm)] border border-dashed border-danger/40 bg-danger-soft px-5 py-10 text-center">
            <Trash2 className="mx-auto h-6 w-6 text-danger" aria-hidden />
            <p className="mt-3 text-[13.5px] font-semibold text-foreground">
              Deleting playlists is coming soon
            </p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              This mode will let you permanently remove a playlist from your library.
            </p>
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
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <div className="my-6 h-px bg-border" aria-hidden />

      <div className="flex items-center justify-between gap-4">
        <p className="text-[13px] text-muted-foreground">
          {mode === SAVE_MODE.CREATE
            ? `${uris.length} track${uris.length === 1 ? '' : 's'} will be saved.`
            : mode === SAVE_MODE.UPDATE
              ? 'Update mode is coming soon.'
              : 'Delete mode is coming soon.'}
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
