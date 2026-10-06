import { it, expect } from 'vitest';
import { signJwt, verifyJwt } from '../src/jwt';
import { post, get, loginToken, bearer, coach } from './helpers';

it('login ok returns a token valid for requireUser', async () => {
  const r = await post('/api/login', { password: 'segreta' });
  expect(r.status).toBe(200);
  const body = (await r.json()) as { token: string; expiresAt: number };
  expect(body.token.split('.')).toHaveLength(3);
  expect(body.expiresAt).toBeGreaterThan(Date.now() + 29 * 86400000);
  const me = await get('/api/me', bearer(body.token));
  expect(me.status).toBe(200);
  expect(await me.json()).toEqual({ kind: 'user' });
});

it('wrong password is 401 and the 6th attempt from the same ip is 429', async () => {
  const ip = { 'CF-Connecting-IP': '10.0.0.9' };
  for (let i = 0; i < 5; i++) expect((await post('/api/login', { password: 'nope' }, ip)).status).toBe(401);
  expect((await post('/api/login', { password: 'nope' }, ip)).status).toBe(429);
  // la password giusta da un altro IP funziona ancora
  expect((await post('/api/login', { password: 'segreta' }, { 'CF-Connecting-IP': '10.0.0.10' })).status).toBe(200);
});

it('missing or tampered token is 401', async () => {
  expect((await get('/api/me')).status).toBe(401);
  const t = await loginToken();
  expect((await get('/api/me', bearer(t + 'x'))).status).toBe(401);
  expect((await get('/api/me', bearer('abc'))).status).toBe(401);
});

it('coach key opens read routes but not user routes', async () => {
  const ping = await get('/api/v1/read/ping', coach);
  expect(ping.status).toBe(200);
  expect(await ping.json()).toEqual({ ok: true, kind: 'coach' });
  expect((await get('/api/me', coach)).status).toBe(401);
  expect((await get('/api/v1/read/ping', { 'X-Api-Key': 'wrong' })).status).toBe(401);
  const t = await loginToken();
  expect((await get('/api/v1/read/ping', bearer(t))).status).toBe(200);
});

it('expired jwt is rejected and valid jwt roundtrips', async () => {
  const expired = await signJwt({ sub: 'u' }, 's3cret', -10);
  expect(await verifyJwt(expired, 's3cret')).toBeNull();
  const ok = await signJwt({ sub: 'u' }, 's3cret', 60);
  expect(await verifyJwt(ok, 's3cret')).toMatchObject({ sub: 'u' });
  expect(await verifyJwt(ok, 'other')).toBeNull();
});

it('login body without password is 400', async () => {
  expect((await post('/api/login', {})).status).toBe(400);
});
