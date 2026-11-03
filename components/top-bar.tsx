import { BrandMark } from '@/components/brand-mark';
import { MainNav } from '@/components/main-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserChip } from '@/components/user-chip';

/**
 * Sticky app-wide top bar.
 *
 * Brand mark and primary navigation on the left; theme toggle and (when
 * authenticated) the user chip on the right. The nav and the chip are client
 * subcomponents so the surrounding bar can stay a server component. Rendered
 * by `/` (builder), `/playlists` and `/login` — on `/login` both `MainNav` and
 * `UserChip` render nothing because there is no session to navigate with.
 */
export function TopBar() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-border bg-glass px-5 py-4 sm:px-11">
      <div className="flex items-center gap-4 sm:gap-7">
        <BrandMark />
        <MainNav />
      </div>
      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        <UserChip />
      </div>
    </header>
  );
}
