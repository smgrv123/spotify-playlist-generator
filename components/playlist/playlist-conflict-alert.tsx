'use client';

import { RefreshCw, TriangleAlert } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface PlaylistConflictAlertProps {
  /** Drops local edits and re-seeds the editor from current server data. */
  onReload: () => void;
  /** Disabled while a write is in flight, so a reload can't race it. */
  isSaving: boolean;
}

/**
 * Shown when the playlist changed on Spotify while the user had unsaved edits.
 *
 * Save writes the *whole* playlist in `replace` mode, so saving on top of a
 * change made elsewhere would delete it. The editor keeps the user's work,
 * blocks Save, and puts the choice here: the only way forward is to drop the
 * local edits and reload.
 */
export function PlaylistConflictAlert({ onReload, isSaving }: PlaylistConflictAlertProps) {
  return (
    <Alert variant="destructive" className="shadow-pop">
      <TriangleAlert className="h-4 w-4" />
      <AlertTitle>This playlist changed on Spotify</AlertTitle>
      <AlertDescription>
        <p>
          It was edited somewhere else — another tab, a collaborator, or a save that only partly
          went through — while you had unsaved changes here. Saving rewrites the whole playlist, so
          it would overwrite that edit. Your changes are still on screen, but saving is paused.
        </p>
        <Button variant="outline" onClick={onReload} disabled={isSaving}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden />
          Discard my changes and reload
        </Button>
      </AlertDescription>
    </Alert>
  );
}
