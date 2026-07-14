import { draftSchema } from './schemas';
import type { Draft } from './types';

/**
 * Deep module for persisting the builder `Draft` to `sessionStorage`.
 *
 * The three exported functions form the complete interface:
 * - `loadDraft()` — safe read with schema validation.
 * - `saveDraft(draft)` — trusted write.
 * - `clearDraft()` — remove the key.
 *
 * All three tolerate the SSR / Node case where `window` is undefined and
 * collapse every failure path (missing key, malformed JSON, schema mismatch,
 * quota exceeded, storage disabled) to a no-op or `null` so callers never
 * need a try/catch of their own.
 *
 * The key is versioned so a future `Draft` shape change can bump the version
 * suffix and cleanly invalidate old drafts instead of parsing them into
 * broken state.
 */

export const DRAFT_STORAGE_KEY = 'spotify-playlist-builder-draft-v1';

function safeSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Reads and validates the persisted `Draft`. Returns `null` on any failure
 * so callers can treat "no draft" as a single branch.
 */
export function loadDraft(): Draft | null {
  const storage = safeSessionStorage();
  if (!storage) return null;

  const raw = storage.getItem(DRAFT_STORAGE_KEY);
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = draftSchema.safeParse(parsed);
  if (!result.success) return null;

  return result.data;
}

/**
 * Serializes and writes the `Draft`. No-op on SSR/Node or when the browser
 * refuses the write (e.g. quota exceeded, storage disabled by user).
 */
export function saveDraft(draft: Draft): void {
  const storage = safeSessionStorage();
  if (!storage) return;
  try {
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Storage full or unavailable — silent failure is preferable to
    // interrupting the user mid-edit.
  }
}

/**
 * Removes the persisted `Draft`. No-op on SSR/Node. Wired to Phase 12's
 * "Build another" trigger; kept intentionally trigger-less in this phase.
 */
export function clearDraft(): void {
  const storage = safeSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Same rationale as saveDraft.
  }
}
