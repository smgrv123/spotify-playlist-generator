import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { normalizeError, parseExternalError } from './api-response';
import { logger } from './logger';

vi.mock('./logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('normalizeError', () => {
  it('maps a ZodError to a 400 VALIDATION_ERROR carrying per-field messages', async () => {
    const result = z.object({ name: z.string() }).safeParse({});
    if (result.success) throw new Error('expected parse failure');

    const res = normalizeError(result.error);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Invalid request payload',
      details: { name: [expect.any(String)] },
    });
  });

  it('uses the numeric status of an error that carries a code and message', async () => {
    const res = normalizeError({ code: 'RATE_LIMITED', message: 'slow down', status: 429 });

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ code: 'RATE_LIMITED', message: 'slow down' });
  });

  it('honours the Object.assign(new Error, { code, status }) pattern used by spotify-client', async () => {
    const error = Object.assign(new Error('No active session'), {
      code: 'NO_SESSION',
      details: { hint: 'log in' },
      status: 401,
    });

    const res = normalizeError(error);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      code: 'NO_SESSION',
      message: 'No active session',
      details: { hint: 'log in' },
    });
  });

  it('defaults an api-shaped error without a status to 500', async () => {
    const res = normalizeError({ code: 'BOOM', message: 'nope' });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ code: 'BOOM', message: 'nope' });
  });

  it('defaults an api-shaped error with a non-numeric status to 500', async () => {
    const res = normalizeError({ code: 'BOOM', message: 'nope', status: '401' });

    expect(res.status).toBe(500);
  });

  it('collapses a plain Error to a generic 500 without leaking its message, and logs it', async () => {
    const error = new Error('db password is hunter2');

    const res = normalizeError(error);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred.',
    });
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('collapses an object missing a string code to a generic 500', async () => {
    const res = normalizeError({ message: 'no code here', status: 404 });

    expect(res.status).toBe(500);
    expect((await res.json()).code).toBe('INTERNAL_SERVER_ERROR');
  });

  it.each([
    ['a string', 'oops'],
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
  ])('collapses %s thrown as a non-object to a generic 500', async (_label, thrown) => {
    const res = normalizeError(thrown);

    expect(res.status).toBe(500);
    expect((await res.json()).code).toBe('INTERNAL_SERVER_ERROR');
  });
});

describe('parseExternalError', () => {
  const FALLBACK = 'Spotify API request failed (500)';

  it('always reports EXTERNAL_SERVICE_ERROR with the caller-supplied fallback message', () => {
    expect(parseExternalError({ error: { message: 'x' } }, FALLBACK)).toMatchObject({
      code: 'EXTERNAL_SERVICE_ERROR',
      message: FALLBACK,
    });
  });

  it('extracts the message from a Spotify-style nested { error: { status, message } } body', () => {
    const parsed = parseExternalError({ error: { status: 403, message: 'Forbidden' } }, FALLBACK);

    expect(parsed.details).toEqual({ externalMessage: 'Forbidden' });
  });

  it('prefers the nested error message over a top-level message', () => {
    const parsed = parseExternalError({ error: { message: 'nested' }, message: 'top' }, FALLBACK);

    expect(parsed.details).toEqual({ externalMessage: 'nested' });
  });

  it('falls back to a top-level message', () => {
    expect(parseExternalError({ message: 'top' }, FALLBACK).details).toEqual({
      externalMessage: 'top',
    });
  });

  it('reads error_description from an OAuth-style { error: "string", error_description } body', () => {
    const parsed = parseExternalError(
      { error: 'invalid_grant', error_description: 'Refresh token revoked' },
      FALLBACK
    );

    expect(parsed.details).toEqual({ externalMessage: 'Refresh token revoked' });
  });

  it('yields no details for a bare { error: "string" } body', () => {
    expect(parseExternalError({ error: 'invalid_grant' }, FALLBACK).details).toBeUndefined();
  });

  it('skips an empty nested message in favour of the next candidate', () => {
    const parsed = parseExternalError({ error: { message: '' }, message: 'top' }, FALLBACK);

    expect(parsed.details).toEqual({ externalMessage: 'top' });
  });

  it('yields no details when the nested message is not a string', () => {
    const parsed = parseExternalError({ error: { message: 123 }, message: 'top' }, FALLBACK);

    expect(parsed.details).toBeUndefined();
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'oops'],
    ['an empty object', {}],
  ])('yields no details for %s', (_label, payload) => {
    expect(parseExternalError(payload, FALLBACK).details).toBeUndefined();
  });
});
