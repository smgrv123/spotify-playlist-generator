import { API_ERROR_CODE } from './constants';
import { isApiErrorShape } from './type-guards';
import type { ApiError } from './types';

/**
 * Thin `fetch` wrapper for calls to this app's own `/api/*` routes.
 *
 * Centralizes the response handling every hook in `hooks/` used to hand-roll
 * on its own (parse JSON, check `res.ok`, narrow the body against
 * `isApiErrorShape`, `Object.assign` a message/code/details onto a plain
 * `Error`). `apiFetch` does that once so callers get a thrown error instead
 * of re-deriving one from a raw `Response`.
 *
 * Every route under `app/api/**` responds via `ok()`/`fail()` from
 * `lib/api-response.ts`, which always writes a JSON body (never an empty
 * 204), so `apiFetch` can unconditionally call `.json()` on both the success
 * and failure paths without a "was there a body at all" branch.
 */

/**
 * Thrown when the server responds `401`.
 *
 * Caught app-wide by `components/providers.tsx` (`UnauthorizedRedirect`),
 * which redirects to `/login`; the matching "Session expired" toast is fired
 * from `lib/query-client.ts`'s cache-level `onError` (it — not this class —
 * owns the toast copy, since the same message needs to be shown regardless
 * of which query/mutation surfaced the 401).
 */
export class UnauthorizedError extends Error {
  constructor(message = 'Session expired. Please sign in again.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Fetches `path` and returns the parsed JSON body on a 2xx response.
 *
 * - `fetch` itself rejecting (network down, blocked, etc.) → throws a plain `Error`.
 * - `401` → throws `UnauthorizedError`.
 * - any other non-2xx → throws a plain `Error`, built from the response
 *   body when it matches `{code, message}` (`isApiErrorShape`), else a
 *   generic `Error` carrying the HTTP status.
 * - a 2xx body that fails to parse as JSON → throws a plain `Error`.
 * - otherwise → returns the parsed JSON body as `T`.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch (cause) {
    throw new Error('Network request failed. Check your connection and try again.', { cause });
  }

  if (response.status === 401) {
    throw new UnauthorizedError();
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // No/invalid JSON body on an error response — fall through to the
      // generic message below rather than letting a parse failure mask the
      // real (non-2xx) failure.
    }

    if (isApiErrorShape(body)) {
      throw new Error(body.message, { cause: body });
    }

    const fallback: ApiError = {
      code: API_ERROR_CODE.UNKNOWN_ERROR,
      message: `Request failed with status ${response.status}`,
    };
    throw new Error(fallback.message);
  }

  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new Error('Received an unreadable response from the server.', { cause });
  }
}
