import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrackCard } from '@/components/track-card';
import type { FailedTrack, ResolvedTrack } from '@/lib/types';
import { isResolved } from '@/lib/type-guards';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

type TrackItem = ResolvedTrack | FailedTrack;

interface TrackListProps {
  tracks: TrackItem[];
  onRemove?: (index: number) => void;
  readOnly?: boolean;
  emptyMessage?: string;
  /** Overrides the default fixed `h-[400px]` viewport — e.g. a shorter list nested in a longer form. */
  heightClassName?: string;
  /**
   * Selection-mode support (save step's Update-mode checkbox lists). When
   * both are provided, each resolved row renders a leading checkbox and the
   * whole row becomes clickable to toggle it — mutually exclusive with
   * `onRemove` in practice, since callers use one mode or the other.
   */
  selectedUris?: Set<string>;
  onToggleSelect?: (uri: string) => void;
}

export function TrackList({
  tracks,
  onRemove,
  readOnly = false,
  emptyMessage,
  heightClassName = 'h-[400px]',
  selectedUris,
  onToggleSelect,
}: TrackListProps) {
  const canRemove = Boolean(onRemove) && !readOnly;
  if (tracks.length === 0) {
    return (
      <div className="h-48 border-2 border-dashed rounded-xl flex items-center justify-center text-muted-foreground bg-muted/10">
        {emptyMessage ?? 'No tracks yet.'}
      </div>
    );
  }

  return (
    <ScrollArea className={cn('w-full rounded-md border p-4', heightClassName)}>
      <div className="space-y-[7px]">
        {tracks.map((track, index) => {
          const resolved = isResolved(track);
          const canSelect = Boolean(onToggleSelect) && resolved;
          const isSelected = resolved ? (selectedUris?.has(track.spotifyUri) ?? false) : false;
          const cardProps = resolved
            ? {
                title: track.displayData.title,
                artist: track.displayData.artist,
                albumContext: track.displayData.albumContext,
                imageUrl: track.displayData.imageUrl,
                isFailed: false,
                durationMs: track.durationMs,
              }
            : {
                title: track.query.title,
                artist: track.query.artist,
                albumContext: undefined,
                imageUrl: undefined,
                isFailed: true,
                durationMs: undefined,
              };

          const handleToggle = () => {
            if (resolved) onToggleSelect?.(track.spotifyUri);
          };

          return (
            <div
              key={resolved ? track.spotifyUri : `failed-${index}`}
              role={canSelect ? 'button' : undefined}
              tabIndex={canSelect ? 0 : undefined}
              onClick={canSelect ? handleToggle : undefined}
              onKeyDown={
                canSelect
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleToggle();
                      }
                    }
                  : undefined
              }
              className={cn(
                'group flex items-center gap-[13px] rounded-[var(--radius-sm)] border py-[9px] px-[11px] transition-colors',
                resolved
                  ? 'border-border bg-surface hover:border-border-strong hover:bg-surface-2'
                  : 'border-danger/30 bg-danger-soft',
                canSelect && 'cursor-pointer'
              )}
            >
              {canSelect && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={handleToggle}
                  onClick={(event) => event.stopPropagation()}
                  className="flex-shrink-0"
                  aria-label={`Select ${cardProps.title}`}
                />
              )}
              {/* Grip-handle slot intentionally left empty — Phase 13 wires drag-to-reorder. */}
              <div className="min-w-0 flex-1">
                <TrackCard {...cardProps} />
              </div>
              {canRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-[30px] w-[30px] flex-shrink-0 rounded-[8px] text-text-faint opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-danger-soft hover:text-danger"
                  onClick={() => onRemove?.(index)}
                  title="Remove track"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
