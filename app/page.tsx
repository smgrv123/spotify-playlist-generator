import { redirect } from 'next/navigation';
import { PlaylistBuilder } from '@/components/playlist-builder';
import { TopBar } from '@/components/top-bar';
import { getSpotifyTokens } from '@/lib/cookies';

export default async function Home() {
  // Server-side gate: route unauthenticated traffic to /login before any builder
  // markup is sent to the client. No client-side flash.
  const tokens = await getSpotifyTokens();
  if (!tokens.accessToken && !tokens.refreshToken) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-11 sm:py-14">
        {/* PlaylistBuilder is unrestyled in this phase — it continues to render
            its existing three-card stack. Phase 3+ will replace it. */}
        <PlaylistBuilder />
      </main>
    </div>
  );
}
