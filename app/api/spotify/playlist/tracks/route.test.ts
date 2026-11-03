import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/lib/spotify-client', () => ({ spotifyClient: mocks }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
});

const request = () =>
  new NextRequest('http://localhost/api/spotify/playlist/tracks?playlistId=pl1');

describe('GET /api/spotify/playlist/tracks', () => {
  it('keeps normal tracks and counts local files, wrapper-local items and episodes as skipped', async () => {
    mocks.get.mockResolvedValue({
      next: null,
      items: [
        {
          item: {
            type: 'track',
            id: '4uLU6hMCjMI75M1A2tKUQC',
            name: 'A',
            uri: 'spotify:track:4uLU6hMCjMI75M1A2tKUQC',
            artists: [{ name: 'X' }],
            duration_ms: 1000,
          },
        },
        {
          item: {
            type: 'track',
            is_local: true,
            id: '',
            name: 'L',
            uri: 'spotify:local:a:b:c:1',
            artists: [{ name: 'X' }],
          },
        },
        {
          is_local: true,
          item: {
            type: 'track',
            id: '',
            name: 'L2',
            uri: 'spotify:local:a:b:d:2',
            artists: [{ name: 'X' }],
          },
        },
        {
          item: { type: 'episode', id: 'e', name: 'E', uri: 'spotify:episode:e' },
        },
      ],
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tracks).toHaveLength(1);
    expect(body.tracks[0].spotifyUri).toBe('spotify:track:4uLU6hMCjMI75M1A2tKUQC');
    expect(body.skippedCount).toBe(3);
  });
});
