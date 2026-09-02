import { API_ERROR_CODE } from './constants';
import { isApiErrorShape } from './type-guards';
import type { ApiError } from './types';

/**
 * Thin `fetch` wrapper for calls to this app's own `/api/*` routes.
 *
 * Centralizes the response handling every hook in `hooks/` used to hand-roll
 * on its own (parse JSON, check `res.ok`, narrow the body against
 * `isApiErrorShape`, `Object.assign` a message/code/details onto a plain
 * `Error`). `apiFetch` does that once so callers get a typed, thrown error
 * instead of re-deriving one from a raw `Response` — see the four error
 * classes below.
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
 * Thrown for any other non-2xx response.
 *
 * Mirrors the `{code, message, details?}` shape `lib/api-response.ts`'s
 * `fail()` writes — `.message` is the server's own message (or a generic
 * fallback when the body doesn't match that shape), so existing callers that
 * read `err.message` or pass `err` to `getErrorMessage()` keep working
 * unchanged.
 */
export class ApiRequestError extends Error {
  readonly code: string;
  readonly details?: unknown;
  readonly status: number;

  constructor(apiError: ApiError, status: number) {
    super(apiError.message);
    this.name = 'ApiRequestError';
    this.code = apiError.code;
    this.details = apiError.details;
    this.status = status;
  }
}

/** Thrown when a response that should have been JSON fails to parse. */
export class ApiParseError extends Error {
  constructor(
    message = 'Received an unreadable response from the server.',
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'ApiParseError';
  }
}

/** Thrown when `fetch` itself rejects (offline, DNS failure, blocked request, etc). */
export class NetworkError extends Error {
  constructor(
    message = 'Network request failed. Check your connection and try again.',
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'NetworkError';
  }
}

/**
 * Fetches `path` and returns the parsed JSON body on a 2xx response.
 *
 * - `fetch` itself rejecting (network down, blocked, etc.) → throws `NetworkError`.
 * - `401` → throws `UnauthorizedError`.
 * - any other non-2xx → throws `ApiRequestError`, built from the response
 *   body when it matches `{code, message}` (`isApiErrorShape`), else a
 *   generic `ApiRequestError` carrying the HTTP status.
 * - a 2xx body that fails to parse as JSON → throws `ApiParseError`.
 * - otherwise → returns the parsed JSON body as `T`.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch (cause) {
    throw new NetworkError(undefined, { cause });
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
      throw new ApiRequestError(body, response.status);
    }

    const fallback: ApiError = {
      code: API_ERROR_CODE.UNKNOWN_ERROR,
      message: `Request failed with status ${response.status}`,
    };
    throw new ApiRequestError(fallback, response.status);
  }

  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new ApiParseError(undefined, { cause });
  }
}
