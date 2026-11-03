import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() }));

vi.mock('@/lib/spotify-client', () => ({ spotifyClient: mocks }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const URI = 'spotify:track:4uLU6hMCjMI75M1A2tKUQC';

function save(payload: unknown) {
  return POST(
    new NextRequest('http://localhost/api/spotify/playlist/save', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.put.mockResolvedValue({ snapshot_id: 's1' });
});

describe('POST /api/spotify/playlist/save (update mode)', () => {
  it('only sends the track PUT when no name or visibility is provided', async () => {
    const response = await save({ playlistId: 'pl1', uris: [URI], mode: 'replace' });

    expect(response.status).toBe(200);
    expect(mocks.put.mock.calls.map(([url]) => url)).toEqual(['/playlists/pl1/items']);
  });

  it('PUTs the details endpoint with the new name before replacing tracks', async () => {
    const response = await save({
      playlistId: 'pl1',
      playlistName: 'New name',
      uris: [URI],
      mode: 'replace',
    });

    expect(response.status).toBe(200);
    expect(mocks.put.mock.calls.map(([url]) => url)).toEqual([
      '/playlists/pl1',
      '/playlists/pl1/items',
    ]);
    expect(mocks.put.mock.calls[0][1]).toEqual({ name: 'New name' });
  });

  it('sends only public when isPublic is the only detail provided', async () => {
    const response = await save({
      playlistId: 'pl1',
      isPublic: true,
      uris: [URI],
      mode: 'replace',
    });

    expect(response.status).toBe(200);
    expect(mocks.put.mock.calls[0]).toEqual(['/playlists/pl1', { public: true }]);
  });

  it('rejects a blank name with VALIDATION_ERROR and makes no Spotify calls', async () => {
    const response = await save({
      playlistId: 'pl1',
      playlistName: '  ',
      uris: [URI],
      mode: 'replace',
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
