import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAFT_STORAGE_KEY, clearDraft, loadDraft, saveDraft } from './draft-storage';
import type { Draft } from './types';

/**
 * Test fixture covering every branch of `draftSchema`: a resolved track with
 * full display data, a failed track with a query object, a non-default
 * visibility, and non-zero step/maxReached.
 */
const SAMPLE_DRAFT: Draft = {
  tracks: [
    {
      status: 'resolved',
      spotifyUri: 'spotify:track:abc123',
      spotifyTrackId: 'abc123',
      durationMs: 210_000,
      rowId: 'row-1',
      displayData: {
        title: 'Sample Song',
        artist: 'Sample Artist',
        albumContext: 'Sample Album',
        imageUrl: 'https://i.scdn.co/image/sample',
      },
    },
    {
      status: 'failed',
      reason: 'NO_MATCH',
      query: { title: 'Missing', artist: 'Nobody' },
      rowId: 'row-2',
    },
  ],
  name: 'My Playlist',
  visibility: 'public',
  step: 1,
  maxReached: 2,
};

/**
 * Fresh in-memory `sessionStorage` stub. Simpler than pulling in `jsdom`
 * just to exercise a four-method interface. Returned so tests can seed
 * malformed values without going through the module's own writer.
 */
function stubSessionStorage(): Storage {
  const store = new Map<string, string>();
  const stub: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => (store.has(key) ? (store.get(key) ?? null) : null),
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
  vi.stubGlobal('window', { sessionStorage: stub });
  return stub;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('draft-storage (browser)', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = stubSessionStorage();
  });

  it('round-trips a Draft through save/load', () => {
    saveDraft(SAMPLE_DRAFT);
    expect(loadDraft()).toEqual(SAMPLE_DRAFT);
  });

  it('returns null when the storage key is not set', () => {
    expect(loadDraft()).toBeNull();
  });

  it('returns null (without throwing) when the stored value is not valid JSON', () => {
    storage.setItem(DRAFT_STORAGE_KEY, '{not json');
    expect(() => loadDraft()).not.toThrow();
    expect(loadDraft()).toBeNull();
  });

  it('returns null when the stored value does not match the Draft schema', () => {
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ foo: 'bar', tracks: 'not-an-array' }));
    expect(loadDraft()).toBeNull();
  });

  it('clearDraft removes the key so loadDraft returns null again', () => {
    saveDraft(SAMPLE_DRAFT);
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it('round-trips distinct rowIds per track', () => {
    saveDraft(SAMPLE_DRAFT);
    const rowIds = loadDraft()?.tracks.map((track) => track.rowId) ?? [];
    expect(rowIds).toEqual(['row-1', 'row-2']);
    expect(new Set(rowIds).size).toBe(rowIds.length);
  });

  it('rejects a draft persisted under the pre-rowId key/shape after the storage-key version bump', () => {
    const OLD_DRAFT_STORAGE_KEY = 'spotify-playlist-builder-draft-v2';
    const oldShapedDraft = {
      ...SAMPLE_DRAFT,
      tracks: SAMPLE_DRAFT.tracks.map((track) => {
        const clone: Record<string, unknown> = { ...track };
        delete clone.rowId;
        return clone;
      }),
    };
    storage.setItem(OLD_DRAFT_STORAGE_KEY, JSON.stringify(oldShapedDraft));
    expect(loadDraft()).toBeNull();
  });
});

describe('draft-storage (SSR / no window)', () => {
  beforeEach(() => {
    vi.stubGlobal('window', undefined);
  });

  it('loadDraft returns null when window is undefined', () => {
    expect(loadDraft()).toBeNull();
  });

  it('saveDraft is a no-op (does not throw) when window is undefined', () => {
    expect(() => saveDraft(SAMPLE_DRAFT)).not.toThrow();
  });

  it('clearDraft is a no-op (does not throw) when window is undefined', () => {
    expect(() => clearDraft()).not.toThrow();
  });
});
