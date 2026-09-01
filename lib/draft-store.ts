import { clearDraft, loadDraft, saveDraft } from './draft-storage';
import type { Draft } from './types';

/**
 * External store for the builder `Draft`, consumed by `BuilderShell` via
 * `useSyncExternalStore`. This avoids the SSR hydration-mismatch flash that a
 * `useState + useEffect` hydration pattern would introduce: on the
 * server-matching render React uses `getServerSnapshot()` (== `INITIAL_DRAFT`),
 * then after hydration commit it switches to `getSnapshot()` (which hits
 * sessionStorage). Mutations update the in-memory cache synchronously, notify
 * subscribers, and debounce the sessionStorage write so rapid edits do not
 * thrash storage.
 */

const INITIAL_DRAFT: Draft = {
  tracks: [],
  name: '',
  visibility: 'private',
  step: 0,
  maxReached: 0,
  mode: 'create',
  target: '',
};

const DRAFT_SAVE_DEBOUNCE_MS = 300;

let cachedDraft: Draft | null = null;
const draftListeners = new Set<() => void>();
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export function getSnapshot(): Draft {
  if (cachedDraft === null) {
    cachedDraft = loadDraft() ?? INITIAL_DRAFT;
  }
  return cachedDraft;
}

export function getServerSnapshot(): Draft {
  return INITIAL_DRAFT;
}

export function subscribe(listener: () => void): () => void {
  draftListeners.add(listener);
  return () => {
    draftListeners.delete(listener);
  };
}

function scheduleDraftSave(draft: Draft): void {
  if (saveTimeout !== null) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveDraft(draft);
    saveTimeout = null;
  }, DRAFT_SAVE_DEBOUNCE_MS);
}

export function update(updater: (prev: Draft) => Draft): void {
  const prev = getSnapshot();
  const next = updater(prev);
  if (Object.is(prev, next)) return;
  cachedDraft = next;
  scheduleDraftSave(next);
  for (const listener of draftListeners) listener();
}

/**
 * Resets the in-memory cache to `INITIAL_DRAFT` and clears the persisted
 * copy. Used by Phase 12's "Build another" flow (`draftStore.reset()`) to
 * start a fresh draft.
 *
 * Cancels any in-flight debounced `scheduleDraftSave` first — otherwise a
 * write queued just before the reset (e.g. the user was still typing a name)
 * would fire ~300ms later and resurrect the old draft in sessionStorage.
 * Notifies subscribers afterward so `useSyncExternalStore` consumers (i.e.
 * `BuilderShell`) actually re-render with the reset snapshot; without this,
 * nothing schedules the follow-up render since no other state changed.
 */
export function reset(): void {
  if (saveTimeout !== null) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  cachedDraft = null;
  clearDraft();
  for (const listener of draftListeners) listener();
}
