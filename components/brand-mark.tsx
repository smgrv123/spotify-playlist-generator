import { APP_NAME } from '@/lib/constants';

/**
 * Vibecrafter brand mark — the rounded-square / circle (token-controlled)
 * tile with the animated equalizer bars, plus the wordmark and tag.
 *
 * Shape is driven by --brand-mark-radius (Studio = 11px, Vinyl = 50%).
 * Animation respects prefers-reduced-motion (see globals.css).
 */
export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="brand-mark" aria-hidden>
        <div className="bars">
          {Array.from({ length: 4 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
      </div>
      <div className="leading-tight">
        <div className="display-text text-[20px] text-foreground">{APP_NAME}</div>
        <div className="label-text -mt-0.5 whitespace-nowrap text-[11px] uppercase text-[color:var(--text-faint)]">
          playlist studio
        </div>
      </div>
    </div>
  );
}
