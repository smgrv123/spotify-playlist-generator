import { BrandMark } from '@/components/brand-mark';
import { ThemeToggle } from '@/components/theme-toggle';

/**
 * Sticky app-wide top bar.
 *
 * Currently renders the brand mark on the left and the theme toggle on the right.
 * Future phases will extend the right-hand `topbar-actions` slot with the user chip,
 * logout, etc. Rendered by both `/` (builder) and `/login`.
 */
export function TopBar() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-border bg-glass px-5 py-4 sm:px-11">
      <BrandMark />
      <div className="flex items-center gap-2.5">
        <ThemeToggle />
      </div>
    </header>
  );
}
