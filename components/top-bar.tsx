import { BrandMark } from '@/components/brand-mark';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserChip } from '@/components/user-chip';

/**
 * Sticky app-wide top bar.
 *
 * Brand mark on the left; theme toggle and (when authenticated) the user chip
 * on the right. The chip is a client subcomponent so the surrounding bar can
 * stay a server component. Rendered by both `/` (builder) and `/login` — on
 * `/login` `UserChip` renders nothing because there is no session.
 */
export function TopBar() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-border bg-glass px-5 py-4 sm:px-11">
      <BrandMark />
      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        <UserChip />
      </div>
    </header>
  );
}
