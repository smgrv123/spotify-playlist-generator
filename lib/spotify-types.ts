/**
 * Shared Spotify API response/request interfaces.
 *
 * Consolidating these here eliminates duplicate interface definitions
 * that previously existed across multiple API routes.
 */

// ─── Search / Resolve ─────────────────────────────────────────────────────────

export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  artists: Array<{ name: string }>;
  album?: {
    name: string;
    images?: Array<{ url: string }>;
  };
}

export interface SpotifySearchResponse {
  tracks?: {
    items?: SpotifyTrack[];
  };
}

// ─── Playlists ────────────────────────────────────────────────────────────────

export interface SpotifyPlaylistItem {
  id: string;
  name: string;
  public: boolean | null;
  description: string | null;
  collaborative?: boolean;
  owner?: { id?: string | null; display_name?: string | null };
  images?: Array<{ url: string }>;
  tracks?: { total: number };
}

export interface SpotifyPlaylistsResponse {
  items?: SpotifyPlaylistItem[];
  next: string | null;
}

// ─── Playlist Writes ──────────────────────────────────────────────────────────

/** Body returned by add-items (POST) and replace-items (PUT) on a playlist. */
export interface SpotifySnapshotResponse {
  snapshot_id: string;
}

// ─── Playlist Tracks ──────────────────────────────────────────────────────────

export interface PlaylistItemContent {
  /** Open-ended Spotify vocabulary (`track`, `episode`, ...); only `track` is kept on read. */
  type?: string;
  id: string;
  name: string;
  uri: string;
  duration_ms?: number;
  artists?: Array<{ name: string }>;
  album?: {
    name: string;
    images?: Array<{ url: string }>;
  };
}

export interface SpotifyPlaylistTracksResponse {
  items?: Array<{
    track?: PlaylistItemContent | null;
    item?: PlaylistItemContent | null;
  }>;
  next: string | null;
}
