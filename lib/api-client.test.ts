import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedError, apiFetch } from './api-client';

/** Build a minimal `Response`-like object the production code can consume. */
function mockResponse(status: number, body: unknown): Response {
  return Response.json(body, { status });
}

/** A 2xx `Response` whose body is not valid JSON. */
function mockUnparseableResponse(status: number): Response {
  return new Response('not valid json', { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiFetch', () => {
  it('returns the parsed JSON body on a 2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mockResponse(200, { playlists: [{ id: '1' }] }))
    );

    await expect(apiFetch('/api/spotify/playlists')).resolves.toEqual({
      playlists: [{ id: '1' }],
    });
  });

  it('throws a typed UnauthorizedError on a 401 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          mockResponse(401, { code: 'UNAUTHORIZED', message: 'No active session.' })
        )
    );

    await expect(apiFetch('/api/spotify/playlists')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('throws a generic error containing the server message on a 5xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockResponse(500, {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected internal server error occurred.',
        })
      )
    );

    const error = await apiFetch('/api/spotify/playlists').catch((err) => err);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(UnauthorizedError);
    expect((error as Error).message).toBe('An unexpected internal server error occurred.');
  });

  it('carries the server message on a non-5xx, non-401 error response (e.g. 400)', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          mockResponse(400, { code: 'VALIDATION_ERROR', message: 'playlistId is required' })
        )
    );

    await expect(apiFetch('/api/spotify/playlist')).rejects.toThrow('playlistId is required');
  });

  it('falls back to a generic message when a non-2xx body does not match {code, message}', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(502, { unexpected: 'shape' })));

    const error = await apiFetch('/api/spotify/playlists').catch((err) => err);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('502');
  });

  it('throws a recognizable Error when fetch itself rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiFetch('/api/spotify/playlists')).rejects.toBeInstanceOf(Error);
  });

  it('throws an Error when a 2xx body fails to parse as JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockUnparseableResponse(200)));

    await expect(apiFetch('/api/spotify/playlists')).rejects.toBeInstanceOf(Error);
  });

  it('does not attempt to parse the body of a 401 response before throwing', async () => {
    // A 401 with no JSON body at all (e.g. an auth middleware redirect) must
    // still resolve to UnauthorizedError, not an unrelated parse error.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockUnparseableResponse(401)));

    await expect(apiFetch('/api/spotify/playlists')).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
