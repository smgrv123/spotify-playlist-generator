'use client';

import { AlertCircle, Loader2, Trash2 } from 'lucide-react';
import Image from 'next/image';

import { PlaylistMetaFields } from '@/components/playlist/playlist-meta-fields';
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
import { VISIBILITY } from '@/lib/constants';
import { coverGradient } from '@/lib/cover-art';
import { getErrorMessage } from '@/lib/type-guards';
import type { PlaylistDetail } from '@/lib/types';

interface PlaylistDetailHeaderProps {
  /** Last-saved server truth: artwork, owner, counts, and the rename baseline. */
  detail: PlaylistDetail;
  /** Pending (unsaved) name and visibility, owned by `PlaylistDetail`. */
  name: string;
  onNameChange: (name: string) => void;
  isPublic: boolean;
  onIsPublicChange: (isPublic: boolean) => void;
  /** Locks the editable fields while a save is in flight. */
  isSaving: boolean;
  onDelete: () => void;
  isDeleting: boolean;
  deleteError: unknown;
}

/**
 * Identity block for the playlist editor: cover art, owner/track summary, the
 * rename + visibility fields, and the (confirmed) delete action.
 *
 * Name and visibility are *deferred* like every other edit on this screen —
 * this component only reports changes upward; nothing here writes to Spotify
 * except Delete, which is immediate and therefore gated behind an
 * `AlertDialog`.
 */
export function PlaylistDetailHeader({
  detail,
  name,
  onNameChange,
  isPublic,
  onIsPublicChange,
  isSaving,
  onDelete,
  isDeleting,
  deleteError,
}: PlaylistDetailHeaderProps) {
  // Title mirrors the pending rename so typing is reflected immediately;
  // a cleared field falls back to the saved name rather than rendering blank.
  const headingName = name.trim() || detail.name;
  const ownerLabel = detail.ownerName ?? detail.ownerId;

  return (
    <section className="rounded-[var(--radius-lg)] border bg-surface p-6 shadow-card sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="relative h-[132px] w-[132px] flex-shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-border shadow-card">
          {detail.imageUrl ? (
            <Image
              src={detail.imageUrl}
              alt={detail.name}
              fill
              sizes="132px"
              className="object-cover"
            />
          ) : (
            // Tailwind can't statically emit the unbounded set of runtime
            // gradient strings `coverGradient` produces, so it goes inline —
            // same pattern as `TrackArt` and the login art strip.
            <div
              className="h-full w-full"
              style={{ background: coverGradient(detail.name) }}
              aria-hidden
            />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-5">
          <div className="min-w-0">
            <p className="label-text text-[11px] font-semibold uppercase text-text-faint">
              Playlist
            </p>
            <h1 className="display-text mt-1 text-[clamp(22px,3vw,28px)] leading-tight break-words text-foreground">
              {headingName}
            </h1>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              {ownerLabel && <span>{ownerLabel}</span>}
              {ownerLabel && detail.trackCount !== null && <span aria-hidden> · </span>}
              {detail.trackCount !== null && (
                <span>
                  {detail.trackCount} track{detail.trackCount === 1 ? '' : 's'}
                </span>
              )}
            </p>
          </div>

          <PlaylistMetaFields
            name={name}
            onNameChange={onNameChange}
            visibility={isPublic ? VISIBILITY.PUBLIC : VISIBILITY.PRIVATE}
            onVisibilityChange={(visibility) => onIsPublicChange(visibility === VISIBILITY.PUBLIC)}
            disabled={isSaving}
            idPrefix="playlist-detail"
            nameHint={
              name.trim().length === 0
                ? "A playlist can't be saved without a name."
                : 'Renames apply when you save.'
            }
          />
        </div>
      </div>

      {deleteError ? (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{getErrorMessage(deleteError)}</AlertDescription>
        </Alert>
      ) : null}

      <div className="my-6 h-px bg-border" aria-hidden />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          Deleting removes this playlist from your library right away.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              disabled={isDeleting || isSaving}
              className="text-danger hover:bg-danger-soft hover:text-danger"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" aria-hidden />
              )}
              {isDeleting ? 'Deleting…' : 'Delete playlist'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete playlist?</AlertDialogTitle>
              <AlertDialogDescription>
                {`"${detail.name}" will be removed from your library. This can't be undone.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              {/* Radix `Slot` concatenates classNames without tailwind-merge, so
                  the danger palette needs `!` to win over the variant's own
                  background/ring utilities. */}
              <AlertDialogAction
                variant="destructive"
                className="bg-danger! text-white! hover:bg-danger/90! focus-visible:border-danger! focus-visible:ring-danger/30!"
                onClick={onDelete}
              >
                Delete playlist
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
