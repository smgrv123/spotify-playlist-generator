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

/**
 * A single playlist from `GET /playlists/{id}`, narrowed by a `fields`
 * projection to the list-item fields plus the snapshot id. `snapshot_id` is
 * optional like the rest of the projected extras: what actually comes back is
 * decided by the caller's `fields` string, not by this type.
 */
export interface SpotifyPlaylistDetailResponse extends SpotifyPlaylistItem {
  snapshot_id?: string;
}

// ─── Playlist Tracks ──────────────────────────────────────────────────────────

export interface PlaylistItemContent {
  type?: 'track' | 'episode' | string;
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

// ─── Save ─────────────────────────────────────────────────────────────────────

export interface SpotifyAddItemsResponse {
  snapshot_id: string;
}
