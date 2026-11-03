import { PlaylistLibrary } from '@/components/playlist/playlist-library';

/**
 * Playlist library route. Chrome (TopBar + page container) comes from
 * `app/playlists/layout.tsx` and the auth gate lives there too, so this file
 * renders content only — a thin server shell around the client-side
 * `PlaylistLibrary`, which owns the fetch and its loading/error/empty states.
 */
export default function PlaylistsPage() {
  return <PlaylistLibrary />;
}
