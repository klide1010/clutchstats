import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetDb, teamsRepo, meta } from '../src/db';
import { setToken } from '../src/state/session';
import { runSync, syncState, countPending } from '../src/api/sync';

const fetchMock = vi.fn();
const res = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const emptyPull = (serverTime: number) => ({ teams: [], players: [], opponents: [], games: [], events: [], serverTime });

beforeEach(async () => {
  await resetDb();
  await setToken('tok');
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  syncState.value = { running: false, pending: 0, lastAt: null, lastError: null };
});
afterEach(() => vi.unstubAllGlobals());

it('pushes dirty records and clears them', async () => {
  await teamsRepo.put({ id: 't1', name: 'Noi', shortName: 'NOI', color: '#000' });
  expect(await countPending()).toBe(1);
  fetchMock.mockResolvedValueOnce(res(200, { accepted: 1, serverTime: 5000 }));
  fetchMock.mockResolvedValueOnce(res(200, emptyPull(5000)));
  const r = await runSync();
  expect(r.pushed).toBe(1);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/api/sync/push');
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body).teams).toHaveLength(1);
  expect(await teamsRepo.dirty()).toEqual([]);
  expect(syncState.value.pending).toBe(0);
  expect(syncState.value.lastError).toBeNull();
  expect(syncState.value.lastAt).toBeGreaterThan(0);
});

it('pull applies remote records with LWW and stores lastPulledAt', async () => {
  await meta.set('lastPulledAt', 1000);
  fetchMock.mockResolvedValueOnce(res(200, { ...emptyPull(7000), teams: [{ id: 't9', name: 'Remoto', shortName: 'R', color: '#fff', updatedAt: 6000, deleted: false }] }));
  const r = await runSync();
  expect(r.pulled).toBe(1);
  expect(fetchMock.mock.calls[0][0]).toBe('/api/sync/pull?since=1000');
  expect((await teamsRepo.get('t9'))!.name).toBe('Remoto');
  expect(await teamsRepo.dirty()).toEqual([]);
  expect(await meta.get('lastPulledAt')).toBe(7000);
});

it('older remote record does not overwrite local', async () => {
  const local = await teamsRepo.put({ id: 't1', name: 'Locale', shortName: 'L', color: '#000' });
  fetchMock.mockResolvedValueOnce(res(200, { accepted: 1, serverTime: 9000 }));
  fetchMock.mockResolvedValueOnce(res(200, { ...emptyPull(9000), teams: [{ ...local, name: 'Vecchio', updatedAt: local.updatedAt - 5000 }] }));
  await runSync();
  expect((await teamsRepo.get('t1'))!.name).toBe('Locale');
});

it('network error keeps dirty and sets lastError', async () => {
  await teamsRepo.put({ id: 't1', name: 'Noi', shortName: 'NOI', color: '#000' });
  fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  await expect(runSync()).rejects.toThrow();
  expect(await teamsRepo.dirty()).toHaveLength(1);
  expect(syncState.value.lastError).toBe('Rete assente, sync rimandata');
  expect(syncState.value.running).toBe(false);
  expect(syncState.value.pending).toBe(1);
});

it('401 sets session expired message', async () => {
  fetchMock.mockResolvedValueOnce(res(401, { error: 'unauthorized' }));
  await expect(runSync()).rejects.toThrow();
  expect(syncState.value.lastError).toBe('Sessione scaduta');
});

it('server error message includes the status', async () => {
  fetchMock.mockResolvedValueOnce(res(500, { error: 'boom' }));
  await expect(runSync()).rejects.toThrow();
  expect(syncState.value.lastError).toBe('Errore server 500');
});

it('nothing dirty skips the push call', async () => {
  fetchMock.mockResolvedValueOnce(res(200, emptyPull(100)));
  const r = await runSync();
  expect(r.pushed).toBe(0);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe('/api/sync/pull?since=0');
});
