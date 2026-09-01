'use client';

import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { PlaylistConflictAlert } from '@/components/playlist/playlist-conflict-alert';
import { PlaylistDetailHeader } from '@/components/playlist/playlist-detail-header';
import { PlaylistTrackEditor } from '@/components/playlist/playlist-track-editor';
import { UnsavedChangesBar } from '@/components/playlist/unsaved-changes-bar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useDeletePlaylist } from '@/hooks/use-delete-playlist';
import { usePlaylistDetail } from '@/hooks/use-playlist-detail';
import { usePlaylistEditor } from '@/hooks/use-playlist-editor';
import { usePlaylistTracks } from '@/hooks/use-playlist-tracks';
import { getErrorMessage } from '@/lib/type-guards';

/**
 * The `/playlists/[id]` editor: server tracks in order, drag-to-reorder,
 * per-row removal, rename, visibility, delete — all of it **deferred**.
 *
 * Every mutation except delete edits local state only. A sticky
 * `UnsavedChangesBar` reports the pending diff and offers Discard / Save; one
 * Save writes the full ordered URI list back through the existing save
 * endpoint in `replace` mode, so no new Spotify write path is needed.
 *
 * This component is the rendering shell: the edit state machine (local rows,
 * the pending diff against a captured baseline, the conflict rule, and the
 * Save mutation) lives in `hooks/use-playlist-editor.ts`.
 */
export function PlaylistDetail({ playlistId }: { playlistId: string }) {
  const router = useRouter();

  const { detail, isLoading: isLoadingDetail, error: detailError } = usePlaylistDetail(playlistId);
  const {
    tracks: serverTracks,
    skippedCount,
    isLoading: isLoadingTracks,
    error: tracksError,
  } = usePlaylistTracks(playlistId);
  const { mutate: deletePlaylist, isPending: isDeleting, error: deleteError } = useDeletePlaylist();

  const editor = usePlaylistEditor(playlistId, detail, serverTracks);

  const handleDelete = () => {
    deletePlaylist({ playlistId }, { onSuccess: () => router.push('/playlists') });
  };

  if (detailError) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{getErrorMessage(detailError)}</AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link href="/playlists">Back to playlists</Link>
        </Button>
      </div>
    );
  }

  if (isLoadingDetail || !detail) {
    return (
      <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface-2 px-5 py-10 text-[13px] text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading playlist…
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Link
        href="/playlists"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All playlists
      </Link>

      {/* Rendered above everything, and independently of the unsaved-changes
          bar: a conflict outlives the pending diff that raised it (the user can
          undo their edits by hand), and while it stands the page is showing
          data the editor already knows is out of date. */}
      {editor.hasConflict && (
        <PlaylistConflictAlert onReload={editor.discard} isSaving={editor.isSaving} />
      )}

      <PlaylistDetailHeader
        detail={detail}
        name={editor.name}
        onNameChange={editor.setName}
        isPublic={editor.isPublic}
        onIsPublicChange={editor.setIsPublic}
        isSaving={editor.isSaving}
        onDelete={handleDelete}
        isDeleting={isDeleting}
        deleteError={deleteError}
      />

      <PlaylistTrackEditor
        rows={editor.rows}
        isLoading={isLoadingTracks}
        error={tracksError}
        skippedCount={skippedCount}
        onReorder={editor.reorder}
        onRemove={editor.remove}
        onAddTracks={editor.addTracks}
        isSaving={editor.isSaving}
      />

      {editor.diff.total > 0 && (
        <UnsavedChangesBar
          diff={editor.diff}
          onDiscard={editor.discard}
          onSave={editor.save}
          isSaving={editor.isSaving}
          canSave={editor.canSave}
          isBlockedByConflict={editor.hasConflict}
          saveError={editor.saveError}
        />
      )}
    </div>
  );
}
