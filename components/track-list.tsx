import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrackCard } from '@/components/track-card';
import type { FailedTrack, ResolvedTrack } from '@/lib/types';
import { isResolved } from '@/lib/type-guards';
import { Trash2 } from 'lucide-react';

type TrackItem = ResolvedTrack | FailedTrack;

interface TrackListProps {
  tracks: TrackItem[];
  onRemove?: (index: number) => void;
  readOnly?: boolean;
  emptyMessage?: string;
}

export function TrackList({ tracks, onRemove, readOnly = false, emptyMessage }: TrackListProps) {
  const canRemove = Boolean(onRemove) && !readOnly;
  if (tracks.length === 0) {
    return (
      <div className="h-48 border-2 border-dashed rounded-xl flex items-center justify-center text-muted-foreground bg-muted/10">
        {emptyMessage ?? 'No tracks yet.'}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
      <div className="space-y-3">
        {tracks.map((track, index) => {
          const resolved = isResolved(track);
          const cardProps = resolved
            ? {
                title: track.displayData.title,
                artist: track.displayData.artist,
                albumContext: track.displayData.albumContext,
                imageUrl: track.displayData.imageUrl,
                isFailed: false,
              }
            : {
                title: track.query.title,
                artist: track.query.artist,
                albumContext: undefined,
                imageUrl: undefined,
                isFailed: true,
              };

          return (
            <div
              key={resolved ? track.spotifyUri : `failed-${index}`}
              className={`flex items-center justify-between p-3 border rounded-lg group transition-colors ${
                resolved
                  ? 'bg-card hover:bg-muted/50'
                  : 'bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900/50'
              }`}
            >
              <div className="flex-1 min-w-0 pr-4">
                <TrackCard {...cardProps} />
              </div>
              {canRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                    resolved
                      ? 'text-muted-foreground hover:text-destructive'
                      : 'text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40'
                  }`}
                  onClick={() => onRemove?.(index)}
                  title="Remove track"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
