import Image from 'next/image';
import { Music2 } from 'lucide-react';
import React from 'react';

/**
 * Common prop interface spanning resolved, failed, or standard track shapes.
 */
export interface TrackCardProps {
  title: string;
  artist: string;
  albumContext?: string;
  imageUrl?: string;
  isFailed?: boolean;
}

/**
 * Reusable display component for a single track.
 * Used in lists and search comboboxes to ensure a unified visual design.
 */
export function TrackCard({ title, artist, albumContext, imageUrl, isFailed }: TrackCardProps) {
  return (
    <div className={`flex items-center gap-4 w-full ${isFailed ? 'opacity-80' : ''}`}>
      <div className="relative flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12 bg-muted rounded overflow-hidden flex items-center justify-center">
        {imageUrl ? (
          <Image src={imageUrl} alt={title} fill className="object-cover" />
        ) : (
          <Music2 className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground opacity-50" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm sm:text-base font-medium truncate ${
            isFailed ? 'text-destructive' : 'text-foreground'
          }`}
        >
          {title}
        </p>
        <div className="flex items-center text-xs sm:text-sm text-muted-foreground truncate gap-1.5">
          <span className="truncate max-w-[50%] sm:max-w-none">{artist}</span>
          {albumContext && (
            <>
              <span className="hidden sm:inline opacity-50">•</span>
              <span className="truncate max-w-[40%] sm:max-w-none hidden sm:inline">
                {albumContext}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
