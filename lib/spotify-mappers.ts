import type { SpotifyPlaylistItem } from './spotify-types';

export function toPlaylistSummary(playlist: SpotifyPlaylistItem) {
  return {
    id: playlist.id,
    name: playlist.name,
    public: !!playlist.public,
    imageUrl: playlist.images?.[0]?.url || null,
    trackCount: playlist.tracks?.total ?? null,
  };
}
