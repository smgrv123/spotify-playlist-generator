import { afterEach, describe, expect, it, vi } from 'vitest';
import { deriveInitials, fetchSpotifyProfile } from './spotify-me';
import { spotifyClient } from './spotify-client';

vi.mock('./spotify-client', () => ({
  spotifyClient: { get: vi.fn() },
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('fetchSpotifyProfile', () => {
  it('returns a full UserProfile when /v1/me returns display_name + non-empty images', async () => {
    vi.mocked(spotifyClient.get).mockResolvedValue({
      display_name: 'Jordan Doe',
      images: [{ url: 'https://i.scdn.co/image/abc' }, { url: 'https://i.scdn.co/image/xyz' }],
    });

    const profile = await fetchSpotifyProfile();

    expect(profile).toEqual({
      displayName: 'Jordan Doe',
      avatarUrl: 'https://i.scdn.co/image/abc',
      initials: 'JD',
    });
  });

  it('returns a UserProfile with avatarUrl=null when /v1/me returns an empty/missing images array', async () => {
    vi.mocked(spotifyClient.get).mockResolvedValue({
      display_name: 'Jordan Doe',
      images: [],
    });

    const profile = await fetchSpotifyProfile();

    expect(profile).toEqual({
      displayName: 'Jordan Doe',
      avatarUrl: null,
      initials: 'JD',
    });
  });

  it('returns a UserProfile with avatarUrl=null when /v1/me response has no images key at all', async () => {
    vi.mocked(spotifyClient.get).mockResolvedValue({
      display_name: 'Jordan Doe',
    });

    const profile = await fetchSpotifyProfile();

    expect(profile).toEqual({
      displayName: 'Jordan Doe',
      avatarUrl: null,
      initials: 'JD',
    });
  });

  it('returns null when spotifyClient.get rejects (e.g. no session / 401 / refresh failure)', async () => {
    vi.mocked(spotifyClient.get).mockRejectedValue(new Error('No token'));

    const profile = await fetchSpotifyProfile();

    expect(profile).toBeNull();
  });

  it('returns null when spotifyClient.get rejects on malformed response body', async () => {
    vi.mocked(spotifyClient.get).mockRejectedValue(
      new Error('Failed to parse Spotify response body.')
    );

    const profile = await fetchSpotifyProfile();

    expect(profile).toBeNull();
  });

  // Decision: empty display_name collapses to `null`. A chip with no name has
  // nothing to render, so we treat it the same as "no profile available".
  it('returns null when display_name is empty', async () => {
    vi.mocked(spotifyClient.get).mockResolvedValue({
      display_name: '',
      images: [{ url: 'https://i.scdn.co/image/abc' }],
    });

    const profile = await fetchSpotifyProfile();

    expect(profile).toBeNull();
  });
});

describe('deriveInitials', () => {
  it('uses the first letter of the first two words for multi-word names', () => {
    expect(deriveInitials('Jordan Doe')).toBe('JD');
    expect(deriveInitials('jordan doe smith')).toBe('JD');
  });

  it('uses only the first letter for single-word names', () => {
    expect(deriveInitials('Jordan')).toBe('J');
  });

  it('falls back to "?" for empty or whitespace-only strings', () => {
    expect(deriveInitials('')).toBe('?');
    expect(deriveInitials('   ')).toBe('?');
  });
});
