'use client';

import { LogOut } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useLogout } from '@/hooks/use-logout';
import { useSession } from '@/hooks/use-session';

/**
 * Pill-shaped chip showing the authenticated Spotify user's avatar and
 * display name. Renders nothing when no profile is available (logged out,
 * `/v1/me` failure, or session still loading) — the top bar slot collapses
 * gracefully in that case.
 *
 * Avatar uses `next/image`; when Spotify returns no image we render the
 * derived initials over a soft accent gradient as the visual fallback.
 */
export function UserChip() {
  const { user } = useSession();
  const logout = useLogout();

  if (!user) return null;

  return (
    <>
      <div
        className="flex items-center gap-2.5 rounded-full border border-border bg-surface-2 py-1 pl-1 pr-3 transition-colors hover:border-border-strong"
        title={user.displayName}
      >
        <div className="relative grid h-[30px] w-[30px] place-items-center overflow-hidden rounded-full bg-accent-soft text-[12px] font-bold text-accent-foreground">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.displayName}
              width={30}
              height={30}
              className="h-full w-full object-cover"
            />
          ) : (
            <span aria-hidden>{user.initials}</span>
          )}
        </div>
        <span className="text-[13px] font-semibold text-foreground">{user.displayName}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        aria-label="Log out"
        title="Log out"
      >
        <LogOut aria-hidden />
      </Button>
    </>
  );
}
