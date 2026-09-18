import { PlaylistDetail } from '@/components/playlist/playlist-detail';

/**
 * Playlist detail route. Chrome (TopBar + page container) comes from
 * `app/playlists/layout.tsx` and the auth gate lives there too, so this file
 * renders content only — a thin server shell around the client-side
 * `PlaylistDetail`, which owns the fetches, the deferred-edit state and its
 * loading/error states.
 *
 * Next.js 16 hands route params to pages as a Promise, hence the `await`.
 */
export default async function PlaylistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <PlaylistDetail playlistId={id} />;
}
