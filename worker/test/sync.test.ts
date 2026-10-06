import { it, expect, beforeAll, beforeEach } from 'vitest';
import type { GameEvent, Player, Team } from '@bkstats/shared';
import { post, get, loginToken, bearer, coach, clearDb } from './helpers';

let auth: Record<string, string>;
beforeAll(async () => { auth = bearer(await loginToken()); });
beforeEach(async () => { await clearDb(); });

const team = (over: Partial<Team> = {}): Team => ({ id: 't1', name: 'A', shortName: 'A', color: '#000', updatedAt: 2000, deleted: false, ...over });
const player: Player = { id: 'p1', teamId: 't1', firstName: 'Mario', lastName: 'Rossi', number: 7, role: 'ALA', active: true, updatedAt: 2000, deleted: false };
const event: GameEvent = { id: 'e1', gameId: 'g1', seq: 1, period: 1, side: 'US', type: 'SHOT_3', playerId: 'p1', made: true, x: 0.5, y: 0.7, clockSec: 540, createdAt: 1, updatedAt: 2000, deleted: false };

it('push then pull roundtrip', async () => {
  const r = await post('/api/sync/push', { teams: [team()], players: [player], events: [event] }, auth);
  expect(r.status).toBe(200);
  const body = (await r.json()) as { accepted: number; serverTime: number };
  expect(body.accepted).toBe(3);
  expect(body.serverTime).toBeGreaterThan(0);

  const pull = await get('/api/sync/pull?since=0', auth);
  expect(pull.status).toBe(200);
  const data = (await pull.json()) as { teams: Team[]; players: Player[]; events: GameEvent[]; games: unknown[]; opponents: unknown[]; serverTime: number };
  expect(data.teams).toEqual([team()]);
  expect(data.players).toEqual([player]);
  expect(data.events).toEqual([event]);
  expect(data.games).toEqual([]);
  expect(data.opponents).toEqual([]);
});

it('push with older updatedAt does not overwrite, newer does', async () => {
  await post('/api/sync/push', { teams: [team({ name: 'A' })] }, auth);
  const older = await post('/api/sync/push', { teams: [team({ name: 'B', updatedAt: 1000 })] }, auth);
  expect(((await older.json()) as { accepted: number }).accepted).toBe(0);
  let pulled = (await (await get('/api/sync/pull?since=0', auth)).json()) as { teams: Team[] };
  expect(pulled.teams[0].name).toBe('A');
  const newer = await post('/api/sync/push', { teams: [team({ name: 'C', updatedAt: 3000 })] }, auth);
  expect(((await newer.json()) as { accepted: number }).accepted).toBe(1);
  pulled = (await (await get('/api/sync/pull?since=0', auth)).json()) as { teams: Team[] };
  expect(pulled.teams[0].name).toBe('C');
});

it('pull since is a server-time cursor and includes deleted records', async () => {
  const first = (await (await post('/api/sync/push', { teams: [team({ id: 'old', updatedAt: 1000 })] }, auth)).json()) as { serverTime: number };
  await new Promise((r) => setTimeout(r, 5));
  await post('/api/sync/push', { teams: [team({ id: 'new', updatedAt: 3000, deleted: true })] }, auth);
  const pulled = (await (await get(`/api/sync/pull?since=${first.serverTime}`, auth)).json()) as { teams: Team[] };
  expect(pulled.teams.map((t) => t.id)).toEqual(['new']);
  expect(pulled.teams[0].deleted).toBe(true);
});

it('invalid record is 400 with its index', async () => {
  const r = await post('/api/sync/push', { events: [{ seq: 1 }] }, auth);
  expect(r.status).toBe(400);
  expect(await r.json()).toMatchObject({ error: 'invalid_record', collection: 'events', index: 0 });
});

it('requires user auth (coach key is not enough)', async () => {
  expect((await post('/api/sync/push', { teams: [] })).status).toBe(401);
  expect((await post('/api/sync/push', { teams: [] }, coach)).status).toBe(401);
  expect((await get('/api/sync/pull?since=0', coach)).status).toBe(401);
});

it('optional fields roundtrip as undefined, booleans as booleans', async () => {
  const g = { id: 'g1', teamId: 't1', opponentId: 'o1', date: '2026-10-18T18:30:00.000Z', home: false, status: 'SCHEDULED', useClock: true, periodLengthMin: 10, periodsRegulation: 4, currentPeriod: 0, source: 'ICS', icsUid: 'u1', starters: ['p1', 'p2'], updatedAt: 2000, deleted: false };
  const o = { id: 'o1', name: 'Verdi', shortName: 'VER', roster: [{ number: 7, name: 'X' }, { number: 12 }], updatedAt: 2000, deleted: false };
  await post('/api/sync/push', { games: [g], opponents: [o] }, auth);
  const pulled = (await (await get('/api/sync/pull?since=0', auth)).json()) as { games: unknown[]; opponents: unknown[] };
  expect(pulled.games[0]).toEqual(g);
  expect(pulled.opponents[0]).toEqual(o);
});

it('pull cursor is server time: a record with an old client updatedAt pushed later is still delivered', async () => {
  const before = Date.now();
  await post('/api/sync/push', { teams: [team({ id: 'late', updatedAt: 1000 })] }, auth);
  const pulled = (await (await get(`/api/sync/pull?since=${before - 1}`, auth)).json()) as { teams: Team[]; serverTime: number };
  expect(pulled.teams.map((t) => t.id)).toEqual(['late']);
  expect(pulled.teams[0].updatedAt).toBe(1000);
  const later = (await (await get(`/api/sync/pull?since=${pulled.serverTime}`, auth)).json()) as { teams: Team[] };
  expect(later.teams).toEqual([]);
});
