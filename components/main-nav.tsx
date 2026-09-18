'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavLink {
  href: string;
  label: string;
}

const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Build' },
  { href: '/playlists', label: 'Playlists' },
];

/**
 * Primary top-bar navigation between the builder (`/`) and the playlist
 * library (`/playlists`).
 *
 * Links match by prefix so a detail route like `/playlists/<id>` keeps its
 * parent tab lit. Renders nothing on `/login`, which is pre-auth and has
 * nowhere to navigate to.
 */
export function MainNav() {
  const pathname = usePathname();

  if (pathname === '/login') return null;

  return (
    <nav aria-label="Primary" className="flex items-center gap-1">
      {NAV_LINKS.map(({ href, label }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors',
              isActive
                ? 'bg-surface-2 text-foreground'
                : 'text-text-faint hover:bg-surface-2 hover:text-foreground'
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
