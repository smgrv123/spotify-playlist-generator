import { redirect } from 'next/navigation';
import { TopBar } from '@/components/top-bar';
import { getSpotifyTokens } from '@/lib/cookies';

/**
 * Shared shell for the playlist management routes (`/playlists` and
 * `/playlists/[id]`).
 *
 * Holds the single server-side auth gate for both routes — identical to the
 * one on `/` — plus the chrome (`TopBar`) and the page container, so the page
 * files below it render only their own content.
 */
export default async function PlaylistsLayout({ children }: { children: React.ReactNode }) {
  // Server-side gate: route unauthenticated traffic to /login before any
  // playlist markup is sent to the client. No client-side flash.
  const tokens = await getSpotifyTokens();
  if (!tokens.accessToken && !tokens.refreshToken) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-11 sm:py-14">{children}</main>
    </div>
  );
}
