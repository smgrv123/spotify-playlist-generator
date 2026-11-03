import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { API_ERROR_CODE } from '@/lib/constants';
import { POST } from './route';

const mocks = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn() }));

vi.mock('@/lib/spotify-client', () => ({ spotifyClient: mocks }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const request = () =>
  new NextRequest('http://localhost/api/spotify/playlist/delete', {
    method: 'POST',
    body: JSON.stringify({ playlistId: 'pl1' }),
  });

const mockOwner = (ownerId: string) =>
  mocks.get.mockImplementation(async (endpoint: string) =>
    endpoint === '/me' ? { id: 'me' } : { owner: { id: ownerId } }
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/spotify/playlist/delete', () => {
  it('rejects a non-owner with 403 and never calls the unfollow endpoint', async () => {
    mockOwner('someone-else');

    const response = await POST(request());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: API_ERROR_CODE.FORBIDDEN });
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it('unfollows the playlist for its owner', async () => {
    mockOwner('me');

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ playlistId: 'pl1' });
    expect(mocks.delete).toHaveBeenCalledWith('/playlists/pl1/followers');
  });
});
