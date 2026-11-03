import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const cookieStore = vi.hoisted(() => ({ delete: vi.fn() }));

vi.mock('next/headers', () => ({ cookies: async () => cookieStore }));
vi.mock('@/lib/env', () => ({ env: { COOKIE_SECURE: false } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/logout', () => {
  it('clears the access, refresh, expiry and OAuth-state cookies and reports success', async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true });
    expect(cookieStore.delete.mock.calls.map(([name]) => name).sort()).toEqual([
      'sp_access_token',
      'sp_expires_at',
      'sp_refresh_token',
      'sp_state',
    ]);
  });

  it('returns a 500 error body instead of throwing when a cookie cannot be cleared', async () => {
    cookieStore.delete.mockImplementation(() => {
      throw new Error('cookie store unavailable');
    });

    const response = await POST();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
  });
});
