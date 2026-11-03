import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/lib/spotify-client', () => ({ spotifyClient: mocks }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const NEXT_PAGE_URL = 'https://api.spotify.com/v1/me/playlists?offset=50&limit=50';

const playlist = (id: string, ownerId: string, collaborative = false) => ({
  id,
  name: `Playlist ${id}`,
  public: true,
  description: '',
  collaborative,
  owner: { id: ownerId },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/spotify/playlists', () => {
  it('follows next across pages and keeps only owned or collaborative playlists', async () => {
    const owned = playlist('pl-owned', 'me');
    const notMine = playlist('pl-other', 'someone-else');
    const collab = playlist('pl-collab', 'someone-else', true);
    const notMine2 = playlist('pl-other-2', 'someone-else-2');

    mocks.get.mockImplementation(async (endpoint: string) => {
      if (endpoint === '/me') return { id: 'me' };
      if (endpoint === '/me/playlists?limit=50') {
        return { items: [owned, notMine], next: NEXT_PAGE_URL };
      }
      if (endpoint === NEXT_PAGE_URL) return { items: [collab, notMine2], next: null };
      throw new Error(`unexpected endpoint ${endpoint}`);
    });

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      playlists: [
        {
          id: 'pl-owned',
          name: 'Playlist pl-owned',
          public: true,
          imageUrl: null,
          trackCount: null,
        },
        {
          id: 'pl-collab',
          name: 'Playlist pl-collab',
          public: true,
          imageUrl: null,
          trackCount: null,
        },
      ],
    });
    expect(mocks.get).toHaveBeenCalledWith(NEXT_PAGE_URL);
  });
});
