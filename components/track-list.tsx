import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FailedTrack, ResolvedTrack } from '@/lib/types';
import { AlertCircle, Trash2 } from 'lucide-react';
import Image from 'next/image';

type TrackItem = ResolvedTrack | FailedTrack;

interface TrackListProps {
  tracks: TrackItem[];
  onRemove: (index: number) => void;
}

export function TrackList({ tracks, onRemove }: TrackListProps) {
  if (tracks.length === 0) {
    return (
      <div className="h-48 border-2 border-dashed rounded-xl flex items-center justify-center text-muted-foreground bg-muted/10">
        No tracks yet.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
      <div className="space-y-4">
        {tracks.map((track, index) => {
          if (track.status === 'failed') {
            return (
              <div
                key={`failed-${index}`}
                className="flex items-center justify-between p-3 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 rounded-lg"
              >
                <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      {track.query.title} - {track.query.artist}
                    </span>
                    <span className="text-xs opacity-80">Could not find a match on Spotify</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/50"
                  onClick={() => onRemove(index)}
                  title="Remove track"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          }

          // Resolved Track
          return (
            <div
              key={track.spotifyUri}
              className="flex items-center justify-between p-3 border bg-card hover:bg-muted/50 transition-colors rounded-lg group"
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                {track.displayData.imageUrl ? (
                  <div className="relative h-10 w-10 rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={track.displayData.imageUrl}
                      alt={track.displayData.albumContext || track.displayData.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                    <span className="text-muted-foreground text-xs">No img</span>
                  </div>
                )}
                <div className="flex flex-col min-w-0 pr-4">
                  <span className="font-medium text-sm truncate">{track.displayData.title}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {track.displayData.artist}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(index)}
                title="Remove track"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
