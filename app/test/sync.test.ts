import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetDb, teamsRepo, meta } from '../src/db';
import { setToken } from '../src/state/session';
import { runSync, syncState, countPending } from '../src/api/sync';
import { myTeam } from '../src/state/team';

const fetchMock = vi.fn();
const res = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const emptyPull = (serverTime: number) => ({ teams: [], players: [], opponents: [], games: [], events: [], serverTime });

beforeEach(async () => {
  await resetDb();
  await setToken('tok');
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  syncState.value = { running: false, pending: 0, lastAt: null, lastError: null };
  myTeam.value = null;
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

it('a push rejected by the server is followed by a pull that brings the newer copy', async () => {
  const local = await teamsRepo.put({ id: 't1', name: 'Vecchio locale', shortName: 'L', color: '#000' });
  fetchMock.mockResolvedValueOnce(res(200, { accepted: 0, serverTime: 9000 }));
  fetchMock.mockResolvedValueOnce(res(200, { ...emptyPull(9000), teams: [{ ...local, name: 'Nuovo server', updatedAt: local.updatedAt + 1 }] }));
  await runSync();
  expect((await teamsRepo.get('t1'))!.name).toBe('Nuovo server');
  expect(await teamsRepo.dirty()).toEqual([]);
});

it('concurrent runSync calls share one in-flight sync instead of failing', async () => {
  fetchMock.mockResolvedValueOnce(res(200, emptyPull(100)));
  const [a, b] = await Promise.all([runSync(), runSync()]);
  expect(a).toBe(b);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('after a pull the local team signal reflects the renamed server team and players are reloaded', async () => {
  const { ensureTeam, myTeam, players } = await import('../src/state/team');
  const local = await ensureTeam();
  expect(myTeam.value?.name).toBe('La mia squadra');
  await teamsRepo.clearDirty([{ id: local.id, updatedAt: local.updatedAt }]);
  const later = local.updatedAt + 1000;
  fetchMock.mockResolvedValueOnce(res(200, {
    ...emptyPull(later + 1),
    teams: [{ ...local, name: 'Fiore Outlanders', shortName: 'FIO', logoUrl: '/logo-team.png', updatedAt: later }],
    players: [{ id: 'pz', teamId: local.id, firstName: 'Matteo', lastName: 'Chiesa', number: 4, role: 'GUARDIA', active: true, updatedAt: later, deleted: false }],
  }));
  await runSync();
  expect(myTeam.value?.name).toBe('Fiore Outlanders');
  expect(myTeam.value?.logoUrl).toBe('/logo-team.png');
  expect(players.value.map((p) => p.lastName)).toEqual(['Chiesa']);
});

it('after a pull that deletes the local duplicate team, the surviving team is selected', async () => {
  const { ensureTeam, myTeam } = await import('../src/state/team');
  const dup = await ensureTeam();
  await teamsRepo.clearDirty([{ id: dup.id, updatedAt: dup.updatedAt }]);
  const later = dup.updatedAt + 1000;
  fetchMock.mockResolvedValueOnce(res(200, {
    ...emptyPull(later + 1),
    teams: [{ ...dup, updatedAt: later, deleted: true }, { id: 'real', name: 'Fiore Outlanders', shortName: 'FIO', color: '#e63946', updatedAt: later, deleted: false }],
  }));
  await runSync();
  expect(myTeam.value?.id).toBe('real');
});
