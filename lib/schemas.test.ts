import { describe, expect, it } from 'vitest';
import { MAX_PLAYLIST_URIS } from './constants';
import { saveRequestSchema } from './schemas';

const VALID_URI = 'spotify:track:4uLU6hMCjMI75M1A2tKUQC';

describe('saveRequestSchema uris', () => {
  it('accepts a real track URI', () => {
    expect(saveRequestSchema.safeParse({ playlistName: 'x', uris: [VALID_URI] }).success).toBe(
      true
    );
  });

  it('accepts exactly MAX_PLAYLIST_URIS URIs', () => {
    const uris = Array.from({ length: MAX_PLAYLIST_URIS }, () => VALID_URI);
    expect(saveRequestSchema.safeParse({ playlistName: 'x', uris }).success).toBe(true);
  });

  it('accepts a payload without playlistName (update-mode track-only save)', () => {
    expect(saveRequestSchema.safeParse({ uris: [VALID_URI] }).success).toBe(true);
  });

  it.each([
    ['local file URI', 'spotify:local:Artist:Album:Title:123'],
    ['episode URI', `spotify:episode:${'a'.repeat(22)}`],
    ['short track ID', 'spotify:track:short'],
    ['23-character track ID', `spotify:track:${'a'.repeat(23)}`],
    ['22 non-alphanumeric characters', `spotify:track:${'!'.repeat(22)}`],
  ])('rejects a %s', (_label, uri) => {
    expect(saveRequestSchema.safeParse({ playlistName: 'x', uris: [uri] }).success).toBe(false);
  });

  it('rejects more than MAX_PLAYLIST_URIS URIs', () => {
    const uris = Array.from({ length: MAX_PLAYLIST_URIS + 1 }, () => VALID_URI);
    expect(saveRequestSchema.safeParse({ playlistName: 'x', uris }).success).toBe(false);
  });
});
