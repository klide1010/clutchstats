import { it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resetDb, meta } from '../src/db';
import { token, setToken, initSession } from '../src/state/session';
import { apiFetch, ApiError, login } from '../src/api/client';

const fetchMock = vi.fn();

beforeEach(async () => {
  await resetDb();
  await setToken(null);
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const res = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

it('adds bearer token and json body', async () => {
  await setToken('tok');
  fetchMock.mockResolvedValueOnce(res(200, {}));
  await apiFetch('/api/x', { method: 'POST', json: { a: 1 } });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/api/x');
  expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  expect(init.body).toBe('{"a":1}');
});

it('401 clears the token and throws ApiError', async () => {
  await setToken('tok');
  fetchMock.mockResolvedValueOnce(res(401, { error: 'unauthorized' }));
  await expect(apiFetch('/api/x')).rejects.toBeInstanceOf(ApiError);
  expect(token.value).toBeNull();
});

it('other errors throw ApiError with status and keep the token', async () => {
  await setToken('tok');
  fetchMock.mockResolvedValueOnce(res(500, { error: 'boom' }));
  await expect(apiFetch('/api/x')).rejects.toMatchObject({ status: 500 });
  expect(token.value).toBe('tok');
});

it('login stores token in memory and in meta', async () => {
  fetchMock.mockResolvedValueOnce(res(200, { token: 't2', expiresAt: 1 }));
  await login('pw');
  expect(token.value).toBe('t2');
  expect(await meta.get('token')).toBe('t2');
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ password: 'pw' });
});

it('initSession loads the token from meta', async () => {
  await meta.set('token', 'saved');
  token.value = null;
  await initSession();
  expect(token.value).toBe('saved');
});
