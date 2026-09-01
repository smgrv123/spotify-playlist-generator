import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrackCard } from '@/components/track-card';
import type { FailedTrack, ResolvedTrack } from '@/lib/types';
import { isResolved } from '@/lib/type-guards';
import { cn } from '@/lib/utils';

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
  /**
   * Drag-to-reorder support (refine step's resolved-track list). When
   * provided, rows become sortable via a grip handle and this list is wrapped
   * in a dnd-kit `DndContext`. `oldIndex`/`newIndex` are positions within
   * this component's own `tracks` prop — the caller (`BuilderShell`) is
   * responsible for translating that into the full draft's `tracks` array,
   * mirroring how `onRemove` indices are subset-local. Only resolved tracks
   * are ever sortable — omit this prop for unresolved/failed lists.
   */
  onReorder?: (oldIndex: number, newIndex: number) => void;
}

/** Stable per-row id: resolved tracks use their Spotify URI; failed tracks (never sortable) fall back to a positional id. */
function trackId(track: TrackItem, index: number): string {
  return isResolved(track) ? track.spotifyUri : `failed-${index}`;
}

/** Shared row content: leading checkbox (select mode), grip handle (sortable mode), track card, trailing remove button. */
function TrackRowContent({
  cardProps,
  canSelect,
  isSelected,
  onToggle,
  canRemove,
  onRemove,
  sortable,
  dragHandleProps,
}: {
  cardProps: React.ComponentProps<typeof TrackCard>;
  canSelect: boolean;
  isSelected: boolean;
  onToggle: () => void;
  canRemove: boolean;
  onRemove: () => void;
  sortable: boolean;
  dragHandleProps?: {
    attributes: ReturnType<typeof useSortable>['attributes'];
    listeners: ReturnType<typeof useSortable>['listeners'];
  };
}) {
  return (
    <>
      {canSelect && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          onClick={(event) => event.stopPropagation()}
          className="flex-shrink-0"
          aria-label={`Select ${cardProps.title}`}
        />
      )}
      {sortable ? (
        <button
          type="button"
          className="flex h-[30px] w-[18px] flex-shrink-0 cursor-grab touch-none items-center justify-center rounded-[6px] text-text-faint opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
          aria-label={`Reorder ${cardProps.title}`}
          {...dragHandleProps?.attributes}
          {...dragHandleProps?.listeners}
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
      ) : (
        // Grip-handle slot intentionally left empty for non-sortable (unresolved) rows.
        <span className="hidden" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <TrackCard {...cardProps} />
      </div>
      {canRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-[30px] w-[30px] flex-shrink-0 rounded-[8px] text-text-faint opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-danger-soft hover:text-danger"
          onClick={onRemove}
          title="Remove track"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      )}
    </>
  );
}

/** Sortable row wrapper: wires `useSortable` and applies the drag transform. Only ever mounted for resolved tracks. */
function SortableTrackRow({
  id,
  rowClassName,
  ...rowProps
}: {
  id: string;
  rowClassName: string;
} & Omit<React.ComponentProps<typeof TrackRowContent>, 'sortable' | 'dragHandleProps'>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(rowClassName, isDragging && 'z-10 shadow-[var(--shadow-card)]')}
    >
      <TrackRowContent {...rowProps} sortable dragHandleProps={{ attributes, listeners }} />
    </div>
  );
}

export function TrackList({
  tracks,
  onRemove,
  readOnly = false,
  emptyMessage,
  heightClassName = 'h-[400px]',
  selectedUris,
  onToggleSelect,
  onReorder,
}: TrackListProps) {
  const canRemove = Boolean(onRemove) && !readOnly;
  const sortable = Boolean(onReorder) && !readOnly;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (tracks.length === 0) {
    return (
      <div className="h-48 border-2 border-dashed rounded-xl flex items-center justify-center text-muted-foreground bg-muted/10">
        {emptyMessage ?? 'No tracks yet.'}
      </div>
    );
  }

  const ids = tracks.map((track, index) => trackId(track, index));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder?.(oldIndex, newIndex);
  };

  const rows = tracks.map((track, index) => {
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

    const rowClassName = cn(
      'group flex items-center gap-[13px] rounded-[var(--radius-sm)] border py-[9px] px-[11px] transition-colors',
      resolved
        ? 'border-border bg-surface hover:border-border-strong hover:bg-surface-2'
        : 'border-danger/30 bg-danger-soft',
      canSelect && 'cursor-pointer'
    );

    const id = trackId(track, index);
    const rowProps = {
      cardProps,
      canSelect,
      isSelected,
      onToggle: handleToggle,
      canRemove,
      onRemove: () => onRemove?.(index),
    };

    if (sortable && resolved) {
      return <SortableTrackRow key={id} id={id} rowClassName={rowClassName} {...rowProps} />;
    }

    return (
      <div
        key={id}
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
        className={rowClassName}
      >
        <TrackRowContent {...rowProps} sortable={false} />
      </div>
    );
  });

  return (
    <ScrollArea className={cn('w-full rounded-md border p-4', heightClassName)}>
      {sortable ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="space-y-[7px]">{rows}</div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-[7px]">{rows}</div>
      )}
    </ScrollArea>
  );
}
