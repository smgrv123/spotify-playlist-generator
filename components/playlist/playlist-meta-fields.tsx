'use client';

import { Globe, Lock, type LucideIcon } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { VISIBILITY, type Visibility } from '@/lib/constants';
import { isVisibility } from '@/lib/type-guards';
import { cn } from '@/lib/utils';

interface VisibilityOption {
  value: Visibility;
  label: string;
  icon: LucideIcon;
}

const VISIBILITY_OPTIONS: VisibilityOption[] = [
  { value: VISIBILITY.PRIVATE, label: 'Private', icon: Lock },
  { value: VISIBILITY.PUBLIC, label: 'Public', icon: Globe },
];

interface PlaylistMetaFieldsProps {
  name: string;
  onNameChange: (name: string) => void;
  visibility: Visibility;
  onVisibilityChange: (visibility: Visibility) => void;
  /** Locks both fields while a write is in flight. */
  disabled?: boolean;
  /**
   * Namespace for the generated `id`/`htmlFor` pairs, so two instances can
   * coexist on one page without colliding label targets.
   */
  idPrefix: string;
  nameHint?: string;
}

/**
 * The playlist name + visibility pair: a labelled text input and a two-option
 * segmented radio group.
 *
 * Extracted as its own component because the same pair appears in two places
 * and must stay identical: the detail editor (`PlaylistDetailHeader`) and the
 * builder's publish step (`CreatePlaylistForm`). Both render this; neither
 * keeps a copy.
 *
 * Visibility is expressed as the domain `Visibility` union rather than a
 * boolean: it is the repo's single source of truth for the value, and the
 * radio group needs string values regardless. Callers holding a boolean
 * (`PlaylistDetail.public`, `SaveRequest.isPublic`) convert at the boundary.
 */
export function PlaylistMetaFields({
  name,
  onNameChange,
  visibility,
  onVisibilityChange,
  disabled = false,
  idPrefix,
  nameHint,
}: PlaylistMetaFieldsProps) {
  const nameInputId = `${idPrefix}-name`;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor={nameInputId} className="block text-[12.5px] font-semibold text-foreground">
          Playlist name
        </Label>
        <Input
          id={nameInputId}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="e.g. Summer Vibes 2026"
          disabled={disabled}
          className="block h-auto w-full rounded-[var(--radius-sm)] border bg-surface-inset px-4 py-3 text-[14.5px] text-foreground placeholder:text-text-faint transition focus-visible:border-primary focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring dark:bg-surface-inset"
        />
        {nameHint && <p className="text-[12.5px] leading-relaxed text-text-faint">{nameHint}</p>}
      </div>

      <div className="space-y-2">
        <Label className="block text-[12.5px] font-semibold text-foreground">Visibility</Label>
        <RadioGroup
          value={visibility}
          onValueChange={(value) => {
            if (isVisibility(value)) onVisibilityChange(value);
          }}
          disabled={disabled}
          aria-label="Visibility"
          className="inline-flex w-full gap-[3px] rounded-[var(--radius-sm)] border bg-surface-2 p-1"
        >
          {VISIBILITY_OPTIONS.map((option) => {
            const isActive = visibility === option.value;
            const Icon = option.icon;
            const inputId = `${idPrefix}-visibility-${option.value}`;
            return (
              <Label
                key={option.value}
                htmlFor={inputId}
                className={cn(
                  'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[calc(var(--radius-sm)-4px)] px-3.5 py-2.5 text-[13px] font-semibold transition-colors',
                  isActive
                    ? 'bg-surface text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                  disabled && 'cursor-not-allowed opacity-50'
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
  );
}
